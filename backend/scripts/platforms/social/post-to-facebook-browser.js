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
const CLEANUP_TIMEOUT_MS = Number(process.env.FACEBOOK_BROWSER_CLEANUP_TIMEOUT_MS || 12000);
const POST_SETTLE_MS = Number(process.env.FACEBOOK_POST_SETTLE_MS || 8000);

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
		keepOpenOnPostFailure: boolFromEnv("FACEBOOK_KEEP_OPEN_ON_POST_FAILURE", true),
	};
}

function logStep(step, detail = "") {
	const suffix = detail ? ` :: ${detail}` : "";
	console.log(`[fb-browser] ${step}${suffix}`);
}

function shouldFallbackToChromium() {
	return !["0", "false", "off", "no"].includes(
		String(process.env.FACEBOOK_FALLBACK_TO_CHROMIUM || "false").toLowerCase(),
	);
}

function isBrowserLaunchAbortError(error) {
	const message = String(error?.message || error || "");
	return (
		/browsertype\.launchpersistentcontext/i.test(message) &&
		(/signal=sigabrt/i.test(message) ||
			/abort trap/i.test(message) ||
			/hiservices/i.test(message) ||
			/crashpad/i.test(message) ||
			/target page, context or browser has been closed/i.test(message))
	);
}

async function launchFacebookContextWithFallback(profile, config) {
	try {
		return await chromium.launchPersistentContext(profile.launchUserDataDir, {
			channel: config.channel,
			executablePath: config.executablePath,
			headless: config.headless,
			args: [`--profile-directory=${profile.profileDirectory}`],
			viewport: { width: 1440, height: 960 },
		});
	} catch (error) {
		if (
			!shouldFallbackToChromium() ||
			String(config.channel || "").toLowerCase() !== "chrome" ||
			!isBrowserLaunchAbortError(error)
		) {
			throw error;
		}
		logStep("browser:launch:fallback", "chromium");
		return await chromium.launchPersistentContext(profile.launchUserDataDir, {
			headless: config.headless,
			args: [`--profile-directory=${profile.profileDirectory}`],
			viewport: { width: 1440, height: 960 },
		});
	}
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

async function settleWithTimeout(label, taskPromise, timeoutMs = CLEANUP_TIMEOUT_MS) {
	try {
		await Promise.race([
			taskPromise,
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error(`Facebook browser cleanup timed out: ${label}`)),
					timeoutMs,
				),
			),
		]);
	} catch (error) {
		logStep("cleanup-warning", `${label}: ${error?.message || String(error)}`);
	}
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
	const cloneRootParent = path.dirname(config.clonedUserDataDir);
	const cloneRootPrefix = `${path.basename(config.clonedUserDataDir)}-`;
	await mkdir(cloneRootParent, { recursive: true });
	const clonedRoot = await fs.promises.mkdtemp(
		path.join(cloneRootParent, cloneRootPrefix),
	);
	const clonedProfileDir = path.join(clonedRoot, config.profileDirectory);

	if (!fs.existsSync(sourceProfileDir)) {
		throw new Error(`Facebook Chrome source profile not found: ${sourceProfileDir}`);
	}

	await copyDirectory(sourceProfileDir, clonedProfileDir);
	if (fs.existsSync(sourceLocalState)) {
		await fs.promises.copyFile(sourceLocalState, path.join(clonedRoot, "Local State"));
	}
	logStep("profile:ready", clonedRoot);

	return {
		launchUserDataDir: clonedRoot,
		profileDirectory: config.profileDirectory,
		cleanup: async () => {
			await fs.promises.rm(clonedRoot, { recursive: true, force: true });
		},
	};
}

function resolveLocalMediaPath(post) {
	const mediaPath = post?.mediaPath || "";
	if (!mediaPath) return null;
	if (path.isAbsolute(mediaPath)) return mediaPath;
	const workspacePath = path.join(BACKEND_ROOT, "..", mediaPath);
	if (fs.existsSync(workspacePath)) {
		return workspacePath;
	}
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

async function dismissInterruptivePopups(page) {
	const dismissSelectors = [
		'div[role="dialog"] div[role="button"]:has-text("Not now")',
		'div[role="dialog"] button:has-text("Not now")',
		'div[role="dialog"] div[role="button"]:has-text("Not Now")',
		'div[role="dialog"] button:has-text("Not Now")',
		'div[role="dialog"] div[role="button"]:has-text("Maybe later")',
		'div[role="dialog"] button:has-text("Maybe later")',
	];
	for (const selector of dismissSelectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
				await locator.click({ timeout: 2000, force: true });
				logStep("popup:dismissed", selector);
				await page.waitForTimeout(500);
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
	const allInputSelector =
		'input[type="file"], input[accept*="image" i], input[accept*="video" i]';
	const inputSelectors = [
		'div[role="dialog"] input[type="file"]',
		'input[type="file"]',
	];
	const tryKnownInputs = async () => {
		for (const selector of inputSelectors) {
			try {
				const locator = page.locator(selector);
				const count = await locator.count();
				for (let index = 0; index < count; index += 1) {
					try {
						await locator.nth(index).setInputFiles(mediaPath, { timeout: 6000 });
						return `${selector}[${index}]`;
					} catch {
						// try next file input
					}
				}
			} catch {
				// continue
			}
		}
		return null;
	};

	const attachedViaKnownInput = await tryKnownInputs();
	if (attachedViaKnownInput) return attachedViaKnownInput;

	const addPhotoSelectors = [
		'div[role="button"]:has-text("Photo/video")',
		'div[role="button"]:has-text("Photo/video") span',
		'div[role="button"]:has-text("Photo/Video")',
		'div[role="button"]:has-text("Add photo/video")',
		'div[role="button"]:has-text("Add photos/videos")',
		'div[role="button"]:has-text("Add photos")',
		'div[role="button"]:has-text("Add photo")',
		'div[aria-label*="Photo/video"]',
		'div[aria-label*="Add photo"]',
		'div[aria-label*="photos/videos"]',
	];

	await clickFirst(page, addPhotoSelectors, 4000);
	await page.waitForTimeout(1200);

	try {
		const anyInputs = page.locator(allInputSelector);
		const count = await anyInputs.count();
		for (let index = 0; index < count; index += 1) {
			try {
				await anyInputs.nth(index).setInputFiles(mediaPath, { timeout: 6000 });
				return `${allInputSelector}[${index}]`;
			} catch {
				// keep trying additional inputs
			}
		}
	} catch {
		// continue
	}

	const attachedAfterOpen = await tryKnownInputs();
	if (attachedAfterOpen) return attachedAfterOpen;

	for (const selector of addPhotoSelectors) {
		try {
			const chooserPromise = page.waitForEvent("filechooser", { timeout: 3500 });
			const clicked = await clickFirst(page, [selector], 2000);
			if (!clicked) continue;
			const chooser = await chooserPromise;
			await chooser.setFiles(mediaPath);
			return `filechooser:${selector}`;
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
		.getByRole("button", { name: /^(Post|Post now|Share now)$/i })
		.last();
	const ariaSubmitLocator = page.locator(
		'div[role="dialog"] [aria-label="Post"], div[role="dialog"] [aria-label="Post now"], div[role="dialog"] [aria-label="Share now"]',
	);
	const successSignals = [
		page.locator('text=/Your post is now published/i').first(),
		page.locator('text=/Your post was shared/i').first(),
		page.locator('text=/Post published/i').first(),
		page.locator('text=/Shared successfully/i').first(),
	];

	for (let attempt = 0; attempt < 24; attempt += 1) {
		await dismissInterruptivePopups(page);
		const dialogVisible = await dialogLocator.isVisible().catch(() => false);
		const postButtonVisible = await postButtonLocator.isVisible().catch(() => false);
		const ariaSubmitVisible = await ariaSubmitLocator
			.first()
			.isVisible()
			.catch(() => false);
		for (const signal of successSignals) {
			if (await signal.isVisible().catch(() => false)) {
				return true;
			}
		}
		if (!dialogVisible) {
			return true;
		}
		if (postButtonVisible || ariaSubmitVisible) {
			await clickFacebookFinalPostButton(page).catch(() => null);
			await page.waitForTimeout(1200);
			continue;
		}
		await page.waitForTimeout(1000);
	}

	return false;
}

async function getPublishSignalCount(page) {
	const signalLocator = page.locator(
		"text=/Your post is now published|Your post was shared|Post published|Shared successfully/i",
	);
	return await signalLocator.count().catch(() => 0);
}

async function waitForPublishSignal(page, baselineCount = 0) {
	const signalLocator = page.locator(
		"text=/Your post is now published|Your post was shared|Post published|Shared successfully/i",
	);
	for (let attempt = 0; attempt < 20; attempt += 1) {
		await dismissInterruptivePopups(page);
		const visible = await signalLocator.first().isVisible().catch(() => false);
		const count = await signalLocator.count().catch(() => 0);
		if (visible && count > baselineCount) return true;
		await page.waitForTimeout(500);
	}
	return false;
}

async function verifyPostVisibleOnFeed(page, text) {
	const snippet = String(text || "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 80);
	if (!snippet) return false;
	for (let attempt = 0; attempt < 8; attempt += 1) {
		try {
			await page.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 45000 });
		} catch {
			// continue
		}
		const visible = await page
			.locator(`text=${snippet}`)
			.first()
			.isVisible()
			.catch(() => false);
		if (visible) return true;
		await page.waitForTimeout(3000);
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
				await locator.first().click({ timeout: 4000, force: true });
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
	await dismissInterruptivePopups(page);
	// Explicit support for FB variants where the visible action is nested in role="none" wrappers.
	const roleNonePostWrappers = page.locator(
		'div[role="dialog"] div[role="none"]:has(span:has-text("Post")), div[role="dialog"] div[role="none"]:has(span:has-text("Post now")), div[role="dialog"] div[role="none"]:has(span:has-text("Share now"))',
	);
	const wrapperCount = await roleNonePostWrappers.count().catch(() => 0);
	for (let index = wrapperCount - 1; index >= 0; index -= 1) {
		try {
			const wrapper = roleNonePostWrappers.nth(index);
			await wrapper.click({ timeout: 4000, force: true });
			await wrapper.dispatchEvent("mousedown").catch(() => {});
			await wrapper.dispatchEvent("mouseup").catch(() => {});
			await wrapper.dispatchEvent("click").catch(() => {});
			const text = await roleNonePostWrappers.nth(index).innerText().catch(() => "");
			return `role-none-wrapper:${String(text || "").trim().slice(0, 40)}`;
		} catch {
			// continue
		}
	}

	// Exact fallback for variants where only nested text spans are stable.
	try {
		const target = await page.evaluate(() => {
			const isVisible = (el) => {
				if (!el) return false;
				const style = window.getComputedStyle(el);
				if (!style || style.visibility === "hidden" || style.display === "none") return false;
				const rect = el.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			};
			const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
			const spans = dialogs.flatMap((dialog) =>
				Array.from(dialog.querySelectorAll("span")),
			).filter(
				(el) => /^(Post|Post now|Share now)$/i.test((el.textContent || "").trim()),
			);
			for (let i = spans.length - 1; i >= 0; i -= 1) {
				let node = spans[i];
				while (node && node !== document.body) {
					if (node instanceof HTMLElement && node.getAttribute("role") === "none" && isVisible(node)) {
						const rect = node.getBoundingClientRect();
						return {
							x: Math.round(rect.left + rect.width / 2),
							y: Math.round(rect.top + rect.height / 2),
							label: (spans[i].textContent || "").trim(),
						};
					}
					node = node.parentElement;
				}
			}
			return null;
		});
		if (target?.x && target?.y) {
			await page.mouse.click(target.x, target.y, { delay: 40 });
			return `exact-span-post-mouse:${target.label || "Post"}`;
		}
	} catch {
		// continue
	}

	const postButtons = page
		.getByRole("dialog")
		.getByRole("button", { name: /^(Post|Post now|Share now)$/i });
	const postCount = await postButtons.count().catch(() => 0);
	if (postCount > 0) {
		await postButtons.nth(postCount - 1).click({ timeout: 4000 });
		return 'role=button[name~="Post|Post now|Share now"]';
	}

	const ariaPostButtons = page.locator(
		'div[role="dialog"] [aria-label="Post"], div[role="dialog"] [aria-label="Post now"], div[role="dialog"] [aria-label="Share now"]',
	);
	const ariaPostCount = await ariaPostButtons.count().catch(() => 0);
	if (ariaPostCount > 0) {
		await ariaPostButtons.nth(ariaPostCount - 1).click({ timeout: 4000 });
		return 'div[role="dialog"] [aria-label~="Post|Post now|Share now"]';
	}

	for (const label of ["Post", "Post now", "Share now"]) {
		const postClicked = await clickDialogActionByText(page, label);
		if (postClicked) return postClicked;
	}

	// Last-resort: click any visible submit-like button in dialog.
	const dialogButtons = page.locator('div[role="dialog"] button, div[role="dialog"] div[role="button"]');
	const count = await dialogButtons.count().catch(() => 0);
	for (let index = 0; index < count; index += 1) {
		const button = dialogButtons.nth(index);
		const label = (await button.innerText().catch(() => "")).trim();
		const aria = (await button.getAttribute("aria-label").catch(() => "")) || "";
		const text = `${label} ${aria}`.toLowerCase();
		if (!text) continue;
		if (!/(post|share|publish)/i.test(text)) continue;
		if (/(boost|schedule|save draft|draft)/i.test(text)) continue;
		const disabled = await button.getAttribute("aria-disabled").catch(() => null);
		if (String(disabled || "").toLowerCase() === "true") continue;
		try {
			await button.click({ timeout: 3000 });
			return `dialog-generic:${text}`;
		} catch {
			// continue
		}
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
		browserContext = await launchFacebookContextWithFallback(profile, config);
		cleanup = profile.cleanup;
	}

	try {
		logStep("page:open", targetUrl);
		const page = browserContext.pages()[0] || (await browserContext.newPage());
		await withStepTimeout("goto-target", () =>
			page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 }),
		);
		await page.waitForTimeout(2500);
		await dismissInterruptivePopups(page);
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
			await dismissInterruptivePopups(page);
		}

		logStep("composer:find");
		await dismissInterruptivePopups(page);
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
			keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
			throw new Error("Facebook browser fallback could not find the post composer");
		}
		logStep("composer:clicked", composerSelector);

		await page.waitForTimeout(1200);
		await dismissInterruptivePopups(page);

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
			await dismissInterruptivePopups(page);
		}

		logStep("post-button:find");
		const publishSignalBaseline = await getPublishSignalCount(page);
		const postButtonSelector = await withStepTimeout("find-post-button", () =>
			clickFacebookSubmitButton(page),
		);

		if (!postButtonSelector) {
			logStep("post-button:missing");
			keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
			throw new Error("Facebook browser fallback could not find the Post button");
		}
		logStep("post-button:clicked", postButtonSelector);

		if (String(postButtonSelector).includes("Next")) {
			await page.waitForTimeout(5000);
			await dismissInterruptivePopups(page);
			const finalPostButtonSelector = await withStepTimeout(
				"find-final-post-button",
				async () => {
					for (let attempt = 0; attempt < 20; attempt += 1) {
						const clicked = await clickFacebookFinalPostButton(page);
						if (clicked) return clicked;
						await page.waitForTimeout(1500);
					}
					return null;
				},
				45000,
			);
			if (
				!finalPostButtonSelector ||
				String(finalPostButtonSelector).includes("Next")
			) {
				// Last-resort keyboard submit in dialog composer
				const composer = page
					.locator('div[role="dialog"] [contenteditable="true"], div[role="dialog"] textarea')
					.first();
				if ((await composer.count().catch(() => 0)) > 0) {
					await composer.click({ timeout: 3000 }).catch(() => {});
					await page.keyboard.press("Meta+Enter").catch(() => {});
					await page.keyboard.press("Control+Enter").catch(() => {});
					await page.waitForTimeout(1500);
				}
			}
			if (
				!finalPostButtonSelector ||
				String(finalPostButtonSelector).includes("Next")
			) {
				keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
				logStep("post-button:final-missing");
				throw new Error(
					"Facebook browser fallback advanced with Next, but could not find the final Post button.",
				);
			}
			logStep("post-button:final-clicked", finalPostButtonSelector);
		}

		await page.waitForTimeout(2000);
		const submitted = await confirmPostSubmitted(page);
		if (!submitted) {
			keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
			logStep("post-submit:not-confirmed");
			throw new Error(
				"Facebook browser fallback clicked Post, but the composer did not close.",
			);
		}
		const publishSeen = await waitForPublishSignal(page, publishSignalBaseline);
		if (!publishSeen) {
			keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
			logStep("post-submit:no-publish-signal");
			throw new Error(
				"Facebook browser fallback did not detect a publish confirmation signal.",
			);
		}
		const feedVisible = await verifyPostVisibleOnFeed(page, post.body || post.title || "");
		if (!feedVisible) {
			keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
			logStep("post-submit:not-found-on-feed");
			throw new Error(
				"Facebook browser fallback could not verify the new post on feed after publish.",
			);
		}
		await page.waitForTimeout(POST_SETTLE_MS);
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
			await settleWithTimeout("context-close", browserContext.close());
		}
		await settleWithTimeout("profile-cleanup", cleanup());
	}
}
