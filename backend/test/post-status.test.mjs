import test from "node:test";
import assert from "node:assert/strict";
import { isApprovedStatus, normalizePostStatus } from "../utils/postStatus.mjs";

test("normalizePostStatus maps legacy scheduled to approved", () => {
	assert.equal(normalizePostStatus("scheduled"), "approved");
	assert.equal(normalizePostStatus("queued"), "approved");
});

test("normalizePostStatus maps published and sent to posted", () => {
	assert.equal(normalizePostStatus("published"), "posted");
	assert.equal(normalizePostStatus("sent"), "posted");
});

test("isApprovedStatus only allows ready-to-publish statuses", () => {
	assert.equal(isApprovedStatus("approved"), true);
	assert.equal(isApprovedStatus("scheduled"), true);
	assert.equal(isApprovedStatus("draft"), false);
	assert.equal(isApprovedStatus("failed"), false);
});
