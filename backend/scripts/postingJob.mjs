/** @format */

import "dotenv/config";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { postToAllPlatforms } from "./platforms/post-to-all.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_DIR = path.join(__dirname, "../queue");
const FILE_QUEUE = path.join(QUEUE_DIR, "postQueue.json");
const FILE_POSTED = path.join(QUEUE_DIR, "postedLog.json");
const FILE_REJECTED = path.join(QUEUE_DIR, "rejections.json");

const SUPPORTED_PLATFORMS = new Set([
	"x",
	"facebook",
	"linkedin",
	"pinterest",
	"reddit",
	"tumblr",
	"onlyfans",
	"kofi",
	"discord",
	"devto",
	"hashnode",
	"producthunt",
	"amazon",
]);

const PLATFORM_ALIASES = {
	twitter: "x",
	x: "x",
	linkedin: "linkedin",
	facebook: "facebook",
	pinterest: "pinterest",
	reddit: "reddit",
	tumblr: "tumblr",
	onlyfans: "onlyfans",
	kofi: "kofi",
	discord: "discord",
	devto: "devto",
	"dev.to": "devto",
	hashnode: "hashnode",
	producthunt: "producthunt",
	amazon: "amazon",
};

async function ensureQueueFiles() {
	await mkdir(QUEUE_DIR, { recursive: true });
	const ensure = async (file, fallback) => {
		try {
			await access(file, fs.constants.F_OK);
		} catch {
			await writeJson(file, fallback);
		}
	};
	await ensure(FILE_QUEUE, []);
	await ensure(FILE_POSTED, []);
	await ensure(FILE_REJECTED, []);
}

async function readJson(file, fallback) {
	try {
		const raw = await readFile(file, "utf-8");
		return JSON.parse(raw);
	} catch (error) {
		console.warn(`Unable to read ${path.basename(file)} – using fallback.`, error);
		return fallback;
	}
}

async function writeJson(file, value) {
	await writeFile(file, JSON.stringify(value, null, 2));
}

function toDate(value) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePlatforms(post) {
	const rawPlatforms = Array.isArray(post.platforms)
		? post.platforms
		: post.platform
		? [post.platform]
		: [];
	const unique = new Set();
	for (const entry of rawPlatforms) {
		if (!entry) continue;
		const key = String(entry).trim().toLowerCase();
		const normalized = PLATFORM_ALIASES[key] || key;
		if (SUPPORTED_PLATFORMS.has(normalized)) {
			unique.add(normalized);
		}
	}
	return Array.from(unique);
}

function buildPostPayload(post) {
	return {
		title: post.title ?? "",
		body: post.body ?? post.content ?? "",
		image: post.image ?? post.media ?? null,
		hashtags: post.hashtags ?? post.tags ?? [],
		platformOverrides: post.platformOverrides ?? {},
		metadata: post.metadata ?? {},
	};
}

async function processQueue() {
	await ensureQueueFiles();
	const [queue, postedLog, rejectedLog] = await Promise.all([
		readJson(FILE_QUEUE, []),
		readJson(FILE_POSTED, []),
		readJson(FILE_REJECTED, []),
	]);

	const now = Date.now();
	const readyPosts = queue.filter((post) => {
		const status = String(post.status ?? "").toLowerCase();
		if (status !== "approved") return false;
		const when = toDate(post.scheduledAt ?? post.scheduled_at);
		return !when || when.getTime() <= now;
	});

	if (readyPosts.length === 0) {
		console.log("No posts ready for processing.");
		return;
	}

	console.log(`Processing ${readyPosts.length} queued post(s)...`);
	const processed = [];

	for (const post of readyPosts) {
		const platforms = normalizePlatforms(post);
		if (platforms.length === 0) {
			console.warn(
				`Skipping "${post.title ?? post.id ?? "untitled"}" – no supported platforms.`,
			);
			continue;
		}

		const payload = buildPostPayload(post);
		const timestamp = new Date().toISOString();

		try {
			const results = await postToAllPlatforms(payload, platforms);
			const successes = results.filter((r) => r.status === "success");
			const failures = results.filter((r) => r.status !== "success");

			if (successes.length > 0) {
				postedLog.push({
					id: post.id ?? null,
					title: post.title ?? null,
					platforms,
					results,
					processedAt: timestamp,
				});
				console.log(
					`Posted "${post.title ?? post.id ?? "untitled"}" to ${successes.length} platform(s).`,
				);
			}

			if (failures.length > 0) {
				rejectedLog.push({
					id: post.id ?? null,
					title: post.title ?? null,
					platforms: failures.map((f) => f.platform),
					results: failures,
					processedAt: timestamp,
				});
				console.warn(
					`Post "${post.title ?? post.id ?? "untitled"}" had ${failures.length} failure(s).`,
				);
			}

			processed.push(post);
		} catch (error) {
			rejectedLog.push({
				id: post.id ?? null,
				title: post.title ?? null,
				error: error?.message ?? "Unknown worker error",
				platforms,
				processedAt: timestamp,
			});
			console.error(
				`Failed to process "${post.title ?? post.id ?? "untitled"}":`,
				error,
			);
			processed.push(post);
		}
	}

	const remainingQueue = queue.filter((post) => !processed.includes(post));

	await Promise.all([
		writeJson(FILE_QUEUE, remainingQueue),
		writeJson(FILE_POSTED, postedLog),
		writeJson(FILE_REJECTED, rejectedLog),
	]);

	console.log(
		`Worker finished: ${processed.length} processed, ${remainingQueue.length} remaining.`,
	);
}

processQueue().catch((error) => {
	console.error("Worker crashed:", error);
	process.exitCode = 1;
});
