/** @format */

const fs = require("fs");
const path = require("path");
const redditBot = require("./../bots/redditBot");
const pinterestBot = require("./../bots/pinterestBot");
const tiktokUploader = require("./../bots/tiktokUploader");

async function runQueue() {
	const raw = fs.readFileSync("./queue/contentQueue.json");
	const posts = JSON.parse(raw);
	const now = new Date();

	for (const post of posts) {
		const postTime = new Date(post.postAt);
		if (postTime <= now) {
			try {
				if (post.platform === "reddit") {
					await redditBot(post);
				} else if (post.platform === "pinterest") {
					await pinterestBot(post);
				} else if (post.platform === "tiktok") {
					const caption = `${post.caption} ${post.hashtags?.join(" ") || ""}`;
					await tiktokUploader(post.videoPath, caption);
				}
				console.log(
					`[✅] Posted to ${post.platform} at ${new Date().toISOString()}`
				);
			} catch (err) {
				console.error(`[❌] Failed to post to ${post.platform}:`, err);
			}
		}
	}
}

runQueue();
