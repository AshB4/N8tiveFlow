/** @format */

import "dotenv/config";
import path from "path";
import { mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../../..");
const DEFAULT_PROFILE_DIR = path.join(
	BACKEND_ROOT,
	"config",
	"substack-chrome-profile",
);
const STEP_TIMEOUT_MS = Number(process.env.SUBSTACK_STEP_TIMEOUT_MS || 15000);

function boolFromEnv(name, fallback = false) {
	const value = process.env[name];
	if (value === undefined) return fallback;
	return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

function logStep(step, detail = "") {
	const suffix = detail ? ` :: ${detail}` : "";
	console.log(`[substack] ${step}${suffix}`);
}

async function withStepTimeout(label, task, timeoutMs = STEP_TIMEOUT_MS) {
	return await Promise.race([
		task(),
		new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error(`Substack step timed out: ${label}`)),
				timeoutMs,
			),
		),
	]);
}

function resolveConfig(account = {}) {
	const metadata = account?.metadata || {};
	return {
		channel: process.env.SUBSTACK_BROWSER_CHANNEL || "chrome",
		executablePath: process.env.SUBSTACK_EXECUTABLE_PATH || undefined,
		headless: boolFromEnv("SUBSTACK_HEADLESS", false),
		keepOpenOnAuthRequired: boolFromEnv("SUBSTACK_KEEP_OPEN_ON_AUTH_REQUIRED", true),
		profileDir: process.env.SUBSTACK_PROFILE_DIR || DEFAULT_PROFILE_DIR,
		profileHandle:
			metadata.profileHandle || process.env.SUBSTACK_PROFILE_HANDLE || "",
		publicationUrl:
			metadata.publicationUrl || process.env.SUBSTACK_PUBLICATION_URL || "",
		newPostUrl: metadata.newPostUrl || process.env.SUBSTACK_NEW_POST_URL || "",
	};
}

function resolveEntryUrl(config) {
	if (config.newPostUrl) return config.newPostUrl;
	if (config.publicationUrl) return config.publicationUrl;
	return "https://substack.com/home";
}

function pageLooksLikeAuthRequired(page) {
	const url = String(page?.url?.() || "");
	return /substack\.com\/sign-in|substack\.com\/signin|substack\.com\/login/i.test(
		url,
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

async function clickLabeledButton(page, labels, timeout = 5000) {
	for (const label of labels) {
		try {
			const locator = page.getByRole("button", { name: label }).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout });
				return `role=button[name="${label}"]`;
			}
		} catch {
			// continue
		}
	}
	return null;
}

async function ensureEditorOpen(page, config) {
	logStep("editor:entry", resolveEntryUrl(config));
	await page.goto(resolveEntryUrl(config), {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await page.waitForTimeout(1500);

	if (pageLooksLikeAuthRequired(page)) {
		logStep("auth-required", page.url());
		throw new Error("Substack login required in the automation browser");
	}

	const createNew = await clickLabeledButton(page, ["Create new", "Create New"], 4000);
	if (createNew) {
		logStep("editor:create-new", createNew);
		await page.waitForTimeout(800);
	} else {
		logStep("editor:create-new-missing", page.url());
	}

	const textPost = await clickLabeledButton(page, ["Text post", "Text Post"], 3000);
	if (textPost) {
		logStep("editor:text-post", textPost);
		await page.waitForTimeout(800);
	} else {
		logStep("editor:text-post-missing", page.url());
	}

	const continueButton = await clickLabeledButton(page, ["Continue"], 3000);
	if (continueButton) {
		logStep("editor:continue", continueButton);
		await page.waitForTimeout(1000);
	} else {
		logStep("editor:continue-missing", page.url());
	}
}

async function fillTitle(page, title) {
	const selectors = [
		'textarea[placeholder*="Title" i]',
		'input[placeholder*="Title" i]',
		'[aria-label*="Title" i]',
		'h1[contenteditable="true"]',
	];

	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout: 4000 });
				if (selector.includes("contenteditable")) {
					await locator.fill("");
					await locator.type(title, { delay: 10 });
				} else {
					await locator.fill(title, { timeout: 4000 });
				}
				return selector;
			}
		} catch {
			// continue
		}
	}

	return null;
}

async function fillBody(page, body) {
	const selectors = [
		'.ProseMirror',
		'div[role="textbox"]',
		'[contenteditable="true"][data-contents="true"]',
		'[contenteditable="true"]',
	];

	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).last();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout: 4000 });
				await page.keyboard.type(body, { delay: 6 });
				return selector;
			}
		} catch {
			// continue
		}
	}

	return null;
}

async function publishPost(page) {
	const firstStage = await clickLabeledButton(page, ["Publish"], 5000);
	if (!firstStage) return null;
	logStep("publish:first", firstStage);
	await page.waitForTimeout(1200);

	const secondStage = await clickLabeledButton(
		page,
		["Publish now", "Publish post", "Send now", "Publish"],
		5000,
	);
	if (secondStage) {
		logStep("publish:final", secondStage);
		return secondStage;
	}

	return firstStage;
}

export default async function postToSubstack(post = {}, { account = {} } = {}) {
	const config = resolveConfig(account);
	await mkdir(config.profileDir, { recursive: true });
	logStep("profile:dir", config.profileDir);

	const context = await chromium.launchPersistentContext(config.profileDir, {
		channel: config.channel,
		executablePath: config.executablePath,
		headless: config.headless,
		viewport: null,
		args: ["--start-maximized"],
	});

	let shouldClose = true;

	try {
		const page = context.pages()[0] || (await context.newPage());
		logStep("page:open");

		await withStepTimeout("open-editor", () => ensureEditorOpen(page, config), 30000);

		if (pageLooksLikeAuthRequired(page)) {
			logStep("auth-required", page.url());
			if (config.keepOpenOnAuthRequired) {
				shouldClose = false;
			}
			throw new Error("Substack login required in the automation browser");
		}

		const normalizedTitle = String(post.title || "").trim();
		const normalizedBody = String(post.body || "").trim();
		if (!normalizedTitle && !normalizedBody) {
			throw new Error("Substack requires a title or body");
		}

		if (normalizedTitle) {
			const titleSelector = await withStepTimeout(
				"fill-title",
				() => fillTitle(page, normalizedTitle),
				12000,
			);
			if (!titleSelector) {
				throw new Error("Substack title field not found");
			}
			logStep("title:filled", titleSelector);
		}

		if (normalizedBody) {
			const bodySelector = await withStepTimeout(
				"fill-body",
				() => fillBody(page, normalizedBody),
				12000,
			);
			if (!bodySelector) {
				throw new Error("Substack body editor not found");
			}
			logStep("body:filled", bodySelector);
		}

		await page.waitForTimeout(1000);

		if (post.saveAsDraft) {
			logStep("draft:saved");
			return {
				status: "draft",
				url: page.url(),
			};
		}

		const publishSelector = await withStepTimeout(
			"publish",
			() => publishPost(page),
			15000,
		);
		if (!publishSelector) {
			throw new Error("Substack publish button not found");
		}

		await page.waitForTimeout(1500);
		logStep("done", page.url());
		return {
			status: "published",
			url: page.url(),
		};
	} catch (error) {
		shouldClose = false;
		throw error;
	} finally {
		if (shouldClose) {
			await context.close();
		}
	}
}
