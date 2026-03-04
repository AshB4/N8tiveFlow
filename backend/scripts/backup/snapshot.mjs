/** @format */

import { cp, mkdir, readdir, rm } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../..");
const SOURCE_DIRS = [
	path.join(BACKEND_ROOT, "queue"),
	path.join(BACKEND_ROOT, "media"),
	path.join(BACKEND_ROOT, "config"),
];
const BACKUP_ROOT = path.join(BACKEND_ROOT, "backups");
const RETENTION = Number(process.env.POSTPUNK_BACKUP_RETENTION || 14);

function stamp() {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	const hh = String(now.getHours()).padStart(2, "0");
	const mm = String(now.getMinutes()).padStart(2, "0");
	const ss = String(now.getSeconds()).padStart(2, "0");
	return `${y}${m}${d}-${hh}${mm}${ss}`;
}

async function enforceRetention() {
	const entries = await readdir(BACKUP_ROOT, { withFileTypes: true }).catch(() => []);
	const dirs = entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	const excess = dirs.length - RETENTION;
	if (excess <= 0) return 0;
	const toDelete = dirs.slice(0, excess);
	for (const dir of toDelete) {
		await rm(path.join(BACKUP_ROOT, dir), { recursive: true, force: true });
	}
	return toDelete.length;
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");
	await mkdir(BACKUP_ROOT, { recursive: true });
	const targetDir = path.join(BACKUP_ROOT, stamp());

	if (!dryRun) {
		await mkdir(targetDir, { recursive: true });
		for (const source of SOURCE_DIRS) {
			const name = path.basename(source);
			await cp(source, path.join(targetDir, name), { recursive: true, force: true });
		}
		const deleted = await enforceRetention();
		console.log(`Backup created: ${targetDir}`);
		console.log(`Retention cleanup removed: ${deleted} old backup(s).`);
		return;
	}

	console.log(`Dry run backup target: ${targetDir}`);
	console.log(`Sources:`);
	for (const source of SOURCE_DIRS) {
		console.log(`- ${source}`);
	}
}

main().catch((error) => {
	console.error("Backup snapshot failed:", error?.message || error);
	process.exitCode = 1;
});

