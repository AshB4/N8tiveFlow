/** @format */

import "dotenv/config";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { scoreProduct } from "./score-product.js";
import { generateAngles } from "./generate-angles.js";
import { storeCandidates } from "./store-results.js";
import { creatorsSearchItems } from "../../integrations/amazon/creatorsApiClient.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../../data/product-finder");
const SEED_FILE = path.join(DATA_DIR, "catalog.seed.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const OUTPUT_FILE = path.join(DATA_DIR, "candidates.json");

function parseArgs(argv) {
	const args = {};
	for (let i = 2; i < argv.length; i += 1) {
		const token = argv[i];
		if (!token.startsWith("--")) continue;
		const key = token.slice(2);
		const next = argv[i + 1];
		if (!next || next.startsWith("--")) {
			args[key] = true;
			continue;
		}
		args[key] = next;
		i += 1;
	}
	return args;
}

function parsePriceValue(displayValue) {
	if (!displayValue) return NaN;
	const match = String(displayValue).replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)/);
	return match ? Number(match[1]) : NaN;
}

function parseNiches(value) {
	if (!value) {
		return [
			{ name: "home office", keywords: ["home", "office", "desk"], targetPriceBand: { min: 20, max: 120 } },
			{ name: "garden decor", keywords: ["garden", "outdoor", "decor"], targetPriceBand: { min: 15, max: 80 } },
			{ name: "sensory toys", keywords: ["sensory", "toy", "kids"], targetPriceBand: { min: 10, max: 60 } },
		];
	}
	return String(value)
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((name) => ({ name, keywords: name.split(/\s+/), targetPriceBand: null }));
}

async function loadJson(filePath, fallback) {
	try {
		const raw = await readFile(filePath, "utf-8");
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

function ensurePartnerTag(urlValue, partnerTag) {
	if (!urlValue || !partnerTag) return urlValue || "";
	try {
		const parsed = new URL(urlValue);
		if (!/(^|\.)amazon\./i.test(parsed.hostname)) {
			return urlValue;
		}
		parsed.searchParams.set("tag", partnerTag);
		return parsed.toString();
	} catch {
		return urlValue;
	}
}

function dedupeByAsin(rows) {
	const map = new Map();
	for (const row of rows) {
		if (!row?.asin) continue;
		const existing = map.get(row.asin);
		if (!existing || (row.scores?.total || 0) > (existing.scores?.total || 0)) {
			map.set(row.asin, row);
		}
	}
	return Array.from(map.values());
}

function normalizeSeedRow(row) {
	const priceValue =
		Number(row.priceValue) ||
		(Number.isFinite(Number(row.price)) ? Number(row.price) : NaN);
	return {
		asin: row.asin,
		title: row.title || "",
		category: row.category || "misc",
		priceValue,
		priceDisplay: row.priceDisplay || (Number.isFinite(priceValue) ? `$${priceValue.toFixed(2)}` : ""),
		imageUrl: row.imageUrl || "",
		detailUrl: row.detailUrl || "",
		keywords: Array.isArray(row.keywords) ? row.keywords : [],
	};
}

function matchesNiche(product, niche) {
	const text = `${product.title} ${(product.keywords || []).join(" ")} ${product.category}`.toLowerCase();
	return (niche.keywords || []).some((keyword) => text.includes(String(keyword).toLowerCase()));
}

async function fetchCreatorsCandidatesForNiche(niche, itemCount, partnerTag, marketplace) {
	const data = await creatorsSearchItems({
		keywords: niche.name,
		searchIndex: "All",
		itemCount,
		marketplace,
		partnerTag,
		resources: [
			"images.primary.small",
			"images.primary.medium",
			"itemInfo.title",
			"detailPageURL",
		],
	});
	const items = data?.searchResult?.items || [];
	return items
		.map((item) => {
			const title = item?.itemInfo?.title?.displayValue || "";
			const asin = item?.asin || "";
			const detailUrl = item?.detailPageURL || "";
			const imageUrl =
				item?.images?.primary?.medium?.url || item?.images?.primary?.small?.url || "";
			const priceDisplay = item?.offersV2?.listings?.[0]?.price?.money?.displayAmount || "";
			return {
				asin,
				title,
				category: niche.name,
				priceValue: parsePriceValue(priceDisplay),
				priceDisplay,
				imageUrl,
				detailUrl,
				keywords: niche.keywords || [],
			};
		})
		.filter((row) => row.asin && row.title);
}

async function run() {
	const args = parseArgs(process.argv);
	const maxPerNiche = Math.max(1, Number(args["max-per-niche"] || 5));
	const minScore = Number(args["min-score"] || 55);
	const niches = parseNiches(args.niches);
	const dryRun = Boolean(args["dry-run"]);
	const source = String(
		args.source || process.env.PRODUCT_FINDER_SOURCE || "seed",
	).toLowerCase();

	const partnerTag = process.env.AMAZON_PARTNER_TAG || "";
	const marketplace = process.env.AMAZON_MARKETPLACE || "www.amazon.com";
	const seed = await loadJson(SEED_FILE, []);
	const history = await loadJson(HISTORY_FILE, []);
	const normalizedSeed = Array.isArray(seed) ? seed.map(normalizeSeedRow) : [];
	const historyRows = Array.isArray(history) ? history : [];

	const selected = [];
	for (const niche of niches) {
		let candidates = normalizedSeed.filter((row) => matchesNiche(row, niche));
		if (source === "creators") {
			try {
				const creatorsRows = await fetchCreatorsCandidatesForNiche(
					niche,
					maxPerNiche * 3,
					partnerTag,
					marketplace,
				);
				if (creatorsRows.length > 0) {
					candidates = creatorsRows;
				}
			} catch (error) {
				console.warn(
					`Creators API fetch failed for niche "${niche.name}", using seed fallback: ${error?.message || error}`,
				);
			}
		}
		const ranked = candidates
			.map((product) => {
				const scores = scoreProduct(product, niche, historyRows);
				return {
					...product,
					niche: niche.name,
					scores,
					affiliateUrl: ensurePartnerTag(product.detailUrl, partnerTag),
					platformAngles: generateAngles(product, niche),
				};
			})
			.filter((row) => row.scores.total >= minScore)
			.sort((a, b) => b.scores.total - a.scores.total)
			.slice(0, maxPerNiche);

		selected.push(...ranked);
	}

	const deduped = dedupeByAsin(selected);
	if (!dryRun) {
		await storeCandidates(OUTPUT_FILE, deduped, {
			niches: niches.map((n) => n.name),
			maxPerNiche,
			minScore,
			source,
		});
	}

	console.log(`Product Finder generated ${deduped.length} candidates.`);
	if (deduped.length > 0) {
		console.table(
			deduped.slice(0, 10).map((row) => ({
				asin: row.asin,
				niche: row.niche,
				score: row.scores.total.toFixed(1),
				price: row.priceDisplay,
				title: row.title.slice(0, 64),
			})),
		);
	}
	if (!partnerTag) {
		console.warn("AMAZON_PARTNER_TAG is missing; affiliate links were not tagged.");
	}
	if (dryRun) {
		console.log("Dry run enabled; no files were written.");
	}
	console.log(`Product Finder source: ${source}`);
}

run().catch((error) => {
	console.error("Product Finder failed:", error);
	process.exitCode = 1;
});
