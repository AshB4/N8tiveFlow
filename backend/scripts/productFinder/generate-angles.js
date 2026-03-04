/** @format */

const shortPrice = (priceDisplay, priceValue) => {
	if (priceDisplay) return priceDisplay;
	if (Number.isFinite(priceValue)) return `$${priceValue.toFixed(2)}`;
	return "a solid price";
};

export function generateAngles(product, niche) {
	const label = niche?.name || "this niche";
	const price = shortPrice(product.priceDisplay, product.priceValue);

	return {
		pinterest: [
			`${product.title}: a ${label} favorite at ${price}.`,
			`If you want ${label} upgrades, this one is worth a look.`,
		],
		facebook: [
			`Found a practical ${label} pick: ${product.title} (${price}).`,
			`Quick find for ${label}: ${product.title}.`,
		],
		x: [
			`${product.title} is a clean ${label} pick at ${price}.`,
			`Simple ${label} win: ${product.title}.`,
		],
	};
}

