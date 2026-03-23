/** @format */

import postToSubstack from "./scripts/platforms/social/post-to-substack.js";
import { getAccount } from "./utils/accountStore.mjs";

const account = await getAccount("substack", "substack-main");

if (!account) {
	throw new Error("Substack account configuration not found");
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
	process.exit(0);
} catch (error) {
	console.error(error);
	console.log("Substack browser left open for manual login. Press Ctrl+C when done.");
	await new Promise(() => {});
}
