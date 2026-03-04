/** @format */

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { sendPostPunkTelegramAlert } from "../../utils/telegramAlerts.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUEUE_FILE = path.join(__dirname, "../../queue/postQueue.json");
const POSTED_FILE = path.join(__dirname, "../../queue/postedLog.json");
const REJECTED_FILE = path.join(__dirname, "../../queue/rejections.json");

const toDate = (value) => {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

async function readJson(file, fallback) {
	try {
		const raw = await readFile(file, "utf-8");
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

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
		nextScheduled: queue
			.map((row) => toDate(row?.scheduledAt ?? row?.scheduled_at))
			.filter(Boolean)
			.sort((a, b) => a - b)[0],
	};
}

async function main() {
	const shouldSend = process.argv.includes("--send");
	const [queue, posted, rejected] = await Promise.all([
		readJson(QUEUE_FILE, []),
		readJson(POSTED_FILE, []),
		readJson(REJECTED_FILE, []),
	]);
	const summary = buildSummary({
		queue: Array.isArray(queue) ? queue : [],
		posted: Array.isArray(posted) ? posted : [],
		rejected: Array.isArray(rejected) ? rejected : [],
	});

	const message = [
		"Daily Summary (last 24h)",
		`Posted: ${summary.posted24Count}`,
		`Failed: ${summary.failed24Count}`,
		`Queue total: ${summary.queueCount}`,
		`Approved queued: ${summary.approvedQueued}`,
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

