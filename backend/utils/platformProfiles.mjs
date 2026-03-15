export const platformProfiles = {
  linkedin: {
    label: "LinkedIn",
    audienceExpectation: "credible, useful, specific, professional",
    voice: "calm, informed, human, experience-backed",
    structureRules: [
      "Lead with the insight or problem.",
      "Keep humor controlled and earned.",
      "Give the reader a takeaway, not just a vibe.",
    ],
    ctaStyle: "Invite discussion, feedback, or reflection.",
    avoid: ["sloppy irony", "too many in-jokes", "unearned hype"],
  },
  x: {
    label: "X",
    audienceExpectation: "fast, timely, punchy, identity-clear",
    voice: "sharp, concise, opinionated, high signal",
    structureRules: [
      "Front-load the hook.",
      "One post should carry one main point.",
      "Make the first line do real work.",
    ],
    ctaStyle: "Reply, react, quote, or click through.",
    avoid: ["burying the point", "generic brand copy", "overexplaining"],
  },
  facebook: {
    label: "Facebook",
    audienceExpectation: "broader, conversational, personality-friendly",
    voice: "friendly, story-first, warm, lightly playful",
    structureRules: [
      "Explain context before the ask.",
      "Make the human angle obvious.",
      "Keep it more relaxed than LinkedIn.",
    ],
    ctaStyle: "Comment, share, react, or click through.",
    avoid: ["hard ad tone", "dense technical blocks with no story"],
  },
  instagram: {
    label: "Instagram",
    audienceExpectation: "visual-first, emotionally immediate, creator-forward",
    voice: "concise, personal, vivid",
    structureRules: [
      "The caption should support the visual asset.",
      "The first line should earn the expand tap.",
      "Keep paragraph rhythm clean.",
    ],
    ctaStyle: "Save, share, comment, DM, or watch.",
    avoid: ["link-dependent messaging", "heavy technical explanation with no visual payoff"],
  },
  threads: {
    label: "Threads",
    audienceExpectation: "conversational, current, casual-smart",
    voice: "thoughtful but unforced",
    structureRules: [
      "Sound like a person talking, not a company publishing.",
      "Invite reply more than click.",
      "Keep the friction low.",
    ],
    ctaStyle: "Ask what others think or have seen.",
    avoid: ["hard-sell framing", "rigid launch-copy"],
  },
  pinterest: {
    label: "Pinterest",
    audienceExpectation: "searchable, practical, evergreen, save-worthy",
    voice: "clear, useful, benefit-led",
    structureRules: [
      "Title the benefit clearly.",
      "Align the copy with a searchable use case.",
      "Prefer evergreen value when possible.",
    ],
    ctaStyle: "Save this, try this, click for the full guide.",
    avoid: ["vague captions", "jokes without utility"],
  },
  reddit: {
    label: "Reddit",
    audienceExpectation: "subreddit-specific value, authenticity, anti-spam",
    voice: "direct, plain, transparent, context-aware",
    structureRules: [
      "Respect subreddit norms first.",
      "Add value before mentioning the product.",
      "Disclose context when relevant.",
    ],
    ctaStyle: "Discussion-first, minimal direct CTA.",
    avoid: ["marketing tone", "copy-paste blasts", "vague self-promotion"],
  },
  devto: {
    label: "Dev.to",
    audienceExpectation: "technical, practical, readable",
    voice: "dev-friendly, transparent, educational",
    structureRules: [
      "Use substance.",
      "Prioritize clarity over hype.",
      "Make the post useful even without the product.",
    ],
    ctaStyle: "Read more, try it, or give feedback.",
    avoid: ["shallow promo copy", "buzzword stuffing"],
  },
  hashnode: {
    label: "Hashnode",
    audienceExpectation: "technical depth and thoughtful writing",
    voice: "professional, builder-focused, polished",
    structureRules: [
      "Go deeper than a feed post.",
      "Use stronger structure than X or Threads.",
      "Value first, promotion second.",
    ],
    ctaStyle: "Feedback, reading, or product context after value.",
    avoid: ["meme-heavy copy", "shallow launch noise"],
  },
  producthunt: {
    label: "Product Hunt",
    audienceExpectation: "launch clarity, authenticity, maker presence",
    voice: "crisp, excited, credible",
    structureRules: [
      "Explain what it is.",
      "Explain who it is for.",
      "Explain why it matters now.",
    ],
    ctaStyle: "Try it, leave feedback, ask questions.",
    avoid: ["fake scarcity", "vague hype", "posting then disappearing"],
  },
  tumblr: {
    label: "Tumblr",
    audienceExpectation: "culture-aware, expressive, niche-friendly",
    voice: "voicey, stylized, community-literate",
    structureRules: [
      "Let the voice breathe.",
      "Use tags intentionally.",
      "Account for community and link-spam moderation.",
    ],
    ctaStyle: "Notes, reblogs, replies.",
    avoid: ["sterile corporate copy", "obvious spammy links"],
  },
  discord: {
    label: "Discord",
    audienceExpectation: "in-room update, not broadcast ad copy",
    voice: "direct, brief, human, situational",
    structureRules: [
      "Assume ongoing context.",
      "Avoid bloated intros.",
      "Write like you are dropping into a room, not a feed.",
    ],
    ctaStyle: "React, reply, test, or click if useful.",
    avoid: ["polished broadcast language"],
  },
  kofi: {
    label: "Ko-fi",
    audienceExpectation: "supporter relationship, creator warmth",
    voice: "personal, grateful, gently promotional",
    structureRules: [
      "Explain what supporters get.",
      "Make the relationship obvious.",
      "Reward directness over funnel-speak.",
    ],
    ctaStyle: "Support, commission, follow, unlock.",
    avoid: ["aggressive funnel-speak"],
  },
  amazon: {
    label: "Amazon",
    audienceExpectation: "transactional clarity",
    voice: "plain, confidence-building, benefit-first",
    structureRules: [
      "Reduce ambiguity quickly.",
      "Focus on fit and use case.",
      "Keep the copy clean and direct.",
    ],
    ctaStyle: "Buy, compare, learn more.",
    avoid: ["social-style chaos", "inside jokes"],
  },
  onlyfans: {
    label: "OnlyFans",
    audienceExpectation: "exclusivity, boundary clarity, relationship and reward",
    voice: "brand-specific",
    structureRules: [
      "Customize heavily per creator brand.",
      "Keep boundaries explicit.",
      "Use relationship cues intentionally.",
    ],
    ctaStyle: "Subscribe, unlock, message, view.",
    avoid: ["generic default prompts"],
  },
};

export function getPlatformPromptProfiles(platformIds = []) {
  return (Array.isArray(platformIds) ? platformIds : [])
    .map((id) => String(id || "").toLowerCase())
    .filter(Boolean)
    .map((id) => ({ id, ...platformProfiles[id] }))
    .filter((profile) => Boolean(profile.label));
}
