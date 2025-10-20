/** @format */

const { runSeoCheck } = require("./seoCheckRunner.js");
const fs = require("fs");
const path = require("path");

// Helper to load JSON files that may contain comments
function loadJSON(relativePath) {
        const file = path.resolve(__dirname, relativePath);
        const raw = fs.readFileSync(file, "utf-8");
        const cleaned = raw.replace(/(^\s*\/\/.*$)/gm, "");
        return JSON.parse(cleaned);
}

// Load configuration and queue data
const config = loadJSON("../config/settings.json");
const posts = loadJSON("../queue/postQueue.json");

// Determine today's platform in a simple rotating manner
const dayIndex = new Date().getDay() % config.active_platforms.length;
const todayPlatform = config.active_platforms[dayIndex];

// Track how many posts we've sent out today
let postedCount = 0;

posts.forEach((post) => {
	if (
		post.status === "approved" &&
		post.platforms.includes(todayPlatform) &&
		postedCount < config.daily_limit
	) {
		const seoKey =
			post.id || post.slug || post.title.toLowerCase().replace(/\s+/g, "-");
		const seoResult = runSeoCheck(seoKey);

		if (!seoResult.ok) {
			console.warn(`⚠️ Skipping due to missing SEO: ${seoResult.error}`);
			return;
		}

		console.log(`✅ SEO Check Passed for ${post.title}`);
		console.log(`📢 Posting to ${todayPlatform}: ${post.title}`);

		// Replace with real post function here
		post.status = "posted";
		postedCount++;
	}
});
