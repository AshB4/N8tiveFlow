/**
 * postToAllPlatforms.js
 * This runs selected post-to-* scripts with shared post data.
 *
 * @format
 */

// Import your platform posting functions
const postToX = require("./social/post-to-x.js");
const postToFacebook = require("./social/post-to-facebook.js");
const postToLinkedin = require("./social/post-to-linkedin.js");
const postToPinterest = require("./social/post-to-pinterest.js");
const postToReddit = require("./social/post-to-reddit.js");
const postToTumblr = require("./social/post-to-tumblr.js");
const postToOnlyfans = require("./adult/post-to-onlyfans.js");
const postToKofi = require("./content/post-to-kofi.js");
const postToDiscord = require("./adult/post-to-discord.js");
const postToDevto = require("./dev/post-to-devto.js");
const postToHashnode = require("./dev/post-to-hashnode.js");
const postToProducthunt = require("./dev/post-to-producthunt.js");
const postToAmazon = require("./marketplaces/post-to-amazon.js");

// Map of platform name to function
const platformMap = {
	x: postToX,
	facebook: postToFacebook,
	linkedin: postToLinkedin,
	pinterest: postToPinterest,
	reddit: postToReddit,
	tumblr: postToTumblr,
	onlyfans: postToOnlyfans,
	kofi: postToKofi,
	discord: postToDiscord,
	devto: postToDevto,
	hashnode: postToHashnode,
	producthunt: postToProducthunt,
	amazon: postToAmazon,
};

/**
 * Posts to selected platforms.
 * @param {Object} post - The post payload (title, body, hashtags, overrides, etc)
 * @param {Array} platforms - Array of selected platform strings
 * @returns {Promise<Array>} - Array of results by platform
 */
const postToAllPlatforms = async (post, platforms) => {
	const results = [];

	for (const platform of platforms) {
		const fn = platformMap[platform];
		if (!fn) {
			results.push({ platform, status: "skipped", reason: "Not implemented" });
			continue;
		}

		try {
			const customText = post.platformOverrides?.[platform] || post.body;
			const payload = {
				title: post.title,
				body: customText,
				image: post.image,
				hashtags: post.hashtags,
			};

			const result = await fn(payload);
			results.push({ platform, status: "success", result });
		} catch (err) {
			results.push({ platform, status: "error", error: err.message });
		}
	}

	return results;
};

module.exports = {
	postToAllPlatforms,
	default: postToAllPlatforms,
};
//Maybe change to post to all boxes checked boxes in the post composer
