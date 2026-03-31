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
const WORKSPACE_ROOT = path.join(__dirname, "..", "..");
const BACKEND_ROOT = path.join(__dirname, "..");
const PRODUCT_MEDIA_POOL_PATH = path.join(
	BACKEND_ROOT,
	"config",
	"product-media-pools.json",
);

const MAX_ATTEMPTS = Number(process.env.POSTPUNK_MAX_ATTEMPTS || 2);
const RETRY_DELAY_MINUTES = Number(process.env.POSTPUNK_RETRY_DELAY_MINUTES || 30);

const SUPPORTED_PLATFORMS = new Set([
	"x",
	"facebook",
	"linkedin",
	"pinterest",
	"substack",
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
	substack: "substack",
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

async function sendWorkerAlert(message) {
	const result = await sendPostPunkTelegramAlert(message);
	if (result?.ok || result?.skipped) return result;
	console.warn("[telegram] alert send failed", result);
	return result;
}

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

function hasPinterestTarget(post) {
	const targets = normalizeTargets(
		Array.isArray(post?.targets) && post.targets.length
			? post.targets
			: Array.isArray(post?.platforms)
				? post.platforms
				: post?.platform
					? [post.platform]
					: [],
	);
	return targets.some((target) => target.platform === "pinterest");
}

function productIdFor(post) {
	return (
		post?.metadata?.productProfileId ||
		post?.productProfileId ||
		null
	);
}

function splitMediaValues(value) {
	if (Array.isArray(value)) {
		return value.flatMap((item) => splitMediaValues(item));
	}
	const raw = String(value || "").trim();
	if (!raw) return [];
	return raw
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function resolveMediaPathForExistence(mediaPath) {
	const value = String(mediaPath || "").trim();
	if (!value) return null;
	if (/^https?:\/\//i.test(value)) return value;
	if (path.isAbsolute(value)) return value;
	if (value.startsWith("/media/")) {
		return path.join(BACKEND_ROOT, value.slice(1));
	}
	if (value.startsWith("media/")) {
		return path.join(BACKEND_ROOT, value);
	}
	return path.join(WORKSPACE_ROOT, value);
}

function mediaPathUsable(mediaPath) {
	const value = String(mediaPath || "").trim();
	if (!value) return false;
	if (/^https?:\/\//i.test(value)) return true;
	const resolved = resolveMediaPathForExistence(value);
	return Boolean(resolved && fs.existsSync(resolved));
}

async function loadProductMediaPools() {
	try {
		const raw = await readFile(PRODUCT_MEDIA_POOL_PATH, "utf-8");
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

function collectMediaCandidates(post, productId, mediaPools) {
	const productPool = Array.isArray(mediaPools?.[productId]) ? mediaPools[productId] : [];
	const defaultPool = Array.isArray(mediaPools?._default) ? mediaPools._default : [];
	const metadataPool = [
		...splitMediaValues(post?.metadata?.imagePool || []),
		...splitMediaValues(post?.metadata?.pinterestImagePool || []),
		...splitMediaValues(post?.metadata?.mediaPool || []),
	];
	const lockedPool = Array.from(new Set([...metadataPool, ...productPool]))
		.map((value) => String(value || "").trim())
		.filter(Boolean);
	const seeded = (lockedPool.length
		? lockedPool
		: [
			post?.mediaPath || "",
			post?.image || "",
			...defaultPool,
		])
		.map((value) => String(value || "").trim())
		.filter(Boolean);
	return Array.from(new Set(seeded)).filter((value) => mediaPathUsable(value));
}

function pickRotatedMedia(candidates, usageCounts, lastMedia) {
	if (!candidates.length) return null;
	const order = new Map(candidates.map((candidate, index) => [candidate, index]));
	const sorted = [...candidates].sort((a, b) => {
		const countA = usageCounts.get(a) || 0;
		const countB = usageCounts.get(b) || 0;
		if (countA !== countB) return countA - countB;
		const orderA = order.get(a) ?? Number.MAX_SAFE_INTEGER;
		const orderB = order.get(b) ?? Number.MAX_SAFE_INTEGER;
		if (orderA !== orderB) return orderA - orderB;
		return a.localeCompare(b);
	});
	const nonRepeating = sorted.find((candidate) => candidate !== lastMedia);
	return nonRepeating || sorted[0] || null;
}

function getPostTimestamp(post) {
	const when = toDate(post?.scheduledAt ?? post?.scheduled_at);
	return when ? when.getTime() : Number.MAX_SAFE_INTEGER;
}

function isPinterestArchiveEntry(entry) {
	if (Array.isArray(entry?.targets) && entry.targets.length > 0) {
		return entry.targets.some(
			(target) => String(target?.platform || "").toLowerCase() === "pinterest",
		);
	}
	if (Array.isArray(entry?.results) && entry.results.length > 0) {
		return entry.results.some(
			(result) => String(result?.platform || "").toLowerCase() === "pinterest",
		);
	}
	const platforms = Array.isArray(entry?.platforms) ? entry.platforms : [];
	return platforms.map((item) => String(item || "").toLowerCase()).includes("pinterest");
}

function rebalancePinterestMedia(queue, postedLog, mediaPools) {
	const grouped = new Map();
	const usage = new Map();
	const lastUsed = new Map();

	for (const entry of postedLog || []) {
		if (!isPinterestArchiveEntry(entry)) continue;
		const productId = productIdFor(entry);
		const mediaPath = String(entry?.mediaPath || "").trim();
		if (!productId || !mediaPath) continue;
		const key = `${productId}::${mediaPath}`;
		usage.set(key, (usage.get(key) || 0) + 1);
		lastUsed.set(productId, mediaPath);
	}

	const updatedQueue = (queue || []).map((post) => ({ ...post }));
	for (let index = 0; index < updatedQueue.length; index += 1) {
		const post = updatedQueue[index];
		if (!hasPinterestTarget(post)) continue;
		const productId = productIdFor(post);
		if (!productId) continue;
		if (!grouped.has(productId)) grouped.set(productId, []);
		grouped.get(productId).push(post);
	}

	let changedCount = 0;
	for (const [productId, posts] of grouped.entries()) {
		posts.sort((a, b) => getPostTimestamp(a) - getPostTimestamp(b));
		const productUsageCounts = new Map();
		let productLastMedia = lastUsed.get(productId) || null;
		for (const [key, count] of usage.entries()) {
			if (!key.startsWith(`${productId}::`)) continue;
			productUsageCounts.set(key.split("::")[1], count);
		}

		for (const post of posts) {
			const candidates = collectMediaCandidates(post, productId, mediaPools);
			if (!candidates.length) continue;
			const selected = pickRotatedMedia(
				candidates,
				productUsageCounts,
				productLastMedia,
			);
			if (!selected) continue;
			if (post.mediaPath !== selected) {
				post.mediaPath = selected;
				post.mediaType = "image";
				post.updatedAt = new Date().toISOString();
				changedCount += 1;
			}
			productUsageCounts.set(selected, (productUsageCounts.get(selected) || 0) + 1);
			productLastMedia = selected;
		}
	}

	return {
		posts: updatedQueue,
		changedCount,
	};
}

export async function rebalanceQueueMediaOnly() {
	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	const mediaPools = await loadProductMediaPools();
	const rebalanceResult = rebalancePinterestMedia(
		snapshot.posts,
		snapshot.postedLog,
		mediaPools,
	);
	if (rebalanceResult.changedCount > 0) {
		await replaceStoreSnapshot({
			posts: rebalanceResult.posts,
			postedLog: snapshot.postedLog,
			rejections: snapshot.rejections,
		});
	}
	return rebalanceResult.changedCount;
}

export async function processQueue() {
	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	let queue = snapshot.posts;
	const postedLog = snapshot.postedLog;
	const rejectedLog = snapshot.rejections;
	const mediaPools = await loadProductMediaPools();
	const rebalanceResult = rebalancePinterestMedia(queue, postedLog, mediaPools);
	queue = rebalanceResult.posts;

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
		if (rebalanceResult.changedCount > 0) {
			await replaceStoreSnapshot({
				posts: queue,
				postedLog,
				rejections: rejectedLog,
			});
			console.log(
				`No posts ready for processing. Rebalanced Pinterest media on ${rebalanceResult.changedCount} queued post(s).`,
			);
			return;
		}
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
			const skipped = results.filter((r) => r.status === "skipped");
			const failures = results.filter((r) => r.status === "error");

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
				await sendWorkerAlert(
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
				await sendWorkerAlert(
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
			} else if (successes.length > 0 || skipped.length > 0) {
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
			await sendWorkerAlert(
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
	if (process.argv.includes("--rebalance-only")) {
		rebalanceQueueMediaOnly()
			.then((count) => {
				console.log(`Rebalanced Pinterest media on ${count} queued post(s).`);
			})
			.catch((error) => {
				console.error("Media rebalance failed:", error);
				process.exitCode = 1;
			});
	} else {
		processQueue().catch((error) => {
			console.error("Worker crashed:", error);
			sendWorkerAlert(
				`Worker crashed before completion.\nError: ${error?.message || "Unknown crash error"}\n\nRerun command: cd backend && npm run worker`,
			).catch(() => {});
			process.exitCode = 1;
		});
	}
}
