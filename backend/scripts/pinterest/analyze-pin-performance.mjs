/** @format */

import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
	analyzePinterestPerformance,
	buildPinterestAnalysisPrompt,
	parseCsv,
} from "../../utils/pinterestPerformanceAnalysis.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../..");

function getArgValue(flag) {
	const index = process.argv.indexOf(flag);
	if (index === -1) return null;
	return process.argv[index + 1] || null;
}

async function main() {
	const inputPath = process.argv[2];
	if (!inputPath || inputPath.startsWith("--")) {
		throw new Error("Usage: node scripts/pinterest/analyze-pin-performance.mjs <csv-path> [--out output.json]");
	}

	const resolvedInput = path.isAbsolute(inputPath) ? inputPath : path.join(BACKEND_ROOT, inputPath);
	const csvText = await readFile(resolvedInput, "utf-8");
	const rows = parseCsv(csvText);
	const report = analyzePinterestPerformance(rows);
	const outPath = getArgValue("--out");
	const json = JSON.stringify({
		...report,
		analysis_prompt: buildPinterestAnalysisPrompt(report),
	}, null, 2);

	if (outPath) {
		const resolvedOut = path.isAbsolute(outPath) ? outPath : path.join(BACKEND_ROOT, outPath);
		await writeFile(resolvedOut, `${json}\n`);
		console.log(`Wrote Pinterest performance report: ${resolvedOut}`);
	} else {
		process.stdout.write(`${json}\n`);
	}
}

main().catch((error) => {
	console.error("Pinterest performance analysis failed:", error?.message || error);
	process.exitCode = 1;
});
