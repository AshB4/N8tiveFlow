/** @format */

import { readFile } from "fs/promises";
import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "..");
const PROJECT_ROOT = path.join(__dirname, "../..");
const ACCOUNTS_PATH = path.join(__dirname, "../config/accounts.json");
const ACCOUNTS_TEMPLATE_PATH = path.join(
	__dirname,
	"../config/accounts.template.json",
);

// Load env from both backend/.env and project-root/.env without overriding pre-set process env.
loadEnv({ path: path.join(PROJECT_ROOT, ".env"), override: false });
loadEnv({ path: path.join(BACKEND_ROOT, ".env"), override: false });

let cachedAccounts = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadAccountsFromDisk() {
	const resolveEnvToken = (value) => {
		if (typeof value !== "string") return value;
		if (value.startsWith("env:")) {
			const envName = value.slice(4).trim();
			return envName ? process.env[envName] ?? null : null;
		}
		const match = value.match(/^\$\{([A-Z0-9_]+)\}$/);
		if (match) {
			return process.env[match[1]] ?? null;
		}
		return value;
	};

	const resolveSecrets = (value) => {
		if (Array.isArray(value)) {
			return value.map(resolveSecrets);
		}
		if (value && typeof value === "object") {
			if (
				Object.keys(value).length === 1 &&
				typeof value.$env === "string"
			) {
				return process.env[value.$env] ?? null;
			}
			return Object.fromEntries(
				Object.entries(value).map(([key, nested]) => [key, resolveSecrets(nested)]),
			);
		}
		return resolveEnvToken(value);
	};

	const readAccountsFile = async (filePath) => {
		const raw = await readFile(filePath, "utf-8");
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			throw new Error(`${path.basename(filePath)} must be an array`);
		}
		return parsed.map((account) => resolveSecrets(account));
	};

	try {
		return await readAccountsFile(ACCOUNTS_PATH);
	} catch (primaryError) {
		try {
			return await readAccountsFile(ACCOUNTS_TEMPLATE_PATH);
		} catch {
			console.error("Failed to load accounts configuration", primaryError);
			return [];
		}
	}
}

async function ensureAccounts() {
	const now = Date.now();
	if (!cachedAccounts || now - cacheLoadedAt > CACHE_TTL_MS) {
		cachedAccounts = await loadAccountsFromDisk();
		cacheLoadedAt = now;
	}
	return cachedAccounts;
}

export async function getAccounts() {
	return ensureAccounts();
}

export async function getAccountsByPlatform() {
	const accounts = await ensureAccounts();
	return accounts.reduce((acc, account) => {
		if (!account?.platform) return acc;
		const key = String(account.platform).toLowerCase();
		if (!acc[key]) acc[key] = [];
		acc[key].push(account);
		return acc;
	}, {});
}

export async function getPreferredAccount(platform) {
	if (!platform) return null;
	const platformKey = String(platform).toLowerCase();
	const accounts = await ensureAccounts();
	const candidates = accounts.filter(
		(account) => String(account.platform).toLowerCase() === platformKey,
	);
	if (!candidates.length) return null;
	return (
		candidates.find((account) => account?.metadata?.default === true) ||
		candidates[0]
	);
}

export async function getAccount(platform, accountId) {
	if (!platform) return null;
	const platformKey = String(platform).toLowerCase();
	const accounts = await ensureAccounts();
	return (
		accounts.find(
			(account) =>
				String(account.platform).toLowerCase() === platformKey &&
				String(account.id) === String(accountId),
		) || null
	);
}

export async function getPublicAccounts() {
	const accounts = await ensureAccounts();
	return accounts.map((account) => ({
		platform: account.platform,
		id: account.id,
		label: account.label,
		metadata: account.metadata || {},
	}));
}

export async function reloadAccounts() {
	cachedAccounts = await loadAccountsFromDisk();
	cacheLoadedAt = Date.now();
	return cachedAccounts;
}
