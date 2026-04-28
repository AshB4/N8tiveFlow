/** @format */

export function inferPostIntent(options = {}, productProfile) {
	if (options.postIntent) return options.postIntent;
	if (productProfile?.category === "Devtools") return "educational";
	if (productProfile?.category === "Physical products") return "soft-sell";
	if (productProfile?.category === "Digital products") return "jab";
	return "balanced";
}

export function inferCampaignPhase(options = {}, productProfile) {
	if (options.campaignPhase) return options.campaignPhase;
	if (productProfile?.category === "Devtools") return "evergreen";
	return "evergreen";
}

export function inferLinkPolicy(productProfile) {
	const primary = productProfile?.links?.primary || "";
	if (!primary) {
		return "No live primary product link is available. Do not pretend a launch URL exists.";
	}
	if (/amazon\./i.test(primary)) {
		return "If linking to Amazon, preserve the product URL and assume affiliate-tagging may be applied downstream.";
	}
	return "Use the real primary product link only when the post intent justifies a CTA.";
}

export function buildSystemLayer() {
	return [
		"You are a multi-platform marketing strategist, copywriter, and SEO assistant.",
		"Return valid JSON only. Do not wrap it in markdown fences.",
	].join("\n");
}

export function buildPlatformGuidance(selectedPlatforms = []) {
	if (!Array.isArray(selectedPlatforms) || selectedPlatforms.length === 0) {
		return "No specific platform guidance supplied. Keep the copy flexible and broadly usable.";
	}

	return selectedPlatforms
		.map((profile) => {
			const rules = Array.isArray(profile.structureRules)
				? profile.structureRules.join(" | ")
				: "";
			const avoid = Array.isArray(profile.avoid) ? profile.avoid.join(", ") : "";
			return `- ${profile.label} (${profile.id})
  audience: ${profile.audienceExpectation}
  voice: ${profile.voice}
  structure: ${rules}
  cta: ${profile.ctaStyle}
  avoid: ${avoid}`;
		})
		.join("\n");
}

export function buildProductGuidance(productProfile) {
	if (!productProfile) {
		return "No product profile selected. Keep the copy broadly useful.";
	}

	return `Selected product profile:
- label: ${productProfile.label}
- category: ${productProfile.category}
- product type: ${productProfile.productType}
- audience: ${productProfile.audience}
- brand voice: ${productProfile.brandVoice}
- primary goal: ${productProfile.primaryGoal}
- promotion channels: ${productProfile.promotionChannels?.join(", ") || "general"}
- notes: ${productProfile.notes?.join(" | ") || "none"}`;
}

export function buildInputLayer(productName, productType, audience, options = {}) {
	const postIntent = inferPostIntent(options, options.productProfile);
	const campaignPhase = inferCampaignPhase(options, options.productProfile);
	const campaignAngle = options.campaignAngle || "";
	return `Product: ${productName}
Type: ${productType}
Audience: ${audience}
Target platforms: ${options.platformIds?.join(", ") || "general multi-platform"}
Suggested post intent: ${postIntent}
Campaign phase: ${campaignPhase}
Campaign angle: ${campaignAngle || "not specified"}`;
}

export function buildPostIntentLayer(options = {}) {
	const postIntent = inferPostIntent(options, options.productProfile);
	return `Create copy that can support:
- jab posts: useful, trust-building, insight-first
- punch posts: direct offer, CTA, explicit product relevance
- soft-sell posts: human, warm, less pushy
- story posts: anecdotal or reflective
- educational posts: useful even without buying

Selected post intent: ${postIntent}`;
}

export function buildCampaignPhaseLayer(options = {}) {
	const campaignPhase = inferCampaignPhase(options, options.productProfile);
	return `Campaign phase rules:
- teaser: focus on curiosity, hint at the concept, avoid direct product links unless explicitly required
- launch: clear offer, stronger CTA, direct product relevance, link-friendly
- follow_up: reaction, reminder, proof, or payoff with softer CTA
- evergreen: discovery-focused, SEO-friendly, and useful beyond launch timing

Selected campaign phase: ${campaignPhase}
Selected campaign angle: ${options.campaignAngle || "not specified"}`;
}

export function buildContentMixLayer() {
	return `Content mix guidance:
- Do not make every post a product blurb.
- Keep the output interesting even without the product link.
- Mix these categories across a batch or campaign:
  - product/value posts: the thing, the use case, the problem solved
  - creator/identity posts: who the creator is, what they make, what they stand for
  - process/build posts: behind the scenes, lessons learned, why it was made, what changed
  - direct sell posts: clear CTA, product-forward, offer-aware

Recommended balance across a content run:
- 60-70% product-adjacent value or personality posts
- 20-30% creator/process/identity posts
- 10-20% direct sell posts

Avoid:
- repeating the same emotional angle in every post
- sounding like every post is asking for a purchase
- making quirky tone do all the work without a clear idea`;
}

export function buildGuardrailsLayer(options = {}) {
	const linkPolicy = inferLinkPolicy(options.productProfile);
	return `Link and CTA policy:
${linkPolicy}

Do not:
- invent fake launches, fake metrics, or fake testimonials
- sound like every platform is the same
- push unfinished products like they are fully polished
- bury the actual value proposition in vague aesthetic language
- forget image planning for visual platforms
- generate broken text inside images
- use corporate wellness language when the brand should sound weird, human, or specific`;
}

export function buildBehaviorLayer() {
	return `Honor the selected platform guidance in:
- hooks
- CTA tone
- keywords and hashtags
- search query framing
- campaign naming ideas
- preferred platform emphasis
- platform_variants

Honor the product guidance in:
- tone consistency
- audience framing
- offer positioning
- CTA direction
- link destination assumptions
- jab vs punch judgment`;
}

export function buildIntentAnswerLayer() {
	return `Intent and answer framing:
- Map the post to a clear user intent instead of treating it like a vague product blurb.
- Frame the product or post as an answer to a specific situation, problem, aesthetic desire, beginner need, or comparison question.
- Prefer structured, useful, specific phrasing over generic hype.
- Use this answer-style pattern when writing copy: "If you're looking for [problem or goal], this [product or post] helps because [benefit]. It's especially useful for [use case or audience]."
- Generate multiple useful angles when possible so the same product can be packaged in different ways.

Supported angle families:
- problem
- aesthetic
- beginner
- comparison`;
}

export function buildOutputSchema(productName, productType, audience, options = {}) {
	const postIntent = inferPostIntent(options, options.productProfile);
	const campaignPhase = inferCampaignPhase(options, options.productProfile);
	return `Use this exact shape:
{
  "product_name": "${productName}",
  "slug": "kebab-case-slug",
  "product_type": "${productType}",
  "audience": "${audience}",
  "product": "",
  "psychological_trigger": "",
  "hook": "",
  "visual_style": "",
  "category": "",
  "destination_url": "",
  "confidence_score": 0,
  "post_intent": "${postIntent}",
  "campaign_phase": "${campaignPhase}",
  "campaign_angle": "",
  "intent_layer": {
    "primary_intent": "problem | aesthetic | comparison | beginner | lifestyle | direct-offer",
    "keyword_focus": "",
    "use_case": "",
    "audience_segment": ""
  },
  "platforms": ["Twitter", "LinkedIn", "Medium", "Dev.to", "Pinterest", "Instagram"],
  "core_problem": "",
  "core_promise": "",
  "cta_mode": "jab | punch | soft-sell | educational | story",
  "primary_cta": "",
  "secondary_cta": "",
  "answer_style_description": "",
  "hook_options": ["", "", ""],
  "angle_options": {
    "problem": "",
    "aesthetic": "",
    "beginner": "",
    "comparison": ""
  },
  "desperate_search_queries": ["", "", ""],
  "unaware_search_questions": ["", "", ""],
  "seo_human_pitch": "",
  "keywords": ["", "", "", "", ""],
  "hashtags": {
    "Twitter": ["", "", ""],
    "Instagram": ["", "", ""],
    "LinkedIn": ["", "", ""],
    "Pinterest": ["", "", ""],
    "Dev.to": ["", "", ""],
    "Medium": ["", "", ""],
    "All": ["", "", ""]
  },
  "meta_description": "",
  "alt_text_examples": ["", ""],
  "visual_hook": "",
  "image_concept": "",
  "image_prompt": "",
  "image_requirements": {
    "Twitter": "1200x675",
    "Instagram": "1080x1080 or 1080x1350",
    "Pinterest": "1000x1500",
    "LinkedIn": "1200x627",
    "Default": "1200x630"
  },
  "asset_expansion": {
    "recommended_image_count": 3,
    "max_image_count": 4,
    "adjacent_products": [
      {
        "product": "",
        "hook": "",
        "image_prompt": "",
        "visual_style": ""
      }
    ],
    "same_product_variants": [
      {
        "hook": "",
        "image_prompt": "",
        "visual_style": ""
      }
    ],
    "stop_generation_threshold": {
      "same_hook_limit": 3,
      "same_visual_limit": 3,
      "same_product_limit": 4
    }
  },
  "winner_expansion": {
    "adjacent_variations": [],
    "hook_variations": [],
    "experimental_variation": ""
  },
  "lane_priority": {
    "seasonal_affiliate": 40,
    "home_garden_affiliate": 25,
    "goblin_ip": 20,
    "dev_products": 10,
    "experimental": 5
  },
  "seasonality": {
    "holiday_name": "",
    "days_until_holiday": "",
    "urgency_level": "",
    "recommended_post_volume": ""
  },
  "image_prompt_variants": {
    "lifestyle": "",
    "collage": "",
    "before_after": "",
    "ugc_style": "",
    "product_spotlight": ""
  },
  "ip_repurposing": {
    "meme_pin": "",
    "line_art_prompt": "",
    "printable_pack": "",
    "amazon_book_bucket": ""
  },
  "platform_variants": {
    "LinkedIn": {
      "hook": "",
      "body": "",
      "cta": ""
    },
    "X": {
      "hook": "",
      "body": "",
      "cta": ""
    },
    "Facebook": {
      "hook": "",
      "body": "",
      "cta": ""
    },
    "Instagram": {
      "hook": "",
      "body": "",
      "cta": ""
    },
    "Pinterest": {
      "hook": "",
      "body": "",
      "cta": ""
    },
    "Reddit": {
      "hook": "",
      "body": "",
      "cta": ""
    },
    "Dev.to": {
      "hook": "",
      "body": "",
      "cta": ""
    }
  },
  "preferred_post_times": {
    "Twitter": "",
    "LinkedIn": "",
    "Instagram": "",
    "Pinterest": "",
    "Medium": "",
    "Dev.to": ""
  },
  "link": {
    "gumroad": "",
    "amazon": "",
    "utm_base": "?utm_source=__PLATFORM__&utm_medium=social&utm_campaign=__CAMPAIGN__"
  },
  "campaigns": [
    {
      "name": "",
      "description": "",
      "tags": [""],
      "start_date": "",
      "end_date": ""
    }
  ]
}`;
}

export function buildRequirementsLayer() {
	return `Requirements:
- post_intent: choose the best fit for this product and angle
- campaign_phase: choose the best phase for the request and timing
- campaign_angle: the specific framing idea for this phase
- intent_layer: map the likely user intent, keyword focus, use case, and audience segment
- core_problem: the painful or urgent thing the audience is dealing with
- core_promise: the believable outcome or relief offered
- primary_cta: what you want them to do next
- secondary_cta: softer fallback CTA for less sales-heavy platforms
- answer_style_description: 1-2 sentences that clearly answer a user need using the answer-style pattern
- hook_options: exactly 3 useful opening lines, not generic fluff
- angle_options: provide one useful angle each for problem, aesthetic, beginner, and comparison framing
- desperate_search_queries: real high-intent searches someone might type before buying
- unaware_search_questions: problem-first searches by someone who does not know the product exists
- seo_human_pitch: 1-2 sentences, human-readable, not robotic
- keywords: exactly 5 useful keywords
- meta_description: under 160 characters
- alt_text_examples: at least 2
- visual_hook: one short visual sentence useful for thumbnails, pins, or asset planning
- image_concept: plain-language creative direction
- image_prompt: generator-ready prompt with composition, mood, and style direction
- product / psychological_trigger / hook / visual_style / category / destination_url / confidence_score: fill these for Pinterest-ready generation
- asset_expansion: expand the winning trigger into adjacent products and 2-4 visual variations
- lane_priority: prioritize seasonal affiliate, home/garden affiliate, goblin IP, and dev products over lower-value lanes
- seasonality: capture holiday urgency when the pin is seasonal
- image_prompt_variants: create multiple composition types so visuals do not clone each other
- ip_repurposing: turn goblin concepts into meme pins, line art, printable packs, and books
- winner_expansion: add adjacent variations that keep the same emotional trigger
- platform_variants: adapt voice and CTA per platform instead of repeating the same copy`;
}

export function buildPinterestCreativeLayer(context = {}) {
	if (!context || !context.enabled) {
		return "Pinterest creative guidance: repeat the emotional trigger, not the visual or hook wording. Rotate product, format, and angle before reusing a creative lane.";
	}

	const recentHooks = Array.isArray(context.recentHooks) ? context.recentHooks.slice(0, 5) : [];
	const recentVisuals = Array.isArray(context.recentVisuals) ? context.recentVisuals.slice(0, 5) : [];
	const lanes = Array.isArray(context.priorityLanes) ? context.priorityLanes.join(", ") : "";
	return `Pinterest creative safeguards:
- Trigger lane: ${context.trigger || "not specified"}
- Category lane: ${context.category || "not specified"}
- Category throttle: ${context.categoryThrottleCount || 0} recent pin(s)
- Priority lanes: ${lanes || "seasonal affiliate, home/garden affiliate, dev products, goblin printables, coloring books"}
- Recent hooks to avoid: ${recentHooks.join(" | ") || "none"}
- Recent visual styles to avoid: ${recentVisuals.join(" | ") || "none"}
- Rule: keep the emotion, but change product, composition, and hook framing when similarity climbs.`;
}

function buildCompactContext(productName, productType, audience, options = {}) {
	const postIntent = inferPostIntent(options, options.productProfile);
	const campaignPhase = inferCampaignPhase(options, options.productProfile);
	return [
		`Product: ${productName}`,
		`Type: ${productType}`,
		`Audience: ${audience}`,
		`Post intent: ${postIntent}`,
		`Campaign phase: ${campaignPhase}`,
		`Campaign angle: ${options.campaignAngle || "not specified"}`,
		`Platforms: ${options.platformIds?.join(", ") || "general"}`,
		buildProductGuidance(options.productProfile),
		"Platform guidance:",
		buildPlatformGuidance(options.selectedPlatforms),
		"Pinterest creative guidance:",
		buildPinterestCreativeLayer(options.pinterestCreativeContext),
		"Content mix guidance:",
		buildContentMixLayer(),
	].join("\n");
}

function buildPriorStageSummary(label, data = {}) {
	if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
		return `${label}: none`;
	}
	return `${label}: ${JSON.stringify(data)}`;
}

export function buildStrategyStagePrompt(productName, productType, audience, options = {}) {
	return [
		buildSystemLayer(),
		buildCompactContext(productName, productType, audience, options),
		buildGuardrailsLayer(options),
		buildContentMixLayer(),
		buildIntentAnswerLayer(),
		"Task: produce the campaign strategy for one post only.",
		`Return this exact JSON shape:
{
  "product_name": "${productName}",
  "product_type": "${productType}",
  "audience": "${audience}",
  "post_intent": "${inferPostIntent(options, options.productProfile)}",
  "campaign_phase": "${inferCampaignPhase(options, options.productProfile)}",
  "campaign_angle": "",
  "intent_layer": {
    "primary_intent": "",
    "keyword_focus": "",
    "use_case": "",
    "audience_segment": ""
  },
  "core_problem": "",
  "core_promise": "",
  "cta_mode": "",
  "primary_cta": "",
  "secondary_cta": ""
}`,
	].join("\n\n");
}

export function buildDiscoverabilityStagePrompt(
	productName,
	productType,
	audience,
	options = {},
	strategy = {},
) {
	return [
		buildSystemLayer(),
		buildCompactContext(productName, productType, audience, options),
		buildPriorStageSummary("Strategy", strategy),
		buildContentMixLayer(),
		buildIntentAnswerLayer(),
		"Task: produce discoverability signals for one post only.",
		`Return this exact JSON shape:
{
  "hook_options": ["", "", ""],
  "answer_style_description": "",
  "angle_options": {
    "problem": "",
    "aesthetic": "",
    "beginner": "",
    "comparison": ""
  },
  "desperate_search_queries": ["", "", ""],
  "unaware_search_questions": ["", "", ""],
  "seo_human_pitch": "",
  "keywords": ["", "", "", "", ""],
  "hashtags": {
    "All": ["", "", ""]
  },
  "meta_description": ""
}`,
	].join("\n\n");
}

export function buildCopyStagePrompt(
	productName,
	productType,
	audience,
	options = {},
	strategy = {},
	discoverability = {},
) {
	return [
		buildSystemLayer(),
		buildCompactContext(productName, productType, audience, options),
		buildPriorStageSummary("Strategy", strategy),
		buildPriorStageSummary("Discoverability", discoverability),
		buildGuardrailsLayer(options),
		buildContentMixLayer(),
		buildIntentAnswerLayer(),
		"Task: write compact platform-ready copy for one post only. Keep variants concise.",
		`Return this exact JSON shape:
{
  "platforms": ["LinkedIn", "X", "Reddit"],
  "platform_variants": {
    "LinkedIn": { "hook": "", "body": "", "cta": "" },
    "X": { "hook": "", "body": "", "cta": "" },
    "Facebook": { "hook": "", "body": "", "cta": "" },
    "Instagram": { "hook": "", "body": "", "cta": "" },
    "Pinterest": { "hook": "", "body": "", "cta": "" },
    "Reddit": { "hook": "", "body": "", "cta": "" },
    "Dev.to": { "hook": "", "body": "", "cta": "" }
  },
  "preferred_post_times": {
    "LinkedIn": "",
    "X": "",
    "Instagram": "",
    "Pinterest": "",
    "Dev.to": ""
  },
  "link": {
    "gumroad": "",
    "amazon": "",
    "utm_base": "?utm_source=__PLATFORM__&utm_medium=social&utm_campaign=__CAMPAIGN__"
  },
  "campaigns": [
    {
      "name": "",
      "description": "",
      "tags": [""],
      "start_date": "",
      "end_date": ""
    }
  ]
}`,
	].join("\n\n");
}

export function buildVisualStagePrompt(
	productName,
	productType,
	audience,
	options = {},
	strategy = {},
) {
	return [
		buildSystemLayer(),
		buildCompactContext(productName, productType, audience, options),
		buildPriorStageSummary("Strategy", strategy),
		buildContentMixLayer(),
		buildIntentAnswerLayer(),
		"Task: plan the visual for one post only.",
		`Return this exact JSON shape:
{
  "visual_hook": "",
  "alt_text_examples": ["", ""],
  "image_concept": "",
  "image_prompt": "",
  "image_requirements": {
    "Twitter": "1200x675",
    "Instagram": "1080x1080 or 1080x1350",
    "Pinterest": "1000x1500",
    "LinkedIn": "1200x627",
    "Default": "1200x630"
  }
}`,
	].join("\n\n");
}

export function buildChunkedPromptStages(productName, productType, audience, options = {}) {
	return [
		{
			id: "strategy",
			label: "Strategy",
			prompt: buildStrategyStagePrompt(productName, productType, audience, options),
		},
		{
			id: "discoverability",
			label: "Discoverability",
			prompt: buildDiscoverabilityStagePrompt(productName, productType, audience, options),
		},
		{
			id: "copy",
			label: "Copy",
			prompt: buildCopyStagePrompt(productName, productType, audience, options),
		},
		{
			id: "visual",
			label: "Visual",
			prompt: buildVisualStagePrompt(productName, productType, audience, options),
		},
	];
}

export const buildSeoPrompt = (productName, productType, audience, options = {}) => {
	const platformGuidance = buildPlatformGuidance(options.selectedPlatforms);
	const productGuidance = buildProductGuidance(options.productProfile);
	return [
		buildSystemLayer(),
		"",
		buildInputLayer(productName, productType, audience, options),
		"",
		"Platform-specific writing guidance:",
		platformGuidance,
		"",
		"Product-specific guidance:",
		productGuidance,
		"Pinterest creative guidance:",
		buildPinterestCreativeLayer(options.pinterestCreativeContext),
		"",
		buildGuardrailsLayer(options),
		"",
		buildBehaviorLayer(),
		"",
		buildIntentAnswerLayer(),
		"",
		buildContentMixLayer(),
		"",
		buildPostIntentLayer(options),
		"",
		buildCampaignPhaseLayer(options),
		"",
		buildOutputSchema(productName, productType, audience, options),
		"",
		buildRequirementsLayer(),
	].join("\n");
};
