/** @format */

// utils/validateSettings.js

const fs = require("fs");
const path = require("path");

function validateSettings(settingsPath = "../settings.json") {
	const fullPath = path.resolve(__dirname, settingsPath);
	const settings = JSON.parse(fs.readFileSync(fullPath, "utf-8"));

	const errors = [];

	if (
		!Array.isArray(settings.active_platforms) ||
		settings.active_platforms.length === 0
	) {
		errors.push("Missing or invalid active_platforms.");
	}

	if (!["exclusive", "multi"].includes(settings.platform_mode)) {
		errors.push("Invalid platform_mode. Use 'exclusive' or 'multi'.");
	}

	if (typeof settings.daily_limit !== "number") {
		errors.push("daily_limit must be a number.");
	}

	if (!["true", "false", true, false].includes(settings.auto_post)) {
		errors.push("auto_post must be true or false.");
	}

	if (!settings.campaign_start || !settings.campaign_end) {
		errors.push("Missing campaign date window.");
	}

	if (errors.length > 0) {
		console.error("❌ Settings validation failed:");
		errors.forEach((err) => console.error("  -", err));
		process.exit(1); // or throw new Error() if used in scripts
	}

	console.log("✅ settings.json validated successfully.");
	return settings;
}

module.exports = { validateSettings };
