/** @format */

import { getAccounts } from "../../utils/accountStore.mjs";
import { runPlatformHealthChecks } from "../../utils/platformHealth.mjs";

const LIVE_MODE = process.argv.includes("--live");
const JSON_MODE = process.argv.includes("--json");

async function main() {
	const accounts = await getAccounts();
	if (!Array.isArray(accounts) || accounts.length === 0) {
		console.error("No accounts found in configuration.");
		process.exitCode = 1;
		return;
	}

	const health = await runPlatformHealthChecks(accounts, { live: LIVE_MODE });
	let failures = 0;
	let warnings = 0;

	for (const item of health.results) {
		const accountLabel = `${item.platform}:${item.accountId || "unknown"}`;
		if (item.status === "healthy") {
			console.log(`OK   ${accountLabel}${item.detail ? ` (${item.detail})` : ""}`);
			continue;
		}
		if (item.status === "warning") {
			warnings += 1;
			console.log(`WARN ${accountLabel} ${item.detail}`);
			continue;
		}
		failures += 1;
		console.log(`FAIL ${accountLabel} ${item.summary.toLowerCase()} (${item.detail})`);
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
			report.push({
				account: "creators",
				status: "fail",
				detail: `missing required env [${missing.join(", ")}]`,
			});
		} else {
			console.log("OK   creators: required env present");
			report.push({
				account: "creators",
				status: "ok",
				detail: "required env present",
			});
		}
	}
	console.log(
		`\nToken Health Summary${LIVE_MODE ? " [live]" : ""}: ${accounts.length} account(s), ${failures} failure(s), ${warnings} warning(s).`,
	);
	if (JSON_MODE) {
		console.log(
			JSON.stringify(
				{
					...health,
					accounts: accounts.length,
					failures,
					warnings,
				},
				null,
				2,
			),
		);
	}
	if (failures > 0) {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error("Token health checker crashed:", error);
	process.exitCode = 1;
});
