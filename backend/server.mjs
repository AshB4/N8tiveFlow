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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
const PORT = process.env.PORT || 3001;

// ---- data paths
const DIR_QUEUE = path.join(__dirname, "queue");
const Q_POSTS = path.join(DIR_QUEUE, "postQueue.json");
const Q_POSTED = path.join(DIR_QUEUE, "postedLog.json");
const Q_REJECT = path.join(DIR_QUEUE, "rejections.json");

// ---- helpers
async function ensureFiles() {
	await mkdir(DIR_QUEUE, { recursive: true });
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

app.post("/api/posts", async (req, res) => {
	try {
		const {
			title,
			body,
			platforms = ["reddit"],
			scheduledAt = null,
			targets = [],
			image = null,
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
			altText,
			platforms: normalizedTargets.map((target) => target.platform),
			targets: normalizedTargets,
			scheduledAt,
			status,
			metadata,
		};
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
