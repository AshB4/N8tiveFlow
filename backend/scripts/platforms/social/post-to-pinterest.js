/** @format */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../../..");

const DEFAULT_STATE_PATH = path.join(
	BACKEND_ROOT,
	"config",
	"pinterest-state.json",
);

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

function resolveLocalMediaPath(post) {
	const mediaPath = post?.mediaPath || "";
	if (!mediaPath) return null;
	if (path.isAbsolute(mediaPath)) return mediaPath;
	if (mediaPath.startsWith("/media/")) {
		return path.join(BACKEND_ROOT, mediaPath.slice(1));
	}
	return path.join(BACKEND_ROOT, mediaPath);
}

async function clickFirst(page, selectors) {
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout: 4000 });
				return true;
			}
		} catch {
			// continue
		}
	}
	return false;
}

async function fillFirst(page, selectors, value) {
	if (!value) return false;
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.fill(value, { timeout: 4000 });
				return true;
			}
		} catch {
			// continue
		}
	}
	return false;
}

async function ensureLoggedIn(page, email, password, statePath) {
	await page.goto("https://www.pinterest.com/pin-creation-tool/", {
		waitUntil: "domcontentloaded",
	});

	const onLoginScreen =
		page.url().includes("/login") ||
		(await page.locator('input[type="password"]').count()) > 0;

	if (!onLoginScreen) return;

	await fillFirst(page, ['input[type="email"]', 'input[name="id"]'], email);
	await fillFirst(page, ['input[type="password"]'], password);

	const loginClicked = await clickFirst(page, [
		'button[type="submit"]',
		'button:has-text("Log in")',
		'button:has-text("Continue")',
	]);
	if (!loginClicked) {
		throw new Error("Unable to find Pinterest login submit button");
	}

	await page.waitForURL((url) => !url.toString().includes("/login"), {
		timeout: 30000,
	});
	await page.context().storageState({ path: statePath });
}

async function uploadMedia(page, mediaPath) {
	if (!mediaPath || !fs.existsSync(mediaPath)) return false;

	const fileInput = page.locator('input[type="file"]').first();
	if ((await fileInput.count()) === 0) return false;
	await fileInput.setInputFiles(mediaPath);
	await page.waitForTimeout(2500);
	return true;
}

async function selectBoard(page, boardName) {
	if (!boardName) return;

	await clickFirst(page, [
		'[data-test-id="board-dropdown-select-button"]',
		'button:has-text("Select")',
		'button:has-text("Board")',
	]);

	const searchFilled = await fillFirst(page, [
		'input[placeholder*="Search"]',
		'input[aria-label*="Search"]',
	], boardName);
	if (searchFilled) {
		await page.waitForTimeout(600);
	}

	const boardClicked = await clickFirst(page, [
		`[data-test-id="board-row-${boardName}"]`,
		`div[role="button"]:has-text("${boardName}")`,
		`button:has-text("${boardName}")`,
	]);
	if (!boardClicked) {
		throw new Error(`Unable to select Pinterest board "${boardName}"`);
	}
}

async function publishPin(page) {
	const published = await clickFirst(page, [
		'[data-test-id="board-dropdown-save-button"]',
		'button:has-text("Publish")',
		'button:has-text("Save")',
		'button:has-text("Done")',
	]);
	if (!published) {
		throw new Error("Unable to find Pinterest publish button");
	}
	await page.waitForTimeout(2500);
}

export default async function postToPinterest(post, _context = {}) {
	const username =
		process.env.PINTEREST_LOGIN_EMAIL ||
		process.env.PINTEREST_USERNAME ||
		requiredEnv("PINTEREST_USERNAME");
	const password = requiredEnv("PINTEREST_PASSWORD");
	const board =
		process.env.PINTEREST_BOARD_NAME ||
		process.env.PINTEREST_BOARD_ID ||
		"";
	const headless = boolFromEnv("PINTEREST_HEADLESS", true);
	const statePath =
		process.env.PINTEREST_SESSION_STATE_PATH || DEFAULT_STATE_PATH;

	const browser = await chromium.launch({ headless });
	const contextOptions = fs.existsSync(statePath)
		? { storageState: statePath }
		: {};
	const context = await browser.newContext(contextOptions);
	const page = await context.newPage();

	try {
		await ensureLoggedIn(page, username, password, statePath);
		await page.goto("https://www.pinterest.com/pin-creation-tool/", {
			waitUntil: "domcontentloaded",
		});

		const title = post?.title || "";
		const description = post?.body || "";
		const link = post?.canonicalUrl || post?.affiliateUrl || "";
		const mediaPath = resolveLocalMediaPath(post);

		await uploadMedia(page, mediaPath);
		await fillFirst(page, ['textarea[aria-label*="Title"]', 'input[aria-label*="Title"]'], title);
		await fillFirst(page, ['div[contenteditable="true"]', 'textarea[aria-label*="description"]'], description);
		await fillFirst(page, ['input[aria-label*="destination"]', 'input[placeholder*="link"]'], link);
		await selectBoard(page, board);
		await publishPin(page);

		await context.storageState({ path: statePath });
		return {
			success: true,
			board,
			url: page.url(),
			usedMedia: Boolean(mediaPath && fs.existsSync(mediaPath)),
			sessionStatePath: statePath,
		};
	} finally {
		await context.close();
		await browser.close();
	}
}
