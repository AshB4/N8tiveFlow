/** @format */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const authRouter = require("./routes/auth");
const contentRouter = require("./routes/content");

const app = express(); // <-- Define app first!

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/content", contentRouter);
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
