# Product Finder Plan (Monetization-First)

## Goal
Build a "smart Product Finder" that helps pick and post high-probability Amazon affiliate products across social platforms, with minimal manual effort and measurable revenue outcomes.

## Core Outcomes
- Find products likely to convert (not just trendy).
- Generate platform-ready post ideas fast.
- Track what actually earns money and feed that back into ranking.

## MVP Scope
- Input: niche keywords (example: `garden decor`, `sensory toys`, `home office`).
- Fetch products (PA-API when available; fallback manual links list).
- Score products with a simple ranking model.
- Output top products with:
  - tagged affiliate link
  - title, price, image
  - post angle suggestions per platform
- Save results to local JSON for reuse.

## Scoring Model (v1)
Weighted score per product:
- `relevance_score` (keyword match to niche intent)
- `commission_score` (category-level commission heuristic)
- `price_score` (mid-ticket often converts better than ultra-low)
- `social_fit_score` (visual potential + hookability)
- `competition_score` (optional; lower saturation gets higher score)
- `historical_score` (future: based on your own click/sale history)

Example:
`total = 0.30*relevance + 0.20*commission + 0.15*price + 0.20*social_fit + 0.15*historical`

## Data You Should Store
Per product candidate:
- `asin`
- `title`
- `price`
- `image_url`
- `category`
- `detail_url`
- `affiliate_url` (must include your `tag`)
- `niche`
- `scores` (all components + total)
- `selected_for_post` (boolean)
- `platform_angles` (short hooks by platform)
- `posted_at`, `clicks`, `orders`, `revenue` (when available)

## Suggested File Layout
- `backend/scripts/productFinder/run-product-finder.js`
- `backend/scripts/productFinder/score-product.js`
- `backend/scripts/productFinder/generate-angles.js`
- `backend/scripts/productFinder/store-results.js`
- `backend/data/product-finder/candidates.json`
- `backend/data/product-finder/history.json`

## Pseudocode (High-Level)
```text
function runProductFinder(config):
  niches = config.niches
  maxPerNiche = config.maxPerNiche
  allCandidates = []

  for niche in niches:
    products = fetchProducts(niche)               # PA-API or fallback source
    normalized = normalizeProducts(products)
    scored = []

    for p in normalized:
      score = scoreProduct(p, niche, historyData)
      if score.total >= config.minScore:
        p.scores = score
        p.affiliate_url = ensurePartnerTag(p.detail_url, config.partnerTag)
        p.platform_angles = generateAngles(p, niche)
        scored.push(p)

    top = takeTop(sortByScoreDesc(scored), maxPerNiche)
    allCandidates.extend(top)

  deduped = deduplicateByAsin(allCandidates)
  storeCandidates(deduped)
  return deduped
```

## Pseudocode (Scoring)
```text
function scoreProduct(product, niche, history):
  relevance = scoreRelevance(product.title, niche.keywords)
  commission = estimateCommission(product.category)
  price = scorePriceBand(product.price, niche.targetPriceBand)
  socialFit = scoreSocialHookability(product.title, product.image_url, niche.platforms)
  historical = scoreHistoricalPerformance(product.asin, history)

  total = 0.30*relevance + 0.20*commission + 0.15*price + 0.20*socialFit + 0.15*historical

  return {
    relevance, commission, price, socialFit, historical, total
  }
```

## Pseudocode (Angle Generation)
```text
function generateAngles(product, niche):
  return {
    pinterest: [
      "Top pick for <use case> under <price>",
      "Why this solves <pain point>"
    ],
    facebook: [
      "Personal story + benefit + CTA",
      "Problem/Solution post with direct link"
    ],
    x: [
      "Short hook + one benefit + link",
      "Comparison style: old way vs this product"
    ]
  }
```

## Anti-Spam / Safety Rules
- Never post the same ASIN too frequently.
- Enforce per-platform cooldown windows.
- Require disclosure markers where needed (`#ad`, `affiliate`).
- Reject products missing image/title/price.

## KPI Dashboard (What to Track)
- Click-through rate by platform + niche.
- Revenue per post.
- Revenue per ASIN.
- Revenue per content angle template.
- Win-rate: `% of posted products generating clicks/sales`.

## Roadmap
1. **Phase 1**: Offline scoring + candidate list generation.
2. **Phase 2**: One-click "Send top picks to Composer".
3. **Phase 3**: Feedback loop from click/sale data into ranking.
4. **Phase 4**: Automated scheduling by expected value.

## Notes
- Start simple and measurable. Avoid fancy ML until you have your own outcome data.
- Your strongest moat will be historical performance data from your own audience.
