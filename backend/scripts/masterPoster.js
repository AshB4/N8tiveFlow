/** @format */

const { runSeoCheck } = require("../utils/seoCheckRunner");

// Load queued posts
const posts = require("../queue/postQueue.json");

// Load global configuration
const config = require("../config/settings.json");

// Determine today's platform using round-robin across active platforms
const dayIndex = new Date().getDay();
const todayPlatform =
        config.active_platforms[dayIndex % config.active_platforms.length];

// Track number of posts successfully sent today
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
