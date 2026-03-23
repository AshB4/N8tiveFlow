/**
 * postToAllPlatforms.js
 * Runs selected post-to-* scripts with shared post data.
 *
 * @format
 */

import { getAccount, getPreferredAccount } from "../../utils/accountStore.mjs";

const platformLoaders = {
	x: () => import("./social/post-to-x.js"),
	facebook: () => import("./social/post-to-facebook.js"),
	linkedin: () => import("./social/post-to-linkedin.js"),
	pinterest: () => import("./social/post-to-pinterest.js"),
	substack: () => import("./social/post-to-substack.js"),
	reddit: () => import("./social/post-to-reddit.js"),
	tumblr: () => import("./social/post-to-tumblr.js"),
	kofi: () => import("./content/post-to-kofi.js"),
	discord: () => import("./adult/post-to-discord.js"),
	devto: () => import("./dev/post-to-devto.js"),
	hashnode: () => import("./dev/post-to-hashnode.js"),
	producthunt: () => import("./dev/post-to-producthunt.js"),
	amazon: () => import("./marketplaces/post-to-amazon.js"),
	threads: () => import("./social/post-to-threads.js"),
	instagram: () => import("./social/post-to-instagram.js"),
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

const AMAZON_HOST_PATTERN = /(^|\.)amazon\./i;
const TRAILING_PUNCTUATION_PATTERN = /[),.!?:;]+$/;
const hasVendedAmazonParams = (url) =>
	url.searchParams.has("linkCode") ||
	url.searchParams.has("language") ||
	Array.from(url.searchParams.keys()).some((key) => key.toLowerCase().startsWith("ref"));

export const withAffiliateTag = (rawText, partnerTag) => {
	if (!rawText || !partnerTag) return rawText || "";
	return String(rawText).replace(/https?:\/\/[^\s]+/gi, (rawUrl) => {
		const trailing = rawUrl.match(TRAILING_PUNCTUATION_PATTERN)?.[0] || "";
		const cleanUrl = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
		try {
			const parsed = new URL(cleanUrl);
			if (!AMAZON_HOST_PATTERN.test(parsed.hostname)) {
				return rawUrl;
			}
			if (hasVendedAmazonParams(parsed)) {
				return rawUrl;
			}
			parsed.searchParams.set("tag", partnerTag);
			return `${parsed.toString()}${trailing}`;
		} catch {
			return rawUrl;
		}
	});
};

export const normalizeProductLink = (post, partnerTag = "") => {
	const links = post?.metadata?.productLinks || {};
	const candidate =
		post?.canonicalUrl ||
		post?.affiliateUrl ||
		links.primary ||
		links.amazon ||
		links.gumroad ||
		"";
	if (!candidate) return "";
	if (!AMAZON_HOST_PATTERN.test(candidate)) {
		return candidate;
	}
	return withAffiliateTag(candidate, partnerTag);
};

export const ensureProductLink = (body, link) => {
	const content = String(body || "").trim();
	const normalizedLink = String(link || "").trim();
	if (!normalizedLink) return content;
	if (content.includes(normalizedLink)) return content;
	if (!content) return normalizedLink;
	return `${content}\n\n${normalizedLink}`;
};

export const isConfiguredValue = (value) => {
	if (value === null || value === undefined) return false;
	if (typeof value !== "string") return Boolean(value);
	const trimmed = value.trim();
	if (!trimmed) return false;
	return !/^(replace|todo|changeme)/i.test(trimmed);
};

export const isThreadsConfigured = (account) => {
	const token =
		account?.credentials?.accessToken || process.env.THREADS_ACCESS_TOKEN || "";
	const accountId =
		account?.metadata?.accountId || process.env.THREADS_ACCOUNT_ID || "";
	return isConfiguredValue(token) && isConfiguredValue(accountId);
};

export const normalizeTargets = (input) => {
	if (!Array.isArray(input)) return [];
	return input
		.map((entry) => {
			if (!entry) return null;
			if (typeof entry === "string") {
				return { platform: String(entry).toLowerCase(), accountId: null };
			}
			if (typeof entry === "object") {
				const platform = entry.platform || entry.name || entry.value;
				if (!platform) return null;
				const rawAccountId =
					entry.accountId ??
					entry.account ??
					entry.account_id ??
					(entry.platform ? null : entry.id) ??
					null;
				return {
					platform: String(platform).toLowerCase(),
					accountId:
						rawAccountId === undefined || rawAccountId === null
							? null
							: String(rawAccountId),
				};
			}
			return null;
		})
		.filter((entry) => entry && entry.platform);
};

/**
 * Posts to selected targets.
 * @param {Object} post - The post payload (title, body, hashtags, overrides, etc)
 * @param {Array} targetsInput - Array of selected platform/account targets
 * @returns {Promise<Array>} - Array of results by platform/account
 */
export const postToAllPlatforms = async (post, targetsInput) => {
	const targets = normalizeTargets(targetsInput);
	const results = [];
	const shouldAutoTagAmazon = Boolean(
		post?.autoAffiliateAmazon || post?.metadata?.autoAffiliateAmazon,
	);
	const partnerTag = process.env.AMAZON_PARTNER_TAG || "";

	for (const target of targets) {
		const { platform, accountId } = target;
		const handler = await resolveHandler(platform);
		if (typeof handler !== "function") {
			results.push({
				platform,
				accountId,
				status: "skipped",
				reason: "Not implemented",
			});
			continue;
		}

		let account = null;
		if (accountId) {
			account = await getAccount(platform, accountId);
			if (!account) {
				results.push({
					platform,
					accountId,
					status: "error",
					error: "Account configuration not found",
				});
				continue;
			}
		} else {
			account = await getPreferredAccount(platform);
		}
		if (platform === "threads" && !isThreadsConfigured(account)) {
			results.push({
				platform,
				accountId,
				status: "skipped",
				reason: "Threads not configured",
			});
			continue;
		}

		try {
			const accountOverrideKey = accountId ? `${platform}:${accountId}` : null;
			const customText =
				(accountOverrideKey && post.platformOverrides?.[accountOverrideKey]) ??
				post.platformOverrides?.[platform] ??
				post.body;
			const productLink = normalizeProductLink(post, partnerTag);
			const baseBody =
				shouldAutoTagAmazon || productLink
					? withAffiliateTag(customText, partnerTag)
					: customText;
			const body =
				post?.metadata?.includeProductLink
					? ensureProductLink(baseBody, productLink)
					: baseBody;
			const payload = {
				title: post.title,
				body,
				canonicalUrl: productLink || post.canonicalUrl || post.affiliateUrl || "",
				affiliateUrl: productLink || post.affiliateUrl || post.canonicalUrl || "",
				image: post.image,
				mediaPath: post.mediaPath ?? null,
				mediaType: post.mediaType ?? null,
				saveAsDraft: Boolean(post.saveAsDraft),
				hashtags: post.hashtags,
				platformOverrides: post.platformOverrides ?? {},
				metadata: post.metadata ?? {},
				tags: post.tags ?? [],
			};

			const result = await handler(payload, { account, target });
			results.push({ platform, accountId, status: "success", result });
		} catch (err) {
			results.push({
				platform,
				accountId,
				status: "error",
				error: err?.message || "Unknown posting error",
			});
		}
	}

	return results;
};

export default postToAllPlatforms;
// Maybe change to post to all boxes checked boxes in the post composer
