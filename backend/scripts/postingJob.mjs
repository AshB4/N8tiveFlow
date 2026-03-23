/** @format */

import "dotenv/config";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeTargets, postToAllPlatforms } from "./platforms/post-to-all.js";
import { sendPostPunkTelegramAlert } from "../utils/telegramAlerts.mjs";
import { isApprovedStatus } from "../utils/postStatus.mjs";
import { buildArchiveEntry } from "../utils/archiveEntry.mjs";
import { initLocalDb, readStoreSnapshot, replaceStoreSnapshot } from "../utils/localDb.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_ATTEMPTS = Number(process.env.POSTPUNK_MAX_ATTEMPTS || 2);
const RETRY_DELAY_MINUTES = Number(process.env.POSTPUNK_RETRY_DELAY_MINUTES || 30);

const SUPPORTED_PLATFORMS = new Set([
	"x",
	"facebook",
	"linkedin",
	"pinterest",
	"reddit",
	"tumblr",
	"kofi",
	"discord",
	"devto",
	"hashnode",
	"producthunt",
	"amazon",
	"threads",
	"instagram",
]);

const PLATFORM_ALIASES = {
	twitter: "x",
	x: "x",
	linkedin: "linkedin",
	facebook: "facebook",
	pinterest: "pinterest",
	reddit: "reddit",
	tumblr: "tumblr",
	kofi: "kofi",
	discord: "discord",
	devto: "devto",
	"dev.to": "devto",
	hashnode: "hashnode",
	producthunt: "producthunt",
	amazon: "amazon",
	threads: "threads",
	instagram: "instagram",
	ig: "instagram",
};

function toDate(value) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function scheduleRetry(post) {
	const current = Number(post?.attemptCount || 0);
	const nextAttemptCount = current + 1;
	const nextAttemptAt = new Date(
		Date.now() + RETRY_DELAY_MINUTES * 60 * 1000,
	).toISOString();
	return {
		...post,
		attemptCount: nextAttemptCount,
		nextAttemptAt,
		lastErrorAt: new Date().toISOString(),
	};
}

function markFailed(post) {
	return {
		...post,
		status: "failed",
		nextAttemptAt: null,
		lastErrorAt: new Date().toISOString(),
	};
}

function isRetryNowAttempt(post) {
	return Boolean(post?.metadata?.retryNowAttempt);
}

function clearRetryNowAttempt(post) {
	const metadata = { ...(post?.metadata || {}) };
	delete metadata.retryNowAttempt;
	return {
		...post,
		metadata,
	};
}

function buildFailureTargets(failures = []) {
	return failures
		.map((failure) => ({
			platform: failure.platform,
			accountId: failure.accountId ?? null,
		}))
		.filter((target) => target.platform);
}

function buildFailureRetryPost(post, failures = []) {
	const failedTargets = buildFailureTargets(failures);
	return {
		...post,
		targets: failedTargets,
		platforms: Array.from(new Set(failedTargets.map((target) => target.platform))),
		metadata: {
			...(post.metadata || {}),
			partialFailure: true,
			lastFailedTargets: failedTargets,
		},
	};
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
		mediaPath: post.mediaPath ?? null,
		mediaType: post.mediaType ?? null,
		hashtags: post.hashtags ?? post.tags ?? [],
		platformOverrides: post.platformOverrides ?? {},
		metadata: post.metadata ?? {},
	};
}

export async function processQueue() {
	await initLocalDb();
	const { posts: queue, postedLog, rejections: rejectedLog } = await readStoreSnapshot();

	const now = Date.now();
	const readyPosts = queue.filter((post) => {
		if (!isApprovedStatus(post.status)) return false;
		if (Number(post.attemptCount || 0) >= MAX_ATTEMPTS) return false;
		const when = toDate(post.scheduledAt ?? post.scheduled_at);
		const retryAt = toDate(post.nextAttemptAt);
		const scheduleReady = !when || when.getTime() <= now;
		const retryReady = !retryAt || retryAt.getTime() <= now;
		return scheduleReady && retryReady;
	});

	if (readyPosts.length === 0) {
		console.log("No posts ready for processing.");
		return;
	}

	console.log(`Processing ${readyPosts.length} queued post(s)...`);
	const processedIds = new Set();
	const queueUpdates = new Map();

	for (const post of readyPosts) {
		const retryNowAttempt = isRetryNowAttempt(post);
		const fallbackPlatforms = normalizePlatforms(post);
		const targets = normalizeTargets(
			Array.isArray(post.targets) && post.targets.length ? post.targets : fallbackPlatforms,
		);
		if (targets.length === 0) {
			console.warn(
				`Skipping "${post.title ?? post.id ?? "untitled"}" – no supported platforms.`,
			);
			queueUpdates.set(post.id, scheduleRetry(post));
			continue;
		}
		const platforms = Array.from(
			new Set(targets.map((target) => target.platform)),
		);

		const payload = buildPostPayload(post);
		const timestamp = new Date().toISOString();

		try {
			const results = await postToAllPlatforms(payload, targets);
			const successes = results.filter((r) => r.status === "success");
			const failures = results.filter((r) => r.status !== "success");

			if (successes.length > 0) {
				postedLog.push(
					buildArchiveEntry(post, {
						targets,
						results,
						processedAt: timestamp,
					}),
				);
				console.log(
					`Posted "${post.title ?? post.id ?? "untitled"}" to ${successes.length} platform(s).`,
				);
				const successSummary = successes
					.map((success) =>
						success.accountId
							? `${success.platform} (${success.accountId})`
							: success.platform,
					)
					.join(", ");
				await sendPostPunkTelegramAlert(
					`Post succeeded.\nTitle: ${post.title ?? post.id ?? "untitled"}\nPlatforms: ${successSummary}`,
				);
			}

			if (failures.length > 0) {
				rejectedLog.push({
					id: post.id ?? null,
					title: post.title ?? null,
					targets: failures.map((f) => ({
						platform: f.platform,
						accountId: f.accountId ?? null,
					})),
					results: failures,
					processedAt: timestamp,
				});
				console.warn(
					`Post "${post.title ?? post.id ?? "untitled"}" had ${failures.length} failure(s).`,
				);
				const summary = failures
					.map((failure) => {
						const targetLabel = failure.accountId
							? `${failure.platform} (${failure.accountId})`
							: failure.platform;
						return `- ${targetLabel}: ${failure.error || failure.reason || "Unknown error"}`;
					})
					.join("\n");
				await sendPostPunkTelegramAlert(
					`Post failed on one or more targets.\nTitle: ${post.title ?? post.id ?? "untitled"}\nFailures:\n${summary}\n\nRerun command: cd backend && npm run worker`,
				);
				const retryBase =
					successes.length > 0
						? buildFailureRetryPost(post, failures)
						: post;
				if (retryNowAttempt) {
					queueUpdates.set(
						post.id,
						markFailed(clearRetryNowAttempt(retryBase)),
					);
				} else {
					const retried = scheduleRetry(retryBase);
					if (Number(retried.attemptCount || 0) >= MAX_ATTEMPTS) {
						queueUpdates.set(post.id, markFailed(retried));
					} else {
						queueUpdates.set(post.id, retried);
					}
				}
			} else if (successes.length > 0) {
				processedIds.add(post.id);
			}
		} catch (error) {
			rejectedLog.push({
				id: post.id ?? null,
				title: post.title ?? null,
				error: error?.message ?? "Unknown worker error",
				targets,
				processedAt: timestamp,
			});
			console.error(
				`Failed to process "${post.title ?? post.id ?? "untitled"}":`,
				error,
			);
			await sendPostPunkTelegramAlert(
				`Worker failed processing post.\nTitle: ${post.title ?? post.id ?? "untitled"}\nError: ${error?.message || "Unknown worker error"}\n\nRerun command: cd backend && npm run worker`,
			);
			if (retryNowAttempt) {
				queueUpdates.set(post.id, markFailed(clearRetryNowAttempt(post)));
			} else {
				const retried = scheduleRetry(post);
				if (Number(retried.attemptCount || 0) >= MAX_ATTEMPTS) {
					queueUpdates.set(post.id, markFailed(retried));
				} else {
					queueUpdates.set(post.id, retried);
				}
			}
		}
	}

	const remainingQueue = queue
		.filter((post) => !processedIds.has(post.id))
		.map((post) => queueUpdates.get(post.id) || post);

	await replaceStoreSnapshot({
		posts: remainingQueue,
		postedLog,
		rejections: rejectedLog,
	});

	console.log(
		`Worker finished: ${processedIds.size} processed, ${remainingQueue.length} remaining.`,
	);
}

const entryScript = process.argv[1]
	? path.resolve(process.argv[1])
	: null;
const isDirectRun = entryScript === __filename;

if (isDirectRun) {
	processQueue().catch((error) => {
		console.error("Worker crashed:", error);
		sendPostPunkTelegramAlert(
			`Worker crashed before completion.\nError: ${error?.message || "Unknown crash error"}\n\nRerun command: cd backend && npm run worker`,
		).catch(() => {});
		process.exitCode = 1;
	});
}
