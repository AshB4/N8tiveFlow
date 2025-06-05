# pSEO + Content Remix Quick Reference Sheet (2025)

## Critical Success Factors

- **Uniqueness & Value**: Every page must offer something original—facts, answers, visuals, or personality.
- **Test Before You Scale**: Start with 10–100 pages. Manually check them. Scale only after verifying value, uniqueness, and indexing.
- **Smart Linking & Schema**: Use internal links and schema markup on every page for better crawlability and rich results.
- **Automate, Don’t Spam**: Use AI to remix content for each platform, but always review it manually before mass-publishing.
- **Continuous Monitoring**: Watch GSC and analytics for index status, engagement, and bounce rate. Pause and revise content that’s underperforming.

## Remix Workflow (BLUF)

1. **Seed Content**: Start with a product, feature, or main idea.
2. **Remix Prompt**: Use AI to generate:
   - 1x Long-form article
   - 1x LinkedIn post
   - 1x X/Twitter thread
   - 1x Reddit post
   - 1x Meme/caption
3. **Save & Edit**: Store each in a content DB with fields for loop type, BLUF, and platform.
4. **Auto-Link & Schema**: Inject related internal links and JSON-LD (FAQ, Article, Product).
5. **Publish & Track**: Send content to blog and socials. Submit sitemap. Watch indexing and click data.
6. **Iterate**: If something flops, remix or combine with other content.

## Red Flags

- "Discovered – not indexed" status in GSC
- Duplicate or thin content warnings
- Bounce rate above 80%
- No loop results (referral or viral engagement)
- CTR below 1% on target keywords

## Remix Prompt Template

```
Take [topic/product]. Write a 600-word SEO article, a LinkedIn post, a Twitter/X thread (3–5 tweets), a Reddit post, and a meme/caption—each unique, human, and adapted to the platform’s tone. Include a CTA on each.
```

## Tools/Features to Build or Use

- Content DB with:
  - `mainIdea`
  - `longFormContent`
  - `platformVariants` (LinkedIn, Reddit, etc.)
  - `growthLoopType`
  - `loopBLUF`
  - `indexStatus`
  - `metrics`
- AI remix button in editor
- Auto-link suggestion logic
- Schema generator
- Index health dashboard

## PostPunk Workflow Implementation

### A. Prompt Example

```
I want to announce/promote [core topic or product].
Write a long-form article (600+ words), a short-form LinkedIn post, a Twitter/X thread, a Reddit post, and a meme caption—each with unique tone, voice, and CTA.
```

### B. Data Structure

```js
// DB Model
{
  mainIdea: String,
  longFormContent: String,
  platformVariants: {
    linkedin: String,
    twitter: String,
    reddit: String,
    meme: String
  },
  growthLoopType: String,
  loopBLUF: String,
  indexStatus: String,
  metrics: Object
}
```

### C. Code Flow (Pseudo-JS/React)

```js
const mainIdea = "AI-powered coloring books for dog lovers";
const prompt = `Remix this: ${mainIdea}`;
const { longForm, linkedin, twitter, reddit, meme } = await gptRemix(prompt);

savePost({
  mainIdea,
  longFormContent: longForm,
  platformVariants: { linkedin, twitter, reddit, meme },
  growthLoopType: 'viral',
  loopBLUF: 'Generate dog-lover interest via multi-platform content.'
});

publishToBlog(longForm);
publishToSocial({ linkedin, twitter, reddit });
trackIndexingAndMetrics();
```

## TL;DR – Ashley’s PostPunk pSEO System

- Seed idea → Remix to platforms → Review and publish
- Add schema and internal links
- Monitor → Iterate → Scale based on real data
