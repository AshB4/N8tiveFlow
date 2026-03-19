# Project State

This file is the handoff doc for the current working state of PostPunk/N8tiveFlow.

If you come back later, this is the file to read first.

## What This App Is Right Now

PostPunk is currently:

- a working queue and scheduling system
- a manual-post assistant for unstable platforms
- a partially automated publishing tool
- a proven automatic `Dev.to` lane
- a proven automatic `Facebook` lane for page posts
- a proven automatic `Pinterest` lane for single pins
- a local-first app using SQLite as the real store
- an import-first workflow for AI-written content via `/batch`

It is not yet a fully automatic multi-platform autoposter.

## What Exists

These pieces are built and in active use:

- post composer with queue saving
- approval workflow using `draft`, `approved`, `posted`, `failed`
- bulk scheduling in the library
- auto-schedule-after-last-date flow in the library
- weekday presets like `MWF` and `MWFSu`
- Today Ops page at `/today`
- Batch import page at `/batch`
- Posted archive page at `/archive`
- Rotation/settings page at `/setup`
- retry and failure handling
- failed-post visibility on the calendar with retry support
- product profiles
- platform writing guidance
- AI SEO generation with product and platform context
- campaign planning/generation backend route
- visible AI result trays on `/compose` and `/batch`
- image planning fields:
  - `imageStatus`
  - `imageConcept`
  - `imagePrompt`
- manual metrics logging in the library for charts
- product link injection for punch posts
- Amazon affiliate tagging for Amazon product links
- Telegram success and failure alerts
- token-health visibility on `/setup`

## What Is Proven Working

- frontend build passes
- backend tests pass
- queue save and edit flow works
- SQLite persistence and JSON mirroring work
- launchd worker is installed and running on this Mac
- `Dev.to` automatic posting has been proven live
- `Facebook` page posting has been proven live for text and image posts
- `Pinterest` posting has been proven live for single pins through Playwright + saved session
- Product profile lifecycle status is now tracked. The shipped Gumroad/Amazon products are marked `live`, while `PostPunk Core` is `in-progress` and the memoir/Reddit product remain `planned`.
- Telegram alerts fire for both success and failure

## What Is Not Reliable Yet

- `X` is not a trusted posting lane
- `Facebook` token expiry is still an operational risk, but the lane itself is working
- `Instagram` token state has been a blocker
- `Threads` is incomplete
- `Pinterest` works for single live pins, but batch posting, topics/tags, alt text, and publish-later are not wired yet
- `Amazon` is in the queue model, but not a proven unattended posting lane
- built-in AI generation is not a trusted daily workflow yet; external GPT output + `/batch` import is the practical path
- `Facebook Stories` and `Facebook video` are not wired yet; they are a future Meta lane worth adding because Stories likely matter for reach, but current focus should remain on regular image posts first

## Current Operating Model

Use the system like this:

1. Generate content externally or in-app, then bring batches into `/batch`.
2. Save selected items into the queue.
3. Approve and schedule from `/batch` or `/lib`.
4. Let `Dev.to` auto-post when due.
5. Let `Facebook` auto-post when due if the page token is healthy.
6. Use `/today` for manual posting or manual confirmation on the other platforms.
7. Use the Pinterest Playwright lane for single-pin posting when needed.
8. Review posted items in `/archive` and log metrics from `/lib`.
9. Mark posts `posted` or `failed` as needed.

## Current System Notes

- Scheduling is intentionally one post per day by default.
- Product mixing is now supported so batches from multiple products can be interleaved across days.
- `/lib` now separates "approved" from "scheduled" more clearly:
  - `approved` means ready
  - `scheduledAt` means it will appear on the calendar
- Scheduled items are not selectable in the library bulk-select flow.
- Batch imports can be saved, approved, and chained after the current last scheduled date.
- Archive entries now store full post bodies going forward.
- `/setup` now shows platform token/credential health so auth failures are visible before they become mysteries.
- Facebook feed posting with text and local image uploads is now proven live against the `Color With Ash` page.
- Pinterest Playwright posting is now proven for single live pins using the saved Pinterest session/profile.
- OpenAI is the practical in-app AI default. Ollama remains optional but is not the trusted path on this Mac.
- Meta-related future work should be prioritized in this order:
  - stabilize Facebook image posting
  - add Facebook Stories support
  - add Facebook video support
  - then revisit Instagram/Threads once the credential flow is clearer
- Pinterest near-term next step:
  - support sequential batch pin posting in one reused Pinterest session instead of one pin per run
  - then add Pinterest-specific fields like topics/tags, alt text, and publish-later scheduling

## Current Queue Snapshot

This snapshot changes quickly now and should be checked live in the app or DB instead of trusted as a static count.

What matters operationally:

- the queue is real, not fake seed content
- scheduling currently stretches into May 2026
- one-post-per-day cadence is the current default
- the app now supports multiple live products in one rotating schedule

## Dev.to Plan

`Dev.to` is the first trusted automation lane.

Current `Dev.to` queue strategy:

- once per week
- article-length posts
- insight first, product link second

Current `Dev.to` queued articles:

- `2026-03-30`: `What Building a Social Scheduler Taught Me About Reliability`
- `2026-04-06`: `Most Founders Do Not Need More Ideas. They Need Better Filters`
- `2026-04-13`: `Prompt Packs Are Not Magic. They Are Starting Systems`

## Product Profiles In Use

Current product profiles include:

- `PostPunk Core`
- `Gumroad Devtools`
- `Kawaii Coloring Series`
- `Goblin Self-Care Coloring Book`
- `Goblin Core Coloring Affirmations`
- `AI Powered Grad`
- `100 Prompt Storm`
- `Product Strategy 25`
- `Buzzing Adventures Coloring Book`
- `Memoir`
- `Reddit Product`

The memoir exists as a placeholder profile but is not an active promotion focus yet.

## Important Files To Check First

If you need to understand the system quickly, check these first:

- `docs/code-map.md`
- `docs/project-state.md`
- `frontend/main.jsx`
- `backend/utils/localDb.mjs`
- `backend/server.mjs`
- `backend/scripts/postingJob.mjs`
- `backend/scripts/platforms/post-to-all.js`
- `frontend/UXUI/Components/PostComposer/usePostComposerState.jsx`
- `frontend/UXUI/Pages/PostLib.jsx`
- `frontend/UXUI/Pages/BatchPage.jsx`
- `frontend/UXUI/Pages/ArchivePage.jsx`
- `frontend/UXUI/Pages/SetupPage.jsx`
- `frontend/UXUI/Pages/TodayQueue.jsx`
- `backend/scripts/platforms/social/post-to-facebook.js`
- `backend/scripts/platforms/social/post-to-pinterest.js`
- `backend/scripts/platforms/social/capture-pinterest-state.js`

## Commands To Check Health

Backend tests:

```bash
cd backend
npm test
```

Frontend build:

```bash
cd frontend
npm run build
```

Run backend server:

```bash
cd backend
npm run start
```

Run frontend dev server:

```bash
cd frontend
npm run dev
```

Check worker logs:

```bash
tail -f /Users/ash/Desktop/N8tiveFlow/backend/worker.log
tail -f /Users/ash/Desktop/N8tiveFlow/backend/worker.err.log
```

Check launchd worker:

```bash
launchctl list | rg postpunk
```

Check platform health:

```bash
cd backend
npm run health:tokens -- --live
```

Inspect SQLite directly:

```bash
cd backend
sqlite3 data/postpunk.sqlite "select count(*) from posts;"
sqlite3 data/postpunk.sqlite "select count(*) from posts where json_extract(payload, '$.scheduledAt') is not null;"
```

## What To Say Next Time

If you want me to pick up quickly later, say something like:

- `check project state`
- `read the handoff docs and continue`
- `check code map and current queue`
- `what is the current PostPunk state`

That should be enough for me to reload context fast.

## Next Practical Priorities

The right order is:

1. Use `/batch` + `/lib` + `/today` as the main operating loop.
2. Keep filling the content queue across the live products.
3. Log manual performance metrics in the library.
4. Notice actual friction in `/today`, batch import, and library scheduling.
5. Only automate more after the manual workflow proves where the pain is.

Most likely future automation targets:

- refresh Facebook and Instagram credentials
- improve Pinterest handling
- decide whether X is worth manual-assist or browser automation later
- build a real bulk import/setup product layer instead of relying on ad hoc operator help

## Browser Scheduling Fallback

There is a practical fallback strategy for platforms that already support native scheduling in their own UI.

For platforms like `Facebook`, `X`, and `LinkedIn`, a browser-automation path may be more realistic in the near term than fighting each API integration.

The idea:

- log in with Playwright or browser session reuse
- open the native compose flow
- paste the final post copy
- attach media if present
- set the publish date and time using the platform's own scheduler
- submit the scheduled post in the platform UI

This is more brittle than a clean API integration, but it may still be the better short-term business choice when:

- the API is paid, restricted, or unstable
- credentials are hard to keep healthy
- native scheduling already exists in the platform UI

Current recommendation:

- keep `Dev.to` on direct automation
- keep `/today` manual-assist for unstable platforms
- consider browser-scheduling automation as a next-step fallback for `Facebook`, `X`, and `LinkedIn`

## Important Notes

- `X` should be treated as unreliable for now.
- `Dev.to` should stay weekly, not daily.
- `PostPunk` itself should be described honestly as a project in progress, not as a finished polished product.
- Avoid adding duplicate queue, tag, or profile logic. Use the existing shared helpers instead.
- Frontend routes live in `frontend/main.jsx`. That is the file to update when routes change.
- Local Ollama default is set to `stable-code:3b-code-q4_0` as the lightest installed model for code-path testing on this Mac.
- Ollama requests now use a longer backend timeout. If local generation still stalls, the app should surface a direct timeout message instead of a vague `500`.
- SQLite is now the real source of truth. The legacy JSON files still exist, but they are mirrors, not the primary store.
- The practical content workflow right now is import-first: generate externally if needed, then bring batches into `/batch`.
