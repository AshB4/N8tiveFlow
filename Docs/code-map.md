# Code Map

This file explains what owns what in PostPunk/N8tiveFlow.

Use it before adding features so we do not recreate logic, duplicate helpers, or split the source of truth.

## Core Flow

- Frontend entrypoint and route source of truth: `frontend/main.jsx`
- Composer page UI: `frontend/UXUI/Pages/postComposer.jsx`
- Composer state and submit logic: `frontend/UXUI/Components/PostComposer/usePostComposerState.jsx`
- Batch import and queue staging: `frontend/UXUI/Pages/BatchPage.jsx`
- Affiliate strategy/rules page: `frontend/UXUI/Pages/AffiliateEnginePage.jsx`
- Affiliate batch builder: `frontend/UXUI/Pages/AffiliateBuilderPage.jsx`
- Rotation and scheduling defaults setup: `frontend/UXUI/Pages/SetupPage.jsx`
- Posted history archive UI: `frontend/UXUI/Pages/ArchivePage.jsx`
- Backend API: `backend/server.mjs`
- Scheduled worker: `backend/scripts/postingJob.mjs`
- Platform dispatch: `backend/scripts/platforms/post-to-all.js`

## Single Sources Of Truth

- Queue data: SQLite `posts` table via `backend/utils/localDb.mjs`
- Posted log/history: SQLite `posted_log` table via `backend/utils/localDb.mjs`
- Rejections and failures: SQLite `rejections` table via `backend/utils/localDb.mjs`
- Legacy JSON mirrors for compatibility:
  - `backend/queue/postQueue.json`
  - `backend/queue/postedLog.json`
  - `backend/queue/rejections.json`
- Status rules:
  - `backend/utils/postStatus.mjs`
  - `frontend/UXUI/utils/postStatus.js`
- Distribution-tag parsing:
  - `backend/utils/distributionTags.mjs`
  - `frontend/UXUI/utils/distributionTags.js`
- Product profiles:
  - `backend/utils/productProfiles.mjs`
  - `frontend/UXUI/utils/productProfiles.js`
- Platform writing guidance:
  - `backend/utils/platformProfiles.mjs`
  - `frontend/UXUI/utils/platformProfiles.js`

## Frontend Page Ownership

- Calendar and home view: `frontend/UXUI/Pages/PostCalendar.jsx`
- Composer: `frontend/UXUI/Pages/postComposer.jsx`
- Library and bulk scheduling: `frontend/UXUI/Pages/PostLib.jsx`
- Batch import and batch queue actions: `frontend/UXUI/Pages/BatchPage.jsx`
- Affiliate rules, planning kernel, and reusable GPT prompts: `frontend/UXUI/Pages/AffiliateEnginePage.jsx`
- Affiliate row builder, bulk JSON import, and affiliate queue scheduling: `frontend/UXUI/Pages/AffiliateBuilderPage.jsx`
- Today Ops and manual assist: `frontend/UXUI/Pages/TodayQueue.jsx`
- Analytics: `frontend/UXUI/Pages/ChartsPage.jsx`
- Posted archive: `frontend/UXUI/Pages/ArchivePage.jsx`
- Rotation/setup: `frontend/UXUI/Pages/SetupPage.jsx`
- pSEO pages: `frontend/UXUI/Pages/SeoPages.jsx`
- 404 and fallback UI: `frontend/UXUI/Pages/notFound.jsx`

### Current page-specific operational notes

- `frontend/UXUI/Pages/PostCalendar.jsx`
  - shows scheduled approved posts
  - now also shows failed scheduled posts in red
  - supports retrying failed posts forward by a day
  - shows affiliate day markers in the month grid with a small status-colored `🛒` badge beside the date number
- `frontend/UXUI/Pages/SetupPage.jsx`
  - owns rotation defaults
  - now also surfaces token/platform health from `/api/platform-health`
- `frontend/UXUI/Pages/postComposer.jsx`
  - owns single-post AI assist
  - has visible AI results tray and one-click `Approve + Schedule Next Open Day`
- `frontend/UXUI/Pages/BatchPage.jsx`
  - owns import-first batch workflow
  - has AI response staging and batch scheduling/mix actions
- `frontend/UXUI/Pages/AffiliateEnginePage.jsx`
  - owns the Amazon affiliate planning framework
  - holds decision rules, sale-mode notes, tracking guidance, and reusable GPT research prompts
- `frontend/UXUI/Pages/AffiliateBuilderPage.jsx`
  - owns the Amazon affiliate working builder
  - supports row-based affiliate pin prep using `keyword`, `angle`, `productLink`, `title`, `description`, `image`, `board`, optional `boards`, and `tags`
  - supports bulk GPT JSON import, local autosave, row selection, and queueing selected rows into the main queue
  - mixes queued rows by product/link before scheduling so one product does not clump on consecutive slots
  - pulls saved board suggestions from `/api/pinterest-boards` and uses them for primary and alternate board fields

## Composer Dependencies

- Platform selector UI: `frontend/UXUI/Global/PostComposer/PlatformSelector.jsx`
- Image upload UI: `frontend/UXUI/Global/PostComposer/ImageUploader.jsx`
- Platform-specific text UI: `frontend/UXUI/Global/PostComposer/CustomPlatformText.jsx`
- Product selector UI: `frontend/UXUI/Global/PostComposer/SeoProductSelector.jsx`

## Backend API Ownership

- Posts CRUD: `backend/server.mjs`
- Archive API: `backend/server.mjs`
- Rotation settings API: `backend/server.mjs`
- Accounts API: `backend/server.mjs`
- Pinterest boards API: `backend/server.mjs`
- Platform health API: `backend/server.mjs`
- Analytics summary API: `backend/server.mjs`
- AI SEO generation API: `backend/server.mjs`
- AI campaign generation API: `backend/server.mjs`
- Media upload API: `backend/server.mjs`

### Important backend behavior notes

- `backend/server.mjs`
  - moving a post to `status: "posted"` appends it to archive history
  - `/api/platform-health` powers the `/setup` token-health panel
  - `/api/pinterest-boards` exposes saved Pinterest board names and default board for the affiliate builder
- `backend/scripts/postingJob.mjs`
  - fully failed posts stay in the queue as `failed` after max attempts instead of disappearing
  - partially successful posts now remain in the queue for the failed targets only, so they do not vanish after mixed success

## Posting Pipeline

- Worker chooses due posts and handles retries: `backend/scripts/postingJob.mjs`
- Target normalization, account lookup, and product-link injection: `backend/scripts/platforms/post-to-all.js`
- Account loading and lookup: `backend/utils/accountStore.mjs`
- Possible future fallback for unstable social platforms: browser-scheduling automation via Playwright, instead of API-first posting

### Per-platform handlers

- Dev.to: `backend/scripts/platforms/dev/post-to-devto.js`
- X: `backend/scripts/platforms/social/post-to-x.js`
- Facebook: `backend/scripts/platforms/social/post-to-facebook.js`
- Instagram: `backend/scripts/platforms/social/post-to-instagram.js`
- LinkedIn: `backend/scripts/platforms/social/post-to-linkedin.js`
- Pinterest: `backend/scripts/platforms/social/post-to-pinterest.js`
- Substack: `backend/scripts/platforms/social/post-to-substack.js`
- Reddit: `backend/scripts/platforms/social/post-to-reddit.js`
- Threads: `backend/scripts/platforms/social/post-to-threads.js`
- Pinterest session bootstrap helper: `backend/scripts/platforms/social/capture-pinterest-state.js`

### Meta lane notes

- Current proven Meta lane: Facebook page posting through `post-to-facebook.js`
- Proven now:
  - text posts
  - image posts using a local `mediaPath`
  - browser-only posting through `post-to-facebook-browser.js`
  - personal-profile posting routed by `profileUrl`
  - page posting routed by `pageUrl`
  - `Color With Ash` page flow using `Next -> Post`
- Not wired yet:
  - Facebook Stories API flow
  - Facebook video publishing flow
- Instagram and Threads have adapter files, but they rely on separate `INSTAGRAM_*` and `THREADS_*` credentials and should not be treated as automatically covered by Facebook page tokens

### Pinterest lane notes

- Current proven Pinterest lane: `post-to-pinterest.js`
- Proven now:
  - single live pin posting
  - image upload from local `mediaPath`
  - title/description/link fill
  - board selection from `backend/config/pinterest-boards.json`
  - saved-session reuse through a dedicated Pinterest Chrome profile
  - product-link passthrough from queued metadata into the Pinterest `Link` field
  - draft-rail handling for single-pin publish flows
- Supporting helper:
  - `capture-pinterest-state.js` creates/saves the Pinterest automation session
- Not wired yet:
  - publish-later scheduling
  - alt text
  - tagged topics / product tagging
  - sequential multi-pin posting in one run

### Substack lane notes

- Current Substack lane: `post-to-substack.js`
- Wired now:
  - browser-only posting through Playwright
  - dedicated persistent profile at `backend/config/substack-chrome-profile`
  - account/config support through `backend/config/accounts.json`
  - frontend platform visibility in the composer and queue views
  - worker/platform routing through `post-to-all.js` and `postingJob.mjs`
- Current blocker:
  - Substack auth/session has not been completed yet
  - the automation currently lands on `https://substack.com/` / `https://substack.com/home` without a signed-in writer session
  - the next resume step is to sign in once inside the dedicated Substack automation browser profile, then rerun the editor flow
- Helper test harness:
  - `backend/test-substack.js`

### Affiliate workflow notes

- `/affiliate` is the strategy layer, not the posting engine
- `/affiliate/builder` is the operational affiliate batch builder
- The builder currently feeds Pinterest-oriented affiliate posts into the normal queue one by one
- Default affiliate cadence in the builder is `3/day`, with date-range overrides for sale windows such as `25th-30th -> 6/day`
- The builder supports one immediate `board` plus optional per-row `boards` for future reposting to niche-fit boards on different days
- The builder does not export paid Pinterest bulk CSV workflows; it prepares and queues rows into PostPunk instead

## AI And Prompting

- SEO generation orchestration: `backend/utils/seoGeneration.mjs`
- Prompt builder: `backend/utils/GptPromptBuilder.js`
- Provider client: `backend/utils/aiClient.mjs`
- Campaign planning/generation: `backend/utils/campaignGeneration.mjs`

## Local Storage And Scheduling

- SQLite storage layer and migration/mirroring: `backend/utils/localDb.mjs`
- Archive entry normalization: `backend/utils/archiveEntry.mjs`
- Rotation settings persistence: `backend/utils/localDb.mjs`
- Queue bulk scheduling and auto-schedule-after-last-date UI: `frontend/UXUI/Pages/PostLib.jsx`
- Batch save, approve, and continue-after-last-date flow: `frontend/UXUI/Pages/BatchPage.jsx`

## Health, Analytics, Alerts

- Platform credential checks: `backend/utils/platformHealth.mjs`
- Analytics aggregation: `backend/utils/analyticsSummary.mjs`
- Telegram alerts: `backend/utils/telegramAlerts.mjs`

## AI Provider Reality

- `backend/utils/aiClient.mjs` supports both OpenAI and Ollama
- operational default should be treated as `OpenAI`
- Ollama remains optional/testing-only on this Mac because local inference was not reliable enough for daily use

## Avoid Duplicates

- Do not create another status mapper. Use `postStatus`.
- Do not create another target parser. Use `distributionTags` and `normalizeTargets`.
- Do not create another product-profile store. Use `productProfiles`.
- Do not create another platform-style prompt map. Use `platformProfiles`.
- Do not create a second storage layer. SQLite in `localDb.mjs` is the source of truth.
- Do not put posting logic in the frontend. Route it through the backend.
- Do not treat the JSON mirrors as the primary queue. They exist for compatibility only.

## Rules Of Thumb

- UI behavior belongs in page and component files.
- Shared frontend logic belongs in `frontend/UXUI/utils/*` or React hooks.
- API and data mutation belong in `backend/server.mjs`.
- Scheduling belongs in `backend/scripts/postingJob.mjs`.
- Posting behavior belongs in `backend/scripts/platforms/*`.
- Cross-platform posting rules belong in `backend/scripts/platforms/post-to-all.js`.
- Do not add or update routes in `frontend/app.jsx`. `frontend/main.jsx` is the active router.
