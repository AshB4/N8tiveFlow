/** @format */

import axios from "axios";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const CREATORS_BASE_URL = "https://creatorsapi.amazon";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../../data/amazon");
const RATE_STATE_FILE = path.join(DATA_DIR, "creators-rate-state.json");

const TOKEN_ENDPOINTS = {
	"2.1": "https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token",
	"2.2": "https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token",
	"2.3": "https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token",
	"3.1": "https://api.amazon.com/auth/o2/token",
	"3.2": "https://api.amazon.co.uk/auth/o2/token",
	"3.3": "https://api.amazon.co.jp/auth/o2/token",
};

let tokenCache = {
	accessToken: null,
	expiresAtMs: 0,
	cacheKey: "",
};

const responseCache = new Map();
let lastRequestAtMs = 0;

const MAX_TPS = Math.max(
	1,
	Math.min(10, Number(process.env.AMAZON_CREATORS_MAX_TPS || 1)),
);
const MAX_TPD = Math.max(1, Number(process.env.AMAZON_CREATORS_MAX_TPD || 8640));
const MAX_RETRIES = Math.max(
	0,
	Math.min(5, Number(process.env.AMAZON_CREATORS_MAX_RETRIES || 3)),
);

function requiredEnv(name) {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required Amazon Creators config: ${name}`);
	return value;
}

function getConfig() {
	const credentialVersion = process.env.AMAZON_CREATORS_CREDENTIAL_VERSION || "3.1";
	const tokenEndpoint =
		process.env.AMAZON_CREATORS_TOKEN_ENDPOINT || TOKEN_ENDPOINTS[credentialVersion];
	if (!tokenEndpoint) {
		throw new Error(
			`No token endpoint available for Creators credential version ${credentialVersion}`,
		);
	}
	return {
		clientId: requiredEnv("AMAZON_CREATORS_CLIENT_ID"),
		clientSecret: requiredEnv("AMAZON_CREATORS_CLIENT_SECRET"),
		credentialVersion,
		tokenEndpoint,
		baseUrl: process.env.AMAZON_CREATORS_BASE_URL || CREATORS_BASE_URL,
	};
}

function isV3(version) {
	return String(version || "").startsWith("3.");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function todayKey() {
	return new Date().toISOString().slice(0, 10);
}

async function readRateState() {
	try {
		const raw = await readFile(RATE_STATE_FILE, "utf-8");
		return JSON.parse(raw);
	} catch {
		return { date: todayKey(), count: 0 };
	}
}

async function writeRateState(state) {
	await mkdir(DATA_DIR, { recursive: true });
	await writeFile(RATE_STATE_FILE, JSON.stringify(state, null, 2));
}

async function enforceRateLimits() {
	const intervalMs = Math.ceil(1000 / MAX_TPS);
	const now = Date.now();
	const waitMs = Math.max(0, intervalMs - (now - lastRequestAtMs));
	if (waitMs > 0) {
		await sleep(waitMs);
	}

	const state = await readRateState();
	const day = todayKey();
	const normalized = state?.date === day ? state : { date: day, count: 0 };
	if (normalized.count >= MAX_TPD) {
		throw new Error(
			`Creators daily cap reached (${normalized.count}/${MAX_TPD}). Retry tomorrow or raise cap.`,
		);
	}
	normalized.count += 1;
	await writeRateState(normalized);
	lastRequestAtMs = Date.now();
}

function stableStringify(value) {
	if (Array.isArray(value)) {
		return `[${value.map(stableStringify).join(",")}]`;
	}
	if (value && typeof value === "object") {
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function cacheTtlMs(body) {
	const resources = Array.isArray(body?.resources) ? body.resources : [];
	const includesOffers = resources.some((resource) =>
		String(resource || "").toLowerCase().startsWith("offers"),
	);
	return includesOffers ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
}

async function postWithBackoff(url, body, headers) {
	let attempt = 0;
	while (true) {
		try {
			await enforceRateLimits();
			return await axios.post(url, body, {
				timeout: 15000,
				headers,
			});
		} catch (error) {
			const status = Number(error?.response?.status || 0);
			const retryable =
				status === 429 || status >= 500 || error?.code === "ECONNABORTED";
			if (!retryable || attempt >= MAX_RETRIES) {
				throw error;
			}
			const delay = Math.min(10_000, 500 * 2 ** attempt + Math.floor(Math.random() * 250));
			await sleep(delay);
			attempt += 1;
		}
	}
}

async function fetchToken(config) {
	if (isV3(config.credentialVersion)) {
		const response = await axios.post(
			config.tokenEndpoint,
			{
				grant_type: "client_credentials",
				client_id: config.clientId,
				client_secret: config.clientSecret,
				scope: "creatorsapi::default",
			},
			{ headers: { "Content-Type": "application/json" }, timeout: 10000 },
		);
		return response.data;
	}

	const payload = new URLSearchParams({
		grant_type: "client_credentials",
		client_id: config.clientId,
		client_secret: config.clientSecret,
		scope: "creatorsapi/default",
	});
	const response = await axios.post(config.tokenEndpoint, payload.toString(), {
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		timeout: 10000,
	});
	return response.data;
}

async function getAccessToken() {
	const config = getConfig();
	const now = Date.now();
	const key = `${config.clientId}:${config.credentialVersion}:${config.tokenEndpoint}`;
	if (
		tokenCache.accessToken &&
		tokenCache.expiresAtMs > now + 60_000 &&
		tokenCache.cacheKey === key
	) {
		return { accessToken: tokenCache.accessToken, config };
	}

	const tokenData = await fetchToken(config);
	const accessToken = tokenData.access_token;
	const expiresIn = Number(tokenData.expires_in || 3600);
	if (!accessToken) {
		throw new Error("Creators token response missing access_token");
	}
	tokenCache = {
		accessToken,
		expiresAtMs: now + expiresIn * 1000,
		cacheKey: key,
	};
	return { accessToken, config };
}

function authorizationHeader(accessToken, version) {
	if (isV3(version)) return `Bearer ${accessToken}`;
	return `Bearer ${accessToken}, Version ${version}`;
}

async function postCatalog(pathname, body, marketplace) {
	const cacheKey = `${pathname}|${marketplace}|${stableStringify(body)}`;
	const cached = responseCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data;
	}

	const { accessToken, config } = await getAccessToken();
	const url = `${config.baseUrl}${pathname}`;
	const headers = {
		Authorization: authorizationHeader(accessToken, config.credentialVersion),
		"Content-Type": "application/json",
		"x-marketplace": marketplace,
	};
	const response = await postWithBackoff(url, body, headers);
	responseCache.set(cacheKey, {
		expiresAt: Date.now() + cacheTtlMs(body),
		data: response.data,
	});
	return response.data;
}

export async function creatorsGetItems({
	itemIds,
	marketplace,
	partnerTag,
	resources = [],
}) {
	if (!partnerTag) throw new Error("partnerTag is required for Creators API");
	const sanitizedIds = (Array.isArray(itemIds) ? itemIds : [])
		.map((value) => String(value || "").trim())
		.filter(Boolean)
		.slice(0, 10);
	if (sanitizedIds.length === 0) {
		throw new Error("At least one itemId is required for creatorsGetItems");
	}
	return postCatalog("/catalog/v1/getItems", {
		itemIds: sanitizedIds,
		itemIdType: "ASIN",
		marketplace,
		partnerTag,
		resources,
	}, marketplace);
}

export async function creatorsSearchItems({
	keywords,
	marketplace,
	partnerTag,
	searchIndex = "All",
	itemCount = 10,
	resources = [],
}) {
	if (!partnerTag) throw new Error("partnerTag is required for Creators API");
	return postCatalog("/catalog/v1/searchItems", {
		keywords,
		searchIndex,
		itemCount: Math.max(1, Math.min(10, Number(itemCount || 10))),
		marketplace,
		partnerTag,
		resources,
	}, marketplace);
}
