/** @format */

import { sendPostPunkTelegramAlert } from "../../utils/telegramAlerts.mjs";
import { initLocalDb, readStoreSnapshot } from "../../utils/localDb.mjs";
import {
	buildScheduleHealth,
	getScheduleTimezone,
} from "../../utils/scheduleHealth.mjs";

const toDate = (value) => {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

function buildSummary({ queue, posted, rejected }) {
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const posted24 = posted.filter((row) => {
		const date = toDate(row?.processedAt);
		return date && date >= since;
	});
	const failed24 = rejected.filter((row) => {
		const date = toDate(row?.processedAt);
		return date && date >= since;
	});
	const approvedQueued = queue.filter(
		(row) => String(row?.status || "").toLowerCase() === "approved",
	).length;

	return {
		since,
		posted24Count: posted24.length,
		failed24Count: failed24.length,
		queueCount: queue.length,
		approvedQueued,
		scheduleHealth: buildScheduleHealth(queue, {
			timezone: getScheduleTimezone(),
		}),
		nextScheduled: queue
			.map((row) => toDate(row?.scheduledAt ?? row?.scheduled_at))
			.filter(Boolean)
			.sort((a, b) => a - b)[0],
	};
}

async function main() {
	const shouldSend = process.argv.includes("--send");
	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	const queue = Array.isArray(snapshot?.posts) ? snapshot.posts : [];
	const posted = Array.isArray(snapshot?.postedLog) ? snapshot.postedLog : [];
	const rejected = Array.isArray(snapshot?.rejections) ? snapshot.rejections : [];
	const summary = buildSummary({
		queue,
		posted,
		rejected,
	});

	const message = [
		"Daily Summary (last 24h)",
		`Posted: ${summary.posted24Count}`,
		`Failed: ${summary.failed24Count}`,
		`Queue total: ${summary.queueCount}`,
		`Approved queued: ${summary.approvedQueued}`,
		`Scheduled today (${summary.scheduleHealth.timezone}): ${summary.scheduleHealth.todayScheduledCount}`,
		`Gap days: ${summary.scheduleHealth.gapDays.join(", ") || "none"}`,
		`Next scheduled: ${summary.nextScheduled ? summary.nextScheduled.toISOString() : "none"}`,
	].join("\n");

	console.log(message);
	if (shouldSend) {
		const result = await sendPostPunkTelegramAlert(message);
		if (!result?.ok && !result?.skipped) {
			console.warn("Daily summary Telegram send failed:", result);
			process.exitCode = 1;
		}
	}
}

main().catch((error) => {
	console.error("Daily summary failed:", error?.message || error);
	process.exitCode = 1;
});
