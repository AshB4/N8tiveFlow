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
