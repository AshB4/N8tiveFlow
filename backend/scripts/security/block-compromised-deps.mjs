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

const findings = [];

for (const filePath of filesToCheck) {
	const data = readJsonIfExists(filePath);
	if (!data) continue;
	if (path.basename(filePath) === "package.json" && filePath.includes(`${path.sep}node_modules${path.sep}`)) {
		checkInstalledPackage(data, filePath, findings);
		continue;
	}
	if (path.basename(filePath) === "package.json") {
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
