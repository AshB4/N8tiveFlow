/** @format */

// stats/logFunnelEvent.js
const fs = require("fs");
const path = require("path");

function logFunnelEvent(platform, campaign, type) {
	const filePath = path.join(__dirname, "funnel-log.js");
	const funnel = require(filePath);

	const now = new Date().toISOString();
	const last = funnel.find(
		(f) => f.platform === platform && f.campaign === campaign
	);

	if (last) {
		// Increment existing stat
		last[type] = (last[type] || 0) + 1;
		last.timestamp = now;
	} else {
		// Create new entry
		funnel.push({
			platform,
			campaign,
			[type]: 1,
			timestamp: now,
		});
	}

	const updated = `// funnel-log.js\n\nmodule.exports = ${JSON.stringify(
		funnel,
		null,
		2
	)};`;
	fs.writeFileSync(filePath, updated, "utf-8");
}

module.exports = { logFunnelEvent };
