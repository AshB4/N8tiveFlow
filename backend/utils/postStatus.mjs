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
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	return STATUS_ALIASES[normalized] || fallback;
}

export function isApprovedStatus(value) {
	return normalizePostStatus(value) === "approved";
}
