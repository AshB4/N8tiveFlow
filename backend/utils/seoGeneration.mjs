import { buildSeoPrompt } from "./GptPromptBuilder.js";
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

  return {
    product_name: raw.product_name || input.productName,
    slug: raw.slug || input.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    product_type: raw.product_type || input.productType,
    audience: raw.audience || input.audience,
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
    image_requirements: imageRequirements,
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

export async function generateSeoPayload(input, options = {}) {
  const platformIds = Array.isArray(input.platformIds) ? input.platformIds : [];
  const selectedPlatforms = getPlatformPromptProfiles(platformIds);
  const productProfile = getProductProfile(input.productProfileId);
  const prompt = buildSeoPrompt(input.productName, input.productType, input.audience, {
    platformIds,
    selectedPlatforms,
    productProfile,
  });
  const rawText = await generateStructuredText(prompt, options);
  const parsed = extractJsonObject(rawText);
  return normalizeSeoResult(parsed, input);
}

export function getDryRunPayload(input, options = {}) {
  const config = resolveAiConfig(options);
  const platformIds = Array.isArray(input.platformIds) ? input.platformIds : [];
  const selectedPlatforms = getPlatformPromptProfiles(platformIds);
  const productProfile = getProductProfile(input.productProfileId);
  return {
    mode: "dry-run",
    provider: config.provider,
    model: config.model,
    prompt: buildSeoPrompt(input.productName, input.productType, input.audience, {
      platformIds,
      selectedPlatforms,
      productProfile,
    }),
  };
}
