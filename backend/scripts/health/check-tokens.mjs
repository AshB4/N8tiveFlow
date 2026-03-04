/** @format */

import { getAccounts } from "../../utils/accountStore.mjs";
import axios from "axios";
import crypto from "crypto";

const LIVE_MODE = process.argv.includes("--live");

const REQUIREMENTS = {
	x: {
		credentials: ["apiKey", "apiSecret", "accessToken", "accessSecret"],
		metadata: [],
	},
	facebook: {
		credentials: ["accessToken"],
		metadata: ["pageId"],
	},
	instagram: {
		credentials: ["accessToken"],
		metadata: ["accountId"],
	},
	threads: {
		credentials: ["accessToken"],
		metadata: ["accountId"],
	},
	devto: {
		credentials: ["apiKey"],
		metadata: [],
	},
};

const isMissing = (value) => {
	if (value === null || value === undefined) return true;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return true;
		if (/^(replace|todo|changeme)/i.test(trimmed)) return true;
	}
	return false;
};

function percentEncode(value) {
	return encodeURIComponent(String(value)).replace(
		/[!'()*]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
	);
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
	const signatureBaseParams = { ...oauthParams, ...params };
	const paramString = Object.keys(signatureBaseParams)
		.sort()
		.filter((key) => signatureBaseParams[key] !== undefined)
		.map((key) => `${percentEncode(key)}=${percentEncode(signatureBaseParams[key])}`)
		.join("&");
	const baseString = [
		method.toUpperCase(),
		percentEncode(url),
		percentEncode(paramString),
	].join("&");
	const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
	const signature = crypto
		.createHmac("sha1", signingKey)
		.update(baseString)
		.digest("base64");
	return (
		"OAuth " +
		Object.keys({ ...oauthParams, oauth_signature: signature })
			.sort()
			.map((key) =>
				`${percentEncode(key)}="${percentEncode(
					key === "oauth_signature" ? signature : oauthParams[key],
				)}"`,
			)
			.join(", ")
	);
}

async function validateXCredentials(account) {
	const creds = account?.credentials || {};
	const url = "https://api.twitter.com/1.1/account/verify_credentials.json";
	const auth = buildOAuthHeader({
		method: "GET",
		url,
		consumerKey: creds.apiKey,
		consumerSecret: creds.apiSecret,
		token: creds.accessToken,
		tokenSecret: creds.accessSecret,
	});
	try {
		const response = await axios.get(url, {
			headers: { Authorization: auth, "User-Agent": "PostPunkBot" },
			timeout: 10000,
		});
		return { ok: true, detail: `user @${response.data?.screen_name || "unknown"}` };
	} catch (error) {
		const apiErrors = error.response?.data?.errors;
		const reason = Array.isArray(apiErrors)
			? apiErrors.map((e) => e.message).join("; ")
			: error.response?.data?.detail ||
				error.response?.data?.error ||
				error.message;
		return { ok: false, detail: String(reason) };
	}
}

async function validateFacebookCredentials(account) {
	const token = account?.credentials?.accessToken;
	try {
		const response = await axios.get("https://graph.facebook.com/v20.0/me", {
			params: { fields: "id,name", access_token: token },
			timeout: 10000,
		});
		return {
			ok: true,
			detail: `id ${response.data?.id || "unknown"}`,
		};
	} catch (error) {
		const reason =
			error.response?.data?.error?.message ||
			error.response?.data?.error?.type ||
			error.message;
		return { ok: false, detail: String(reason) };
	}
}

async function liveValidate(platform, account) {
	if (platform === "x") return validateXCredentials(account);
	if (platform === "facebook") return validateFacebookCredentials(account);
	return { ok: true, detail: "live check not implemented for this platform" };
}

async function main() {
	const accounts = await getAccounts();
	if (!Array.isArray(accounts) || accounts.length === 0) {
		console.error("No accounts found in configuration.");
		process.exitCode = 1;
		return;
	}

	let failures = 0;
	let warnings = 0;

	for (const account of accounts) {
		const platform = String(account.platform || "").toLowerCase();
		const accountLabel = `${platform}:${account.id || "unknown"}`;
		const requirement = REQUIREMENTS[platform];
		if (!requirement) {
			console.log(`WARN ${accountLabel} has no health-check rules yet.`);
			warnings += 1;
			continue;
		}

		const missingCreds = requirement.credentials.filter((key) =>
			isMissing(account?.credentials?.[key]),
		);
		const missingMeta = requirement.metadata.filter((key) =>
			isMissing(account?.metadata?.[key]),
		);

		if (missingCreds.length === 0 && missingMeta.length === 0) {
			if (LIVE_MODE) {
				const live = await liveValidate(platform, account);
				if (live.ok) {
					console.log(`OK   ${accountLabel} (${live.detail})`);
				} else {
					failures += 1;
					console.log(`FAIL ${accountLabel} invalid token (${live.detail})`);
				}
				continue;
			}
			console.log(`OK   ${accountLabel}`);
			continue;
		}

		failures += 1;
		const parts = [];
		if (missingCreds.length) parts.push(`credentials[${missingCreds.join(", ")}]`);
		if (missingMeta.length) parts.push(`metadata[${missingMeta.join(", ")}]`);
		console.log(`FAIL ${accountLabel} missing ${parts.join(" and ")}`);
	}

	const creatorsEnabled =
		String(process.env.AMAZON_USE_CREATORS_API || "false").toLowerCase() === "true";
	if (creatorsEnabled) {
		const missing = [];
		if (!process.env.AMAZON_PARTNER_TAG) missing.push("AMAZON_PARTNER_TAG");
		if (!process.env.AMAZON_CREATORS_CLIENT_ID)
			missing.push("AMAZON_CREATORS_CLIENT_ID");
		if (!process.env.AMAZON_CREATORS_CLIENT_SECRET)
			missing.push("AMAZON_CREATORS_CLIENT_SECRET");
		if (!process.env.AMAZON_CREATORS_CREDENTIAL_VERSION)
			warnings += 1;
		if (missing.length > 0) {
			failures += 1;
			console.log(
				`FAIL creators: missing required env [${missing.join(", ")}]`,
			);
		} else {
			console.log("OK   creators: required env present");
		}
	}
	console.log(
		`\nToken Health Summary${LIVE_MODE ? " [live]" : ""}: ${accounts.length} account(s), ${failures} failure(s), ${warnings} warning(s).`,
	);
	if (failures > 0) {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error("Token health checker crashed:", error);
	process.exitCode = 1;
});
