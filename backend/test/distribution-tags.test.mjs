import test from "node:test";
import assert from "node:assert/strict";
import {
	distributionTagsToTargets,
	normalizeTagList,
} from "../utils/distributionTags.mjs";

test("normalizeTagList splits and deduplicates tag text", () => {
	assert.deepEqual(normalizeTagList("goblin, burnout\nburnout"), [
		"goblin",
		"burnout",
	]);
});

test("distributionTagsToTargets extracts post routing tags", () => {
	assert.deepEqual(
		distributionTagsToTargets(["goblin", "post:facebook", "post:pinterest"]),
		[
			{ platform: "facebook", accountId: null },
			{ platform: "pinterest", accountId: null },
		],
	);
});
