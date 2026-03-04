/** @format */

const clamp = (value, min = 0, max = 100) =>
	Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));

const tokenize = (value = "") =>
	String(value)
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter(Boolean);

function scoreRelevance(title, keywords) {
	const titleTokens = new Set(tokenize(title));
	const input = Array.isArray(keywords) ? keywords : tokenize(keywords);
	if (input.length === 0) return 40;
	const matches = input.filter((token) => titleTokens.has(String(token).toLowerCase()));
	return clamp((matches.length / input.length) * 100);
}

function scorePriceBand(priceValue, targetPriceBand) {
	if (!Number.isFinite(priceValue) || priceValue <= 0) return 30;
	if (!targetPriceBand || !Number.isFinite(targetPriceBand.min) || !Number.isFinite(targetPriceBand.max)) {
		if (priceValue >= 15 && priceValue <= 80) return 80;
		if (priceValue > 80 && priceValue <= 160) return 65;
		return 45;
	}
	if (priceValue >= targetPriceBand.min && priceValue <= targetPriceBand.max) return 100;
	const midpoint = (targetPriceBand.min + targetPriceBand.max) / 2;
	const delta = Math.abs(priceValue - midpoint);
	const spread = Math.max(1, targetPriceBand.max - targetPriceBand.min);
	return clamp(100 - (delta / spread) * 100);
}

function scoreCommission(category = "") {
	const value = String(category).toLowerCase();
	if (/(luxury|beauty|furniture|home)/.test(value)) return 85;
	if (/(kitchen|garden|outdoor|tools)/.test(value)) return 75;
	if (/(electronics|computer|video)/.test(value)) return 45;
	return 60;
}

function scoreSocialFit(title = "", imageUrl = "") {
	let score = 45;
	if (title.length >= 30 && title.length <= 110) score += 20;
	if (/(set|kit|before|after|upgrade|gift|hack|organizer|bundle)/i.test(title)) {
		score += 20;
	}
	if (imageUrl) score += 15;
	return clamp(score);
}

function scoreHistorical(asin, history = []) {
	const entries = history.filter((row) => row?.asin === asin);
	if (entries.length === 0) return 50;
	const clicks = entries.reduce((sum, row) => sum + (row.clicks || 0), 0);
	const revenue = entries.reduce((sum, row) => sum + (row.revenue || 0), 0);
	const ctrBoost = Math.min(clicks, 50) * 0.8;
	const revBoost = Math.min(revenue, 200) * 0.2;
	return clamp(45 + ctrBoost + revBoost);
}

export function scoreProduct(product, niche, history) {
	const keywords = niche?.keywords || niche?.name || "";
	const relevance = scoreRelevance(product.title, keywords);
	const commission = scoreCommission(product.category);
	const price = scorePriceBand(product.priceValue, niche?.targetPriceBand);
	const socialFit = scoreSocialFit(product.title, product.imageUrl);
	const historical = scoreHistorical(product.asin, history);

	const total = clamp(
		0.3 * relevance +
			0.2 * commission +
			0.15 * price +
			0.2 * socialFit +
			0.15 * historical,
	);

	return {
		relevance,
		commission,
		price,
		socialFit,
		historical,
		total,
	};
}

