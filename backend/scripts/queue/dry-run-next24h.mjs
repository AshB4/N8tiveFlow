/** @format */

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeTargets } from "../platforms/post-to-all.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUEUE_FILE = path.join(__dirname, "../../queue/postQueue.json");

const toDate = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

async function main() {
	const raw = await readFile(QUEUE_FILE, "utf-8");
	const queue = JSON.parse(raw);
	if (!Array.isArray(queue)) {
		throw new Error("postQueue.json must be an array");
	}

	const now = new Date();
	const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

	const due = queue
		.filter((post) => String(post.status || "").toLowerCase() === "approved")
		.map((post) => {
			const date = toDate(post.scheduledAt ?? post.scheduled_at);
			const targets = normalizeTargets(
				Array.isArray(post.targets) && post.targets.length
					? post.targets
					: post.platforms || post.platform || [],
			);
			return { post, date, targets };
		})
		.filter(({ date }) => date && date >= now && date <= horizon)
		.sort((a, b) => a.date - b.date);

	console.log(`Dry Run Window: ${now.toISOString()} -> ${horizon.toISOString()}`);
	console.log(`Approved posts due in next 24h: ${due.length}`);
	if (due.length === 0) return;

	console.table(
		due.map(({ post, date, targets }) => ({
			id: post.id || "",
			title: String(post.title || "").slice(0, 70),
			scheduledAt: date.toISOString(),
			targets: targets
				.map((t) => (t.accountId ? `${t.platform}(${t.accountId})` : t.platform))
				.join(", "),
			media: post.mediaType || (post.image ? "image" : "none"),
		})),
	);
}

main().catch((error) => {
	console.error("Dry-run failed:", error.message || error);
	process.exitCode = 1;
});

