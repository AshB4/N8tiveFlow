# PostPunk Pinterest Recovery Prompt

Use this when you want to feed Pinterest analytics CSVs, screenshots, or pin images into GPT and get a performance recovery plan back.

```txt
I am uploading:

1. Pinterest analytics CSV exports
2. Screenshot analytics from Pinterest
3. Pin images when needed

Your job is to reconstruct performance data, identify winners, suppress losers, and tell me what content to create next.

-----------------------------------
STEP 1: EXTRACT PERFORMANCE DATA
-----------------------------------

From uploaded screenshots and CSVs:

Extract ONLY visible metrics:

- pin_title
- category
- impressions
- saves
- pin_clicks
- outbound_clicks
- engagement
- board (if visible)
- date range (if visible)

Rules:
- If metrics are missing -> return null
- Never invent missing numbers
- Assign confidence level:
  high
  medium
  low

Return structured CSV rows:

pin_title,
category,
impressions,
saves,
pin_clicks,
outbound_clicks,
engagement,
confidence_score

-----------------------------------
STEP 2: SCORE PERFORMANCE
-----------------------------------

Use scoring formula:

score =
(outbound_clicks * 5)
+ (pin_clicks * 3)
+ (saves * 2)
+ (impressions * 0.5)

Then classify each pin:

SCALE
= strong outbound clicks + engagement

TEST_MORE
= strong saves/clicks but needs refinement

AWARENESS_ONLY
= high impressions but weak clicks

PAUSE
= low performance

KILL
= repeated weak performance

-----------------------------------
STEP 3: DETECT DUPLICATE FATIGUE
-----------------------------------

Identify if I am overposting:

- same product
- same hook
- same visual style

Flag:

"DUPLICATE FATIGUE DETECTED"

Recommend adjacent products instead of clones.

Examples:

BAD:
10 splash pad pins

GOOD:
splash pad
bubble mower
chalk toys
travel toys
sensory toys

-----------------------------------
STEP 4: IDENTIFY WINNING EMOTIONAL TRIGGERS
-----------------------------------

Find what emotional triggers are winning:

- convenience
- parent peace
- transformation
- humor
- productivity
- burnout relief
- affordability
- safety

Tell me which triggers are producing the best results.

-----------------------------------
STEP 5: IDENTIFY LOSING CATEGORIES
-----------------------------------

Automatically suppress weak categories.

Current likely weak categories:

- nails
- generic apparel

If they continue failing:
recommend 30-day cooldown.

-----------------------------------
STEP 6: RECOMMEND WHAT TO CREATE NEXT
-----------------------------------

Recommend next content batch using my proven lanes:

40% seasonal affiliate
- Mother's Day
- Father's Day
- holiday gifting
- seasonal shopping

25% home/garden affiliate
- patio lighting
- backyard upgrades
- garden products

20% goblin IP
- memes
- coloring pages
- printable packs
- Amazon mini books

10% dev products
- prompts
- templates
- automation

5% experiments

-----------------------------------
STEP 7: GOBLIN REPURPOSING
-----------------------------------

For goblin winners:

convert one illustration into:

- meme pin
- line art version
- printable pack
- Amazon mini book page

Recommend book themes:

- burnout goblin
- ADHD goblin
- anxiety goblin
- corporate goblin

Target:
20-30 page mini books

-----------------------------------
STEP 8: IMAGE CREATION RULES
-----------------------------------

For ONE product:

Create ONLY:

3-4 images max

Then move to adjacent products.

Do NOT recommend mass duplicate image generation.

-----------------------------------
FINAL OUTPUT FORMAT
-----------------------------------

{
  "extracted_csv_data": [],
  "top_winners": [],
  "test_more": [],
  "awareness_only": [],
  "pause": [],
  "kill": [],
  "duplicate_fatigue": [],
  "winning_emotional_triggers": [],
  "losing_categories": [],
  "next_content_batch": {
    "seasonal_affiliate": [],
    "home_garden": [],
    "goblin_ip": [],
    "dev_products": [],
    "experiments": []
  },
  "goblin_book_recommendations": [],
  "what_not_to_make": []
}

IMPORTANT:
Do not recommend more nail pins.
Do not recommend repetitive splash pad clones.
Focus on scaling winners through adjacent products.
```
