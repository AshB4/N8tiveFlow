import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalyticsSummary } from "../utils/analyticsSummary.mjs";

test("buildAnalyticsSummary aggregates totals and leaders", () => {
  const summary = buildAnalyticsSummary(
    [
      {
        platform: "LinkedIn",
        campaign: "Launch",
        clicks: 20,
        signups: 3,
        conversions: 1,
        likes: 5,
        timestamp: "2026-03-10T10:00:00Z",
      },
      {
        platform: "Pinterest",
        campaign: "Pins",
        clicks: 45,
        signups: 2,
        conversions: 2,
        saves: 8,
        timestamp: "2026-03-11T10:00:00Z",
      },
    ],
    {
      total_posts_attempted: 10,
      total_posts_successful: 8,
      success_rate: 80,
      total_rejected: 2,
      most_active_day: "Tuesday",
    },
  );

  assert.equal(summary.totals.clicks, 65);
  assert.equal(summary.totals.signups, 5);
  assert.equal(summary.topPlatform.platform, "Pinterest");
  assert.equal(summary.topCampaign.campaign, "Pins");
  assert.equal(summary.posting.totalSuccessful, 8);
});
