/** @format */

// Amazon Product Advertising
// 📘 Docs:
// https://webservices.amazon.com/paapi5/documentation/
// 🧠 Main Use: GetItems, SearchItems, GetBrowseNodes
// Important pages to research:
// https://webservices.amazon.com/paapi5/documentation/register-for-pa-api.html
// https://affiliate-program.amazon.com/welcome/topic/tools
// https://affiliate-program.amazon.com/home/account/profile/sitelist - add pages with this link
// https://www.amazon.com/b?node=120697190011&ref=CG_ac_dyk_240424_Inspiration_TrendingCU - trending items
// https://affiliate-program.amazon.com/home - affiliate dashboard

const affiliateTag = "ashb4studio-20";

function buildAmazonLink({ asin, utm = "", title, description }) {
	const baseLink = `https://www.amazon.com/dp/${asin}?tag=${affiliateTag}${
		utm ? `&${utm}` : ""
	}`;

	return `
  <div class="ritual-tool">
    <h3>${title}</h3>
    <p>${description}</p>
    <a href="${baseLink}" target="_blank" rel="noopener noreferrer">Buy on Amazon</a>
    <p><em>As an Amazon Associate, I earn from qualifying purchases.</em></p>
  </div>
  `;
}

// Ritual Gear Picks – With Working Affiliate ASINs + UTM
const gear = [
	{
		asin: "B08GKVBYHY",
		title: "🎨 Chaos Pens – 120-Color Gel Set",
		description:
			"Color your stress away with this full-spectrum feral pack. Great for journaling, goblin affirmations, or silently judging spreadsheets in technicolor.",
		utm: "utm_source=postpunk&utm_medium=web&utm_campaign=goblinkit",
	},
	{
		asin: "B07L5NK4HR",
		title: "🌲 Goblin Reset Diffuser – Serenity + Calm (Forest Witch Energy)",
		description:
			"Place it near your coloring altar. Let the misty calm do the emotional labor. Forest-scented grounding for chaotic creatives.",
		utm: "utm_source=postpunk&utm_medium=web&utm_campaign=ritualreset",
	},
	{
		asin: "B002XULC26",
		title: "💎 Alchemy Diffuser – Moroccan Amber by NEST",
		description:
			"Rich, warm, and ceremonial. This one smells like you paid a priestess to clear your shame energy with resin smoke.",
		utm: "utm_source=postpunk&utm_medium=web&utm_campaign=ritualreset",
	},
	{
		asin: "B07WL4P8F4",
		title: "🦴 Black Cherry Chaos Diffuser – Gothic Goblin Approved",
		description:
			"Dark bottle. Sweet scent. Subtle menace. Use when summoning motivation from the void.",
		utm: "utm_source=postpunk&utm_medium=web&utm_campaign=ritualreset",
	},
];

// Render all ritual gear
gear.forEach((item) => {
	console.log(buildAmazonLink(item));
});
