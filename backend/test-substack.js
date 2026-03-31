/** @format */

import postToSubstack from "./scripts/platforms/social/post-to-substack.js";
import { getAccount } from "./utils/accountStore.mjs";

function isLaunchBlocked(error) {
	const text = String(error?.message || error || "");
	return (
		/launchPersistentContext/i.test(text) ||
		/Target page, context or browser has been closed/i.test(text) ||
		/Operation not permitted/i.test(text) ||
		/Permission denied/i.test(text)
	);
}

async function testSubstack() {
	const account = await getAccount("substack", "substack-main").catch(() => null);
	if (!account) {
		console.log("Substack test skipped: account configuration not found");
		return;
	}

	try {
		const result = await postToSubstack(
			{
				title: "PostPunk Substack test",
				body: "This is a direct PostPunk Substack browser test.",
				saveAsDraft: true,
			},
			{
				account: {
					...account,
					metadata: {
						...(account?.metadata || {}),
						browserOnly: true,
						browserFirst: true,
					},
				},
			},
		);

		console.log(JSON.stringify(result, null, 2));
	} catch (error) {
		if (isLaunchBlocked(error)) {
			console.log("Substack test skipped: browser launch blocked in this environment");
			return;
		}
		console.error("Substack test failed:", error?.message || String(error));
		process.exitCode = 1;
	}
}

await testSubstack();
