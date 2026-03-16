import test from "node:test";
import assert from "node:assert/strict";
import { buildChunkedPromptStages, buildSeoPrompt } from "../utils/GptPromptBuilder.js";
import {
  extractJsonObject,
  getDryRunPayload,
  normalizeSeoResult,
} from "../utils/seoGeneration.mjs";

test("buildSeoPrompt asks for strict JSON output", () => {
  const prompt = buildSeoPrompt("PostPunk", "Automation Tool", "Indie devs", {
    platformIds: ["linkedin"],
    selectedPlatforms: [
      {
        id: "linkedin",
        label: "LinkedIn",
        audienceExpectation: "credible, useful, specific, professional",
        voice: "calm, informed, human, experience-backed",
        structureRules: ["Lead with the insight or problem."],
        ctaStyle: "Invite discussion, feedback, or reflection.",
        avoid: ["sloppy irony"],
      },
    ],
  });
  assert.match(prompt, /Return valid JSON only/);
  assert.match(prompt, /"product_name": "PostPunk"/);
  assert.match(prompt, /"keywords": \[/);
  assert.match(prompt, /Target platforms: linkedin/);
  assert.match(prompt, /LinkedIn/);
  assert.match(prompt, /Lead with the insight or problem/);
  assert.match(prompt, /Suggested post intent:/);
  assert.match(prompt, /Campaign phase:/);
  assert.match(prompt, /"hook_options": \[/);
  assert.match(prompt, /"platform_variants":/);
  assert.match(prompt, /"campaign_phase":/);
  assert.match(prompt, /"visual_hook":/);
});

test("buildSeoPrompt includes product profile guidance when provided", () => {
  const prompt = buildSeoPrompt("Coloring Books", "Physical products", "Gift buyers", {
    platformIds: ["amazon"],
    selectedPlatforms: [],
    productProfile: {
      label: "Coloring Books",
      category: "Physical products",
      productType: "Printable and paperback coloring books",
      audience: "parents and gift buyers",
      brandVoice: "warm and visual",
      primaryGoal: "sell books",
      promotionChannels: ["amazon", "pinterest"],
      notes: ["Lead with use case"],
    },
  });

  assert.match(prompt, /Product-specific guidance/);
  assert.match(prompt, /Coloring Books/);
  assert.match(prompt, /Lead with use case/);
  assert.match(prompt, /Link and CTA policy/);
  assert.match(prompt, /jab posts/);
  assert.match(prompt, /Campaign phase rules/);
});

test("buildChunkedPromptStages creates small staged prompts", () => {
  const stages = buildChunkedPromptStages("Goblin Core", "Printable pack", "Goblin fans", {
    platformIds: ["facebook", "pinterest"],
    selectedPlatforms: [],
    postIntent: "soft-sell",
    campaignPhase: "launch",
  });

  assert.equal(stages.length, 4);
  assert.deepEqual(
    stages.map((stage) => stage.id),
    ["strategy", "discoverability", "copy", "visual"],
  );
  assert.match(stages[0].prompt, /campaign_phase/);
  assert.match(stages[1].prompt, /hook_options/);
  assert.match(stages[2].prompt, /platform_variants/);
  assert.match(stages[3].prompt, /image_prompt/);
});

test("extractJsonObject parses wrapped JSON", () => {
  const parsed = extractJsonObject('noise before {"hello":"world"} noise after');
  assert.deepEqual(parsed, { hello: "world" });
});

test("normalizeSeoResult fills defaults", () => {
  const normalized = normalizeSeoResult(
    {
      product_name: "PostPunk",
      keywords: ["a", "b"],
      meta_description: "desc",
    },
    {
      productName: "PostPunk",
      productType: "Automation Tool",
      audience: "Indie devs",
    },
  );

  assert.equal(normalized.slug, "postpunk");
  assert.equal(normalized.product_type, "Automation Tool");
  assert.equal(normalized.audience, "Indie devs");
  assert.equal(normalized.primary_cta, "");
  assert.equal(normalized.campaign_phase, "");
  assert.equal(normalized.campaign_angle, "");
  assert.equal(normalized.visual_hook, "");
  assert.deepEqual(normalized.hook_options, []);
  assert.deepEqual(normalized.platforms, ["LinkedIn", "X", "Reddit"]);
  assert.equal(
    normalized.link.utm_base,
    "?utm_source=__PLATFORM__&utm_medium=social&utm_campaign=__CAMPAIGN__",
  );
});

test("dry run for ollama returns chunked stages without calling network", () => {
  const payload = getDryRunPayload(
    {
      productName: "PostPunk",
      productType: "Automation Tool",
      audience: "Indie devs",
      platformIds: ["x", "linkedin"],
    },
    {
      provider: "ollama",
      model: "llama3.1:8b",
    },
  );

  assert.equal(payload.mode, "dry-run");
  assert.equal(payload.provider, "ollama");
  assert.equal(payload.model, "llama3.1:8b");
  assert.equal(payload.stages.length, 4);
  assert.match(payload.prompt, /## Strategy/);
  assert.match(payload.prompt, /## Visual/);
});

test("dry run for openai keeps monolithic prompt", () => {
  const payload = getDryRunPayload(
    {
      productName: "PostPunk",
      productType: "Automation Tool",
      audience: "Indie devs",
      platformIds: ["x", "linkedin"],
    },
    {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  );

  assert.equal(payload.mode, "dry-run");
  assert.equal(payload.provider, "openai");
  assert.equal(payload.model, "gpt-4o-mini");
  assert.equal(payload.stages, undefined);
  assert.match(payload.prompt, /Target platforms: x, linkedin/);
});
