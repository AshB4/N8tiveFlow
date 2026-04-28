function csvEscape(value) {
	const text = String(value ?? "");
	if (text.includes(",") || text.includes('"') || text.includes("\n")) {
		return `"${text.replace(/"/g, '""')}"`;
	}
	return text;
}

export function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = "";
	let inQuotes = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		const next = text[index + 1];

		if (inQuotes) {
			if (char === '"' && next === '"') {
				field += '"';
				index += 1;
			} else if (char === '"') {
				inQuotes = false;
			} else {
				field += char;
			}
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			continue;
		}

		if (char === ",") {
			row.push(field);
			field = "";
			continue;
		}

		if (char === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
			continue;
		}

		if (char === "\r") {
			continue;
		}

		field += char;
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	if (rows.length === 0) return [];
	const headers = rows.shift().map((header) => String(header || "").trim());
	return rows
		.filter((rowValues) => rowValues.some((value) => String(value || "").trim().length > 0))
		.map((rowValues) => {
			const entry = {};
			headers.forEach((header, index) => {
				entry[header] = rowValues[index] ?? "";
			});
			return entry;
		});
}

function toNumber(value) {
	if (value === null || value === undefined || String(value).trim() === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ");
}

function tokenSet(value) {
	return new Set(normalizeText(value).split(" ").filter(Boolean));
}

function similarityScore(left, right) {
	const a = tokenSet(left);
	const b = tokenSet(right);
	if (!a.size || !b.size) return 0;
	let matches = 0;
	for (const token of a) {
		if (b.has(token)) matches += 1;
	}
	return (2 * matches) / (a.size + b.size);
}

function scoreRow(row) {
	const impressions = toNumber(row.impressions) || 0;
	const saves = toNumber(row.saves) || 0;
	const pinClicks = toNumber(row.pin_clicks) || 0;
	const outboundClicks = toNumber(row.outbound_clicks) || 0;
	return (outboundClicks * 5) + (pinClicks * 3) + (saves * 2) + (impressions * 0.5);
}

function inferTrigger(row) {
	const trigger = normalizeText(row.psychological_trigger || row.trigger || "");
	if (trigger) return trigger;
	const hookType = normalizeText(row.hook_type);
	const category = normalizeText(row.category);
	if (/parent|kid|child|summer|water|toy|screen time|safety|play/.test(`${hookType} ${category}`)) return "parent peace";
	if (/dev|prompt|automation|productivity|workflow|ai|tool/.test(`${hookType} ${category}`)) return "productivity";
	if (/goblin|humor|funny|meme|affirmation/.test(`${hookType} ${category}`)) return "humor";
	if (/transform|before after|home|garden|lighting|decor/.test(`${hookType} ${category}`)) return "transformation";
	if (/money|save|cheap|afford|deal|gift/.test(`${hookType} ${category}`)) return "convenience";
	return hookType || category || "unknown";
}

function inferVisualStyle(row) {
	const visual = normalizeText(row.visual_style || row.visualStyle || "");
	if (visual) return visual;
	const hookType = normalizeText(row.hook_type);
	const category = normalizeText(row.category);
	if (/transformation|before after/.test(`${hookType} ${category}`)) return "before_after";
	if (/list/.test(hookType)) return "list_card";
	if (/humor|goblin|meme/.test(`${hookType} ${category}`)) return "meme_art";
	if (/productivity|dev|ai/.test(`${hookType} ${category}`)) return "minimal_tech";
	if (/home|garden|lighting/.test(category)) return "lifestyle_home";
	if (/parent|summer|toy|safety/.test(category)) return "ugc_lifestyle";
	return hookType || category || "unknown";
}

function inferCategoryStatus(score, row) {
	const impressions = toNumber(row.impressions) || 0;
	const saves = toNumber(row.saves) || 0;
	const pinClicks = toNumber(row.pin_clicks) || 0;
	const outboundClicks = toNumber(row.outbound_clicks) || 0;

	if (outboundClicks >= 3 || (outboundClicks >= 2 && (pinClicks >= 8 || saves >= 5)) || score >= 120) {
		return "SCALE";
	}
	if (saves >= 5 || pinClicks >= 8 || outboundClicks >= 1 || score >= 60) {
		return "TEST_MORE";
	}
	if (impressions >= 300 && outboundClicks <= 1 && pinClicks <= 4) {
		return "AWARENESS_ONLY";
	}
	if (score < 25) {
		return "PAUSE";
	}
	return "PAUSE";
}

function buildAdjacentIdeas(category, product, trigger) {
	const map = {
		seasonal_parenting_affiliate: ["bubble mower", "sidewalk chalk projector", "sensory bin", "travel toy", "quiet toy"],
		home_garden_affiliate: ["patio lights", "outdoor decor", "privacy fence", "fire pit", "garden upgrade"],
		goblin_ip: ["goblin coloring pages", "goblin affirmations", "goblin stickers", "goblin journals", "goblin meme printables"],
		dev_products: ["prompt pack", "automation workflow", "template bundle", "AI tool", "code snippets"],
		craft_affiliate: ["organizer kit", "sewing bundle", "embroidery hoop", "DIY craft kit", "subscription box"],
	};
	const candidates = map[normalizeText(category).replace(/\s+/g, "_")] || map[category] || [];
	return candidates.slice(0, 3).map((item) => ({
		product: item,
		hook: `${trigger || "winning trigger"} -> ${item}`,
		image_prompt: `Pinterest-style ${item} visual using the ${trigger || "winning trigger"} angle, vertical composition, high click-through composition`,
		visual_style: /goblin/.test(normalizeText(category)) ? "whimsical meme art" : "lifestyle pinterest",
	}));
}

function buildHookAngles(trigger, product) {
	if (trigger === "parent peace") {
		return [
			`Buys you quiet time with ${product}`,
			`The easy way to burn off kid energy`,
		];
	}
	if (trigger === "productivity") {
		return [
			`Do more with less friction`,
			`The shortcut that saves the most time`,
		];
	}
	if (trigger === "humor") {
		return [
			`For the chaos goblin in your brain`,
			`Funny enough to stop the scroll`,
		];
	}
	if (trigger === "transformation") {
		return [
			`Before and after in one move`,
			`The upgrade that changes the whole space`,
		];
	}
	return [
		`A new angle on ${product}`,
		`Same trigger, different product`,
	];
}

function buildExperimentalVisual(trigger) {
	if (trigger === "parent peace") return "before_after_collapse";
	if (trigger === "productivity") return "infographic_card";
	if (trigger === "humor") return "meme_collage";
	if (trigger === "transformation") return "split_screen_before_after";
	return "ugc_style";
}

function sum(values) {
	return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function mean(values) {
	if (!values.length) return 0;
	return sum(values) / values.length;
}

function aggregateBy(rows, keyFn) {
	const buckets = new Map();
	for (const row of rows) {
		const key = keyFn(row);
		const bucket = buckets.get(key) || { key, rows: [] };
		bucket.rows.push(row);
		buckets.set(key, bucket);
	}
	return [...buckets.values()];
}

function scoreDuplicateFatigue(rows) {
	const clusters = aggregateBy(rows, (row) => `${normalizeText(row.category)}::${normalizeText(row.product)}::${normalizeText(row.hook_type)}`);
	const duplicateClusters = [];

	for (const cluster of clusters) {
		if (cluster.rows.length < 2) continue;
		const avgScore = mean(cluster.rows.map((row) => row.score));
		const lowPerformers = cluster.rows.filter((row) => row.score < 40).length;
		const titleSimilarity = cluster.rows.some((left, index) =>
			cluster.rows.slice(index + 1).some((right) => similarityScore(left.pin_title, right.pin_title) >= 0.7),
		);
		if (lowPerformers >= 2 || avgScore < 40 || titleSimilarity) {
			duplicateClusters.push({
				category: cluster.rows[0].category,
				product: cluster.rows[0].product,
				hook_type: cluster.rows[0].hook_type,
				count: cluster.rows.length,
				avg_score: Number(avgScore.toFixed(2)),
				recommendation: "DUPLICATE FATIGUE DETECTED. Expand into adjacent products and stop cloning the same hook/product combo.",
			});
		}
	}

	return duplicateClusters;
}

function sortByScoreDesc(rows) {
	return [...rows].sort((left, right) => right.score - left.score);
}

function summarizeCategories(rows) {
	return aggregateBy(rows, (row) => row.category || "unknown")
		.map((bucket) => {
			const totalScore = sum(bucket.rows.map((row) => row.score));
			const avgScore = bucket.rows.length ? totalScore / bucket.rows.length : 0;
			const totalOutbound = sum(bucket.rows.map((row) => row.outbound_clicks || 0));
			const totalClicks = sum(bucket.rows.map((row) => row.pin_clicks || 0));
			const totalSaves = sum(bucket.rows.map((row) => row.saves || 0));
			return {
				category: bucket.key,
				count: bucket.rows.length,
				avg_score: Number(avgScore.toFixed(2)),
				total_score: Number(totalScore.toFixed(2)),
				total_outbound_clicks: totalOutbound,
				total_pin_clicks: totalClicks,
				total_saves: totalSaves,
			};
		})
		.sort((left, right) => right.avg_score - left.avg_score || right.total_outbound_clicks - left.total_outbound_clicks);
}

function summarizeDimension(rows, getValue) {
	return aggregateBy(rows, (row) => getValue(row) || "unknown")
		.map((bucket) => {
			const totalScore = sum(bucket.rows.map((row) => row.score));
			const avgScore = bucket.rows.length ? totalScore / bucket.rows.length : 0;
			const totalOutbound = sum(bucket.rows.map((row) => row.outbound_clicks || 0));
			const totalClicks = sum(bucket.rows.map((row) => row.pin_clicks || 0));
			const totalSaves = sum(bucket.rows.map((row) => row.saves || 0));
			return {
				name: bucket.key,
				count: bucket.rows.length,
				avg_score: Number(avgScore.toFixed(2)),
				total_outbound_clicks: totalOutbound,
				total_pin_clicks: totalClicks,
				total_saves: totalSaves,
			};
		})
		.sort((left, right) => right.avg_score - left.avg_score || right.total_outbound_clicks - left.total_outbound_clicks);
}

function thresholdPriority(category) {
	const normalized = normalizeText(category);
	if (/seasonal|parent|holiday|easter|mothers|fathers/.test(normalized)) return 1;
	if (/home|garden|lighting|outdoor/.test(normalized)) return 2;
	if (/goblin|coloring|printable/.test(normalized)) return 3;
	if (/dev|productivity|ai|prompt/.test(normalized)) return 4;
	return 5;
}

export function analyzePinterestPerformance(rows) {
	const normalizedRows = rows
		.filter((row) => row && String(row.pin_title || row.title || "").trim())
		.map((row) => {
			const score = scoreRow(row);
			return {
				pin_title: row.pin_title || row.title || "",
				category: row.category || "unknown",
				hook_type: row.hook_type || row.hookType || "unknown",
				product: row.product || "",
				impressions: toNumber(row.impressions),
				saves: toNumber(row.saves),
				pin_clicks: toNumber(row.pin_clicks),
				outbound_clicks: toNumber(row.outbound_clicks),
				psychological_trigger: inferTrigger(row),
				visual_style: inferVisualStyle(row),
				data_confidence: row.data_confidence || row.confidence_score || "high",
				score,
			};
		});

	const duplicateFatigue = scoreDuplicateFatigue(normalizedRows);
	const duplicateFatigueKeys = new Set(
		duplicateFatigue.map((item) => `${normalizeText(item.category)}::${normalizeText(item.product)}::${normalizeText(item.hook_type)}`),
	);

	for (const row of normalizedRows) {
		const key = `${normalizeText(row.category)}::${normalizeText(row.product)}::${normalizeText(row.hook_type)}`;
		const group = normalizedRows.filter((candidate) => `${normalizeText(candidate.category)}::${normalizeText(candidate.product)}::${normalizeText(candidate.hook_type)}` === key);
		const groupScore = mean(group.map((item) => item.score));
		const repeatedWeak = group.length >= 2 && groupScore < 25;
		const severelyWeak = row.score < 25;
		const awarenessOnly = (row.impressions || 0) >= 300 && (row.outbound_clicks || 0) <= 1 && (row.pin_clicks || 0) <= 4;

		if (duplicateFatigueKeys.has(key) && repeatedWeak) {
			row.decision = "KILL";
			row.reason = "Repeated weak performance with duplicate fatigue";
		} else if (severelyWeak) {
			row.decision = "PAUSE";
			row.reason = "Low score and weak engagement";
		} else if (row.outbound_clicks >= 3 || (row.outbound_clicks >= 2 && (row.pin_clicks >= 8 || row.saves >= 5)) || row.score >= 120) {
			row.decision = "SCALE";
			row.reason = "Strong outbound intent and engagement";
		} else if (row.saves >= 5 || row.pin_clicks >= 8 || row.outbound_clicks >= 1 || row.score >= 60) {
			row.decision = "TEST_MORE";
			row.reason = "Enough interest to refine";
		} else if (awarenessOnly) {
			row.decision = "AWARENESS_ONLY";
			row.reason = "Impressions are there, clicks are weak";
		} else if (duplicateFatigueKeys.has(key)) {
			row.decision = "PAUSE";
			row.reason = "Duplicate fatigue detected";
		} else {
			row.decision = "PAUSE";
			row.reason = "Low performance";
		}
	}

	const topWinners = sortByScoreDesc(normalizedRows.filter((row) => row.decision === "SCALE")).slice(0, 10);
	const testMore = sortByScoreDesc(normalizedRows.filter((row) => row.decision === "TEST_MORE")).slice(0, 10);
	const awarenessOnly = sortByScoreDesc(normalizedRows.filter((row) => row.decision === "AWARENESS_ONLY")).slice(0, 10);
	const pause = sortByScoreDesc(normalizedRows.filter((row) => row.decision === "PAUSE")).slice(0, 10);
	const kill = sortByScoreDesc(normalizedRows.filter((row) => row.decision === "KILL")).slice(0, 10);

	const categorySummary = summarizeCategories(normalizedRows);
	const topCategories = categorySummary.slice(0, 5);
	const weakCategories = [...categorySummary].sort((left, right) => left.avg_score - right.avg_score || left.total_outbound_clicks - right.total_outbound_clicks).slice(0, 5);

	const triggerSummary = summarizeDimension(normalizedRows, (row) => row.psychological_trigger);
	const visualSummary = summarizeDimension(normalizedRows, (row) => row.visual_style);

	const winnerExpansion = topWinners.map((row) => ({
		pin_title: row.pin_title,
		category: row.category,
		product: row.product,
		score: Number(row.score.toFixed(2)),
		psychological_trigger: row.psychological_trigger,
		adjacent_product_ideas: buildAdjacentIdeas(row.category, row.product, row.psychological_trigger),
		hook_angles: buildHookAngles(row.psychological_trigger, row.product),
		experimental_visual_format: buildExperimentalVisual(row.psychological_trigger),
	}));

	const priorityMap = {
		seasonal_affiliate: "Scale hardest. Make more adjacent holiday/seasonal pins.",
		home_garden: "Scale. Focus on transformation, outdoor upgrades, and before/after visuals.",
		home_garden_affiliate: "Scale. Focus on transformation, outdoor upgrades, and before/after visuals.",
		goblin_ip: "Expand. Turn winning goblin concepts into printables, memes, and books.",
		dev_products: "Maintain. Keep testing practical productivity and automation angles.",
		experiments: "Cap experiments. Only one new format at a time.",
	};

	return {
		scoring_formula: "score = (outbound_clicks * 5) + (pin_clicks * 3) + (saves * 2) + (impressions * 0.5)",
		classification_rules: {
			scale: "Strong outbound clicks + high engagement",
			test_more: "Some saves/clicks, but needs refinement",
			awareness_only: "High impressions, weak clicks",
			pause: "Low performance",
			kill: "Repeated weak performance",
		},
		metrics_summary: {
			rows_analyzed: normalizedRows.length,
			total_score: Number(sum(normalizedRows.map((row) => row.score)).toFixed(2)),
			avg_score: Number(mean(normalizedRows.map((row) => row.score)).toFixed(2)),
			total_impressions: sum(normalizedRows.map((row) => row.impressions || 0)),
			total_saves: sum(normalizedRows.map((row) => row.saves || 0)),
			total_pin_clicks: sum(normalizedRows.map((row) => row.pin_clicks || 0)),
			total_outbound_clicks: sum(normalizedRows.map((row) => row.outbound_clicks || 0)),
		},
		top_winners: topWinners,
		test_more: testMore,
		awareness_only: awarenessOnly,
		pause,
		kill,
		duplicate_fatigue: duplicateFatigue,
		top_categories: topCategories,
		weak_categories: weakCategories,
		top_psychological_triggers: triggerSummary.slice(0, 5),
		weak_psychological_triggers: [...triggerSummary].sort((left, right) => left.avg_score - right.avg_score).slice(0, 5),
		top_visual_styles: visualSummary.slice(0, 5),
		weak_visual_styles: [...visualSummary].sort((left, right) => left.avg_score - right.avg_score).slice(0, 5),
		winner_expansion: winnerExpansion,
		content_priority_next_30_days: {
			seasonal_affiliate: priorityMap.seasonal_affiliate,
			home_garden: priorityMap.home_garden,
			goblin_ip: priorityMap.goblin_ip,
			dev_products: priorityMap.dev_products,
			experiments: priorityMap.experiments,
		},
		recommended_focus_order: [...categorySummary]
			.sort((left, right) => thresholdPriority(left.category) - thresholdPriority(right.category) || right.avg_score - left.avg_score)
			.map((item) => item.category),
		data_notes: [
			"Rows with blank metrics are treated as null and ignored in scoring.",
			"psychological_trigger and visual_style are inferred when not explicitly provided.",
			"Duplicate fatigue is based on repeated product + hook_type + category patterns and title similarity.",
		],
		rows: normalizedRows,
	};
}

export function buildPinterestAnalysisPrompt(report) {
	return [
		"Analyze this Pinterest performance report and recommend what to scale, test, pause, or kill.",
		"Focus on emotional triggers, adjacent products, and duplicate fatigue.",
		"Return valid JSON only.",
		`Report JSON:\n${JSON.stringify(report)}`,
	].join("\n\n");
}

export function formatCsvRows(rows) {
	return rows
		.map((row) => Object.values(row).map(csvEscape).join(","))
		.join("\n");
}
