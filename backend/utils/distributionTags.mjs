export const DISTRIBUTION_TAG_PREFIX = "post:";

export function normalizeTagList(value) {
	if (!value) return [];
	const source = Array.isArray(value) ? value.join(",") : String(value);
	return Array.from(
		new Set(
			source
				.split(/[,\n]/)
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	);
}

export function distributionTagsToTargets(tags = []) {
	return normalizeTagList(tags)
		.filter((tag) => tag.toLowerCase().startsWith(DISTRIBUTION_TAG_PREFIX))
		.map((tag) => tag.slice(DISTRIBUTION_TAG_PREFIX.length).trim().toLowerCase())
		.filter(Boolean)
		.map((platform) => ({ platform, accountId: null }));
}
