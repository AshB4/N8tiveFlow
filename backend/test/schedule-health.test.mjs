import test from "node:test";
import assert from "node:assert/strict";
import { buildScheduleHealth } from "../utils/scheduleHealth.mjs";

test("buildScheduleHealth flags an empty scheduled day", () => {
	const summary = buildScheduleHealth(
		[
			{
				id: "future-post",
				status: "approved",
				scheduledAt: "2026-04-08T15:00:00.000Z",
			},
		],
		{
			nowMs: new Date("2026-04-07T17:00:00.000Z").getTime(),
			timezone: "America/Chicago",
			lookaheadDays: 2,
		},
	);

	assert.equal(summary.todayKey, "2026-04-07");
	assert.equal(summary.todayScheduledCount, 0);
	assert.deepEqual(summary.gapDays, ["2026-04-07"]);
	assert.equal(summary.nextScheduled, "2026-04-08T15:00:00.000Z");
});

test("buildScheduleHealth ignores drafts and counts approved posts today", () => {
	const summary = buildScheduleHealth(
		[
			{
				id: "draft-post",
				status: "draft",
				scheduledAt: "2026-04-07T15:00:00.000Z",
			},
			{
				id: "approved-post",
				status: "approved",
				scheduledAt: "2026-04-07T16:00:00.000Z",
			},
		],
		{
			nowMs: new Date("2026-04-07T12:00:00.000Z").getTime(),
			timezone: "America/Chicago",
			lookaheadDays: 1,
		},
	);

	assert.equal(summary.todayScheduledCount, 1);
	assert.deepEqual(summary.gapDays, []);
});
