/** @format */

import { config as loadEnv } from "dotenv";
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import { cp, mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnv({ path: path.join(__dirname, "../../../.env"), override: false });
loadEnv({ path: path.join(__dirname, "../../../../.env"), override: false });

const CREATE_TWEET_URLS = [
	"https://api.x.com/2/tweets",
	"https://api.twitter.com/2/tweets",
];
const MEDIA_UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";
const MAX_TWEET_LENGTH = 280;

// NOTE:
// X no longer offers a practical free API path for this project.
// Treat API posting as best-effort only, and plan to invest in a durable
// Playwright/manual-assist workflow that can reuse a real signed-in session,
// paste copy, and upload media when needed.

function envAny(...names) {
	for (const name of names) {
		const value = process.env[name];
		if (value) return value;
	}
	return null;
}

function requiredEnvAny(...names) {
	const value = envAny(...names);
	if (value) return value;
	throw new Error(`Missing required X config: ${names.join(" or ")}`);
}

function percentEncode(value) {
	return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${
		c.charCodeAt(0).toString(16).toUpperCase()
	}`);
}

function buildStatus({ title, body, hashtags }) {
	let status = body || title || "";
	const hashtagText = Array.isArray(hashtags)
		? hashtags
			.filter(Boolean)
			.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
			.join(" ")
		: typeof hashtags === "string"
		? hashtags
		: "";

	if (hashtagText) {
		status = status ? `${status}\n\n${hashtagText}` : hashtagText;
	}

	if (status.length <= MAX_TWEET_LENGTH) {
		return status;
	}

	return status.slice(0, MAX_TWEET_LENGTH - 1).trimEnd() + "…";
}

function buildOAuthHeader({
	method,
	url,
	params = {},
	consumerKey,
	consumerSecret,
	token,
	tokenSecret,
}) {
	const oauthParams = {
		oauth_consumer_key: consumerKey,
		oauth_nonce: crypto.randomBytes(16).toString("hex"),
		oauth_signature_method: "HMAC-SHA1",
		oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
		oauth_token: token,
		oauth_version: "1.0",
	};

	const signatureBaseParams = {
		...oauthParams,
		...params,
	};

	const sortedKeys = Object.keys(signatureBaseParams)
		.sort()
		.filter((key) => signatureBaseParams[key] !== undefined);

	const paramString = sortedKeys
		.map((key) => `${percentEncode(key)}=${percentEncode(signatureBaseParams[key])}`)
		.join("&");

	const baseString = [
		method.toUpperCase(),
		percentEncode(url),
		percentEncode(paramString),
	].join("&");

	const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(
		tokenSecret,
	)}`;
	const signature = crypto
		.createHmac("sha1", signingKey)
		.update(baseString)
		.digest("base64");

	const headerParams = {
		...oauthParams,
		oauth_signature: signature,
	};

	const header =
		"OAuth " +
		Object.keys(headerParams)
			.sort()
			.map((key) => `${percentEncode(key)}="${percentEncode(headerParams[key])}"`)
			.join(", ");

	return header;
}

function formatAxiosError(error, endpointLabel) {
	const status = error?.response?.status ?? null;
	const data = error?.response?.data ?? null;
	const detail =
		(typeof data === "object" && data !== null
			? data.detail || data.title || JSON.stringify(data)
			: data) || error?.message || "Unknown error";
	return `${endpointLabel} failed${status ? ` (status ${status})` : ""}: ${detail}`;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
	return status === 429 || (typeof status === "number" && status >= 500);
}

function boolFromEnv(name, fallback = true) {
	const value = process.env[name];
	if (value === undefined) return fallback;
	return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

function defaultChromeUserDataDir() {
	if (process.platform === "darwin") {
		return path.join(process.env.HOME || "", "Library/Application Support/Google/Chrome");
	}
	if (process.platform === "win32") {
		return path.join(
			process.env.LOCALAPPDATA || "",
			"Google/Chrome/User Data",
		);
	}
	return path.join(process.env.HOME || "", ".config/google-chrome");
}

function resolveChromeProfileConfig() {
	const enabled = boolFromEnv("X_USE_SYSTEM_CHROME_PROFILE", false);
	const channel = process.env.X_CHROME_CHANNEL || "chrome";
	const userDataDir =
		process.env.X_CHROME_USER_DATA_DIR || defaultChromeUserDataDir();
	const profileDirectory =
		process.env.X_CHROME_PROFILE_DIRECTORY || "Default";
	const cloneEnabled = boolFromEnv("X_CLONE_CHROME_PROFILE", true);
	const cloneUserDataDir =
		process.env.X_CLONED_CHROME_USER_DATA_DIR ||
		path.join(__dirname, "../../../config/x-chrome-profile");

	return {
		enabled,
		channel,
		userDataDir,
		profileDirectory,
		cloneEnabled,
		cloneUserDataDir,
	};
}

async function copyDirectory(source, destination) {
	await mkdir(path.dirname(destination), { recursive: true });
	await fs.promises.rm(destination, { recursive: true, force: true });
	await cp(source, destination, { recursive: true });
}

async function prepareChromeProfileCopy(config) {
	if (!config.cloneEnabled) {
		return {
			launchUserDataDir: config.userDataDir,
			profileDirectory: config.profileDirectory,
			cleanup: async () => {},
		};
	}

	const sourceProfileDir = path.join(config.userDataDir, config.profileDirectory);
	const sourceLocalState = path.join(config.userDataDir, "Local State");
	const clonedRoot = config.cloneUserDataDir;
	const clonedProfileDir = path.join(clonedRoot, config.profileDirectory);

	if (!fs.existsSync(sourceProfileDir)) {
		throw new Error(`X Chrome source profile not found: ${sourceProfileDir}`);
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

function resolveLocalMediaPath(mediaPath) {
	if (!mediaPath) return null;
	if (path.isAbsolute(mediaPath)) return mediaPath;
	if (mediaPath.startsWith("/media/")) {
		return path.join(__dirname, "../../..", mediaPath.slice(1));
	}
	return path.join(__dirname, "../../..", mediaPath);
}

function inferMimeType(filePath, mediaType) {
	if (mediaType === "video") return "video/mp4";
	if (mediaType === "gif") return "image/gif";
	const ext = path.extname(filePath || "").toLowerCase();
	if (ext === ".gif") return "image/gif";
	if (ext === ".png") return "image/png";
	if (ext === ".webp") return "image/webp";
	return "image/jpeg";
}

async function clickFirst(page, selectors) {
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout: 5000 });
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
				await locator.fill(value, { timeout: 5000 });
				return true;
			}
		} catch {
			// continue
		}
	}
	return false;
}

async function ensureXLoggedIn(page, statePath) {
	const username =
		process.env.X_LOGIN_USERNAME || process.env.X_USERNAME || "";
	const password =
		process.env.X_LOGIN_PASSWORD || process.env.X_PASSWORD || "";

	await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
	if (await page.locator('[data-testid="tweetTextarea_0"]').count()) {
		return;
	}
	await page.goto("https://x.com/i/flow/login", { waitUntil: "domcontentloaded" });
	if (!username || !password) {
		throw new Error(
			"X Playwright fallback needs existing session state or X_LOGIN_USERNAME/X_LOGIN_PASSWORD.",
		);
	}
	await fillFirst(page, ['input[autocomplete="username"]', 'input[name="text"]'], username);
	const nextClicked = await clickFirst(page, ['button:has-text("Next")', '[role="button"]:has-text("Next")']);
	if (!nextClicked) {
		throw new Error("X Playwright login: Next button not found");
	}
	await page.waitForTimeout(1500);
	await fillFirst(page, ['input[name="password"]'], password);
	const loginClicked = await clickFirst(page, ['button:has-text("Log in")', '[data-testid="LoginForm_Login_Button"]']);
	if (!loginClicked) {
		throw new Error("X Playwright login: Log in button not found");
	}
	await page.waitForTimeout(4000);
	if (!(await page.locator('[data-testid="tweetTextarea_0"]').count())) {
		throw new Error("X Playwright login incomplete (possibly verification challenge)");
	}
	await page.context().storageState({ path: statePath });
}

async function launchXContext({ headless, statePath }) {
	const chromeProfile = resolveChromeProfileConfig();
	if (chromeProfile.enabled) {
		if (!fs.existsSync(chromeProfile.userDataDir)) {
			throw new Error(
				`X Chrome profile path not found: ${chromeProfile.userDataDir}`,
			);
		}
		const prepared = await prepareChromeProfileCopy(chromeProfile);
		const context = await chromium.launchPersistentContext(prepared.launchUserDataDir, {
			channel: chromeProfile.channel,
			headless,
			args: [`--profile-directory=${prepared.profileDirectory}`],
		});
		context.__postpunkChromePrepared = prepared;
		return context;
	}

	const contextOptions = fs.existsSync(statePath) ? { storageState: statePath } : {};
	const browser = await chromium.launch({ headless });
	const context = await browser.newContext(contextOptions);
	context.__postpunkBrowser = browser;
	return context;
}

async function closeXContext(context) {
	const browser = context?.__postpunkBrowser || null;
	const prepared = context?.__postpunkChromePrepared || null;
	await context.close();
	if (browser) {
		await browser.close();
	}
	if (prepared?.cleanup) {
		await prepared.cleanup();
	}
}

async function postViaPlaywright({ text, mediaPath }) {
	const headless = boolFromEnv("X_PLAYWRIGHT_HEADLESS", true);
	const statePath =
		process.env.X_SESSION_STATE_PATH ||
		path.join(__dirname, "../../../config/x-state.json");
	const chromeProfile = resolveChromeProfileConfig();
	const context = await launchXContext({ headless, statePath });
	const page = await context.newPage();
	try {
		if (!chromeProfile.enabled) {
			await ensureXLoggedIn(page, statePath);
		} else {
			await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
			const loggedIn =
				(await page.locator('[data-testid="tweetTextarea_0"]').count()) > 0 ||
				(await page.locator('[data-testid="SideNav_NewTweet_Button"]').count()) > 0 ||
				(await page.locator('[data-testid="AppTabBar_Home_Link"]').count()) > 0;
			if (!loggedIn) {
				throw new Error(
					"X Chrome profile session not detected. Fully quit Chrome and confirm the selected profile is already signed into X.",
				);
			}
		}
		await page.goto("https://x.com/compose/post", { waitUntil: "domcontentloaded" });
		const textOk = await fillFirst(
			page,
			['[data-testid="tweetTextarea_0"]', '[role="textbox"][contenteditable="true"]'],
			text,
		);
		if (!textOk) {
			throw new Error("X Playwright compose textbox not found");
		}

		if (mediaPath && fs.existsSync(mediaPath)) {
			const fileInput = page.locator('input[type="file"]').first();
			if ((await fileInput.count()) > 0) {
				await fileInput.setInputFiles(mediaPath);
				await page.waitForTimeout(2500);
			}
		}

		const posted = await clickFirst(page, [
			'[data-testid="tweetButtonInline"]',
			'[data-testid="tweetButton"]',
			'button:has-text("Post")',
		]);
		if (!posted) {
			throw new Error("X Playwright post button not found");
		}
		await page.waitForTimeout(2500);
		if (!chromeProfile.enabled) {
			await context.storageState({ path: statePath });
		}
			return {
				status: "success",
				via: "playwright",
				url: page.url(),
				chromeProfile: chromeProfile.enabled
					? {
						userDataDir: chromeProfile.userDataDir,
						profileDirectory: chromeProfile.profileDirectory,
						clonedUserDataDir: chromeProfile.cloneEnabled
							? chromeProfile.cloneUserDataDir
							: null,
					}
				: null,
			sessionStatePath: statePath,
		};
	} finally {
		await closeXContext(context);
	}
}

async function uploadMedia({
	consumerKey,
	consumerSecret,
	token,
	tokenSecret,
	mediaPath,
	mediaType,
}) {
	try {
		const fileBuffer = await readFile(mediaPath);
		const mimeType = inferMimeType(mediaPath, mediaType);
		if (mimeType.startsWith("video/")) {
			throw new Error(
				"X video upload requires chunked upload flow (not enabled yet). Use image/gif for now.",
			);
		}

		const form = new FormData();
		form.append(
			"media",
			new Blob([fileBuffer], { type: mimeType }),
			path.basename(mediaPath),
		);

		const authorization = buildOAuthHeader({
			method: "POST",
			url: MEDIA_UPLOAD_URL,
			params: {},
			consumerKey,
			consumerSecret,
			token,
			tokenSecret,
		});

		const response = await axios.post(MEDIA_UPLOAD_URL, form, {
			headers: {
				Authorization: authorization,
				"User-Agent": "PostPunkBot",
			},
			timeout: 20000,
		});
		const mediaId = response.data?.media_id_string || null;
		if (!mediaId) {
			throw new Error(
				`X media upload returned no media_id_string: ${JSON.stringify(
					response.data || {},
				)}`,
			);
		}
		return mediaId;
	} catch (error) {
		throw new Error(formatAxiosError(error, "X media upload"));
	}
}

export default async function postToX(post, context = {}) {
	const accountCreds = context?.account?.credentials || {};
	const consumerKey =
		accountCreds.apiKey ||
		requiredEnvAny("X_API_KEY", "TWITTER_API_KEY");
	const consumerSecret =
		accountCreds.apiSecret ||
		requiredEnvAny("X_API_SECRET", "TWITTER_API_SECRET");
	const token =
		accountCreds.accessToken ||
		requiredEnvAny("X_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN");
	const tokenSecret =
		accountCreds.accessSecret ||
		requiredEnvAny("X_ACCESS_SECRET", "TWITTER_ACCESS_SECRET");

	const status = buildStatus(post);
	if (!status) {
		throw new Error("X post requires text content");
	}

	const mediaPath = resolveLocalMediaPath(post?.mediaPath);
	let mediaId = null;
	if (mediaPath) {
		mediaId = await uploadMedia({
			consumerKey,
			consumerSecret,
			token,
			tokenSecret,
			mediaPath,
			mediaType: post?.mediaType || null,
		});
	}

	const bodyPayload = mediaId
		? {
				text: status,
				media: { media_ids: [mediaId] },
			}
		: { text: status };
	const maxAttemptsPerEndpoint = 3;
	const attemptErrors = [];
	const attemptStatuses = [];

	for (const createTweetUrl of CREATE_TWEET_URLS) {
		const authorization = buildOAuthHeader({
			method: "POST",
			url: createTweetUrl,
			params: {},
			consumerKey,
			consumerSecret,
			token,
			tokenSecret,
		});

		for (let attempt = 1; attempt <= maxAttemptsPerEndpoint; attempt += 1) {
			try {
				const response = await axios.post(createTweetUrl, bodyPayload, {
					headers: {
						Authorization: authorization,
						"Content-Type": "application/json",
						"User-Agent": "PostPunkBot",
					},
					timeout: 10000,
				});

				return {
					status: "success",
					id: response.data?.data?.id,
					text: response.data?.data?.text,
					mediaId,
					raw: response.data,
					endpoint: createTweetUrl,
					attempt,
				};
			} catch (error) {
				const status = error?.response?.status ?? null;
				attemptStatuses.push(status);
				const formatted = formatAxiosError(
					error,
					`X create tweet @ ${createTweetUrl}`,
				);
				attemptErrors.push(formatted);
				if (!isRetryableStatus(status) || attempt === maxAttemptsPerEndpoint) {
					break;
				}
				await sleep(attempt * 1500);
			}
		}
	}

	const allowPlaywrightFallback = boolFromEnv("X_PLAYWRIGHT_FALLBACK", true);
	const shouldFallback =
		allowPlaywrightFallback &&
		attemptStatuses.length > 0 &&
		attemptStatuses.every((status) => typeof status === "number" && status >= 500);
	if (shouldFallback) {
		try {
			return await postViaPlaywright({ text: status, mediaPath });
		} catch (fallbackError) {
			attemptErrors.push(
				`X Playwright fallback failed: ${fallbackError?.message || fallbackError}`,
			);
		}
	}

	throw new Error(attemptErrors.join(" | "));
}
