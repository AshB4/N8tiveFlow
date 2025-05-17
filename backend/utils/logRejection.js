/** @format */

// utils/logRejection.js

const fs = require("fs");
const path = require("path");

function logRejection(post, reason, errorDetails = null) {
	const logPath = path.join(__dirname, "../rejected-log.js");
	const rejected = require(logPath);

	const entry = {
		id: post.id,
		title: post.title,
		platform: post.platform || "unknown",
		attempted_at: new Date().toISOString(),
		reason,
		error: errorDetails || "N/A",
	};

	rejected.push(entry);
	const fileContent = `// rejected-log.js\n\nmodule.exports = ${JSON.stringify(
		rejected,
		null,
		2
	)};\n`;
	fs.writeFileSync(logPath, fileContent, "utf-8");
}

module.exports = { logRejection };
