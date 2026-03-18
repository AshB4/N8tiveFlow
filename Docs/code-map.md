# Code Map

This file explains what owns what in PostPunk/N8tiveFlow.

Use it before adding features so we do not recreate logic, duplicate helpers, or split the source of truth.

## Core Flow

- Frontend entrypoint and route source of truth: `frontend/main.jsx`
- Composer page UI: `frontend/UXUI/Pages/postComposer.jsx`
- Composer state and submit logic: `frontend/UXUI/Components/PostComposer/usePostComposerState.jsx`
- Batch import and queue staging: `frontend/UXUI/Pages/BatchPage.jsx`
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
- Today Ops and manual assist: `frontend/UXUI/Pages/TodayQueue.jsx`
- Analytics: `frontend/UXUI/Pages/ChartsPage.jsx`
- Posted archive: `frontend/UXUI/Pages/ArchivePage.jsx`
- Rotation/setup: `frontend/UXUI/Pages/SetupPage.jsx`
- pSEO pages: `frontend/UXUI/Pages/SeoPages.jsx`
- 404 and fallback UI: `frontend/UXUI/Pages/notFound.jsx`

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
- Platform health API: `backend/server.mjs`
- Analytics summary API: `backend/server.mjs`
- AI SEO generation API: `backend/server.mjs`
- AI campaign generation API: `backend/server.mjs`
- Media upload API: `backend/server.mjs`

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
- Reddit: `backend/scripts/platforms/social/post-to-reddit.js`

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
