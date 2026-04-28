import test from "node:test";
import assert from "node:assert/strict";
import {
	analyzePinterestPerformance,
	parseCsv,
} from "../utils/pinterestPerformanceAnalysis.mjs";

test("parseCsv reads Pinterest performance rows", () => {
	const rows = parseCsv(`pin_title,category,hook_type,product,impressions,saves,pin_clicks,outbound_clicks,status\nA,b,c,d,10,1,2,3,ok\n`);
	assert.equal(rows.length, 1);
	assert.equal(rows[0].pin_title, "A");
	assert.equal(rows[0].outbound_clicks, "3");
});

test("analyzePinterestPerformance scores and classifies pins", () => {
	const report = analyzePinterestPerformance([
		{
			pin_title: "Backyard Lighting Before & After",
			category: "home_garden_affiliate",
			hook_type: "transformation",
			product: "outdoor lights",
			impressions: 537,
			saves: 10,
			pin_clicks: 7,
			outbound_clicks: 2,
		},
		{
			pin_title: "Nail Pin Variant",
			category: "nails",
			hook_type: "generic_beauty",
			product: "nails",
			impressions: 5,
			saves: 0,
			pin_clicks: 0,
			outbound_clicks: 0,
		},
	]);

	assert.equal(report.top_winners[0].decision, "SCALE");
	assert.equal(report.pause[0].decision, "PAUSE");
	assert.ok(report.winner_expansion.length > 0);
	assert.match(report.content_priority_next_30_days.home_garden, /Scale/);
});
