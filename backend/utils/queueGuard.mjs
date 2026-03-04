/** @format */

function normalizeText(value) {
	return String(value || "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase();
}

function normalizeSchedule(value) {
	if (!value) return "";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function targetsSignature(post) {
	const list = Array.isArray(post?.targets) ? post.targets : [];
	if (list.length === 0) return "";
	return list
		.map((target) => ({
			platform: String(target?.platform || "").toLowerCase(),
			accountId:
				target?.accountId === undefined || target?.accountId === null
					? ""
					: String(target.accountId),
		}))
		.filter((target) => target.platform)
		sort((a, b) =>
			a.platform === b.platform
				? a.accountId.localeCompare(b.accountId)
				: a.platform.localeCompare(b.platform),
		)
		.map((target) => `${target.platform}:${target.accountId}`)
		.join("|");
}

function signature(post) {
	return [
		normalizeText(post?.title),
		normalizeText(post?.body),
		normalizeSchedule(post?.scheduledAt),
		targetsSignature(post),
	].join("::");
}

export function findDuplicatePost(posts, candidate, options = {}) {
	const { excludeId = null } = options;
	const needle = signature(candidate);
	if (!needle || !Array.isArray(posts)) return null;
	return (
		posts.find((post) => {
			if (excludeId && post?.id === excludeId) return false;
			return signature(post) === needle;
		}) || null
	);
}

