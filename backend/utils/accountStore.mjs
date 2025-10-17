/** @format */

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ACCOUNTS_PATH = path.join(__dirname, "../config/accounts.json");

let cachedAccounts = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadAccountsFromDisk() {
	try {
		const raw = await readFile(ACCOUNTS_PATH, "utf-8");
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			throw new Error("accounts.json must be an array");
		}
		return parsed;
	} catch (error) {
		console.error("Failed to load accounts configuration", error);
		return [];
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
