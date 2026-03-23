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
const STEP_TIMEOUT_MS = Number(process.env.FACEBOOK_BROWSER_STEP_TIMEOUT_MS || 15000);

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
			process.env.FACEBOOK_CHROME_USER_DATA_DIR || DEFAULT_CLONED_PROFILE_DIR,
		profileDirectory: process.env.FACEBOOK_CHROME_PROFILE_DIRECTORY || "Default",
		cloneEnabled: boolFromEnv("FACEBOOK_CLONE_CHROME_PROFILE", false),
		clonedUserDataDir:
			process.env.FACEBOOK_CLONED_CHROME_USER_DATA_DIR || DEFAULT_CLONED_PROFILE_DIR,
		keepOpenOnAuthRequired: boolFromEnv("FACEBOOK_KEEP_OPEN_ON_AUTH_REQUIRED", true),
	};
}

function logStep(step, detail = "") {
	const suffix = detail ? ` :: ${detail}` : "";
	console.log(`[fb-browser] ${step}${suffix}`);
}

async function withStepTimeout(label, task, timeoutMs = STEP_TIMEOUT_MS) {
	return await Promise.race([
		task(),
		new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error(`Facebook browser step timed out: ${label}`)),
				timeoutMs,
			),
		),
	]);
}

async function connectViaCdp(config) {
	logStep("connect-cdp:start", config.cdpUrl);
	const browser = await chromium.connectOverCDP(config.cdpUrl);
	const context = browser.contexts()[0];
	if (!context) {
		throw new Error(
			`Facebook CDP connected to ${config.cdpUrl}, but no browser context was available`,
		);
	}
	logStep("connect-cdp:ready");

	return {
		context,
		cleanup: async () => {},
	};
}

async function copyDirectory(source, destination) {
	await mkdir(path.dirname(destination), { recursive: true });
	await fs.promises.rm(destination, { recursive: true, force: true });
	await cp(source, destination, { recursive: true });
}

async function prepareChromeProfile(config) {
	logStep(
		"profile:prepare",
		config.cloneEnabled
			? `${config.sourceUserDataDir} -> ${config.clonedUserDataDir}`
			: config.sourceUserDataDir,
	);
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
	logStep("profile:ready", clonedRoot);

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

function pageLooksLikeAuthRequired(page) {
	const url = String(page?.url?.() || "");
	return (
		/facebook\.com\/login/i.test(url) ||
		/facebook\.com\/checkpoint/i.test(url) ||
		/facebook\.com\/accounts/i.test(url)
	);
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
		'div[role="dialog"] textarea',
		'div[role="dialog"] [data-lexical-editor="true"]',
		'div[role="dialog"] div[aria-label*="What\'s on your mind" i]',
		'div[role="dialog"] div[aria-label*="Write something" i]',
		'[role="main"] [contenteditable="true"][role="textbox"]',
		'[role="main"] div[contenteditable="true"]',
		'[role="main"] textarea',
		'[role="main"] [data-lexical-editor="true"]',
		'div[contenteditable="true"][role="textbox"]',
		'div[contenteditable="true"]',
		'textarea',
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

async function confirmPostSubmitted(page) {
	const dialogLocator = page.locator('div[role="dialog"]').first();
	const postButtonLocator = page
		.getByRole("dialog")
		.getByRole("button", { name: /^Post$/ })
		.last();

	for (let attempt = 0; attempt < 12; attempt += 1) {
		const dialogVisible = await dialogLocator.isVisible().catch(() => false);
		const postButtonVisible = await postButtonLocator.isVisible().catch(() => false);
		if (!dialogVisible || !postButtonVisible) {
			return true;
		}
		await page.waitForTimeout(1000);
	}

	return false;
}

async function clickDialogActionByText(page, label) {
	const textLocator = page
		.getByRole("dialog")
		.getByText(new RegExp(`^${label}$`))
		.last();
	if ((await textLocator.count().catch(() => 0)) === 0) {
		return null;
	}

	const containerAttempts = [
		textLocator.locator("xpath=ancestor::div[@role='button'][1]"),
		textLocator.locator("xpath=ancestor::button[1]"),
		textLocator.locator("xpath=ancestor::div[@role='none'][1]"),
		textLocator.locator("xpath=ancestor::div[@tabindex][1]"),
	];

	for (const locator of containerAttempts) {
		try {
			if ((await locator.count()) > 0) {
				await locator.first().click({ timeout: 4000 });
				return `dialog-action:${label}`;
			}
		} catch {
			// continue
		}
	}

	try {
		await textLocator.click({ timeout: 4000, force: true });
		return `dialog-text:${label}`;
	} catch {
		return null;
	}
}

async function clickFacebookSubmitButton(page) {
	const nextClicked = await clickDialogActionByText(page, "Next");
	if (nextClicked) {
		await page.waitForTimeout(2000);
		return nextClicked;
	}

	const postButtons = page
		.getByRole("dialog")
		.getByRole("button", { name: /^Post$/ });
	const postCount = await postButtons.count().catch(() => 0);
	if (postCount > 0) {
		await postButtons.nth(postCount - 1).click({ timeout: 4000 });
		return 'role=button[name="Post"]';
	}

	const ariaPostButtons = page.locator('div[role="dialog"] [aria-label="Post"]');
	const ariaPostCount = await ariaPostButtons.count().catch(() => 0);
	if (ariaPostCount > 0) {
		await ariaPostButtons.nth(ariaPostCount - 1).click({ timeout: 4000 });
			return 'div[role="dialog"] [aria-label="Post"]';
		}

	const postClicked = await clickDialogActionByText(page, "Post");
	if (postClicked) {
		return postClicked;
	}

	return null;
}

async function clickFacebookFinalPostButton(page) {
	const postButtons = page
		.getByRole("dialog")
		.getByRole("button", { name: /^Post$/ });
	const postCount = await postButtons.count().catch(() => 0);
	if (postCount > 0) {
		await postButtons.nth(postCount - 1).click({ timeout: 4000 });
		return 'role=button[name="Post"]';
	}

	const ariaPostButtons = page.locator('div[role="dialog"] [aria-label="Post"]');
	const ariaPostCount = await ariaPostButtons.count().catch(() => 0);
	if (ariaPostCount > 0) {
		await ariaPostButtons.nth(ariaPostCount - 1).click({ timeout: 4000 });
		return 'div[role="dialog"] [aria-label="Post"]';
	}

	const postClicked = await clickDialogActionByText(page, "Post");
	if (postClicked) {
		return postClicked;
	}

	return null;
}

async function handlePageIdentitySwitch(page) {
	const switchSelector = await clickFirst(page, [
		'div[role="button"]:has-text("Switch now")',
		'button:has-text("Switch now")',
		'div[role="button"]:has-text("Switch")',
		'button:has-text("Switch")',
	]);
	if (!switchSelector) return null;
	await page.waitForTimeout(4000);
	return switchSelector;
}

export default async function postToFacebookBrowser(post, context = {}) {
	const account = context?.account || context?.target?.account || context || {};
	const targetUrl = resolveTargetUrl(account);
	const mediaPath = resolveLocalMediaPath(post);
	const config = resolveProfileConfig();
	let browserContext = null;
	let cleanup = async () => {};
	let shouldCloseContext = true;
	let keepWindowOpen = false;

	if (config.useCdp) {
		const connected = await connectViaCdp(config);
		browserContext = connected.context;
		cleanup = connected.cleanup;
		shouldCloseContext = false;
	} else {
		const profile = await prepareChromeProfile(config);
		logStep("browser:launch", profile.launchUserDataDir);
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
		logStep("page:open", targetUrl);
		const page = browserContext.pages()[0] || (await browserContext.newPage());
		await withStepTimeout("goto-target", () =>
			page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 }),
		);
		await page.waitForTimeout(2500);
		logStep("page:url", page.url());

		if (pageLooksLikeAuthRequired(page)) {
			logStep("auth-required", page.url());
			keepWindowOpen = config.keepOpenOnAuthRequired && !config.useCdp;
			throw new Error(
				"Facebook browser session needs login/account selection. Complete it in the opened browser window and retry.",
			);
		}

		const switchSelector = await handlePageIdentitySwitch(page);
		if (switchSelector) {
			logStep("page-switch:clicked", switchSelector);
			logStep("page-switch:url", page.url());
		}

		logStep("composer:find");
		const composerSelector = await withStepTimeout("find-composer", () =>
			clickFirst(page, [
				'div[role="button"]:has-text("What\'s on your mind")',
				'div[role="button"]:has-text("Write something")',
				'div[role="button"]:has-text("Create post")',
				'button:has-text("Create post")',
				'div[aria-label="Create a post"]',
				'div[role="button"][aria-label*="What\'s on your mind"]',
			]),
		);

		if (!composerSelector) {
			logStep("composer:missing");
			keepWindowOpen = config.keepOpenOnAuthRequired && !config.useCdp;
			throw new Error("Facebook browser fallback could not find the post composer");
		}
		logStep("composer:clicked", composerSelector);

		await page.waitForTimeout(1200);

		logStep("composer:fill");
		const filled = await withStepTimeout("fill-composer", () =>
			fillComposer(page, post.body || post.title || ""),
		);
		if (!filled) {
			logStep("composer:fill-missing");
			throw new Error("Facebook browser fallback could not fill the post body");
		}
		logStep("composer:filled", filled);

		if (mediaPath) {
			logStep("media:attach", mediaPath);
			const attached = await withStepTimeout("attach-media", () =>
				attachMedia(page, mediaPath),
			);
			if (!attached) {
				logStep("media:missing");
				throw new Error("Facebook browser fallback could not attach media");
			}
			logStep("media:attached", attached);
			await page.waitForTimeout(2500);
		}

		logStep("post-button:find");
		const postButtonSelector = await withStepTimeout("find-post-button", () =>
			clickFacebookSubmitButton(page),
		);

		if (!postButtonSelector) {
			logStep("post-button:missing");
			keepWindowOpen = config.keepOpenOnAuthRequired && !config.useCdp;
			throw new Error("Facebook browser fallback could not find the Post button");
		}
		logStep("post-button:clicked", postButtonSelector);

		if (String(postButtonSelector).includes("Next")) {
			await page.waitForTimeout(3000);
			const finalPostButtonSelector = await withStepTimeout(
				"find-final-post-button",
				async () => {
					for (let attempt = 0; attempt < 8; attempt += 1) {
						const clicked = await clickFacebookFinalPostButton(page);
						if (clicked) return clicked;
						await page.waitForTimeout(1000);
					}
					return null;
				},
			);
			if (
				!finalPostButtonSelector ||
				String(finalPostButtonSelector).includes("Next")
			) {
				keepWindowOpen = config.keepOpenOnAuthRequired && !config.useCdp;
				logStep("post-button:final-missing");
				throw new Error(
					"Facebook browser fallback advanced with Next, but could not find the final Post button.",
				);
			}
			logStep("post-button:final-clicked", finalPostButtonSelector);
		}

		const submitted = await confirmPostSubmitted(page);
		if (!submitted) {
			keepWindowOpen = config.keepOpenOnAuthRequired && !config.useCdp;
			logStep("post-submit:not-confirmed");
			throw new Error(
				"Facebook browser fallback clicked Post, but the composer did not close.",
			);
		}
		logStep("done");

		return {
			type: "browser-post",
			via: config.useCdp ? "playwright-cdp" : "playwright",
			targetUrl,
			composerSelector,
			postButtonSelector,
		};
	} finally {
		logStep("cleanup", shouldCloseContext && !keepWindowOpen ? "close" : "keep-open");
		if (shouldCloseContext && !keepWindowOpen) {
			await browserContext.close();
		}
		await cleanup();
	}
}
