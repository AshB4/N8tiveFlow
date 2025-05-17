/** @format */

// /utils/seoCheckRunner.js
import { seoProducts } from "../utils/seoPresets.js";

export function runSeoCheck(productKey) {
	const data = seoProducts[productKey];

	if (!data) {
		return {
			ok: false,
			error: `❌ No SEO metadata found for '${productKey}'`,
		};
	}

	const schema = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: data.title,
		description: data.description,
		operatingSystem: "Cross-platform",
		applicationCategory: "DeveloperTool",
		offers: {
			"@type": "Offer",
			priceCurrency: "USD",
			price: data.price,
			url: data.url,
		},
		author: {
			"@type": "Person",
			name: "Ashley Broussard",
		},
	};

	return {
		ok: true,
		meta: {
			title: data.title,
			description: data.description,
			image: data.image,
			url: data.url,
		},
		schema,
		todoLinks: {
			metatags: "https://metatags.io/",
			pagespeed: "https://pagespeed.web.dev/",
			console: "https://search.google.com/search-console/",
			answerThePublic: "https://answerthepublic.com/",
			trends: "https://trends.google.com/",
		},
	};
}
