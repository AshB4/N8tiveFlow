/** @format */

const PLATFORM_BODY_LIMITS = {
	x: 140,
	twitter: 140,
};

const PLATFORM_MEDIA_RULES = {
	instagram: {
		requiresMedia: true,
		allowedTypes: ["image", "gif", "video"],
	},
	pinterest: {
		requiresMedia: true,
		allowedTypes: ["image", "gif", "video"],
	},
};

const formatAccountHint = (platform, accountId) =>
	accountId ? `${platform} (${accountId})` : platform;

export function validatePostAgainstRules({
	body = "",
	customText = {},
	useAutoPlatformText = true,
	targets = [],
	mediaType = null,
	hasMedia = false,
}) {
	if (!Array.isArray(targets) || targets.length === 0) {
		return [];
	}

	const violations = [];

	for (const target of targets) {
		if (!target) continue;
		const platform = String(target.platform || "").toLowerCase();
		if (!platform) continue;

		const limit = PLATFORM_BODY_LIMITS[platform];
		if (!limit) continue;

		const overrideKey = target.accountId ? `${platform}:${target.accountId}` : platform;
		const candidateText = useAutoPlatformText
			? body
			: customText?.[overrideKey] ?? customText?.[platform] ?? body;

		const length = candidateText ? candidateText.length : 0;
		if (length > limit) {
			violations.push({
				platform,
				accountId: target.accountId ?? null,
				type: "bodyLength",
				limit,
				actual: length,
				message: `Limit ${limit} characters for ${formatAccountHint(platform, target.accountId)}. Currently ${length}.`,
			});
		}

		const mediaRule = PLATFORM_MEDIA_RULES[platform];
		if (mediaRule?.requiresMedia && !hasMedia) {
			violations.push({
				platform,
				accountId: target.accountId ?? null,
				type: "mediaRequired",
				message: `Media is required for ${formatAccountHint(platform, target.accountId)}.`,
			});
			continue;
		}
		if (
			hasMedia &&
			mediaRule?.allowedTypes?.length &&
			mediaType &&
			!mediaRule.allowedTypes.includes(mediaType)
		) {
			violations.push({
				platform,
				accountId: target.accountId ?? null,
				type: "mediaTypeUnsupported",
				message: `${formatAccountHint(platform, target.accountId)} does not support media type "${mediaType}".`,
			});
		}
	}

	return violations;
}
