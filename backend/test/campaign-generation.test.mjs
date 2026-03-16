import test from "node:test";
import assert from "node:assert/strict";
import {
  getCampaignDryRunPayload,
  normalizeCampaignPlan,
} from "../utils/campaignGeneration.mjs";

test("normalizeCampaignPlan filters invalid and duplicate items", () => {
  const normalized = normalizeCampaignPlan(
    {
      campaign_posts: [
        { phase: "launch", platform: "facebook", angle: "weird affirmations", post_intent: "punch" },
        { phase: "launch", platform: "facebook", angle: "weird affirmations", post_intent: "punch" },
        { phase: "bad", platform: "facebook", angle: "skip me" },
        { phase: "evergreen", platform: "tumblr", angle: "skip me too" },
      ],
    },
    {
      allowedPlatforms: ["facebook", "instagram"],
      allowedPhases: ["launch", "evergreen"],
      maxPosts: 6,
    },
  );

  assert.deepEqual(normalized, {
    campaign_posts: [
      {
        phase: "launch",
        platform: "facebook",
        post_intent: "punch",
        angle: "weird affirmations",
      },
    ],
  });
});

test("campaign dry run returns planner prompt and inferred platform/phase limits", () => {
  const payload = getCampaignDryRunPayload(
    {
      productName: "Goblin Core Coloring Affirmations",
      productType: "Printable goblin-core coloring affirmation pack",
      audience: "people who like weird affirmations",
      productProfileId: "goblin-coloring-affirmations",
      maxPosts: 4,
    },
    {
      provider: "ollama",
      model: "stable-code:3b-code-q4_0",
    },
  );

  assert.equal(payload.mode, "dry-run");
  assert.equal(payload.provider, "ollama");
  assert.equal(payload.model, "stable-code:3b-code-q4_0");
  assert.equal(payload.max_posts, 4);
  assert.deepEqual(payload.allowed_phases, ["launch", "follow_up", "evergreen"]);
  assert.match(payload.planner_prompt, /marketing campaign planner/i);
  assert.match(payload.planner_prompt, /Maximum posts to plan: 4/);
});
