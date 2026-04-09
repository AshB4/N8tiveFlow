# Platform Profiles Spec

This document defines how PostPunk should model platform-specific writing rules,
audience expectations, and health-state UX before those rules are wired into the
composer and AI generation flow.

## Goals

- Give the AI platform-specific writing constraints instead of one generic voice.
- Help the composer explain why a draft should sound different on X vs LinkedIn vs Reddit.
- Surface platform health dynamically so users do not attempt posts against expired or incomplete accounts.

## Platform Health UX

### Expected behavior

- Every platform in the composer should have a live status:
  - `healthy`
  - `warning`
  - `error`
  - `unknown`
- `error` platforms should render visually dimmed or grayed out.
- Clicking a grayed-out platform should not silently fail. It should show:
  - platform name
  - status
  - exact error detail
  - provider or account id if available
  - error code/subcode when present
  - last checked timestamp
- If the platform has multiple accounts, the user should see status per account, not just per platform.

Current implementation note:

- backend account/platform health is already exposed through `/api/platform-health`
- `/setup` surfaces that health today
- the composer-side UX described below is still partially aspirational and not fully enforced end-to-end

### Example messages

- `Facebook • Main Profile`
  - `Expired token`
  - `OAuthException 190 / subcode 463`
  - `Expired March 4, 2026`
- `Threads • Main Account`
  - `Missing access token`
  - `Missing account id`
- `X • Main Handle`
  - `Healthy`
  - `Validated as @RosebudsAshes`

### API shape

Recommended backend response for composer health:

```json
{
  "checkedAt": "2026-03-14T21:41:46.000Z",
  "results": [
    {
      "platform": "facebook",
      "accountId": "fb-main-profile",
      "status": "error",
      "summary": "Expired token",
      "detail": "Error validating access token: Session has expired...",
      "errorCode": 190,
      "errorSubcode": 463
    },
    {
      "platform": "x",
      "accountId": "x-main",
      "status": "healthy",
      "summary": "Validated",
      "detail": "user @RosebudsAshes"
    }
  ]
}
```

### Frontend rules

- Healthy: normal styling
- Warning: amber border and tooltip
- Error: dimmed with lock/error badge
- Unknown: neutral state until first check

The composer should still allow a manual override later if you explicitly want
that, but the default should be block-and-explain.

## AI Platform Profile Model

Each platform profile should include:

```ts
type PlatformProfile = {
  id: string;
  label: string;
  audienceExpectation: string;
  voice: string;
  bestFormats: string[];
  structureRules: string[];
  ctaStyle: string;
  linkTolerance: "low" | "medium" | "high";
  emojiTolerance: "low" | "medium" | "high";
  humorTolerance: "low" | "medium" | "high";
  avoid: string[];
  openerPatterns: string[];
  notes: string[];
  sourceNotes: string[];
};
```

## Research-Backed Guidance

The list below combines official platform guidance with product-pattern inference
where the official material is more operational than stylistic.

### LinkedIn

- Audience expectation: credible, useful, specific, professional.
- Voice: calm, informed, human, experience-backed.
- Best formats:
  - lessons learned
  - case studies
  - field notes
  - process breakdowns
- Structure rules:
  - lead with the insight or problem
  - keep humor controlled
  - give a takeaway, not just a vibe
- CTA style: invite discussion, feedback, or reflection.
- Avoid:
  - sloppy irony
  - too many in-jokes
  - sounding unserious before value is established
- Source notes:
  - LinkedIn creator guidance emphasizes confident, useful creation and professional credibility.

### X

- Audience expectation: fast, timely, punchy, identity-clear.
- Voice: sharp, concise, opinionated, high signal.
- Best formats:
  - takes
  - quick build updates
  - short threads
  - clips with commentary
- Structure rules:
  - front-load the hook
  - keep one post to one main point
  - strong first line matters
- CTA style: reply, react, click, follow thread.
- Avoid:
  - overexplaining
  - burying the point
  - generic corporate phrasing
- Source notes:
  - X Professional Accounts guidance focuses on authentic identity, profile clarity, analytics, and resource use.

### Facebook

- Audience expectation: broader, more conversational, more forgiving of personality.
- Voice: friendly, story-first, warm, lightly playful.
- Best formats:
  - anecdotes
  - casual updates
  - link posts with human framing
  - community questions
- Structure rules:
  - explain context
  - make the human angle obvious
  - less dry than LinkedIn
- CTA style: comment, share, react, click through.
- Avoid:
  - sounding like an ad immediately
  - dense technical blocks with no story
- Source notes:
  - This profile is more inference-driven and should be tuned against your own page data.

### Instagram

- Audience expectation: visual-first, emotionally immediate, creator-forward.
- Voice: concise, personal, vivid, supportive of the visual asset.
- Best formats:
  - carousels
  - short narratives
  - behind-the-scenes posts
  - quick tips in caption form
- Structure rules:
  - caption should support the image, not replace it
  - first line should earn the “more”
  - keep paragraph rhythm clean
- CTA style: save, share, comment, watch, DM.
- Avoid:
  - heavy technical explanation with no visual payoff
  - link-dependent messaging
- Source notes:
  - Based on official creator guidance patterns and product-format norms; tune with your own account history.

### Threads

- Audience expectation: conversational, current, casual-smart.
- Voice: thoughtful but unforced, like a smart working note.
- Best formats:
  - perspective posts
  - discussion starters
  - short personal observations
  - follow-up commentary
- Structure rules:
  - sound like a person talking, not publishing
  - keep friction low
  - invite reply more than click
- CTA style: ask what others think or what they’ve seen.
- Avoid:
  - rigid launch-copy
  - hard-sell framing
- Source notes:
  - Threads product direction currently leans into conversation, communities, and longer perspectives.

### Pinterest

- Audience expectation: searchable, practical, evergreen, save-worthy.
- Voice: clear, useful, benefit-led, inspirational when relevant.
- Best formats:
  - idea pins
  - visual guides
  - checklists
  - template or tip graphics
- Structure rules:
  - title the benefit clearly
  - align text with a searchable use case
  - keep it evergreen when possible
- CTA style: save, try this, click for the full guide.
- Avoid:
  - vague captions
  - jokes without utility
- Source notes:
  - Pinterest official materials emphasize creators, partnerships, and structured visual content intended to be discovered and saved.

### Reddit

- Audience expectation: subreddit-specific value, authenticity, anti-spam.
- Voice: direct, plain, transparent, context-aware.
- Best formats:
  - answer posts
  - build logs
  - problem/solution writeups
  - highly relevant story posts
- Structure rules:
  - respect subreddit norms first
  - add real value before mentioning a product
  - disclose if relevant
- CTA style: minimal; discussion-first.
- Avoid:
  - marketing tone
  - copy-paste blasts
  - vague self-promotion
- Source notes:
  - Reddit Help explicitly stresses policy compliance, clarity, and no misleading or exploitative promotion.

### Dev.to

- Audience expectation: technical, practical, readable.
- Voice: dev-friendly, transparent, educational.
- Best formats:
  - tutorials
  - lessons learned
  - architecture notes
  - build-in-public engineering posts
- Structure rules:
  - use substance
  - prioritize clarity over hype
  - make the post useful even without the product
- CTA style: read more, try the repo, give feedback.
- Avoid:
  - shallow promo copy
  - buzzword stuffing
- Source notes:
  - The platform is structurally article-first and best used for technical value delivery.

### Hashnode

- Audience expectation: technical depth and thoughtful writing.
- Voice: professional, builder-focused, more polished than social feed copy.
- Best formats:
  - engineering essays
  - walkthroughs
  - technical breakdowns
- Structure rules:
  - stronger structure than X/Threads
  - more depth than Dev.to snippets
- CTA style: feedback, reading, or product context after value.
- Avoid:
  - meme-heavy copy
  - shallow launch noise
- Source notes:
  - Informed by platform norms and code-of-conduct style guidance.

### Product Hunt

- Audience expectation: launch clarity, authenticity, maker presence.
- Voice: crisp, excited, credible.
- Best formats:
  - launch description
  - maker first comment
  - feature summary
- Structure rules:
  - explain what it is
  - explain who it’s for
  - explain why it matters now
- CTA style: try it, leave feedback, ask questions.
- Avoid:
  - fake scarcity
  - vague hype
  - disappearing after posting
- Source notes:
  - Product Hunt’s launch guide stresses prep, authentic engagement, and a strong maker first comment.

### Tumblr

- Audience expectation: culture-aware, expressive, niche-friendly.
- Voice: voicey, stylized, community-literate.
- Best formats:
  - mood posts
  - visual/editorial posts
  - subculture-aware commentary
- Structure rules:
  - let the voice breathe
  - support tags/community context
  - account for community and link-spam moderation
- CTA style: notes, reblogs, replies.
- Avoid:
  - sterile corporate copy
  - obvious spammy links
- Source notes:
  - Tumblr’s official updates show strong community and link-spam enforcement; style guidance still needs user data.

### Discord

- Audience expectation: in-room update, not public ad copy.
- Voice: direct, brief, human, situational.
- Best formats:
  - updates
  - changelogs
  - asks
  - quick resource drops
- Structure rules:
  - assume ongoing context
  - avoid bloated intros
- CTA style: react, reply, test, click if useful.
- Avoid:
  - polished broadcast language
- Source notes:
  - Mostly usage-pattern inference; tune to your own servers.

### Ko-fi

- Audience expectation: supporter relationship, creator warmth, direct support context.
- Voice: personal, grateful, gently promotional.
- Best formats:
  - update notes
  - supporter offers
  - commissions/promos
  - behind-the-scenes posts
- Structure rules:
  - explain what supporters get
  - make the relationship obvious
- CTA style: support, commission, follow, unlock.
- Avoid:
  - aggressive funnel-speak
- Source notes:
  - Creator-support products tend to reward direct relationship language over growth-hack framing.

### Amazon

- Audience expectation: transactional clarity.
- Voice: plain, confidence-building, benefit-first.
- Best formats:
  - product descriptors
  - utility-first summaries
- Structure rules:
  - reduce ambiguity
  - focus on fit and use case
- CTA style: buy, compare, learn more.
- Avoid:
  - social-style chaos
- Source notes:
  - Marketplace intent is transactional rather than conversational.

## Implementation Order

1. Add a shared `platformProfiles` config file.
2. Add backend/platform-health response with exact detail and timestamps.
3. Gray out failed platforms in the composer.
4. Show account-level reasons in a modal or side panel.
5. Feed platform profile rules into AI prompt generation.
6. Add optional manual tone override for brand-specific exceptions.

## Sources

- X Professional Accounts: https://business.x.com/en/help/account-setup/professional-accounts
- Reddit promotions help: https://support.reddithelp.com/hc/en-us/articles/22755369815700-Running-promotions-on-Reddit
- Product Hunt launch prep: https://www.producthunt.com/launch/preparing-for-launch
- Product Hunt launch guide: https://www.producthunt.com/launch
- Product Hunt posting help: https://help.producthunt.com/en/articles/479557-how-to-post-a-product
- Product Hunt scheduling help: https://help.producthunt.com/en/articles/2724119-how-to-schedule-a-post
- Tumblr official support updates on communities/link-spam: https://support.tumblr.com/post/772675906800074752 and https://support.tumblr.com/post/777750131378421760
