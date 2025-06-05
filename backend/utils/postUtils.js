/** @format */

const fs = require("fs");
const path = require("path");

/**
 * Build a standardized post payload for a specific platform.
 * If platform overrides exist on the entry they will be applied.
 *
 * @param {Object} entry     Raw queue entry
 * @param {string} platform  Target platform name
 * @returns {Object}         Normalized post payload
 */
function buildPostPayload(entry, platform) {
    const body = entry.platformOverrides?.[platform] || entry.body || "";
    return {
        id: entry.id,
        title: entry.title,
        body,
        image: entry.image,
        altText: entry.altText || "",
        hashtags: entry.hashtags || [],
        platform,
    };
}

/**
 * Validate a queue entry before posting.
 * Ensures required fields exist.
 *
 * @param {Object} entry Queue object
 * @returns {Object}     { ok: boolean, errors?: string[] }
 */
function validateQueueEntry(entry) {
    const errors = [];
    if (!entry.title) errors.push("Missing title");
    if (!entry.status) errors.push("Missing status");
    if (!entry.scheduled_at) errors.push("Missing scheduled_at");

    const hasPlatform = entry.platform || (Array.isArray(entry.platforms) && entry.platforms.length > 0);
    if (!hasPlatform) errors.push("Missing platform information");

    if (errors.length) {
        return { ok: false, errors };
    }
    return { ok: true };
}

module.exports = {
    buildPostPayload,
    validateQueueEntry,
};

