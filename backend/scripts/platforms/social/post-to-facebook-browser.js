/** @format */

import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { cp, mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../../..");
const DEFAULT_CLONED_PROFILE_DIR = path.join(
	BACKEND_ROOT,
	"config",
	"facebook-chrome-profile",
);

function boolFromEnv(name, fallback = true) {
	const value = process.env[name];
	if (value === undefined) return fallback;
	return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

function defaultChromeUserDataDir() {
	if (process.platform === "darwin") {
		return path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome");
	}
	if (process.platform === "win32") {
		return path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data");
	}
	return path.join(os.homedir(), ".config", "google-chrome");
}

function resolveProfileConfig() {
	return {
		useCdp: boolFromEnv("FACEBOOK_USE_CDP", false),
		cdpUrl: process.env.FACEBOOK_CDP_URL || "http://127.0.0.1:9222",
		channel: process.env.FACEBOOK_BROWSER_CHANNEL || "chrome",
		executablePath: process.env.FACEBOOK_EXECUTABLE_PATH || undefined,
		headless: boolFromEnv("FACEBOOK_HEADLESS", false),
		sourceUserDataDir:
			process.env.FACEBOOK_CHROME_USER_DATA_DIR || defaultChromeUserDataDir(),
		profileDirectory: process.env.FACEBOOK_CHROME_PROFILE_DIRECTORY || "Default",
		cloneEnabled: boolFromEnv("FACEBOOK_CLONE_CHROME_PROFILE", true),
		clonedUserDataDir:
			process.env.FACEBOOK_CLONED_CHROME_USER_DATA_DIR || DEFAULT_CLONED_PROFILE_DIR,
	};
}

async function connectViaCdp(config) {
	const browser = await chromium.connectOverCDP(config.cdpUrl);
	const context = browser.contexts()[0];
	if (!context) {
		throw new Error(
			`Facebook CDP connected to ${config.cdpUrl}, but no browser context was available`,
		);
	}

	return {
		context,
		cleanup: async () => {
			await browser.close();
		},
	};
}

async function copyDirectory(source, destination) {
	await mkdir(path.dirname(destination), { recursive: true });
	await fs.promises.rm(destination, { recursive: true, force: true });
	await cp(source, destination, { recursive: true });
}

async function prepareChromeProfile(config) {
	if (!config.cloneEnabled) {
		return {
			launchUserDataDir: config.sourceUserDataDir,
			profileDirectory: config.profileDirectory,
			cleanup: async () => {},
		};
	}

	const sourceProfileDir = path.join(
		config.sourceUserDataDir,
		config.profileDirectory,
	);
	const sourceLocalState = path.join(config.sourceUserDataDir, "Local State");
	const clonedRoot = config.clonedUserDataDir;
	const clonedProfileDir = path.join(clonedRoot, config.profileDirectory);

	if (!fs.existsSync(sourceProfileDir)) {
		throw new Error(`Facebook Chrome source profile not found: ${sourceProfileDir}`);
	}

	await mkdir(clonedRoot, { recursive: true });
	await copyDirectory(sourceProfileDir, clonedProfileDir);
	if (fs.existsSync(sourceLocalState)) {
		await fs.promises.copyFile(sourceLocalState, path.join(clonedRoot, "Local State"));
	}

	return {
		launchUserDataDir: clonedRoot,
		profileDirectory: config.profileDirectory,
		cleanup: async () => {},
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

function resolveTargetUrl(account = {}) {
	const explicit =
		account?.metadata?.pageUrl ||
		account?.metadata?.profileUrl ||
		process.env.FACEBOOK_TARGET_URL ||
		"";
	if (explicit) return explicit;

	const pageId = account?.metadata?.pageId || process.env.FACEBOOK_PAGE_ID || "";
	if (pageId) return `https://www.facebook.com/${pageId}`;
	return "https://www.facebook.com/me";
}

async function clickFirst(page, selectors, timeout = 4000) {
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout });
				return selector;
			}
		} catch {
			// continue
		}
	}
	return null;
}

async function fillComposer(page, text) {
	const selectors = [
		'div[role="dialog"] [contenteditable="true"][role="textbox"]',
		'div[role="dialog"] div[contenteditable="true"]',
		'div[contenteditable="true"][role="textbox"]',
		'div[contenteditable="true"]',
	];

	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout: 4000 });
				await locator.fill(text, { timeout: 4000 });
				return selector;
			}
		} catch {
			// continue
		}
	}

	return null;
}

async function attachMedia(page, mediaPath) {
	if (!mediaPath) return null;
	const selectors = [
		'input[type="file"]',
		'div[role="dialog"] input[type="file"]',
	];

	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.setInputFiles(mediaPath);
				return selector;
			}
		} catch {
			// continue
		}
	}

	const addPhotoSelectors = [
		'div[role="button"]:has-text("Photo/video")',
		'div[role="button"]:has-text("Add photos/videos")',
		'div[aria-label*="Photo/video"]',
	];

	await clickFirst(page, addPhotoSelectors, 3000);

	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.setInputFiles(mediaPath);
				return selector;
			}
		} catch {
			// continue
		}
	}

	return null;
}

export default async function postToFacebookBrowser(post, context = {}) {
	const account = context?.account || context?.target?.account || context || {};
	const targetUrl = resolveTargetUrl(account);
	const mediaPath = resolveLocalMediaPath(post);
	const config = resolveProfileConfig();
	let browserContext = null;
	let cleanup = async () => {};
	let shouldCloseContext = true;

	if (config.useCdp) {
		const connected = await connectViaCdp(config);
		browserContext = connected.context;
		cleanup = connected.cleanup;
		shouldCloseContext = false;
	} else {
		const profile = await prepareChromeProfile(config);
		browserContext = await chromium.launchPersistentContext(
			profile.launchUserDataDir,
			{
				channel: config.channel,
				executablePath: config.executablePath,
				headless: config.headless,
				args: [`--profile-directory=${profile.profileDirectory}`],
				viewport: { width: 1440, height: 960 },
			},
		);
		cleanup = profile.cleanup;
	}

	try {
		const page = browserContext.pages()[0] || (await browserContext.newPage());
		await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
		await page.waitForTimeout(2500);

		const composerSelector = await clickFirst(page, [
			'div[role="button"]:has-text("What\'s on your mind")',
			'div[role="button"]:has-text("Write something")',
			'div[aria-label="Create a post"]',
			'div[role="button"][aria-label*="What\'s on your mind"]',
		]);

		if (!composerSelector) {
			throw new Error("Facebook browser fallback could not find the post composer");
		}

		await page.waitForTimeout(1200);

		const filled = await fillComposer(page, post.body || post.title || "");
		if (!filled) {
			throw new Error("Facebook browser fallback could not fill the post body");
		}

		if (mediaPath) {
			const attached = await attachMedia(page, mediaPath);
			if (!attached) {
				throw new Error("Facebook browser fallback could not attach media");
			}
			await page.waitForTimeout(2500);
		}

		const postButtonSelector = await clickFirst(page, [
			'div[role="dialog"] div[role="button"]:has-text("Post")',
			'div[role="dialog"] div[aria-label="Post"]',
			'div[aria-label="Post"]',
		]);

		if (!postButtonSelector) {
			throw new Error("Facebook browser fallback could not find the Post button");
		}

		await page.waitForTimeout(4000);

		return {
			type: "browser-post",
			via: config.useCdp ? "playwright-cdp" : "playwright",
			targetUrl,
			composerSelector,
			postButtonSelector,
		};
	} finally {
		if (shouldCloseContext) {
			await browserContext.close();
		}
		await cleanup();
	}
}
