/**
 * postToAllPlatforms.js
 * Runs selected post-to-* scripts with shared post data.
 *
 * @format
 */

const platformLoaders = {
	x: () => import("./social/post-to-x.js"),
	facebook: () => import("./social/post-to-facebook.js"),
	linkedin: () => import("./social/post-to-linkedin.js"),
	pinterest: () => import("./social/post-to-pinterest.js"),
	reddit: () => import("./social/post-to-reddit.js"),
	tumblr: () => import("./social/post-to-tumblr.js"),
	onlyfans: () => import("./adult/post-to-onlyfans.js"),
	kofi: () => import("./content/post-to-kofi.js"),
	discord: () => import("./adult/post-to-discord.js"),
	devto: () => import("./dev/post-to-devto.js"),
	hashnode: () => import("./dev/post-to-hashnode.js"),
	producthunt: () => import("./dev/post-to-producthunt.js"),
	amazon: () => import("./marketplaces/post-to-amazon.js"),
};

const resolveHandler = async (platform) => {
	const loader = platformLoaders[platform];
	if (!loader) {
		return null;
	}
	const namespace = await loader();
	if (typeof namespace.default === "function") {
		return namespace.default;
	}
	const firstFn = Object.values(namespace).find(
		(value) => typeof value === "function",
	);
	return typeof firstFn === "function" ? firstFn : null;
};

/**
 * Posts to selected platforms.
 * @param {Object} post - The post payload (title, body, hashtags, overrides, etc)
 * @param {Array<string>} platforms - Array of selected platform strings
 * @returns {Promise<Array>} - Array of results by platform
 */
export const postToAllPlatforms = async (post, platforms) => {
	const results = [];

	for (const platform of platforms) {
		const handler = await resolveHandler(platform);
		if (typeof handler !== "function") {
			results.push({
				platform,
				status: "skipped",
				reason: "Not implemented",
			});
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

			const result = await handler(payload);
			results.push({ platform, status: "success", result });
		} catch (err) {
			results.push({
				platform,
				status: "error",
				error: err?.message || "Unknown posting error",
			});
		}
	}

	return results;
};

export default postToAllPlatforms;
// Maybe change to post to all boxes checked boxes in the post composer
