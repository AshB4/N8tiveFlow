import test from "node:test";
import assert from "node:assert/strict";
import {
  enrichPinterestCreativeResult,
} from "../utils/pinterestCreative.mjs";
import { buildPinterestCreativeLayer } from "../utils/GptPromptBuilder.js";

test("Pinterest guidance surfaces recent hooks and lanes", () => {
  const guidance = buildPinterestCreativeLayer({
    enabled: true,
    trigger: "peace/quiet",
    category: "home/garden affiliate",
    categoryThrottleCount: 3,
    recentHooks: ["Safe Water Play for Little Ones"],
    recentVisuals: ["same goblin art"],
    priorityLanes: ["seasonal affiliate", "home/garden affiliate"],
  });

  assert.match(guidance, /Trigger lane: peace\/quiet/);
  assert.match(guidance, /Category throttle: 3 recent pin\(s\)/);
  assert.match(guidance, /Safe Water Play for Little Ones/);
  assert.match(guidance, /same goblin art/);
});

test("Pinterest creative enrichment rewrites near duplicates", () => {
  const result = enrichPinterestCreativeResult(
    {
      product_name: "Splash Mat",
      product: "Splash Mat",
      hook: "Safe Water Play for Little Ones",
      visual_style: "same image style",
      image_concept: "same image style",
      destination_url: "https://example.com/pin",
    },
    {
      productName: "Splash Mat",
      productType: "Backyard water toy",
      audience: "parents",
      productProfileId: "buzzing-adventures-coloring-book",
    },
    {
      enabled: true,
      trigger: "peace/quiet",
      category: "home/garden affiliate",
      categoryThrottleCount: 3,
      recentHistory: [
        {
          hook: "Safe Water Play for Little Ones",
          visualStyle: "same image style",
          category: "home/garden affiliate",
          timestamp: Date.now(),
        },
      ],
      recentHooks: ["Safe Water Play for Little Ones"],
      recentVisuals: ["same image style"],
      priorityLanes: ["seasonal affiliate", "home/garden affiliate"],
    },
  );

  assert.notEqual(result.hook, "Safe Water Play for Little Ones");
  assert.notEqual(result.visual_style, "same image style");
  assert.equal(result.category_throttle_hit, true);
  assert.ok(result.confidence_score <= 99);
  assert.ok(Array.isArray(result.winner_expansion.adjacent_variations));
  assert.equal(result.asset_expansion.recommended_image_count, 3);
  assert.ok(result.asset_expansion.same_product_variants.length > 0);
  assert.ok(result.image_prompt_variants.ugc_style.length > 0);
});
