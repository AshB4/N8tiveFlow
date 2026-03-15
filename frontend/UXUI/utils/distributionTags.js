export const DISTRIBUTION_TAG_PREFIX = "post:";

export function normalizeTagList(value) {
  if (!value) return [];
  const source = Array.isArray(value) ? value.join(",") : String(value);
  return Array.from(
    new Set(
      source
        .split(/[,\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

export function distributionTagsToTargets(tags = []) {
  return normalizeTagList(tags)
    .filter((tag) => tag.toLowerCase().startsWith(DISTRIBUTION_TAG_PREFIX))
    .map((tag) => tag.slice(DISTRIBUTION_TAG_PREFIX.length).trim().toLowerCase())
    .filter(Boolean)
    .map((platform) => ({ platform, accountId: null }));
}

export function mergeTargets(...targetLists) {
  const merged = [];
  const seen = new Set();
  for (const list of targetLists) {
    for (const target of Array.isArray(list) ? list : []) {
      if (!target?.platform) continue;
      const platform = String(target.platform).toLowerCase();
      const accountId =
        target.accountId === undefined || target.accountId === null
          ? null
          : String(target.accountId);
      const key = `${platform}::${accountId ?? "default"}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ platform, accountId });
    }
  }
  return merged;
}
