/** @format */

import "dotenv/config";
import fs from "fs";
import { cp, mkdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { ensurePinterestImageReady } from "../../../utils/imagePreflight.mjs";
import {
	getPinterestPinMappings,
	savePinterestPinMappings,
} from "../../../utils/localDb.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../../..");

const DEFAULT_STATE_PATH = path.join(
	BACKEND_ROOT,
	"config",
	"pinterest-state.json",
);
const DEFAULT_PROFILE_DIR = path.join(
	BACKEND_ROOT,
	"config",
	"pinterest-chrome-profile",
);
const DEFAULT_BOARD_CONFIG_PATH = path.join(
	BACKEND_ROOT,
	"config",
	"pinterest-boards.json",
);
const DEBUG_DIR = path.join(BACKEND_ROOT, "debug", "pinterest");

function extractPinId(value = "") {
	const match = String(value || "").match(/\/pin\/(\d+)/);
	return match ? match[1] : "";
}

function buildPinUrl(pinId = "") {
	return pinId ? `https://www.pinterest.com/pin/${pinId}/` : "";
}

function buildPinAnalyticsUrl(pinId = "") {
	return pinId
		? `https://www.pinterest.com/pin/${pinId}/analytics?content_type=all&device_type=all&source_type=all&aggregation=last30d`
		: "";
}

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

function getDefaultChromeUserDataDir() {
	return path.join(
		os.homedir(),
		"Library",
		"Application Support",
		"Google",
		"Chrome",
	);
}

function getPinterestBrowserOptions() {
	const channel = process.env.PINTEREST_BROWSER_CHANNEL || "chrome";
	const executablePath = process.env.PINTEREST_EXECUTABLE_PATH || undefined;
	const useSystemProfile = boolFromEnv(
		"PINTEREST_USE_SYSTEM_CHROME_PROFILE",
		false,
	);
	const systemProfileDir = getDefaultChromeUserDataDir();
	const profileDir =
		process.env.PINTEREST_PROFILE_DIR ||
		(useSystemProfile && fs.existsSync(systemProfileDir)
			? systemProfileDir
			: DEFAULT_PROFILE_DIR);
	const profileName = process.env.PINTEREST_CHROME_PROFILE_NAME || "Default";
	const cloneEnabled = boolFromEnv("PINTEREST_CLONE_CHROME_PROFILE", true);
	const clonedUserDataDir =
		process.env.PINTEREST_CLONED_CHROME_USER_DATA_DIR ||
		path.join(os.tmpdir(), "postpunk-pinterest-cdp");
	return {
		channel,
		executablePath,
		profileDir,
		profileName,
		useSystemProfile,
		cloneEnabled,
		clonedUserDataDir,
	};
}

async function copyDirectory(source, destination) {
	await mkdir(path.dirname(destination), { recursive: true });
	await fs.promises.rm(destination, { recursive: true, force: true });
	await cp(source, destination, { recursive: true });
}

async function preparePinterestProfileLaunch(options) {
	if (!options.cloneEnabled) {
		return {
			launchUserDataDir: options.profileDir,
			profileName: options.profileName,
			cleanup: async () => {},
		};
	}

	const sourceRoot = options.profileDir;
	const sourceProfileDir = path.join(sourceRoot, options.profileName);
	const sourceLocalState = path.join(sourceRoot, "Local State");
	if (!fs.existsSync(sourceProfileDir)) {
		throw new Error(`Pinterest Chrome source profile not found: ${sourceProfileDir}`);
	}

	const cloneRootParent = path.dirname(options.clonedUserDataDir);
	const cloneRootPrefix = `${path.basename(options.clonedUserDataDir)}-`;
	await mkdir(cloneRootParent, { recursive: true });
	const clonedRoot = await fs.promises.mkdtemp(
		path.join(cloneRootParent, cloneRootPrefix),
	);
	const clonedProfileDir = path.join(clonedRoot, options.profileName);
	await copyDirectory(sourceProfileDir, clonedProfileDir);
	if (fs.existsSync(sourceLocalState)) {
		await fs.promises.copyFile(sourceLocalState, path.join(clonedRoot, "Local State"));
	}

	return {
		launchUserDataDir: clonedRoot,
		profileName: options.profileName,
		cleanup: async () => {
			await fs.promises.rm(clonedRoot, { recursive: true, force: true });
		},
	};
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
		try {
			await page.screenshot({
				path: path.join(sessionDir, `${Date.now()}_${safeName}.png`),
				fullPage: false,
				timeout: 5000,
				animations: "disabled",
			});
		} catch (error) {
			events.push({
				at: new Date().toISOString(),
				step: "debug-screenshot-failed",
				name: safeName,
				error: error?.message || String(error),
			});
			console.warn(
				`[PINTEREST_DEBUG] screenshot failed for ${safeName}:`,
				error?.message || String(error),
			);
		}
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
	if (/^https?:\/\//i.test(mediaPath)) return mediaPath;
	if (path.isAbsolute(mediaPath)) return mediaPath;
	const projectRootPath = path.join(BACKEND_ROOT, "..", mediaPath);
	if (fs.existsSync(projectRootPath)) {
		return projectRootPath;
	}
	// Some queued paths drift across asset subfolders; recover by basename before failing.
	const assetBasename = path.basename(mediaPath);
	if (assetBasename) {
		const assetDirs = [
			path.join(BACKEND_ROOT, "..", "frontend", "assets", "BuzzingBees"),
			path.join(BACKEND_ROOT, "..", "frontend", "assets", "spring26"),
			path.join(BACKEND_ROOT, "..", "frontend", "assets"),
		];
		for (const assetDir of assetDirs) {
			const candidate = path.join(assetDir, assetBasename);
			if (fs.existsSync(candidate)) {
				return candidate;
			}
		}
	}
	if (mediaPath.startsWith("/media/")) {
		return path.join(BACKEND_ROOT, mediaPath.slice(1));
	}
	return path.join(BACKEND_ROOT, mediaPath);
}

async function downloadRemoteMediaToTemp(mediaUrl) {
	const url = new URL(mediaUrl);
	const extFromPath = path.extname(url.pathname) || ".jpg";
	const safeExt = /^\.[a-z0-9]+$/i.test(extFromPath) ? extFromPath : ".jpg";
	const tempPath = path.join(
		os.tmpdir(),
		`postpunk-pinterest-${Date.now()}${safeExt}`,
	);
	const response = await fetch(mediaUrl);
	if (!response.ok) {
		throw new Error(
			`Failed to download remote media (${response.status} ${response.statusText})`,
		);
	}
	const buffer = Buffer.from(await response.arrayBuffer());
	await writeFile(tempPath, buffer);
	return tempPath;
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

async function handleRestoreSession(page, debug) {
	const restored = await clickFirst(
		page,
		[
			'button:has-text("Restore session")',
			'button:has-text("Restore")',
			'text=/Restore session/i',
		],
		debug,
		"restore-session",
	);
	if (restored) {
		await page.waitForTimeout(1500);
		await debug?.screenshot(page, "after-restore-session");
	}
	return restored;
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

async function fillLabeledField(page, labelText, value, debug, stepName) {
	if (!value) {
		await debug?.log(stepName, { ok: false, reason: "empty-value" });
		return false;
	}

	const attempts = [
		async () => {
			const label = page.getByText(new RegExp(`^${labelText}$`, "i")).first();
			if ((await label.count()) === 0) return false;
			const container = label.locator("xpath=..");
			const input = container.locator("input, textarea, [contenteditable='true']").first();
			if ((await input.count()) === 0) return false;
			await input.click({ timeout: 4000 });
			if ((await input.getAttribute("contenteditable")) === "true") {
				await input.fill(value, { timeout: 4000 });
			} else {
				await input.fill(value, { timeout: 4000 });
			}
			return true;
		},
		async () => {
			const input = page
				.locator(
					`xpath=//*[normalize-space(text())='${labelText}']/following::*[(self::input or self::textarea or @contenteditable='true')][1]`,
				)
				.first();
			if ((await input.count()) === 0) return false;
			await input.click({ timeout: 4000 });
			await input.fill(value, { timeout: 4000 });
			return true;
		},
	];

	for (const attempt of attempts) {
		try {
			if (await attempt()) {
				await debug?.log(stepName, { ok: true, labelText });
				return true;
			}
		} catch {
			// continue
		}
	}

	await debug?.log(stepName, { ok: false, labelText });
	return false;
}

async function ensureLoggedIn(page, email, password, statePath, debug) {
	await page.goto("https://www.pinterest.com/pin-creation-tool/", {
		waitUntil: "domcontentloaded",
	});
	await handleRestoreSession(page, debug);
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

async function waitForPinEditorReady(page, debug) {
	const candidates = [
		'input[type="file"]',
		'text=Title',
		'text=Description',
		'text=Board',
		'text=Tagged topics',
	];

	for (const selector of candidates) {
		try {
			await page.locator(selector).first().waitFor({ state: "visible", timeout: 15000 });
			await debug?.log("editor-ready", { selector });
			return true;
		} catch {
			// continue
		}
	}

	await debug?.log("editor-ready", { ok: false });
	await debug?.screenshot(page, "editor-not-ready");
	throw new Error("Pinterest pin editor did not finish loading");
}

function normalizeBoardLabel(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

async function clickBoardByNormalizedText(page, boardName, debug) {
	const target = normalizeBoardLabel(boardName);
	if (!target) return false;
	const candidates = page.locator(
		'[role="option"], div[role="button"], button, [data-test-id^="board-row-"]',
	);
	const count = await candidates.count();
	for (let i = 0; i < count; i += 1) {
		const option = candidates.nth(i);
		const text = await option.innerText().catch(() => "");
		const normalized = normalizeBoardLabel(text);
		if (!normalized) continue;
		if (normalized === target || normalized.includes(target) || target.includes(normalized)) {
			await option.click({ timeout: 2000 }).catch(() => {});
			await debug?.log("select-board-normalized", {
				boardName,
				matchedText: text,
				ok: true,
			});
			return true;
		}
	}
	return false;
}

async function selectBoard(page, boardName, debug) {
	if (!boardName) return;

	await clickFirst(page, [
		'[data-test-id="board-dropdown-select-button"]',
		'button[aria-label*="board" i]',
		'div[aria-label*="board" i]',
		'input[placeholder*="board" i]',
		'text=/Choose a board/i',
		'button:has-text("Select")',
		'button:has-text("Board")',
		"text=Board",
	], debug, "open-board-dropdown");
	await debug?.screenshot(page, "after-open-board-dropdown");

	const searchFilled = await fillFirst(page, [
		'input[placeholder*="Search"]',
		'input[aria-label*="Search"]',
		'input[placeholder*="board" i]',
	], boardName, debug, "fill-board-search");
	if (searchFilled) {
		await page.waitForTimeout(600);
	}

	let boardClicked = await clickFirst(page, [
		`[data-test-id="board-row-${boardName}"]`,
		`div[role="button"]:has-text("${boardName}")`,
		`button:has-text("${boardName}")`,
		`[role="option"]:has-text("${boardName}")`,
		`div:has-text("${boardName}")`,
	], debug, "select-board");
	if (!boardClicked) {
		boardClicked = await clickBoardByNormalizedText(page, boardName, debug);
	}
	if (!boardClicked) {
		await debug?.screenshot(page, "board-select-failed");
		throw new Error(`Unable to select Pinterest board "${boardName}"`);
	}
	await debug?.screenshot(page, "after-select-board");
}

function knownBoardsFromConfig(config) {
	return (config?.boards || [])
		.map((entry) => {
			if (typeof entry === "string") return entry;
			return entry?.board || "";
		})
		.map((name) => String(name || "").trim())
		.filter(Boolean);
}

function splitBoardValues(value) {
	if (Array.isArray(value)) {
		return value.flatMap((item) => splitBoardValues(item));
	}
	const raw = String(value || "").trim();
	if (!raw) return [];
	return raw
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function isContextClosedError(error) {
	const message = String(error?.message || error || "");
	return /target page, context or browser has been closed/i.test(message);
}

function buildBoardCandidates({
	board,
	boardOverride,
	routedBoard,
	config,
	metadataBoards = [],
}) {
	const maxCandidates = Number(process.env.PINTEREST_MAX_BOARD_CANDIDATES || 8);
	const configBoards = knownBoardsFromConfig(config).slice(0, Math.max(maxCandidates, 8));
	const resolved = [];
	for (const source of [
		board,
		boardOverride,
		process.env.PINTEREST_BOARD_NAME || "",
		routedBoard,
		config?.defaultBoard || "",
		...metadataBoards,
		"Fun Ideas",
		...configBoards,
	]) {
		for (const name of splitBoardValues(source)) {
			resolved.push(name);
		}
	}
	return Array.from(new Set(resolved)).slice(0, Math.max(1, maxCandidates));
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

async function findPublishedPinUrl(page, debug) {
	const currentUrl = page.url();
	const currentPinId = extractPinId(currentUrl);
	if (currentPinId) {
		return buildPinUrl(currentPinId);
	}

	const hrefs = await page
		.evaluate(() =>
			Array.from(document.querySelectorAll('a[href*="/pin/"]'))
				.map((anchor) => anchor.href || anchor.getAttribute("href") || "")
				.filter(Boolean),
		)
		.catch(() => []);
	for (const href of hrefs) {
		const pinId = extractPinId(href);
		if (pinId) return buildPinUrl(pinId);
	}

	const bodyText = await page.locator("body").innerText().catch(() => "");
	const inlineMatch = String(bodyText || "").match(/https?:\/\/www\.pinterest\.com\/pin\/(\d+)/i);
	if (inlineMatch?.[1]) {
		return buildPinUrl(inlineMatch[1]);
	}

	await debug?.log("pin-url-not-found", { currentUrl });
	return "";
}

async function persistPinMapping(post, pinUrl, debug) {
	const pinId = extractPinId(pinUrl);
	if (!post?.id || !pinId) return null;
	const current = await getPinterestPinMappings();
	const next = current.filter(
		(entry) =>
			String(entry?.postId || "") !== String(post.id) &&
			String(entry?.pinId || "") !== String(pinId),
	);
	const mapping = {
		postId: post.id,
		pinId,
		pinUrl: buildPinUrl(pinId),
		analyticsUrl: buildPinAnalyticsUrl(pinId),
		titleSeen: post?.title || null,
		updatedAt: new Date().toISOString(),
	};
	next.push(mapping);
	await savePinterestPinMappings(next);
	await debug?.log("pin-mapping-saved", { postId: post.id, pinId });
	return mapping;
}

async function commitDraftBatchIfPresent(page, debug) {
	const hasDraftPanel = await page
		.locator('text=/Pin drafts/i')
		.first()
		.isVisible()
		.catch(() => false);
	await debug?.log("draft-panel-check", { hasDraftPanel });
	if (!hasDraftPanel) return false;

	await clickFirst(
		page,
		[
			'button:has-text("Select all")',
			'div[role="button"]:has-text("Select all")',
			'text=/Select all/i',
		],
		debug,
		"draft-select-all",
	);
	await page.waitForTimeout(500);

	const finalPublished = await clickFirst(
		page,
		[
			'button:has-text("Publish")',
			'div[role="button"]:has-text("Publish")',
			'text=/Publish/i',
		],
		debug,
		"draft-final-publish",
	);
	if (!finalPublished) {
		await debug?.log("draft-panel-no-final-publish", {
			reason: "assuming-single-pin-publish-already-succeeded",
		});
		await debug?.screenshot(page, "draft-final-publish-missing");
		return false;
	}

	await page.waitForTimeout(2500);
	await debug?.screenshot(page, "after-draft-final-publish");
	return true;
}

export default async function postToPinterest(post, _context = {}) {
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
	const browserOptions = getPinterestBrowserOptions();
	const {
		channel,
		executablePath,
		profileDir,
		profileName,
		useSystemProfile,
		cloneEnabled,
	} = browserOptions;
	const preparedProfile = await preparePinterestProfileLaunch(browserOptions);
	const hasSavedState = fs.existsSync(statePath);
	const username =
		process.env.PINTEREST_LOGIN_EMAIL ||
		process.env.PINTEREST_USERNAME ||
		"";
	const password = process.env.PINTEREST_PASSWORD || "";
	if (!hasSavedState && (!username || !password)) {
		throw new Error(
			"Pinterest login is not configured. Create a saved session first or set PINTEREST_USERNAME/PINTEREST_PASSWORD.",
		);
	}

	const context = await chromium.launchPersistentContext(preparedProfile.launchUserDataDir, {
		headless,
		channel,
		executablePath,
		args: [`--profile-directory=${preparedProfile.profileName}`],
	});
	const page = context.pages()[0] || (await context.newPage());

	try {
		await debug.log("start", {
			headless,
			channel,
			executablePath: executablePath || null,
			profileDir: preparedProfile.launchUserDataDir,
			profileName: preparedProfile.profileName,
			useSystemProfile,
			cloneEnabled,
			statePath,
			hasSavedState,
			board,
			boardConfigPath,
		});
		if (hasSavedState || (username && password)) {
			await ensureLoggedIn(page, username, password, statePath, debug);
		}
		await page.goto("https://www.pinterest.com/pin-creation-tool/", {
			waitUntil: "domcontentloaded",
		});
		await handleRestoreSession(page, debug);
		await waitForPinEditorReady(page, debug);
		await debug.screenshot(page, "ready-pin-creation-tool");

		const title = post?.title || "";
		const description = post?.body || "";
		const link = post?.canonicalUrl || post?.affiliateUrl || "";
		const mediaPathRaw = resolveLocalMediaPath(post);
		const mediaPathSource = /^https?:\/\//i.test(mediaPathRaw || "")
			? await downloadRemoteMediaToTemp(mediaPathRaw)
			: mediaPathRaw;
		const autoResizeImages = boolFromEnv("PINTEREST_AUTO_RESIZE_IMAGES", true);
		const preparedMedia = mediaPathSource
			? await ensurePinterestImageReady(mediaPathSource, {
				minWidth: 1000,
				autoResize: autoResizeImages,
				targetWidth: 1000,
				targetHeight: 1500,
			})
			: { path: null, changed: false, reason: "no_media" };
		const mediaPath = preparedMedia.path;
		if (!mediaPath) {
			throw new Error(
				"Pinterest post requires an image (mediaPath). This queued post has no media attached.",
			);
		}
		await debug.log("resolved-inputs", {
			titleLength: title.length,
			descriptionLength: description.length,
			hasLink: Boolean(link),
			mediaPathRaw,
			mediaPathSource,
			mediaPathPrepared: mediaPath,
			mediaPrepared: preparedMedia,
		});

		await uploadMedia(page, mediaPath, debug);
		const titleFilled =
			(await fillFirst(
			page,
			[
				'input[placeholder*="title" i]',
				'textarea[placeholder*="title" i]',
				'input[aria-label*="title" i]',
				'textarea[aria-label*="title" i]',
				'input[name*="title" i]',
			],
			title,
			debug,
			"fill-pin-title",
		)) || (await fillLabeledField(page, "Title", title, debug, "fill-pin-title-labeled"));
		const descriptionFilled =
			(await fillFirst(
			page,
			[
				'textarea[placeholder*="description" i]',
				'div[contenteditable="true"][aria-label*="description" i]',
				'textarea[aria-label*="description" i]',
				'textarea[name*="description" i]',
				'div[contenteditable="true"]',
			],
			description,
			debug,
			"fill-pin-description",
		)) ||
			(await fillLabeledField(
				page,
				"Description",
				description,
				debug,
				"fill-pin-description-labeled",
			));
		const linkFilled =
			(await fillFirst(
			page,
			[
				'input[placeholder*="link" i]',
				'input[aria-label*="link" i]',
				'input[name*="link" i]',
				'input[aria-label*="destination" i]',
			],
			link,
			debug,
			"fill-pin-link",
		)) || (await fillLabeledField(page, "Link", link, debug, "fill-pin-link-labeled"));
		await debug.log("field-fill-summary", {
			titleFilled,
			descriptionFilled,
			linkFilled,
			linkValuePresent: Boolean(link),
		});
		if (!titleFilled && !descriptionFilled && !linkFilled) {
			throw new Error(
				"Pinterest editor fields were not found/fillable (title/description/link). UI selectors likely need refresh.",
			);
		}
		const boardCandidates = buildBoardCandidates({
			board,
			boardOverride,
			routedBoard,
			config: boardConfig,
			metadataBoards: post?.metadata?.pinterestBoards || [],
		});
		let selectedBoard = "";
		let boardError = null;
		for (const candidate of boardCandidates) {
			try {
				await selectBoard(page, candidate, debug);
				selectedBoard = candidate;
				await debug.log("board-selected", { candidate });
				break;
			} catch (error) {
				boardError = error;
				await debug.log("board-select-failed", {
					candidate,
					error: error?.message || String(error),
				});
				if (isContextClosedError(error)) {
					break;
				}
			}
		}
		if (!selectedBoard) {
			throw new Error(
				`Unable to select Pinterest board. Tried: ${boardCandidates.join(", ")}. Last error: ${
					boardError?.message || "unknown"
				}`,
			);
		}
		await publishPin(page, debug);
		await commitDraftBatchIfPresent(page, debug);
		await page.waitForLoadState("domcontentloaded").catch(() => {});
		await page.waitForTimeout(1500);
		const pinUrl = await findPublishedPinUrl(page, debug);
		const pinId = extractPinId(pinUrl);
		const analyticsUrl = buildPinAnalyticsUrl(pinId);
		await persistPinMapping(post, pinUrl, debug);

		await context.storageState({ path: statePath });
		await debug.log("post-success", { board: selectedBoard, finalUrl: page.url(), pinUrl, pinId });
		await debug.flush();
		return {
			success: true,
			board: selectedBoard,
			url: page.url(),
			pinUrl: pinUrl || null,
			pinId: pinId || null,
			analyticsUrl: analyticsUrl || null,
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
		await context.close().catch(async (error) => {
			await debug.log("context-close-error", {
				message: error?.message || String(error),
			});
		});
		await preparedProfile.cleanup().catch(async (error) => {
			await debug.log("profile-cleanup-error", {
				message: error?.message || String(error),
			});
		});
	}
}
