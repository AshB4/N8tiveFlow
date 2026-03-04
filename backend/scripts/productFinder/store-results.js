/** @format */

import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function storeCandidates(outFile, candidates, meta = {}) {
	await mkdir(path.dirname(outFile), { recursive: true });
	const payload = {
		generatedAt: new Date().toISOString(),
		meta,
		count: candidates.length,
		candidates,
	};
	await writeFile(outFile, JSON.stringify(payload, null, 2));
}

