# Pinterest Performance Analysis

Use this when you want a machine-readable report you can feed into GPT.

## CSV Columns

Required:
- `pin_title`
- `category`
- `hook_type`
- `product`
- `impressions`
- `saves`
- `pin_clicks`
- `outbound_clicks`
- `status`

Optional but recommended:
- `psychological_trigger`
- `visual_style`
- `data_confidence`

## Scoring Formula

```txt
score = (outbound_clicks * 5) + (pin_clicks * 3) + (saves * 2) + (impressions * 0.5)
```

## Classification

- `SCALE` = strong outbound clicks + strong engagement
- `TEST_MORE` = enough saves/clicks to refine
- `AWARENESS_ONLY` = high impressions, weak clicks
- `PAUSE` = low performance
- `KILL` = repeated weak performance

## CLI

```bash
cd backend
npm run pinterest:analyze -- /path/to/postpunk_pin_performance_template.csv --out ../data/pinterest-performance-report.json
```

## GPT Handoff Prompt

```txt
Analyze the following Pinterest performance report.

Return:
- top winners
- test more
- awareness only
- pause
- kill
- duplicate fatigue
- top categories
- weak categories
- top psychological triggers
- weak psychological triggers
- top visual styles
- weak visual styles
- winner expansion recommendations
- next 30 days content priorities

Focus on scaling winning emotional triggers across adjacent products.
Avoid duplicate splash toy pins and deprioritize nails unless the data dramatically improves.
```

## Output Shape

The analyzer returns JSON with:

- `top_winners`
- `test_more`
- `awareness_only`
- `pause`
- `kill`
- `duplicate_fatigue`
- `top_categories`
- `weak_categories`
- `top_psychological_triggers`
- `weak_psychological_triggers`
- `top_visual_styles`
- `weak_visual_styles`
- `winner_expansion`
- `content_priority_next_30_days`
- `metrics_summary`
