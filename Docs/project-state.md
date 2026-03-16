# Project State

This file is the handoff doc for the current working state of PostPunk/N8tiveFlow.

If you come back later, this is the file to read first.

## What This App Is Right Now

PostPunk is currently:

- a working queue and scheduling system
- a manual-post assistant for unstable platforms
- a partially automated publishing tool
- a proven automatic `Dev.to` lane

It is not yet a fully automatic multi-platform autoposter.

## What Exists

These pieces are built and in active use:

- post composer with queue saving
- approval workflow using `draft`, `approved`, `posted`, `failed`
- bulk scheduling in the library
- weekday presets like `MWF` and `MWFSu`
- Today Ops page at `/today`
- retry and failure handling
- product profiles
- platform writing guidance
- AI SEO generation with product and platform context
- image planning fields:
  - `imageStatus`
  - `imageConcept`
  - `imagePrompt`
- product link injection for punch posts
- Amazon affiliate tagging for Amazon product links
- Telegram success and failure alerts

## What Is Proven Working

- frontend build passes
- backend tests pass
- queue save and edit flow works
- launchd worker is installed and running on this Mac
- `Dev.to` automatic posting has been proven live
- Product profile lifecycle status is now tracked. The shipped Gumroad/Amazon products are marked `live`, while `PostPunk Core` is `in-progress` and the memoir/Reddit product remain `planned`.
- Telegram alerts fire for both success and failure

## What Is Not Reliable Yet

- `X` is not a trusted posting lane
- `Facebook` token state has been a blocker
- `Instagram` token state has been a blocker
- `Threads` is incomplete
- `Pinterest` and `Amazon` are in the queue model, but not a proven unattended posting lane

## Current Operating Model

Use the system like this:

1. Write or generate posts in the composer.
2. Save as `approved` if they are ready.
3. Bulk schedule them in the library.
4. Let `Dev.to` auto-post when due.
5. Use `/today` for manual posting on the other platforms.
6. Mark posts `posted` or `failed` as needed.

## Current Queue Snapshot

At the time this file was written:

- total queued posts: `17`
- all are real scheduled content, not placeholder junk
- `Dev.to` weekly article cadence: `3` queued posts

Platform counts in the queue:

- `devto`: `3`
- `facebook`: `7`
- `instagram`: `6`
- `pinterest`: `7`
- `linkedin`: `7`
- `reddit`: `7`
- `x`: `8`
- `amazon`: `2`

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
- `backend/queue/postQueue.json`
- `backend/server.mjs`
- `backend/scripts/postingJob.mjs`
- `backend/scripts/platforms/post-to-all.js`
- `frontend/UXUI/Components/PostComposer/usePostComposerState.jsx`
- `frontend/UXUI/Pages/PostLib.jsx`
- `frontend/UXUI/Pages/TodayQueue.jsx`

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

## What To Say Next Time

If you want me to pick up quickly later, say something like:

- `check project state`
- `read the handoff docs and continue`
- `check code map and current queue`
- `what is the current PostPunk state`

That should be enough for me to reload context fast.

## Next Practical Priorities

The right order is:

1. Use the system for real for 1 to 2 weeks.
2. Keep filling the content queue.
3. Notice actual friction in `/today`, composer, and library.
4. Only automate more after the manual workflow proves where the pain is.

Most likely future automation targets:

- refresh Facebook and Instagram credentials
- improve Pinterest handling
- decide whether X is worth manual-assist or browser automation later

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
