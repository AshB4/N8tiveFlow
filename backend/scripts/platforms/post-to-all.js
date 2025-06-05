/**
 * postToAllPlatforms.js
 * This runs selected post-to-* scripts with shared post data.
 *
 * @format
 */

// Import your platform posting functions
import postToX from "./social/post-to-x.js";
import postToFacebook from "./social/post-to-facebook.js";
import postToLinkedin from "./social/post-to-linkedin.js";
import postToPinterest from "./social/post-to-pinterest.js";
import postToReddit from "./social/post-to-reddit.js";
import postToTumblr from "./social/post-to-tumblr.js";
import postToOnlyfans from "./adult/post-to-onlyfans.js";
import postToKofi from "./content/post-to-kofi.js";
import postToDiscord from "./adult/post-to-discord.js";
import postToDevto from "./dev/post-to-devto.js";
import postToHashnode from "./dev/post-to-hashnode.js";
import postToProducthunt from "./dev/post-to-producthunt.js";
import postToAmazon from "./marketplace/post-to-amazon.js";

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
