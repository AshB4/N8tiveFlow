/** @format */

import { getAccounts } from "../../utils/accountStore.mjs";

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
		`\nToken Health Summary: ${accounts.length} account(s), ${failures} failure(s), ${warnings} warning(s).`,
	);
	if (failures > 0) {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error("Token health checker crashed:", error);
	process.exitCode = 1;
});
