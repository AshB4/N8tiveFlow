/** @format */

// tailwind.config.js
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
	theme: {
		extend: {
			colors: {
				ritual: "#0f172a", // Deep dark mode navy
				sacred: "#3b82f6", // Bright sacred blue
			},
		},
	},
	plugins: [
		require("@tailwindcss/forms"),
		require("@tailwindcss/typography"),
		require("@tailwindcss/aspect-ratio"),
	],
};
