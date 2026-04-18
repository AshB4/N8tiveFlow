/**
 * block-compromised-deps.mjs
 *
 * Purpose:
 * - fail installs when known-bad dependency versions appear
 * - catch direct deps, lockfile pins, and already-installed copies
 *
 * How to use in another project:
 * 1. Copy this file to: scripts/security/block-compromised-deps.mjs
 * 2. Add this to package.json:
 *    {
 *      "scripts": {
 *        "preinstall": "node scripts/security/block-compromised-deps.mjs"
 *      }
 *    }
 * 3. Optional but recommended for extra safety:
 *    {
 *      "overrides": {
 *        "axios": "1.14.0"
 *      }
 *    }
 *
 * What it currently blocks:
 * - axios@1.14.1
 * - axios@0.30.4
 *
 * Notes:
 * - Works best in Node projects using npm, pnpm, or yarn classic/Berry.
 * - This script checks package.json, package-lock.json, npm-shrinkwrap.json,
 *   pnpm-lock.yaml, yarn.lock, and node_modules/axios/package.json when present.
 * - Keep the BLOCKED map updated if more compromised versions are identified.
 */

import fs from "fs";
import path from "path";
import process from "process";

const BLOCKED = {
	axios: new Set(["1.14.1", "0.30.4"]),
};

const rootDir = process.cwd();
const filesToCheck = [
	path.join(rootDir, "package.json"),
	path.join(rootDir, "package-lock.json"),
	path.join(rootDir, "npm-shrinkwrap.json"),
	path.join(rootDir, "pnpm-lock.yaml"),
	path.join(rootDir, "yarn.lock"),
	path.join(rootDir, "node_modules", "axios", "package.json"),
];

function readJsonIfExists(filePath) {
	if (!fs.existsSync(filePath)) return null;
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	} catch (error) {
		console.warn(`[security] Skipping unreadable JSON: ${filePath} (${error.message})`);
		return null;
	}
}

function readTextIfExists(filePath) {
	if (!fs.existsSync(filePath)) return null;
	try {
		return fs.readFileSync(filePath, "utf8");
	} catch (error) {
		console.warn(`[security] Skipping unreadable text file: ${filePath} (${error.message})`);
		return null;
	}
}

function checkPackageJson(pkg, filePath, findings) {
	if (!pkg) return;
	for (const section of ["dependencies", "devDependencies", "optionalDependencies", "overrides"]) {
		const deps = pkg[section];
		if (!deps || typeof deps !== "object") continue;
		for (const [name, spec] of Object.entries(deps)) {
			if (!BLOCKED[name]) continue;
			const version = String(spec);
			if (BLOCKED[name].has(version)) {
				findings.push(`${filePath}: ${section}.${name} -> ${version}`);
			}
		}
	}
}

function checkLockfile(lock, filePath, findings) {
	if (!lock) return;
	const packages = lock.packages && typeof lock.packages === "object" ? lock.packages : {};
	for (const [pkgPath, pkgMeta] of Object.entries(packages)) {
		if (!pkgMeta || typeof pkgMeta !== "object") continue;
		const version = pkgMeta.version ? String(pkgMeta.version) : null;
		if (pkgPath.endsWith("node_modules/axios") && version && BLOCKED.axios.has(version)) {
			findings.push(`${filePath}: ${pkgPath} -> ${version}`);
		}
	}
	const rootDeps = lock.dependencies && typeof lock.dependencies === "object" ? lock.dependencies : {};
	for (const [name, meta] of Object.entries(rootDeps)) {
		if (!BLOCKED[name] || !meta || typeof meta !== "object") continue;
		const version = meta.version ? String(meta.version) : null;
		if (version && BLOCKED[name].has(version)) {
			findings.push(`${filePath}: dependencies.${name} -> ${version}`);
		}
	}
}

function checkInstalledPackage(pkg, filePath, findings) {
	if (!pkg) return;
	const name = String(pkg.name || "");
	const version = String(pkg.version || "");
	if (BLOCKED[name] && BLOCKED[name].has(version)) {
		findings.push(`${filePath}: installed ${name} -> ${version}`);
	}
}

function checkTextLockfile(text, filePath, findings) {
	if (!text) return;
	for (const [name, versions] of Object.entries(BLOCKED)) {
		for (const version of versions) {
			if (text.includes(`${name}@${version}`) || text.includes(`/${name}/${version}`) || text.includes(`version: ${version}`)) {
				findings.push(`${filePath}: possible ${name} -> ${version}`);
			}
		}
	}
}

const findings = [];

for (const filePath of filesToCheck) {
	const base = path.basename(filePath);
	if (base === "pnpm-lock.yaml" || base === "yarn.lock") {
		const text = readTextIfExists(filePath);
		checkTextLockfile(text, filePath, findings);
		continue;
	}
	const data = readJsonIfExists(filePath);
	if (!data) continue;
	if (path.basename(filePath) === "package.json" && filePath.includes(`${path.sep}node_modules${path.sep}`)) {
		checkInstalledPackage(data, filePath, findings);
		continue;
	}
	if (base === "package.json") {
		checkPackageJson(data, filePath, findings);
		continue;
	}
	checkLockfile(data, filePath, findings);
}

if (findings.length > 0) {
	console.error("[security] Blocked compromised dependency versions detected:");
	for (const finding of findings) {
		console.error(`- ${finding}`);
	}
	console.error("[security] Do not install axios@1.14.1 or axios@0.30.4.");
	process.exit(1);
}

console.log("[security] Dependency guard passed.");
