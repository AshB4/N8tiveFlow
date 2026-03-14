import test from "node:test";
import assert from "node:assert/strict";
import { buildSeoPrompt } from "../utils/GptPromptBuilder.js";
import {
  extractJsonObject,
  getDryRunPayload,
  normalizeSeoResult,
} from "../utils/seoGeneration.mjs";

test("buildSeoPrompt asks for strict JSON output", () => {
  const prompt = buildSeoPrompt("PostPunk", "Automation Tool", "Indie devs");
  assert.match(prompt, /Return valid JSON only/);
  assert.match(prompt, /"product_name": "PostPunk"/);
  assert.match(prompt, /"keywords": \[/);
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
  assert.deepEqual(normalized.platforms, ["LinkedIn", "X", "Reddit"]);
  assert.equal(
    normalized.link.utm_base,
    "?utm_source=__PLATFORM__&utm_medium=social&utm_campaign=__CAMPAIGN__",
  );
});

test("dry run resolves provider without calling network", () => {
  const payload = getDryRunPayload(
    {
      productName: "PostPunk",
      productType: "Automation Tool",
      audience: "Indie devs",
    },
    {
      provider: "ollama",
      model: "llama3.1:8b",
    },
  );

  assert.equal(payload.mode, "dry-run");
  assert.equal(payload.provider, "ollama");
  assert.equal(payload.model, "llama3.1:8b");
  assert.match(payload.prompt, /PostPunk/);
});
