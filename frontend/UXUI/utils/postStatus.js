const STATUS_ALIASES = {
  draft: "draft",
  review: "draft",
  pending: "draft",
  scheduled: "approved",
  approved: "approved",
  queued: "approved",
  ready: "approved",
  posted: "posted",
  published: "posted",
  sent: "posted",
  failed: "failed",
  error: "failed",
  rejected: "failed",
};

export function normalizePostStatus(value, fallback = "draft") {
  const normalized = String(value || "").trim().toLowerCase();
  return STATUS_ALIASES[normalized] || fallback;
}

export function getStatusLabel(value) {
  const status = normalizePostStatus(value);
  if (status === "approved") return "Approved";
  if (status === "posted") return "Posted";
  if (status === "failed") return "Failed";
  return "Draft";
}

export function isApprovedStatus(value) {
  return normalizePostStatus(value) === "approved";
}

export function getWorkflowColorKey(postOrStatus) {
  const rawStatus =
    typeof postOrStatus === "string"
      ? postOrStatus
      : postOrStatus?.status;
  const status = normalizePostStatus(rawStatus);
  const scheduledAt =
    typeof postOrStatus === "object"
      ? postOrStatus?.scheduledAt || postOrStatus?.scheduled_at || null
      : null;
  const hasTargets =
    typeof postOrStatus === "object" &&
    ((Array.isArray(postOrStatus?.targets) && postOrStatus.targets.length > 0) ||
      (Array.isArray(postOrStatus?.platforms) && postOrStatus.platforms.length > 0) ||
      postOrStatus?.platform);
  const needsAction =
    typeof postOrStatus === "object" &&
    (!hasTargets ||
      !scheduledAt ||
      (!postOrStatus?.mediaPath &&
        !postOrStatus?.image &&
        /pinterest|instagram/i.test(
          String(
            Array.isArray(postOrStatus?.platforms)
              ? postOrStatus.platforms.join(",")
              : postOrStatus?.platform || "",
          ),
        )));

  if (status === "posted") return "posted";
  if (status === "failed") return "failed";
  if (status === "approved" && scheduledAt) return "scheduled";
  if (status === "approved" && !scheduledAt) return "needs_action";
  if (status === "draft" && needsAction) return "needs_action";
  if (status === "draft") return "draft";
  return "archived";
}

export function getWorkflowPalette(postOrStatus) {
  const key = getWorkflowColorKey(postOrStatus);
  const palettes = {
    draft: {
      key,
      label: "Draft",
      badgeClass: "border-violet-500 text-violet-300 bg-violet-950/15",
      cardClass: "border-violet-500 bg-violet-950/10 shadow-[0_0_18px_rgba(139,92,246,0.16)]",
      textClass: "text-violet-300",
      calendarColor: "#8b5cf6",
      calendarTextColor: "#000000",
    },
    needs_action: {
      key,
      label: "Needs Action",
      badgeClass: "border-amber-500 text-amber-300 bg-amber-950/15",
      cardClass: "border-amber-500 bg-amber-950/10 shadow-[0_0_18px_rgba(245,158,11,0.16)]",
      textClass: "text-amber-300",
      calendarColor: "#f59e0b",
      calendarTextColor: "#000000",
    },
    scheduled: {
      key,
      label: "Scheduled",
      badgeClass: "border-cyan-500 text-cyan-300 bg-cyan-950/15",
      cardClass: "border-cyan-500 bg-cyan-950/10 shadow-[0_0_18px_rgba(34,211,238,0.16)]",
      textClass: "text-cyan-300",
      calendarColor: "#67e8f9",
      calendarTextColor: "#000000",
    },
    posted: {
      key,
      label: "Posted",
      badgeClass: "border-lime-500 text-lime-300 bg-lime-950/15",
      cardClass: "border-lime-500 bg-lime-950/10 shadow-[0_0_18px_rgba(132,204,22,0.16)]",
      textClass: "text-lime-300",
      calendarColor: "#84cc16",
      calendarTextColor: "#000000",
    },
    failed: {
      key,
      label: "Failed",
      badgeClass: "border-red-500 text-red-300 bg-red-950/15",
      cardClass: "border-red-500 bg-red-950/10 shadow-[0_0_18px_rgba(255,45,85,0.2)]",
      textClass: "text-red-300",
      calendarColor: "#ff2d55",
      calendarTextColor: "#ffffff",
    },
    archived: {
      key,
      label: "Archived",
      badgeClass: "border-zinc-500 text-zinc-300 bg-zinc-900/40",
      cardClass: "border-zinc-600 bg-zinc-950/30 shadow-[0_0_18px_rgba(113,113,122,0.12)]",
      textClass: "text-zinc-300",
      calendarColor: "#71717a",
      calendarTextColor: "#ffffff",
    },
  };
  return palettes[key] || palettes.draft;
}

export function isAffiliatePost(post) {
  if (!post || typeof post !== "object") return false;
  const platforms = Array.isArray(post.platforms)
    ? post.platforms
    : post.platform
    ? [post.platform]
    : [];
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const contentTags = Array.isArray(post?.metadata?.contentTags)
    ? post.metadata.contentTags
    : [];
  const distributionTags = Array.isArray(post?.metadata?.distributionTags)
    ? post.metadata.distributionTags
    : [];
  const affiliateUrl =
    post?.affiliateUrl ||
    post?.metadata?.affiliateUrl ||
    post?.metadata?.productLinks?.amazon ||
    "";
  const contentMode = String(
    post?.metadata?.contentMode || post?.contentMode || "",
  ).toLowerCase();

  return (
    contentMode === "affiliate" ||
    platforms.some((platform) => String(platform).toLowerCase() === "amazon") ||
    [...tags, ...contentTags, ...distributionTags].some((tag) =>
      /affiliate|amazon/i.test(String(tag || "")),
    ) ||
    /amazon\./i.test(String(affiliateUrl))
  );
}
