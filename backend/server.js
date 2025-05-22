/** @format */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express(); // <-- Define app first!

app.use(cors());
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

app.use((req, res) => {
	res.status(404).json({ message: "Not found", url: req.originalUrl });
});

app.listen(PORT, () => {
	console.log(`Backend running on ${PORT}`);
});
