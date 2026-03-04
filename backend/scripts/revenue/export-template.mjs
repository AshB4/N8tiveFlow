/** @format */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../..");
const POSTED_FILE = path.join(BACKEND_ROOT, "queue/postedLog.json");
const OUT_DIR = path.join(BACKEND_ROOT, "data/revenue");
const OUT_FILE = path.join(OUT_DIR, "revenue-tracking-template.csv");

function csvEscape(value) {
	const text = String(value ?? "");
	if (text.includes(",") || text.includes('"') || text.includes("\n")) {
		return `"${text.replace(/"/g, '""')}"`;
	}
	return text;
}

async function readJson(file, fallback) {
	try {
		return JSON.parse(await readFile(file, "utf-8"));
	} catch {
		return fallback;
	}
}

async function main() {
	const posted = await readJson(POSTED_FILE, []);
	const rows = [];
	const headers = [
		"date",
		"post_id",
		"title",
		"platform",
		"account_id",
		"content_link",
		"affiliate_link",
		"clicks",
		"orders",
		"revenue",
		"notes",
	];

	for (const entry of posted) {
		const date = entry?.processedAt || "";
		const postId = entry?.id || "";
		const title = entry?.title || "";
		const resultRows = Array.isArray(entry?.results) ? entry.results : [];
		if (resultRows.length === 0) {
			rows.push([date, postId, title, "", "", "", "", "", "", "", ""]);
			continue;
		}
		for (const result of resultRows) {
			rows.push([
				date,
				postId,
				title,
				result?.platform || "",
				result?.accountId || "",
				result?.result?.url || result?.result?.link || "",
				"",
				"",
				"",
				"",
				"",
			]);
		}
	}

	await mkdir(OUT_DIR, { recursive: true });
	const lines = [headers.join(",")].concat(
		rows.map((row) => row.map(csvEscape).join(",")),
	);
	await writeFile(OUT_FILE, `${lines.join("\n")}\n`);
	console.log(`Revenue template exported: ${OUT_FILE}`);
	console.log(`Rows: ${rows.length}`);
}

main().catch((error) => {
	console.error("Revenue export failed:", error?.message || error);
	process.exitCode = 1;
});

