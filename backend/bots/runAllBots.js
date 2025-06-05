/** @format */

const fs = require("fs");
const path = require("path");
const redditBot = require("./../bots/redditBot");
const pinterestBot = require("./../bots/pinterestBot");
const tiktokUploader = require("./../bots/tiktokUploader");

async function runQueue() {
        const postsPath = path.join(__dirname, "../queue/postQueue.json");
        const raw = fs.readFileSync(postsPath, "utf8");
        const posts = JSON.parse(raw);
        const now = new Date();

        for (const post of posts) {
                const postTime = new Date(post.scheduled_at || post.postAt);
                if (postTime <= now && post.status === "approved") {
                        const platforms = post.platforms || [];

                        for (const platform of platforms) {
                                try {
                                        if (platform === "reddit") {
                                                await redditBot(post);
                                        } else if (platform === "pinterest") {
                                                await pinterestBot(post);
                                        } else if (platform === "tiktok") {
                                                const caption = `${post.caption} ${post.hashtags?.join(" ") || ""}`;
                                                await tiktokUploader(post.videoPath, caption);
                                        }
                                        console.log(
                                                `[✅] Posted to ${platform} at ${new Date().toISOString()}`
                                        );
                                } catch (err) {
                                        console.error(`[❌] Failed to post to ${platform}:`, err);
                                }
                        }
                }
        }
}

runQueue();
