/** @format */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express(); // <-- Define app first!

app.use(cors());
app.use(express.json());
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

app.post("/api/post-queue", (req, res) => {
  const queuePath = path.join(__dirname, "../queue/post-queue.json");
  fs.readFile(queuePath, "utf-8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ error: "Could not load queue" });
    }
    let queue = [];
    if (!err) {
      try {
        queue = JSON.parse(data);
      } catch (e) {
        queue = [];
      }
    }
    queue.push(req.body);
    fs.writeFile(queuePath, JSON.stringify(queue, null, 2), (wErr) => {
      if (wErr) {
        return res.status(500).json({ error: "Could not save queue" });
      }
      res.json({ ok: true });
    });
  });
});

app.use((req, res) => {
	res.status(404).json({ message: "Not found", url: req.originalUrl });
});

app.listen(PORT, () => {
	console.log(`Backend running on ${PORT}`);
});
