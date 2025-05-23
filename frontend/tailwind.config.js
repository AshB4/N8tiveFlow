/** @format */

module.exports = {
	content: [
		"./frontend/**/*.{js,jsx,ts,tsx}",
		"./ui/**/*.{js,jsx,ts,tsx}",
		"./public/index.html",
	],
	theme: {
		extend: {
			colors: {
				ritual: "#0f172a",
				sacred: "#3b82f6",
			},
		},
	},
	plugins: [
		require("@tailwindcss/forms"),
		require("@tailwindcss/typography"),
		require("@tailwindcss/aspect-ratio"),
	],
};
