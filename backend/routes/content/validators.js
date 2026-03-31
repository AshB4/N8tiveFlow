const VALID_CONTENT_STATUSES = new Set([
	"draft",
	"approved",
	"queued",
	"scheduled",
	"published",
	"archived",
	"pending",
	"rejected",
	"paused",
]);

const VALID_TARGET_STATUSES = new Set([
	"pending",
	"approved",
	"queued",
	"scheduled",
	"posted",
	"failed",
	"skipped",
	"rejected",
]);

function isIsoDate(value) {
	if (value instanceof Date) return !Number.isNaN(value.getTime());
	if (typeof value !== "string" || value.trim().length === 0) return false;
	const date = new Date(value);
	return !Number.isNaN(date.getTime());
}

function normalizeDate(value) {
	return value instanceof Date ? value : new Date(value);
}

function validateAssets(assets, errors) {
	if (!Array.isArray(assets)) {
		errors.push({ field: "assets", message: "Assets must be an array" });
		return [];
	}

	return assets
		.map((asset, index) => {
			const fieldPath = `assets[${index}]`;
			if (typeof asset !== "object" || asset === null || Array.isArray(asset)) {
				errors.push({ field: fieldPath, message: "Asset must be an object" });
				return null;
			}

			const normalized = {};
			let hasError = false;

			if (typeof asset.type !== "string" || asset.type.trim().length === 0) {
				errors.push({ field: `${fieldPath}.type`, message: "Asset type is required" });
				hasError = true;
			} else {
				normalized.type = asset.type.trim();
			}

			if (typeof asset.url !== "string" || asset.url.trim().length === 0) {
				errors.push({ field: `${fieldPath}.url`, message: "Asset url is required" });
				hasError = true;
			} else {
				normalized.url = asset.url.trim();
			}

			if (asset.altText !== undefined && asset.altText !== null) {
				if (typeof asset.altText !== "string") {
					errors.push({
						field: `${fieldPath}.altText`,
						message: "Asset altText must be a string if provided",
					});
					hasError = true;
				} else {
					normalized.altText = asset.altText.trim();
				}
			}

			return hasError ? null : normalized;
		})
		.filter(Boolean);
}

function validateTargets(targets, errors) {
	if (!Array.isArray(targets)) {
		errors.push({ field: "targets", message: "Targets must be an array" });
		return [];
	}

	return targets
		.map((target, index) => {
			const fieldPath = `targets[${index}]`;
			if (typeof target !== "object" || target === null || Array.isArray(target)) {
				errors.push({ field: fieldPath, message: "Target must be an object" });
				return null;
			}

			const normalized = {};
			let hasError = false;

			if (typeof target.platform !== "string" || target.platform.trim().length === 0) {
				errors.push({
					field: `${fieldPath}.platform`,
					message: "Target platform is required",
				});
				hasError = true;
			} else {
				normalized.platform = target.platform.trim();
			}

			if (target.status !== undefined) {
				if (typeof target.status !== "string" || target.status.trim().length === 0) {
					errors.push({
						field: `${fieldPath}.status`,
						message: "Target status must be a non-empty string",
					});
					hasError = true;
				} else if (!VALID_TARGET_STATUSES.has(target.status.trim())) {
					errors.push({
						field: `${fieldPath}.status`,
						message: `Target status must be one of: ${Array.from(VALID_TARGET_STATUSES).join(", ")}`,
					});
					hasError = true;
				} else {
					normalized.status = target.status.trim();
				}
			}

			if (target.scheduledAt === undefined) {
				errors.push({
					field: `${fieldPath}.scheduledAt`,
					message: "Target scheduledAt is required",
				});
				hasError = true;
			} else if (!isIsoDate(target.scheduledAt)) {
				errors.push({
					field: `${fieldPath}.scheduledAt`,
					message: "Target scheduledAt must be a valid ISO date string",
				});
				hasError = true;
			} else {
				normalized.scheduledAt = normalizeDate(target.scheduledAt);
			}

			if (target.metadata !== undefined) {
				if (target.metadata === null) {
					normalized.metadata = null;
				} else if (typeof target.metadata !== "object") {
					errors.push({
						field: `${fieldPath}.metadata`,
						message: "Target metadata must be an object if provided",
					});
					hasError = true;
				} else {
					normalized.metadata = JSON.stringify(target.metadata);
				}
			}

			return hasError ? null : normalized;
		})
		.filter(Boolean);
}

export function validateContentPayload(payload = {}, { partial = false } = {}) {
	const errors = [];
	const data = {};

	if (!partial || Object.prototype.hasOwnProperty.call(payload, "title")) {
		if (payload.title === undefined || payload.title === null) {
			if (!partial) errors.push({ field: "title", message: "Title is required" });
		} else if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
			errors.push({ field: "title", message: "Title must be a non-empty string" });
		} else {
			data.title = payload.title.trim();
		}
	}

	if (Object.prototype.hasOwnProperty.call(payload, "body")) {
		if (payload.body !== null && payload.body !== undefined && typeof payload.body !== "string") {
			errors.push({ field: "body", message: "Body must be a string if provided" });
		} else {
			data.body = payload.body === undefined ? undefined : payload.body;
		}
	}

	if (Object.prototype.hasOwnProperty.call(payload, "status")) {
		if (payload.status === null || payload.status === undefined) {
			errors.push({ field: "status", message: "Status cannot be null" });
		} else if (typeof payload.status !== "string" || payload.status.trim().length === 0) {
			errors.push({ field: "status", message: "Status must be a non-empty string" });
		} else if (!VALID_CONTENT_STATUSES.has(payload.status.trim())) {
			errors.push({
				field: "status",
				message: `Status must be one of: ${Array.from(VALID_CONTENT_STATUSES).join(", ")}`,
			});
		} else {
			data.status = payload.status.trim();
		}
	}

	if (Object.prototype.hasOwnProperty.call(payload, "scheduledAt")) {
		if (payload.scheduledAt === null || payload.scheduledAt === undefined) {
			data.scheduledAt = null;
		} else if (!isIsoDate(payload.scheduledAt)) {
			errors.push({
				field: "scheduledAt",
				message: "scheduledAt must be a valid ISO date string",
			});
		} else {
			data.scheduledAt = normalizeDate(payload.scheduledAt);
		}
	}

	if (Object.prototype.hasOwnProperty.call(payload, "userId")) {
		if (payload.userId === null || payload.userId === undefined) {
			data.userId = null;
		} else if (Number.isInteger(payload.userId)) {
			data.userId = payload.userId;
		} else if (
			typeof payload.userId === "string" &&
			payload.userId.trim() !== "" &&
			Number.isInteger(Number(payload.userId))
		) {
			data.userId = Number(payload.userId);
		} else {
			errors.push({ field: "userId", message: "userId must be an integer if provided" });
		}
	}

	if (!partial) {
		data.assets = validateAssets(payload.assets || [], errors);
		data.targets = validateTargets(payload.targets || [], errors);
	} else {
		if (Object.prototype.hasOwnProperty.call(payload, "assets")) {
			data.assets = validateAssets(payload.assets, errors);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "targets")) {
			data.targets = validateTargets(payload.targets, errors);
		}
	}

	return { data, errors };
}
