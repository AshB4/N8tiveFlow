/** @format */

// scripts/generateSummary.js
const posted = require("../posted-log");
const rejected = require("../rejected-log");
const funnel = require("../stats/funnel-log");
const fs = require("fs");

function generateSummary() {
	const summary = {};
	summary.total_posts_attempted = posted.length + rejected.length;
	summary.total_posts_successful = posted.length;
	summary.total_rejected = rejected.length;
	summary.success_rate =
		Math.round((posted.length / summary.total_posts_attempted) * 1000) / 10;

	// Top performing post
	let mostSignups = 0;
	let topPost = {};
	funnel.forEach((entry) => {
		if (entry.signups && entry.signups > mostSignups) {
			mostSignups = entry.signups;
			topPost = entry;
		}
	});
	summary.top_performing_post = topPost;

	// Top platform
	const platformCounts = {};
	posted.forEach((post) => {
		platformCounts[post.platform] = (platformCounts[post.platform] || 0) + 1;
	});
	const topPlatform = Object.entries(platformCounts).sort(
		(a, b) => b[1] - a[1]
	)[0];
	summary.top_platform = {
		name: topPlatform[0],
		posts_sent: topPlatform[1],
	};

	summary.last_updated = new Date().toISOString();

	fs.writeFileSync(
		"./stats/summary.json",
		JSON.stringify(summary, null, 2),
		"utf-8"
	);
	console.log("✅ Summary generated.");
}

generateSummary();
//Future?	Auto-trigger on new posts or daily cron