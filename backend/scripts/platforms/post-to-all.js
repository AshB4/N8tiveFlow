/**
 * postToAllPlatforms.js
 * This runs selected post-to-* scripts with shared post data.
 *
 * @format
 */

// Import your platform posting functions
import postToX from "./platforms/post-to-x.js";
import postToFacebook from "./platforms/post-to-facebook.js";
import postToLinkedin from "./platforms/post-to-linkedin.js";
import postToPinterest from "./platforms/post-to-pinterest.js";
import postToReddit from "./platforms/post-to-reddit.js";
import postToTumblr from "./platforms/post-to-tumblr.js";
import postToOnlyfans from "./platforms/post-to-onlyfans.js";
import postToKofi from "./platforms/post-to-kofi.js";
import postToDiscord from "./platforms/post-to-discord.js";
import postToDevto from "./platforms/post-to-devto.js";
import postToHashnode from "./platforms/post-to-hashnode.js";
import postToProducthunt from "./platforms/post-to-producthunt.js";
import postToAmazon from "./platforms/post-to-amazon.js";

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
export const postToAllPlatforms = async (post, platforms) => {
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
export default postToAllPlatforms;
//Maybe change to post to all boxes checked boxes in the post composer