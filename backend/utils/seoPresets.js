/** @format */

const seoDefaults = {
        platform: "Cross-platform",
        author: "Ashley Broussard",
};

const seoProducts = {
	"daily-square": {
		title: "Daily Square Ritual – Auto GitHub Commits",
		description:
			"Never miss a green square again. Automate daily Git pushes with stealthy flair.",
		url: "https://fleurdevie.gumroad.com/l/daily-square",
		image: "https://yourcdn.com/assets/dailysquare-banner.png",
		price: "10.00",
	},
	"prompt-storm": {
		title: "PromptStorm – 100 Strategic AI Prompts",
		description:
			"Market better, think faster, and generate content like a boss with this AI prompt bundle.",
		url: "https://fleurdevie.gumroad.com/l/100prompt-storm",
		image: "https://yourcdn.com/assets/promptstorm-banner.png",
		price: "25.00",
	},
};

module.exports = {
        seoDefaults,
        seoProducts,
};


// Usage Example: Use on another page, mainpage ?
// import SEOHead from "@/UXUI/Components/SeoHead";
// import { seoProducts } from "@/utils/seoPresets";

// const meta = seoProducts["prompt-storm"];

// <SEOHead {...meta} />;
