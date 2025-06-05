/** @format */

// The SEO helper lives in this same folder, not ../utils
const { runSeoCheck } = require("./seoCheckRunner.js");

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
