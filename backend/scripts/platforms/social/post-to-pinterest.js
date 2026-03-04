/** @format */

import "dotenv/config";
import fs from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { ensurePinterestImageReady } from "../../../utils/imagePreflight.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../../..");

const DEFAULT_STATE_PATH = path.join(
	BACKEND_ROOT,
	"config",
	"pinterest-state.json",
);
const DEFAULT_BOARD_CONFIG_PATH = path.join(
	BACKEND_ROOT,
	"config",
	"pinterest-boards.json",
);
const DEBUG_DIR = path.join(BACKEND_ROOT, "debug", "pinterest");

function requiredEnv(name) {
	const value = process.env[name];
	if (!value || !String(value).trim()) {
		throw new Error(`Missing required Pinterest config: ${name}`);
	}
	return value;
}

function boolFromEnv(name, fallback = true) {
	const value = process.env[name];
	if (value === undefined) return fallback;
	return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

function createDebugRecorder(enabled) {
	const events = [];
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const sessionDir = path.join(DEBUG_DIR, stamp);

	const ensureDir = async () => {
		if (!enabled) return;
		await mkdir(sessionDir, { recursive: true });
	};

	const log = async (step, details = {}) => {
		const event = {
			at: new Date().toISOString(),
			step,
			...details,
		};
		events.push(event);
		if (enabled) {
			console.log(`[PINTEREST_DEBUG] ${step}`, details);
		}
	};

	const screenshot = async (page, name) => {
		if (!enabled) return;
		await ensureDir();
		const safeName = String(name || "step").replace(/[^a-z0-9_-]+/gi, "-");
		await page.screenshot({
			path: path.join(sessionDir, `${Date.now()}_${safeName}.png`),
			fullPage: true,
		});
	};

	const flush = async () => {
		if (!enabled) return;
		await ensureDir();
		await writeFile(
			path.join(sessionDir, "events.json"),
			JSON.stringify(events, null, 2),
		);
	};

	return {
		enabled,
		sessionDir,
		log,
		screenshot,
		flush,
	};
}

function resolveLocalMediaPath(post) {
	const mediaPath = post?.mediaPath || "";
	if (!mediaPath) return null;
	if (path.isAbsolute(mediaPath)) return mediaPath;
	if (mediaPath.startsWith("/media/")) {
		return path.join(BACKEND_ROOT, mediaPath.slice(1));
	}
	return path.join(BACKEND_ROOT, mediaPath);
}

async function loadBoardConfig(configPath) {
	try {
		const raw = await readFile(configPath, "utf-8");
		const parsed = JSON.parse(raw);
		return {
			defaultBoard: parsed?.defaultBoard || "",
			boards: Array.isArray(parsed?.boards) ? parsed.boards : [],
			rules: Array.isArray(parsed?.rules) ? parsed.rules : [],
		};
	} catch {
		return {
			defaultBoard: "",
			boards: [],
			rules: [],
		};
	}
}

function routeBoardFromRules(post, config) {
	const text = `${post?.title || ""} ${post?.body || ""}`.toLowerCase();
	for (const rule of config.rules || []) {
		const board = String(rule?.board || "").trim();
		const keywords = Array.isArray(rule?.keywords) ? rule.keywords : [];
		if (!board || keywords.length === 0) continue;
		const matched = keywords.some((keyword) =>
			text.includes(String(keyword || "").toLowerCase()),
		);
		if (matched) return board;
	}
	return "";
}

async function clickFirst(page, selectors, debug, stepName = "click") {
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout: 4000 });
				await debug?.log(stepName, { selector, ok: true });
				return true;
			}
		} catch {
			// continue
		}
	}
	await debug?.log(stepName, { ok: false, selectors });
	return false;
}

async function fillFirst(page, selectors, value, debug, stepName = "fill") {
	if (!value) return false;
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.fill(value, { timeout: 4000 });
				await debug?.log(stepName, { selector, ok: true });
				return true;
			}
		} catch {
			// continue
		}
	}
	await debug?.log(stepName, { ok: false, selectors });
	return false;
}

async function ensureLoggedIn(page, email, password, statePath, debug) {
	await page.goto("https://www.pinterest.com/pin-creation-tool/", {
		waitUntil: "domcontentloaded",
	});
	await debug?.screenshot(page, "after-open-pin-creation-tool");

	const onLoginScreen =
		page.url().includes("/login") ||
		(await page.locator('input[type="password"]').count()) > 0;
	await debug?.log("login-screen-check", { onLoginScreen, url: page.url() });

	if (!onLoginScreen) return;

	await fillFirst(
		page,
		['input[type="email"]', 'input[name="id"]'],
		email,
		debug,
		"fill-login-email",
	);
	await fillFirst(page, ['input[type="password"]'], password, debug, "fill-login-password");

	const loginClicked = await clickFirst(page, [
		'button[type="submit"]',
		'button:has-text("Log in")',
		'button:has-text("Continue")',
	], debug, "click-login-submit");
	if (!loginClicked) {
		await debug?.screenshot(page, "login-submit-not-found");
		throw new Error("Unable to find Pinterest login submit button");
	}

	await page.waitForURL((url) => !url.toString().includes("/login"), {
		timeout: 30000,
	});
	await page.context().storageState({ path: statePath });
	await debug?.log("login-success", { statePath });
	await debug?.screenshot(page, "after-login");
}

async function uploadMedia(page, mediaPath, debug) {
	if (!mediaPath || !fs.existsSync(mediaPath)) return false;

	const fileInput = page.locator('input[type="file"]').first();
	if ((await fileInput.count()) === 0) return false;
	await fileInput.setInputFiles(mediaPath);
	await page.waitForTimeout(2500);
	await debug?.log("upload-media", { mediaPath, ok: true });
	await debug?.screenshot(page, "after-media-upload");
	return true;
}

async function selectBoard(page, boardName, debug) {
	if (!boardName) return;

	await clickFirst(page, [
		'[data-test-id="board-dropdown-select-button"]',
		'button:has-text("Select")',
		'button:has-text("Board")',
	], debug, "open-board-dropdown");
	await debug?.screenshot(page, "after-open-board-dropdown");

	const searchFilled = await fillFirst(page, [
		'input[placeholder*="Search"]',
		'input[aria-label*="Search"]',
	], boardName, debug, "fill-board-search");
	if (searchFilled) {
		await page.waitForTimeout(600);
	}

	const boardClicked = await clickFirst(page, [
		`[data-test-id="board-row-${boardName}"]`,
		`div[role="button"]:has-text("${boardName}")`,
		`button:has-text("${boardName}")`,
	], debug, "select-board");
	if (!boardClicked) {
		await debug?.screenshot(page, "board-select-failed");
		throw new Error(`Unable to select Pinterest board "${boardName}"`);
	}
	await debug?.screenshot(page, "after-select-board");
}

async function publishPin(page, debug) {
	const published = await clickFirst(page, [
		'[data-test-id="board-dropdown-save-button"]',
		'button:has-text("Publish")',
		'button:has-text("Save")',
		'button:has-text("Done")',
	], debug, "publish-pin");
	if (!published) {
		await debug?.screenshot(page, "publish-button-missing");
		throw new Error("Unable to find Pinterest publish button");
	}
	await page.waitForTimeout(2500);
	await debug?.screenshot(page, "after-publish");
}

export default async function postToPinterest(post, _context = {}) {
	const username =
		process.env.PINTEREST_LOGIN_EMAIL ||
		process.env.PINTEREST_USERNAME ||
		requiredEnv("PINTEREST_USERNAME");
	const password = requiredEnv("PINTEREST_PASSWORD");
	const boardConfigPath =
		process.env.PINTEREST_BOARD_CONFIG_PATH || DEFAULT_BOARD_CONFIG_PATH;
	const boardConfig = await loadBoardConfig(boardConfigPath);
	const boardOverride =
		post?.metadata?.pinterestBoard ||
		post?.platformOverrides?.pinterest?.board ||
		"";
	const routedBoard = routeBoardFromRules(post, boardConfig);
	const board =
		boardOverride ||
		process.env.PINTEREST_BOARD_NAME ||
		process.env.PINTEREST_BOARD_ID ||
		routedBoard ||
		boardConfig.defaultBoard;
	if (!board) {
		throw new Error(
			"No Pinterest board selected. Set PINTEREST_BOARD_NAME, add routing rules, or pass metadata.pinterestBoard.",
		);
	}
	const headless = boolFromEnv("PINTEREST_HEADLESS", true);
	const debug = createDebugRecorder(boolFromEnv("PINTEREST_DEBUG", false));
	const statePath =
		process.env.PINTEREST_SESSION_STATE_PATH || DEFAULT_STATE_PATH;

	const browser = await chromium.launch({ headless });
	const contextOptions = fs.existsSync(statePath)
		? { storageState: statePath }
		: {};
	const context = await browser.newContext(contextOptions);
	const page = await context.newPage();

	try {
		await debug.log("start", { headless, statePath, board, boardConfigPath });
		await ensureLoggedIn(page, username, password, statePath, debug);
		await page.goto("https://www.pinterest.com/pin-creation-tool/", {
			waitUntil: "domcontentloaded",
		});
		await debug.screenshot(page, "ready-pin-creation-tool");

		const title = post?.title || "";
		const description = post?.body || "";
		const link = post?.canonicalUrl || post?.affiliateUrl || "";
		const mediaPathRaw = resolveLocalMediaPath(post);
		const autoResizeImages = boolFromEnv("PINTEREST_AUTO_RESIZE_IMAGES", true);
		const preparedMedia = mediaPathRaw
			? await ensurePinterestImageReady(mediaPathRaw, {
				minWidth: 1000,
				autoResize: autoResizeImages,
				targetWidth: 1000,
				targetHeight: 1500,
			})
			: { path: null, changed: false, reason: "no_media" };
		const mediaPath = preparedMedia.path;
		await debug.log("resolved-inputs", {
			titleLength: title.length,
			descriptionLength: description.length,
			hasLink: Boolean(link),
			mediaPathRaw,
			mediaPathPrepared: mediaPath,
			mediaPrepared: preparedMedia,
		});

		await uploadMedia(page, mediaPath, debug);
		await fillFirst(page, ['textarea[aria-label*="Title"]', 'input[aria-label*="Title"]'], title, debug, "fill-pin-title");
		await fillFirst(page, ['div[contenteditable="true"]', 'textarea[aria-label*="description"]'], description, debug, "fill-pin-description");
		await fillFirst(page, ['input[aria-label*="destination"]', 'input[placeholder*="link"]'], link, debug, "fill-pin-link");
		await selectBoard(page, board, debug);
		await publishPin(page, debug);

		await context.storageState({ path: statePath });
		await debug.log("post-success", { board, finalUrl: page.url() });
		await debug.flush();
		return {
			success: true,
			board,
			url: page.url(),
			boardConfigPath,
			usedMedia: Boolean(mediaPath && fs.existsSync(mediaPath)),
			sessionStatePath: statePath,
			debugSessionDir: debug.enabled ? debug.sessionDir : null,
		};
	} catch (error) {
		await debug.log("post-error", { message: error?.message || "unknown" });
		await debug.screenshot(page, "error-state");
		await debug.flush();
		throw error;
	} finally {
		await context.close();
		await browser.close();
	}
}
