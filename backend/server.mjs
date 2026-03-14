/** @format */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import fs from "fs"; // only for constants like fs.constants.F_OK
import path from "path";
import { fileURLToPath } from "url";
import { postToAllPlatforms, normalizeTargets } from "./scripts/platforms/post-to-all.js";
import { getPublicAccounts } from "./utils/accountStore.mjs";
import { getAccounts } from "./utils/accountStore.mjs";
import { findDuplicatePost } from "./utils/queueGuard.mjs";
import { generateSeoPayload, getDryRunPayload } from "./utils/seoGeneration.mjs";
import { buildAnalyticsSummary } from "./utils/analyticsSummary.mjs";
import { runPlatformHealthChecks } from "./utils/platformHealth.mjs";

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
const Q_POSTS = path.join(DIR_QUEUE, "postQueue.json");
const Q_POSTED = path.join(DIR_QUEUE, "postedLog.json");
const Q_REJECT = path.join(DIR_QUEUE, "rejections.json");
const STATS_FUNNEL = path.join(__dirname, "stats", "funnel.json");
const STATS_SUMMARY = path.join(__dirname, "stats", "summary.json");
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
	const ensure = async (p, fallback) => {
		try {
			await access(p, fs.constants.F_OK);
		} catch {
			await writeFile(p, JSON.stringify(fallback, null, 2));
		}
	};
	await ensure(Q_POSTS, [
		{
			id: "p1",
			title: "Hello world",
			body: "First draft",
			platforms: ["reddit"],
			targets: [{ platform: "reddit", accountId: null }],
			scheduledAt: null,
			status: "draft",
		},
	]);
	await ensure(Q_POSTED, []);
	await ensure(Q_REJECT, []);
}

const readJson = async (p) => JSON.parse(await readFile(p, "utf-8"));
const writeJson = async (p, data) =>
	writeFile(p, JSON.stringify(data, null, 2));

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
		res.json(await readJson(Q_POSTS));
	} catch {
		res.status(500).json({ error: "Could not load posts" });
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
			provider,
			model,
			dryRun = false,
		} = req.body ?? {};
		if (!productName || !productType || !audience) {
			return res.status(400).json({
				error: "productName, productType, and audience are required",
			});
		}

		const input = { productName, productType, audience };
		const options = { provider, model };
		const result = dryRun
			? getDryRunPayload(input, options)
			: await generateSeoPayload(input, options);

		return res.json(result);
	} catch (error) {
		return res.status(500).json({
			error: "Failed to generate SEO suggestions",
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
		} = req.body ?? {};
		if (!title || !body)
			return res.status(400).json({ error: "title and body required" });
		const posts = await readJson(Q_POSTS);
		const id = "p_" + Date.now();
		const normalizedTargets = normalizeTargets(targets.length ? targets : platforms);
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
			status,
			metadata,
		};
		const duplicate = findDuplicatePost(posts, post);
		if (duplicate) {
			return res.status(409).json({
				error: "Duplicate queue entry",
				detail: `Matches existing post ${duplicate.id}`,
			});
		}
		posts.push(post);
		await writeJson(Q_POSTS, posts);
		res.status(201).json(post);
	} catch (e) {
		res.status(500).json({ error: "Failed to create post", detail: String(e) });
	}
});

app.put("/api/posts/:id", async (req, res) => {
	try {
		const posts = await readJson(Q_POSTS);
		const i = posts.findIndex((p) => p.id === req.params.id);
		if (i === -1) return res.status(404).json({ error: "not found" });
		const updates = { ...req.body };
		if (Array.isArray(updates.targets)) {
			const normalizedTargets = normalizeTargets(updates.targets);
			updates.targets = normalizedTargets;
			updates.platforms = normalizedTargets.map((target) => target.platform);
		}
			posts[i] = { ...posts[i], ...updates, id: posts[i].id };
			const duplicate = findDuplicatePost(posts, posts[i], { excludeId: posts[i].id });
			if (duplicate) {
				return res.status(409).json({
					error: "Duplicate queue entry",
					detail: `Matches existing post ${duplicate.id}`,
				});
			}
			await writeJson(Q_POSTS, posts);
		res.json(posts[i]);
	} catch (e) {
		res.status(500).json({ error: "Failed to update post", detail: String(e) });
	}
});

app.delete("/api/posts/:id", async (req, res) => {
	try {
		const posts = await readJson(Q_POSTS);
		const i = posts.findIndex((p) => p.id === req.params.id);
		if (i === -1) return res.status(404).json({ error: "not found" });
		const [removed] = posts.splice(i, 1);
		await writeJson(Q_POSTS, posts);
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
	app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
});
