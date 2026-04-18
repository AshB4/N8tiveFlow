/** @format */

import { readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";

const DEFAULT_SLOTS_UTC = ["15:00", "15:20", "15:40", "16:00"];
const DEFAULT_DAILY_PLAN = ["amazon-a", "amazon-b", "digital", "wildcard"];
const DEFAULT_MAX_SAME_PRODUCT_PER_DAY = 2;

function parseArgs(argv = process.argv.slice(2)) {
	const args = {
		startDate: null,
		dryRun: false,
		slotsUtc: DEFAULT_SLOTS_UTC,
		dailyPlan: DEFAULT_DAILY_PLAN,
		maxSameProductPerDay: DEFAULT_MAX_SAME_PRODUCT_PER_DAY,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--dry-run") {
			args.dryRun = true;
			continue;
		}
		if (arg === "--start-date") {
			args.startDate = argv[index + 1] || null;
			index += 1;
			continue;
		}
		if (arg === "--slots") {
			args.slotsUtc = String(argv[index + 1] || "")
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
			index += 1;
			continue;
		}
		if (arg === "--plan") {
			args.dailyPlan = String(argv[index + 1] || "")
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
			index += 1;
			continue;
		}
		if (arg === "--max-same-product") {
			args.maxSameProductPerDay = Number(argv[index + 1] || DEFAULT_MAX_SAME_PRODUCT_PER_DAY);
			index += 1;
		}
	}

	if (!args.startDate) {
		args.startDate = new Date().toISOString().slice(0, 10);
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(args.startDate)) {
		throw new Error("--start-date must use YYYY-MM-DD");
	}
	if (!args.slotsUtc.length) {
		throw new Error("--slots must include at least one HH:MM UTC slot");
	}
	if (!args.dailyPlan.length) {
		throw new Error("--plan must include at least one category");
	}
	if (!Number.isFinite(args.maxSameProductPerDay) || args.maxSameProductPerDay < 1) {
		throw new Error("--max-same-product must be 1 or greater");
	}
	return args;
}

function hasPinterestTarget(post) {
	return (
		(post.platforms || []).map(String).includes("pinterest") ||
		(post.targets || []).some(
			(target) => String(target?.platform || "").toLowerCase() === "pinterest",
		)
	);
}

function productGroup(post) {
	const id = String(post?.metadata?.productProfileId || "").trim();
	if (id && id !== "restored-batch" && id !== "unknown") return id;
	return String(
		post?.metadata?.productProfileLabel ||
			post?.metadata?.keyword ||
			post?.canonicalUrl ||
			post?.id ||
			"unknown",
	).trim();
}

function productText(post) {
	return [
		productGroup(post),
		post?.title,
		post?.body,
		post?.canonicalUrl,
		post?.affiliateUrl,
		post?.metadata?.productProfileLabel,
		post?.metadata?.keyword,
		post?.metadata?.angle,
		...(post?.metadata?.pinterestTags || []),
	]
		.map((value) => String(value || "").toLowerCase())
		.join(" ");
}

function isAmazonPost(post) {
	return [
		post?.canonicalUrl,
		post?.affiliateUrl,
		post?.metadata?.productLinks?.amazon,
		post?.metadata?.productLinks?.primary,
	]
		.map((value) => String(value || "").toLowerCase())
		.join(" ")
		.includes("amazon.com");
}

function categoryForPost(post) {
	const text = productText(post);
	if (isAmazonPost(post) && /nail|beauty|spa|gel|polish|manicure/.test(text)) {
		return "amazon-beauty";
	}
	if (
		isAmazonPost(post) &&
		/toddler|kid|kids|egg|easter|montessori|princess|plush|toy|cars|basket|bath/.test(text)
	) {
		return "amazon-kids";
	}
	if (
		/gumroad|creator-spring|teespring|prompt|goblin|passover|start-anyway|frog|ai-powered-grad|coloring/.test(
			text,
		)
	) {
		return "digital";
	}
	return "wildcard";
}

function categoryMatches(category, preferred) {
	if (preferred === "amazon" || preferred === "amazon-a" || preferred === "amazon-b") {
		return category.startsWith("amazon-");
	}
	return category === preferred;
}

function scheduledMs(post) {
	const ms = Date.parse(post?.scheduledAt || post?.scheduled_at || "");
	return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function isoFor(startDate, dayIndex, slot) {
	const base = new Date(`${startDate}T00:00:00.000Z`);
	base.setUTCDate(base.getUTCDate() + dayIndex);
	const [hour, minute] = slot.split(":").map(Number);
	base.setUTCHours(hour, minute, 0, 0);
	return base.toISOString();
}

function buildCandidates(posts, startDate) {
	return posts
		.filter((post) => String(post.status || "").toLowerCase() === "approved")
		.filter(hasPinterestTarget)
		.filter((post) => String(post.scheduledAt || post.scheduled_at || "").slice(0, 10) >= startDate)
		.sort((a, b) => scheduledMs(a) - scheduledMs(b) || String(a.id).localeCompare(String(b.id)));
}

function buildQueues(candidates, dailyPlan) {
	const categories = Array.from(new Set([...dailyPlan, "wildcard"]));
	const queues = new Map(categories.map((category) => [category, []]));
	const initialCategoryCounts = {};

	for (const post of candidates) {
		const category = categoryForPost(post);
		if (!queues.has(category)) queues.set(category, []);
		queues.get(category).push(post);
		initialCategoryCounts[category] = (initialCategoryCounts[category] || 0) + 1;
	}

	return { queues, initialCategoryCounts };
}

function totalRemaining(queues) {
	return [...queues.values()].reduce((sum, list) => sum + list.length, 0);
}

function takeFrom(queues, preferred, dayCounts, lastGroup, maxSameProductPerDay) {
	const queueKeys = [...queues.keys()];
	const categories =
		preferred === "wildcard"
			? queueKeys
			: [
				...queueKeys.filter((key) => categoryMatches(key, preferred)),
				...queueKeys.filter((key) => !categoryMatches(key, preferred)),
			];
	const choices = [];

	for (const category of categories) {
		for (const post of queues.get(category) || []) {
			const group = productGroup(post);
			if ((dayCounts.get(group) || 0) >= maxSameProductPerDay) continue;
			choices.push({
				category,
				post,
				group,
				preferredMatch: categoryMatches(category, preferred),
			});
		}
		if (choices.some((choice) => choice.preferredMatch)) break;
	}

	choices.sort((a, b) => {
		if (a.preferredMatch !== b.preferredMatch) return a.preferredMatch ? -1 : 1;
		const aPenalty = a.group === lastGroup ? 1 : 0;
		const bPenalty = b.group === lastGroup ? 1 : 0;
		if (aPenalty !== bPenalty) return aPenalty - bPenalty;
		return scheduledMs(a.post) - scheduledMs(b.post) || String(a.post.id).localeCompare(String(b.post.id));
	});

	const selected = choices[0];
	if (!selected) return null;
	const list = queues.get(selected.category);
	list.splice(list.indexOf(selected.post), 1);
	return selected;
}

export function rebalancePinterestMix(posts, options = {}) {
	const startDate = options.startDate || new Date().toISOString().slice(0, 10);
	const slotsUtc = options.slotsUtc || DEFAULT_SLOTS_UTC;
	const dailyPlan = options.dailyPlan || DEFAULT_DAILY_PLAN;
	const candidates = buildCandidates(posts, startDate);
	const { queues, initialCategoryCounts } = buildQueues(candidates, dailyPlan);
	const maxSameProductPerDay =
		options.maxSameProductPerDay || DEFAULT_MAX_SAME_PRODUCT_PER_DAY;

	let dayIndex = 0;
	let moved = 0;
	let lastGroup = null;

	while (totalRemaining(queues) > 0) {
		const dayCounts = new Map();
		for (let slotIndex = 0; slotIndex < slotsUtc.length && totalRemaining(queues) > 0; slotIndex += 1) {
			const selected = takeFrom(
				queues,
				dailyPlan[slotIndex] || "wildcard",
				dayCounts,
				lastGroup,
				maxSameProductPerDay,
			);
			if (!selected) break;
			const nextScheduledAt = isoFor(startDate, dayIndex, slotsUtc[slotIndex]);
			if (selected.post.scheduledAt !== nextScheduledAt) moved += 1;
			selected.post.scheduledAt = nextScheduledAt;
			selected.post.updatedAt = new Date().toISOString();
			delete selected.post.scheduled_at;
			dayCounts.set(selected.group, (dayCounts.get(selected.group) || 0) + 1);
			lastGroup = selected.group;
		}
		dayIndex += 1;
	}

	return {
		posts,
		summary: {
			startDate,
			candidates: candidates.length,
			daysUsed: dayIndex,
			moved,
			dailyPlan,
			slotsUtc,
			maxSameProductPerDay,
			initialCategoryCounts,
		},
	};
}

async function main() {
	const args = parseArgs();
	const snapshot = await readStoreSnapshot();
	const { posts, summary } = rebalancePinterestMix(snapshot.posts, args);

	if (!args.dryRun) {
		await replaceStoreSnapshot({
			posts,
			postedLog: snapshot.postedLog,
			rejections: snapshot.rejections,
		});
	}

	console.log(JSON.stringify({ ...summary, dryRun: args.dryRun }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error(error?.message || error);
		process.exitCode = 1;
	});
}
