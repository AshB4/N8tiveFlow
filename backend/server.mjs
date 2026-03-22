/** @format */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import fs from "fs"; // only for constants like fs.constants.F_OK
import path from "path";
import { fileURLToPath } from "url";
import { postToAllPlatforms, normalizeTargets } from "./scripts/platforms/post-to-all.js";
import { processQueue } from "./scripts/postingJob.mjs";
import { getPublicAccounts } from "./utils/accountStore.mjs";
import { getAccounts } from "./utils/accountStore.mjs";
import { findDuplicatePost } from "./utils/queueGuard.mjs";
import { generateSeoPayload, getDryRunPayload } from "./utils/seoGeneration.mjs";
import { generateCampaignPosts, getCampaignDryRunPayload } from "./utils/campaignGeneration.mjs";
import { buildAnalyticsSummary } from "./utils/analyticsSummary.mjs";
import { runPlatformHealthChecks } from "./utils/platformHealth.mjs";
import { normalizePostStatus } from "./utils/postStatus.mjs";
import { distributionTagsToTargets, normalizeTagList } from "./utils/distributionTags.mjs";
import { buildArchiveEntry } from "./utils/archiveEntry.mjs";
import {
	appendPostedLogEntry as appendPostedLogToDb,
	clearPostedPostsFromQueue,
	createPost,
	deletePost as deletePostFromDb,
	getRotationSettings,
	getLocalDbPath,
	initLocalDb,
	listPosts,
	listPostedLog,
	updateRotationSettings,
	updatePost as updatePostInDb,
} from "./utils/localDb.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "75mb" }));
const PORT = process.env.PORT || 3001;

// ---- data paths
const DIR_QUEUE = path.join(__dirname, "queue");
const DIR_MEDIA = path.join(__dirname, "media");
const DIR_MEDIA_IMAGES = path.join(DIR_MEDIA, "images");
const DIR_MEDIA_GIFS = path.join(DIR_MEDIA, "gifs");
const DIR_MEDIA_VIDEOS = path.join(DIR_MEDIA, "videos");
const DIR_MEDIA_OTHER = path.join(DIR_MEDIA, "other");
const STATS_FUNNEL = path.join(__dirname, "stats", "funnel.json");
const STATS_SUMMARY = path.join(__dirname, "stats", "summary.json");
const PINTEREST_BOARDS_PATH = path.join(__dirname, "config", "pinterest-boards.json");
let platformHealthCache = null;
let platformHealthCacheAt = 0;
const PLATFORM_HEALTH_TTL_MS = 60_000;

// ---- helpers
async function ensureFiles() {
	await mkdir(DIR_QUEUE, { recursive: true });
	await mkdir(DIR_MEDIA_IMAGES, { recursive: true });
	await mkdir(DIR_MEDIA_GIFS, { recursive: true });
	await mkdir(DIR_MEDIA_VIDEOS, { recursive: true });
	await mkdir(DIR_MEDIA_OTHER, { recursive: true });
	await initLocalDb();
}

const readJson = async (p) => JSON.parse(await readFile(p, "utf-8"));
const writeJson = async (p, data) =>
	writeFile(p, JSON.stringify(data, null, 2));

async function appendPostedLogEntry(post) {
	const postedLog = await listPostedLog();
	const existing = postedLog.find(
		(entry) => entry?.id === post?.id && entry?.manualArchived,
	);
	const alreadyLogged = Boolean(existing);
	if (alreadyLogged) return;
	await appendPostedLogToDb(
		buildArchiveEntry(post, {
			targets: Array.isArray(post.targets) ? post.targets : [],
			results: [],
			processedAt: new Date().toISOString(),
			manualArchived: true,
		}),
	);
}

function safeFileName(input) {
	const base = String(input || "upload")
		.toLowerCase()
		.replace(/\.[^.]+$/, "")
		.replace(/[^a-z0-9_-]+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 80)
		.replace(/^-|-$/g, "");
	return base || "upload";
}

function parseDataUrl(dataUrl) {
	const match = String(dataUrl || "").match(
		/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i,
	);
	if (!match) return null;
	const mimeType = match[1].toLowerCase();
	const base64 = match[2];
	return { mimeType, buffer: Buffer.from(base64, "base64") };
}

function mediaBucketFromMime(mimeType) {
	if (mimeType.startsWith("image/gif")) {
		return { dir: DIR_MEDIA_GIFS, bucket: "gifs", mediaType: "gif", ext: "gif" };
	}
	if (mimeType.startsWith("image/")) {
		const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "img";
		return { dir: DIR_MEDIA_IMAGES, bucket: "images", mediaType: "image", ext };
	}
	if (mimeType.startsWith("video/")) {
		const ext = mimeType.split("/")[1] || "mp4";
		return { dir: DIR_MEDIA_VIDEOS, bucket: "videos", mediaType: "video", ext };
	}
	return { dir: DIR_MEDIA_OTHER, bucket: "other", mediaType: "file", ext: "bin" };
}

app.use("/media", express.static(DIR_MEDIA));

// ---- API: Posts CRUD
app.get("/api/posts", async (_req, res) => {
	try {
		res.json(await listPosts());
	} catch {
		res.status(500).json({ error: "Could not load posts" });
	}
});

app.get("/api/posts/archive", async (_req, res) => {
	try {
		const archive = await listPostedLog();
		res.json(
			[...archive].sort((a, b) => {
				const left = new Date(b.processedAt || b.createdAt || 0).getTime();
				const right = new Date(a.processedAt || a.createdAt || 0).getTime();
				return left - right;
			}),
		);
	} catch (error) {
		res.status(500).json({
			error: "Could not load posted archive",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/accounts", async (_req, res) => {
	try {
		const accounts = await getPublicAccounts();
		res.json(accounts);
	} catch (error) {
		res.status(500).json({ error: "Failed to load accounts", detail: error?.message });
	}
});

app.get("/api/platform-health", async (req, res) => {
	try {
		const live = String(req.query.live || "true").toLowerCase() !== "false";
		const now = Date.now();
		if (
			live &&
			platformHealthCache &&
			now - platformHealthCacheAt < PLATFORM_HEALTH_TTL_MS
		) {
			return res.json(platformHealthCache);
		}
		const accounts = await getAccounts();
		const report = await runPlatformHealthChecks(accounts, { live });
		if (live) {
			platformHealthCache = report;
			platformHealthCacheAt = now;
		}
		return res.json(report);
	} catch (error) {
		return res.status(500).json({
			error: "Failed to load platform health",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/settings/rotation", async (_req, res) => {
	try {
		return res.json(await getRotationSettings());
	} catch (error) {
		return res.status(500).json({
			error: "Failed to load rotation settings",
			detail: error?.message || String(error),
		});
	}
});

app.put("/api/settings/rotation", async (req, res) => {
	try {
		return res.json(await updateRotationSettings(req.body ?? {}));
	} catch (error) {
		return res.status(500).json({
			error: "Failed to save rotation settings",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/pinterest-boards", async (_req, res) => {
	try {
		const config = await readJson(PINTEREST_BOARDS_PATH).catch(() => ({}));
		return res.json({
			defaultBoard: String(config?.defaultBoard || "").trim(),
			boards: Array.isArray(config?.boards)
				? config.boards.map((board) => String(board || "").trim()).filter(Boolean)
				: [],
		});
	} catch (error) {
		return res.status(500).json({
			error: "Failed to load Pinterest boards",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/analytics/summary", async (_req, res) => {
	try {
		const [events, storedSummary] = await Promise.all([
			readJson(STATS_FUNNEL).catch(() => []),
			readJson(STATS_SUMMARY).catch(() => ({})),
		]);
		res.json(buildAnalyticsSummary(events, storedSummary));
	} catch (error) {
		res.status(500).json({
			error: "Failed to load analytics summary",
			detail: error?.message,
		});
	}
});

app.post("/api/ai/seo-generate", async (req, res) => {
	try {
		const {
			productName,
			productType,
			audience,
			platformIds = [],
			productProfileId = null,
			postIntent = null,
			campaignPhase = null,
			campaignAngle = null,
			visualHook = null,
			provider,
			model,
			dryRun = false,
		} = req.body ?? {};
		if (!productName || !productType || !audience) {
			return res.status(400).json({
				error: "productName, productType, and audience are required",
			});
		}

		const input = {
			productName,
			productType,
			audience,
			platformIds,
			productProfileId,
			postIntent,
			campaignPhase,
			campaignAngle,
			visualHook,
		};
		const options = { provider, model };
		const result = dryRun
			? getDryRunPayload(input, options)
			: await generateSeoPayload(input, options);

		return res.json(result);
	} catch (error) {
		console.error("AI SEO generation failed:", error);
		return res.status(500).json({
			error: "Failed to generate SEO suggestions",
			detail: error?.message || String(error),
		});
	}
});

app.post("/api/ai/campaign-generate", async (req, res) => {
	try {
		const {
			productName,
			productType,
			audience,
			platformIds = [],
			campaignPhases = [],
			productProfileId = null,
			postIntent = null,
			maxPosts = 6,
			provider,
			model,
			dryRun = false,
		} = req.body ?? {};
		if (!productName || !productType || !audience) {
			return res.status(400).json({
				error: "productName, productType, and audience are required",
			});
		}

		const input = {
			productName,
			productType,
			audience,
			platformIds,
			campaignPhases,
			productProfileId,
			postIntent,
			maxPosts,
		};
		const options = { provider, model };
		const result = dryRun
			? getCampaignDryRunPayload(input, options)
			: await generateCampaignPosts(input, options);

		return res.json(result);
	} catch (error) {
		console.error("AI campaign generation failed:", error);
		return res.status(500).json({
			error: "Failed to generate campaign posts",
			detail: error?.message || String(error),
		});
	}
});

app.post("/api/media/upload", async (req, res) => {
	try {
		const { dataUrl, fileName = "upload" } = req.body ?? {};
		if (!dataUrl) {
			return res.status(400).json({ error: "dataUrl is required" });
		}
		const parsed = parseDataUrl(dataUrl);
		if (!parsed) {
			return res.status(400).json({ error: "Invalid dataUrl payload" });
		}
		const { mimeType, buffer } = parsed;
		if (buffer.length > 50 * 1024 * 1024) {
			return res.status(413).json({ error: "Media file too large (max 50MB)" });
		}
		const bucket = mediaBucketFromMime(mimeType);
		const stamp = Date.now();
		const slug = safeFileName(fileName);
		const file = `${stamp}_${slug}.${bucket.ext}`;
		const absolutePath = path.join(bucket.dir, file);
		await writeFile(absolutePath, buffer);
		const mediaPath = `/media/${bucket.bucket}/${file}`;
		return res.status(201).json({
			mediaPath,
			mediaUrl: mediaPath,
			mediaType: bucket.mediaType,
			mimeType,
			bytes: buffer.length,
		});
	} catch (error) {
		return res
			.status(500)
			.json({ error: "Failed to upload media", detail: error?.message });
	}
});

app.post("/api/posts", async (req, res) => {
	try {
		const {
			title,
			body,
			platforms = ["reddit"],
			scheduledAt = null,
			targets = [],
			image = null,
			mediaPath = null,
			mediaType = null,
			altText = "",
			metadata = {},
			status = "draft",
			hashtags = null,
			platformOverrides = null,
			tags = [],
		} = req.body ?? {};
		if (!title || !body)
			return res.status(400).json({ error: "title and body required" });
		const posts = await listPosts();
		const id = "p_" + Date.now();
		const distributionTargets = distributionTagsToTargets(
			metadata?.distributionTags || [],
		);
		const normalizedTargets = normalizeTargets(
			targets.length ? [...targets, ...distributionTargets] : [...platforms, ...distributionTargets],
		);
		const post = {
			id,
			title,
			body,
			image,
			mediaPath,
			mediaType,
			altText,
			platforms: normalizedTargets.map((target) => target.platform),
			targets: normalizedTargets,
			scheduledAt,
			status: normalizePostStatus(status),
			hashtags,
			platformOverrides,
			metadata: {
				...metadata,
				contentTags: normalizeTagList(metadata?.contentTags || tags),
				distributionTags: normalizeTagList(metadata?.distributionTags || []),
			},
			tags: normalizeTagList(tags),
			createdAt: new Date().toISOString(),
		};
		const duplicate = findDuplicatePost(posts, post);
		if (duplicate) {
			return res.status(409).json({
				error: "Duplicate queue entry",
				detail: `Matches existing post ${duplicate.id}`,
			});
		}
		await createPost(post);
		res.status(201).json(post);
	} catch (e) {
		res.status(500).json({ error: "Failed to create post", detail: String(e) });
	}
});

app.put("/api/posts/:id", async (req, res) => {
	try {
		const posts = await listPosts();
		const i = posts.findIndex((p) => p.id === req.params.id);
		if (i === -1) return res.status(404).json({ error: "not found" });
		const previousPost = posts[i];
		const previousStatus = normalizePostStatus(previousPost.status);
		const updates = { ...req.body };
		if ("status" in updates) {
			updates.status = normalizePostStatus(updates.status, posts[i].status || "draft");
		}
		if ("tags" in updates) {
			updates.tags = normalizeTagList(updates.tags);
		}
		if ("metadata" in updates && updates.metadata) {
			updates.metadata = {
				...posts[i].metadata,
				...updates.metadata,
				contentTags: normalizeTagList(
					updates.metadata.contentTags || updates.tags || posts[i].metadata?.contentTags || [],
				),
				distributionTags: normalizeTagList(
					updates.metadata.distributionTags || posts[i].metadata?.distributionTags || [],
				),
			};
		}
		const nextDistributionTargets = distributionTagsToTargets(
			updates.metadata?.distributionTags || posts[i].metadata?.distributionTags || [],
		);
		if (Array.isArray(updates.targets)) {
			const normalizedTargets = normalizeTargets([
				...updates.targets,
				...nextDistributionTargets,
			]);
			updates.targets = normalizedTargets;
			updates.platforms = normalizedTargets.map((target) => target.platform);
		} else if ("metadata" in updates && nextDistributionTargets.length > 0) {
			const existingTargets = Array.isArray(posts[i].targets)
				? posts[i].targets
				: posts[i].platforms || [];
			const normalizedTargets = normalizeTargets([
				...existingTargets,
				...nextDistributionTargets,
			]);
			updates.targets = normalizedTargets;
			updates.platforms = normalizedTargets.map((target) => target.platform);
		}
		posts[i] = {
			...previousPost,
			...updates,
			id: previousPost.id,
			updatedAt: new Date().toISOString(),
		};
		if (normalizePostStatus(posts[i].status) === "posted" && previousStatus !== "posted") {
			await appendPostedLogEntry(posts[i]);
		}
		const duplicate = findDuplicatePost(posts, posts[i], { excludeId: posts[i].id });
		if (duplicate) {
			return res.status(409).json({
				error: "Duplicate queue entry",
				detail: `Matches existing post ${duplicate.id}`,
			});
		}
		await updatePostInDb(posts[i].id, posts[i]);
		res.json(posts[i]);
	} catch (e) {
		res.status(500).json({ error: "Failed to update post", detail: String(e) });
	}
});

app.post("/api/posts/:id/retry-now", async (req, res) => {
	try {
		const posts = await listPosts();
		const existing = posts.find((p) => p.id === req.params.id);
		if (!existing) return res.status(404).json({ error: "not found" });

		const updatedPost = {
			...existing,
			status: "approved",
			scheduledAt: new Date().toISOString(),
			nextAttemptAt: null,
			attemptCount: 0,
			lastErrorAt: null,
			updatedAt: new Date().toISOString(),
		};

		await updatePostInDb(updatedPost.id, updatedPost);
		await processQueue();

		const refreshedPosts = await listPosts();
		const refreshedQueueItem = refreshedPosts.find((p) => p.id === req.params.id) || null;
		const archive = await listPostedLog();
		const archivedItem = archive.find((entry) => entry.id === req.params.id) || null;

		res.json({
			ok: true,
			queueItem: refreshedQueueItem,
			archivedItem,
		});
	} catch (e) {
		res.status(500).json({ error: "Failed to retry post now", detail: String(e) });
	}
});

app.delete("/api/posts", async (req, res) => {
	try {
		const scope = String(req.query.scope || "").toLowerCase();
		if (scope !== "posted") {
			return res.status(400).json({ error: "Unsupported bulk delete scope" });
		}
		const removedCount = await clearPostedPostsFromQueue();
		return res.json({ removedCount });
	} catch (e) {
		res.status(500).json({ error: "Failed to clear posted posts", detail: String(e) });
	}
});

app.delete("/api/posts/:id", async (req, res) => {
	try {
		const removed = await deletePostFromDb(req.params.id);
		if (!removed) return res.status(404).json({ error: "not found" });
		res.json(removed);
	} catch (e) {
		res.status(500).json({ error: "Failed to delete post", detail: String(e) });
	}
});

// ---- API: Post to all platforms (keeps your route)
app.post("/api/post-to-all", async (req, res) => {
	const { post, platforms = [], targets = [] } = req.body || {};
	if (!post) {
		return res.status(400).json({
			error: "Payload must include post object",
		});
	}
	try {
		const normalizedTargets = normalizeTargets(
			Array.isArray(targets) && targets.length ? targets : platforms,
		);
		if (normalizedTargets.length === 0) {
			return res.status(400).json({
				error: "At least one platform/account target is required",
			});
		}
		const results = await postToAllPlatforms(post, normalizedTargets);
		return res.json({ results });
	} catch (error) {
		console.error("Failed to post to platforms", error);
		return res.status(500).json({
			error: error?.message || "Unexpected error while posting to platforms",
		});
	}
});

// ---- 404 fallback
app.use((req, res) => {
	res.status(404).json({ message: "Not found", url: req.originalUrl });
});

// ---- boot
ensureFiles().then(() => {
	app.listen(PORT, () =>
		console.log(`Backend running on ${PORT} (SQLite: ${getLocalDbPath()})`)
	);
});
