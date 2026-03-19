import {
  buildChunkedPromptStages,
  buildCopyStagePrompt,
  buildDiscoverabilityStagePrompt,
  buildSeoPrompt,
  buildStrategyStagePrompt,
  buildVisualStagePrompt,
} from "./GptPromptBuilder.js";
import { generateStructuredText, resolveAiConfig } from "./aiClient.mjs";
import { getPlatformPromptProfiles } from "./platformProfiles.mjs";
import { getProductProfile } from "./productProfiles.mjs";

export function extractJsonObject(text) {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("AI response was empty");
  }

  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("AI response did not contain valid JSON");
    }
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }
}

export function normalizeSeoResult(raw, input) {
  const hashtags =
    raw.hashtags && typeof raw.hashtags === "object" ? raw.hashtags : {};
  const imageRequirements =
    raw.image_requirements && typeof raw.image_requirements === "object"
      ? raw.image_requirements
      : {};
  const preferredPostTimes =
    raw.preferred_post_times && typeof raw.preferred_post_times === "object"
      ? raw.preferred_post_times
      : {};
  const links = raw.link && typeof raw.link === "object" ? raw.link : {};
  const intentLayer =
    raw.intent_layer && typeof raw.intent_layer === "object" ? raw.intent_layer : {};
  const angleOptions =
    raw.angle_options && typeof raw.angle_options === "object" ? raw.angle_options : {};

  return {
    product_name: raw.product_name || input.productName,
    slug: raw.slug || input.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    product_type: raw.product_type || input.productType,
    audience: raw.audience || input.audience,
    post_intent: raw.post_intent || "",
    campaign_phase: raw.campaign_phase || input.campaignPhase || "",
    campaign_angle: raw.campaign_angle || "",
    intent_layer: {
      primary_intent: intentLayer.primary_intent || "",
      keyword_focus: intentLayer.keyword_focus || "",
      use_case: intentLayer.use_case || "",
      audience_segment: intentLayer.audience_segment || "",
    },
    core_problem: raw.core_problem || "",
    core_promise: raw.core_promise || "",
    cta_mode: raw.cta_mode || "",
    primary_cta: raw.primary_cta || "",
    secondary_cta: raw.secondary_cta || "",
    answer_style_description: raw.answer_style_description || "",
    hook_options: Array.isArray(raw.hook_options) ? raw.hook_options.filter(Boolean) : [],
    angle_options: {
      problem: angleOptions.problem || "",
      aesthetic: angleOptions.aesthetic || "",
      beginner: angleOptions.beginner || "",
      comparison: angleOptions.comparison || "",
    },
    platforms: Array.isArray(raw.platforms) && raw.platforms.length ? raw.platforms : ["LinkedIn", "X", "Reddit"],
    desperate_search_queries: Array.isArray(raw.desperate_search_queries)
      ? raw.desperate_search_queries.filter(Boolean)
      : [],
    unaware_search_questions: Array.isArray(raw.unaware_search_questions)
      ? raw.unaware_search_questions.filter(Boolean)
      : [],
    seo_human_pitch: raw.seo_human_pitch || "",
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter(Boolean) : [],
    hashtags,
    meta_description: raw.meta_description || "",
    alt_text_examples: Array.isArray(raw.alt_text_examples)
      ? raw.alt_text_examples.filter(Boolean)
      : [],
    visual_hook: raw.visual_hook || "",
    image_concept: raw.image_concept || "",
    image_prompt: raw.image_prompt || "",
    image_requirements: imageRequirements,
    platform_variants:
      raw.platform_variants && typeof raw.platform_variants === "object"
        ? raw.platform_variants
        : {},
    preferred_post_times: preferredPostTimes,
    link: {
      gumroad: links.gumroad || "",
      amazon: links.amazon || "",
      utm_base:
        links.utm_base ||
        "?utm_source=__PLATFORM__&utm_medium=social&utm_campaign=__CAMPAIGN__",
    },
    campaigns: Array.isArray(raw.campaigns) ? raw.campaigns : [],
  };
}

function buildPromptContext(input) {
  const platformIds = Array.isArray(input.platformIds) ? input.platformIds : [];
  const selectedPlatforms = getPlatformPromptProfiles(platformIds);
  const productProfile = getProductProfile(input.productProfileId);
  return {
    platformIds,
    selectedPlatforms,
    productProfile,
    postIntent: input.postIntent,
    campaignPhase: input.campaignPhase,
    campaignAngle: input.campaignAngle,
    visualHook: input.visualHook,
  };
}

async function runChunkedSeoGeneration(input, options = {}, context = {}) {
  const strategyPrompt = buildStrategyStagePrompt(
    input.productName,
    input.productType,
    input.audience,
    context,
  );
  const strategy = extractJsonObject(await generateStructuredText(strategyPrompt, options));

  const discoverabilityPrompt = buildDiscoverabilityStagePrompt(
    input.productName,
    input.productType,
    input.audience,
    context,
    strategy,
  );
  const discoverability = extractJsonObject(
    await generateStructuredText(discoverabilityPrompt, options),
  );

  const copyPrompt = buildCopyStagePrompt(
    input.productName,
    input.productType,
    input.audience,
    context,
    strategy,
    discoverability,
  );
  const copy = extractJsonObject(await generateStructuredText(copyPrompt, options));

  const visualPrompt = buildVisualStagePrompt(
    input.productName,
    input.productType,
    input.audience,
    context,
    strategy,
  );
  const visual = extractJsonObject(await generateStructuredText(visualPrompt, options));

  return {
    product_name: input.productName,
    product_type: input.productType,
    audience: input.audience,
    ...strategy,
    ...discoverability,
    ...copy,
    ...visual,
  };
}

export async function generateSeoPayload(input, options = {}) {
  const context = buildPromptContext(input);
  const config = resolveAiConfig(options);
  const parsed =
    config.provider === "ollama"
      ? await runChunkedSeoGeneration(input, options, context)
      : extractJsonObject(
          await generateStructuredText(
            buildSeoPrompt(input.productName, input.productType, input.audience, context),
            options,
          ),
        );
  return normalizeSeoResult(parsed, input);
}

export function getDryRunPayload(input, options = {}) {
  const config = resolveAiConfig(options);
  const context = buildPromptContext(input);
  if (config.provider === "ollama") {
    const stages = buildChunkedPromptStages(
      input.productName,
      input.productType,
      input.audience,
      context,
    );
    return {
      mode: "dry-run",
      provider: config.provider,
      model: config.model,
      prompt: stages
        .map((stage) => `## ${stage.label}\n${stage.prompt}`)
        .join("\n\n"),
      stages,
    };
  }
  return {
    mode: "dry-run",
    provider: config.provider,
    model: config.model,
    prompt: buildSeoPrompt(input.productName, input.productType, input.audience, context),
  };
}
