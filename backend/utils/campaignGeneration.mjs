import { generateStructuredText, resolveAiConfig } from "./aiClient.mjs";
import { generateSeoPayload, extractJsonObject } from "./seoGeneration.mjs";
import { buildPinterestCreativeContext } from "./pinterestCreative.mjs";
import { getProductProfile } from "./productProfiles.mjs";

const ALLOWED_PHASES = new Set(["teaser", "launch", "follow_up", "evergreen"]);

function normalizePlatformId(value) {
  return String(value || "").trim().toLowerCase();
}

function inferPlatforms(input, productProfile) {
  const requested = Array.isArray(input.platformIds)
    ? input.platformIds.map(normalizePlatformId).filter(Boolean)
    : [];
  if (requested.length) return requested;
  return Array.isArray(productProfile?.promotionChannels)
    ? productProfile.promotionChannels.map(normalizePlatformId).filter(Boolean)
    : [];
}

function inferPhases(input, productProfile) {
  if (Array.isArray(input.campaignPhases) && input.campaignPhases.length) {
    return input.campaignPhases
      .map((phase) => String(phase || "").trim().toLowerCase())
      .filter((phase) => ALLOWED_PHASES.has(phase));
  }

  if (productProfile?.lifecycleStatus === "in-progress") {
    return ["teaser", "launch"];
  }

  if (productProfile?.lifecycleStatus === "planned") {
    return ["teaser"];
  }

  return ["launch", "follow_up", "evergreen"];
}

function buildCampaignPlannerPrompt(input, productProfile, platforms, phases, maxPosts) {
  const pinterestAware = platforms.includes("pinterest")
    ? "Pinterest rule: avoid repeated hooks, repeated visuals, and repeated products. Rotate emotional trigger, format, and product category instead."
    : "";
  return [
    "You are a marketing campaign planner.",
    "Return valid JSON only. Do not wrap it in markdown fences.",
    `Product: ${input.productName}`,
    `Type: ${input.productType}`,
    `Audience: ${input.audience}`,
    `Lifecycle status: ${productProfile?.lifecycleStatus || "unknown"}`,
    `Primary goal: ${productProfile?.primaryGoal || "unspecified"}`,
    `Platforms: ${platforms.join(", ")}`,
    `Allowed campaign phases: ${phases.join(", ")}`,
    `Maximum posts to plan: ${maxPosts}`,
    pinterestAware,
    "Task: plan a compact multi-platform campaign. Choose the most useful combinations only.",
    `Use this exact JSON shape:
{
  "campaign_posts": [
    {
      "phase": "",
      "platform": "",
      "post_intent": "",
      "angle": ""
    }
  ]
}`,
  ].join("\n\n");
}

export function normalizeCampaignPlan(raw, { allowedPlatforms = [], allowedPhases = [], maxPosts = 6 } = {}) {
  const validPlatforms = new Set(allowedPlatforms.map(normalizePlatformId));
  const validPhases = new Set(allowedPhases);
  const items = Array.isArray(raw?.campaign_posts) ? raw.campaign_posts : [];
  const dedupe = new Set();

  return {
    campaign_posts: items
      .map((item) => {
        const platform = normalizePlatformId(item?.platform);
        const phase = String(item?.phase || "").trim().toLowerCase();
        const postIntent = String(item?.post_intent || "").trim().toLowerCase();
        const angle = String(item?.angle || "").trim();
        if (!platform || !phase || !angle) return null;
        if (validPlatforms.size && !validPlatforms.has(platform)) return null;
        if (validPhases.size && !validPhases.has(phase)) return null;
        const key = `${platform}:${phase}:${angle.toLowerCase()}`;
        if (dedupe.has(key)) return null;
        dedupe.add(key);
        return {
          phase,
          platform,
          post_intent: postIntent || null,
          angle,
        };
      })
      .filter(Boolean)
      .slice(0, maxPosts),
  };
}

function buildCampaignDraft(planItem, generated, input) {
  const variant = generated.platform_variants?.[planItem.platform] ||
    generated.platform_variants?.[planItem.platform === "x" ? "X" : planItem.platform.charAt(0).toUpperCase() + planItem.platform.slice(1)] ||
    null;
  const title =
    variant?.hook ||
    generated.hook_options?.[0] ||
    generated.product_name ||
    input.productName;
  const body =
    variant?.body ||
    generated.meta_description ||
    generated.seo_human_pitch ||
    "";
  const hashtags = Array.isArray(generated.hashtags?.All)
    ? generated.hashtags.All
    : [];

  return {
    platform: planItem.platform,
    phase: planItem.phase,
    post_intent: generated.post_intent || planItem.post_intent || input.postIntent || "",
    campaign_angle: generated.campaign_angle || planItem.angle,
    product: generated.product || input.productName,
    psychological_trigger: generated.psychological_trigger || "",
    title,
    body,
    hook: generated.hook || title,
    visual_style: generated.visual_style || "",
    category: generated.category || "",
    destination_url: generated.destination_url || generated.link?.gumroad || generated.link?.amazon || generated.link?.utm_base || "",
    confidence_score: generated.confidence_score || 0,
    cta: variant?.cta || generated.primary_cta || "",
    hashtags,
    visual_hook: generated.visual_hook || "",
    image_concept: generated.image_concept || "",
    image_prompt: generated.image_prompt || "",
    alt_text: generated.alt_text_examples?.[0] || "",
    asset_expansion: generated.asset_expansion || null,
    lane_priority: generated.lane_priority || null,
    seasonality: generated.seasonality || null,
    image_prompt_variants: generated.image_prompt_variants || null,
    ip_repurposing: generated.ip_repurposing || null,
    winner_expansion: generated.winner_expansion || null,
    generated,
  };
}

export async function generateCampaignPlan(input, options = {}) {
  const productProfile = getProductProfile(input.productProfileId);
  const platforms = inferPlatforms(input, productProfile);
  const phases = inferPhases(input, productProfile);
  const maxPosts = Math.max(1, Math.min(Number(input.maxPosts || 6), 12));
  const prompt = buildCampaignPlannerPrompt(input, productProfile, platforms, phases, maxPosts);
  const rawText = await generateStructuredText(prompt, options);
  const parsed = extractJsonObject(rawText);
  return normalizeCampaignPlan(parsed, {
    allowedPlatforms: platforms,
    allowedPhases: phases,
    maxPosts,
  });
}

export async function generateCampaignPosts(input, options = {}) {
  const config = resolveAiConfig(options);
  const plan = await generateCampaignPlan(input, options);
  const pinterestCreativeContext =
    options.pinterestCreativeContext || (await buildPinterestCreativeContext(input));
  const posts = [];

  for (const item of plan.campaign_posts) {
    const generated = await generateSeoPayload(
      {
        productName: input.productName,
        productType: input.productType,
        audience: input.audience,
        productProfileId: input.productProfileId,
        platformIds: [item.platform],
        postIntent: item.post_intent || input.postIntent || null,
        campaignPhase: item.phase,
        campaignAngle: item.angle,
      },
      {
        ...options,
        pinterestCreativeContext,
        provider: config.provider,
      },
    );
    posts.push(buildCampaignDraft(item, generated, input));
  }

  return {
    provider: config.provider,
    model: config.model,
    plan,
    posts,
  };
}

export function getCampaignDryRunPayload(input, options = {}) {
  const config = resolveAiConfig(options);
  const productProfile = getProductProfile(input.productProfileId);
  const platforms = inferPlatforms(input, productProfile);
  const phases = inferPhases(input, productProfile);
  const maxPosts = Math.max(1, Math.min(Number(input.maxPosts || 6), 12));
  const plannerPrompt = buildCampaignPlannerPrompt(input, productProfile, platforms, phases, maxPosts);

  return {
    mode: "dry-run",
    provider: config.provider,
    model: config.model,
    planner_prompt: plannerPrompt,
    allowed_platforms: platforms,
    allowed_phases: phases,
    max_posts: maxPosts,
  };
}
