export function buildArchiveEntry(post = {}, extras = {}) {
  return {
    id: post?.id ?? null,
    title: post?.title ?? null,
    body: post?.body ?? post?.content ?? "",
    platform: post?.platform ?? null,
    platforms: Array.isArray(post?.platforms) ? post.platforms : [],
    targets: Array.isArray(extras?.targets)
      ? extras.targets
      : Array.isArray(post?.targets)
      ? post.targets
      : [],
    hashtags: Array.isArray(post?.hashtags) ? post.hashtags : [],
    mediaPath: post?.mediaPath ?? null,
    mediaType: post?.mediaType ?? null,
    image: post?.image ?? post?.media ?? null,
    metadata: post?.metadata ?? {},
    productProfileId: post?.productProfileId ?? post?.metadata?.productProfileId ?? null,
    results: Array.isArray(extras?.results) ? extras.results : [],
    processedAt: extras?.processedAt || new Date().toISOString(),
    manualArchived: Boolean(extras?.manualArchived),
  };
}
