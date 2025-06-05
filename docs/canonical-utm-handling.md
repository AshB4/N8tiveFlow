# Canonical & UTM Handling

This document outlines how PostPunk manages canonical links and UTM tracking.

## Goals
- Mark original articles as canonical to consolidate SEO authority.
- Remixed or syndicated versions reference the original via a canonical link or attribution text when a platform does not support canonical tags.
- UTM parameters are used only on monetized funnel links (e.g. Gumroad or Ko-fi). Canonical URLs remain clean.
- Store the relationship between the canonical article and its variants in `backend/posts/canonical.json`.

## Schema Example
```json
{
  "title": "PostPunk Intro",
  "originalUrl": "https://example.com/postpunk-intro",
  "isCanonical": true,
  "utmParams": "",
  "funnelUrl": "https://gumroad.com/l/postpunk",
  "platformVariants": [
    {
      "platform": "Dev.to",
      "postUrl": "https://dev.to/ash/postpunk-intro",
      "canonicalTarget": "https://example.com/postpunk-intro",
      "utmParams": "?utm_source=devto&utm_medium=referral&utm_campaign=launch",
      "postedAt": "2025-05-10T10:00:00Z"
    }
  ]
}
```

## Logic Overview
1. Canonical posts do not require a canonical tag (they point to themselves).
2. Syndicated posts inject `<link rel="canonical" href="ORIGINAL_URL" />` or an "Originally published" attribution.
3. Canonical URLs must never include UTM parameters.
4. Monetized funnel links may include UTM tracking using `buildUtm()` from `backend/utils/postUtils.js`.
5. `validateCanonicalTarget()` verifies that the canonical target is reachable before a post is published.
