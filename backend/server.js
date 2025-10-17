/** @format */

require("dotenv/config");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { postToAllPlatforms } = require("./scripts/platforms/post-to-all.js");

const app = express(); // <-- Define app first!

app.use(cors());
app.use(express.json({ limit: "1mb" }));
const PORT = process.env.PORT || 3001;

app.get("/api/posts", (req, res) => {
	const postsPath = path.join(__dirname, "queue/postQueue.json");
	fs.readFile(postsPath, "utf-8", (err, data) => {
		if (err) {
			return res.status(500).json({ error: "Could not load posts" });
		}
		res.json(JSON.parse(data));
	});
});

app.post("/api/post-to-all", async (req, res) => {
	const { post, platforms } = req.body || {};
	if (!post || !Array.isArray(platforms) || platforms.length === 0) {
		return res.status(400).json({
			error: "Payload must include post object and non-empty platforms array",
		});
	}

	try {
		const results = await postToAllPlatforms(post, platforms);
		return res.json({ results });
	} catch (error) {
		console.error("Failed to post to platforms", error);
		return res.status(500).json({
			error: error.message || "Unexpected error while posting to platforms",
		});
	}
});

app.use((req, res) => {
	res.status(404).json({ message: "Not found", url: req.originalUrl });
});

app.listen(PORT, () => {
	console.log(`Backend running on ${PORT}`);
});
