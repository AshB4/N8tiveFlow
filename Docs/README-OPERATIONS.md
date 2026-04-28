# PostPunk Operations README

## Program size (current)
- Total repo: `216M`
- Backend: `42M`
- Frontend: `129M`
- Docs: `20K`
- Tracked files: `185` (`178` under backend/frontend/docs)

## What this app does
- You create and schedule posts in Composer.
- Posts are stored in SQLite through `backend/utils/localDb.mjs`.
- Queue JSON files are compatibility mirrors, not the primary store.
- Worker script publishes approved posts when scheduled.
- Telegram alerts notify success/failure.
- Optional affiliate Amazon tagging and media uploads are supported.

## Required setup
1. Clone repo and install dependencies:
```bash
cd /path/to/N8tiveFlow
cd backend && npm install
cd ../frontend && npm install
```

2. Create and fill `.env` at repo root (`/path/to/N8tiveFlow/.env`).
   Include at minimum:
- Platform tokens you want to post with
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- Optional:
  - `POSTPUNK_TELEGRAM_ALERTS_ENABLED=true`
  - Inventory/holiday alerts (Telegram, once per day when triggered):
    - `POSTPUNK_INVENTORY_ALERTS_ENABLED=true`
    - `POSTPUNK_LOW_RUNWAY_DAYS_FACEBOOK=7`
    - `POSTPUNK_LOW_RUNWAY_DAYS_PINTEREST=14`
    - `POSTPUNK_LOW_RUNWAY_DAYS_DEVTO=21`
    - `POSTPUNK_DEVTO_POSTS_PER_DAY=0.142857` (1 per week)
    - `POSTPUNK_PINTEREST_HOLIDAY_LEAD_DAYS=60`
    - `POSTPUNK_PINTEREST_HOLIDAY_MIN_PINS=5`
  - `AMAZON_PARTNER_TAG=ashb4studio0b-20`
  - `AMAZON_USE_CREATORS_API=true`
  - `AMAZON_CREATORS_CLIENT_ID=...`
  - `AMAZON_CREATORS_CLIENT_SECRET=...`
  - `AMAZON_CREATORS_CREDENTIAL_VERSION=3.1`
  - `AMAZON_CREATORS_TOKEN_ENDPOINT=https://api.amazon.com/auth/o2/token`
  - `AMAZON_CREATORS_MAX_TPS=1`
  - `AMAZON_CREATORS_MAX_TPD=8640`
  - `AMAZON_CREATORS_MAX_RETRIES=3`
  - `POSTPUNK_MAX_ATTEMPTS=2`
  - `POSTPUNK_RETRY_DELAY_MINUTES=30`
  - Pinterest Playwright:
    - `PINTEREST_USERNAME=...`
    - `PINTEREST_PASSWORD=...`
    - `PINTEREST_LOGIN_EMAIL=...` (optional)
    - `PINTEREST_BOARD_NAME=...`
    - `PINTEREST_SESSION_STATE_PATH=backend/config/pinterest-state.json`
    - `PINTEREST_HEADLESS=true`
    - `PINTEREST_AUTO_RESIZE_IMAGES=true` (auto-fix images narrower than 1000px)

3. Keep `backend/config/accounts.json` as placeholder-based config and let env resolve credentials.

## Local terminal run (manual mode)
Run in 2 terminals:

Terminal A (backend API):
```bash
cd /path/to/N8tiveFlow/backend
npm run start
```

Terminal B (frontend UI):
```bash
cd /path/to/N8tiveFlow/frontend
npm run dev
```

Manual worker run:
```bash
cd /path/to/N8tiveFlow/backend
npm run worker
```

## Daily usage flow
1. Open Composer.
2. Write/paste post content, pick targets, upload media.
3. Set `scheduledAt`.
4. Keep post `status` as `approved` when ready to autopost.
5. Worker picks it up at scheduled window if the machine is awake, the queue is intact, and the target lane is healthy.
6. Use `/today` for due-today ops and manual retry work.
7. Use `/archive` for posted history.
8. Use `/charts` for Pinterest CSV/snapshot analytics.

## Useful backend commands
```bash
cd /path/to/N8tiveFlow/backend
npm run health:tokens     # token/account health check
npm run queue:dry-run     # what posts in next 24h
npm run summary:daily     # local daily summary
npm run summary:daily -- --send  # send summary to Telegram
npm run backup:snapshot   # snapshot queue/media/config
npm run revenue:export    # export revenue CSV template
npm run product-finder    # generate product finder candidates
npm run product-finder -- --source creators --dry-run  # test Creators API source
```

For a Linux always-on deployment checklist, see:

- `Docs/server-setup-linux.md`
- `Docs/server-setup-linux-cheatsheet.md`

## Keep it running on macOS (terminal-free)
Use `launchd` files included in `backend/launchd/`.

Install and load:
```bash
mkdir -p ~/Library/LaunchAgents
cp /path/to/N8tiveFlow/backend/launchd/com.postpunk.api.plist ~/Library/LaunchAgents/
cp /path/to/N8tiveFlow/backend/launchd/com.postpunk.worker.plist ~/Library/LaunchAgents/

launchctl unload ~/Library/LaunchAgents/com.postpunk.api.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/com.postpunk.worker.plist 2>/dev/null || true

launchctl load ~/Library/LaunchAgents/com.postpunk.api.plist
launchctl load ~/Library/LaunchAgents/com.postpunk.worker.plist
```

Check:
```bash
launchctl list | rg postpunk
tail -n 100 /path/to/N8tiveFlow/backend/api.log
tail -n 100 /path/to/N8tiveFlow/backend/worker.log
```

Important: if Mac sleeps, scheduled runs can be missed.

## Keep it running on Linux Mint (recommended always-on box)
Systemd files are in `backend/systemd/`.

Install:
```bash
sudo useradd -r -s /usr/sbin/nologin postpunk || true
sudo mkdir -p /opt/postpunk
sudo chown -R postpunk:postpunk /opt/postpunk

# copy repo to /opt/postpunk, then:
cd /opt/postpunk/backend
npm install

sudo cp /opt/postpunk/backend/systemd/postpunk-api.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-worker.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-worker.timer /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-backup.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-backup.timer /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now postpunk-api.service
sudo systemctl enable --now postpunk-worker.timer
sudo systemctl enable --now postpunk-backup.timer
```

Check:
```bash
systemctl status postpunk-api.service
systemctl status postpunk-worker.timer
systemctl status postpunk-backup.timer
systemctl list-timers | rg postpunk
```

Logs:
```bash
tail -f /opt/postpunk/backend/api.log
tail -f /opt/postpunk/backend/worker.log
tail -f /opt/postpunk/backend/worker.err.log
tail -f /opt/postpunk/backend/backup.log
```

## Scheduler cadence (current)
- Worker runs at `:00` and `:30` each hour.
- Backup runs nightly at `02:05` (Linux timer).

## Queue and media paths
- Primary store:
  - `backend/data/postpunk.sqlite`
- Queue files:
  - `backend/queue/postQueue.json`
  - `backend/queue/postedLog.json`
  - `backend/queue/rejections.json`
- Uploaded media:
  - `backend/media/images`
  - `backend/media/gifs`
  - `backend/media/videos`
  - `backend/media/other`

## Frontend pages
- `/today` or `/today-ops`: due-today queue and retry actions
- `/archive`: posted history
- `/charts`: Pinterest performance dashboard built from CSV/snapshot metrics

## Reliability notes
- Always-on machine required for consistent posting windows.
- Telegram alerts should stay enabled for immediate failure visibility.
- Run `npm run health:tokens` regularly to catch expired/missing credentials.
- The worker can be installed and still miss expected output if the machine sleeps, a lane crashes, or the queue itself has been rewritten incorrectly. Treat `worker.log`, `worker.err.log`, and the SQLite-backed queue as the operational truth.
- Use `npm run summary:daily -- --send` and `npm run queue:dry-run` as active checks instead of assuming scheduled days are populated.
- Amazon Creators migration flag:
  - `AMAZON_USE_CREATORS_API=true` enables Creators API for Amazon lookup in posting flow.
  - Keep it `false` to use legacy PA-API path.
- Creators compliance/rate controls:
  - token caching is automatic
  - API responses are cached (offers resources ~1h, other resources ~1d)
  - request limiting/backoff is enforced via `AMAZON_CREATORS_MAX_TPS`, `AMAZON_CREATORS_MAX_TPD`, and retry env vars
  - auto-affiliate tagging skips likely vended Amazon URLs (to preserve Creators URL parameters)

## Pinterest via Playwright (no Pinterest API)
- Script: `backend/scripts/platforms/social/post-to-pinterest.js`
- First run recommendation:
  - set `PINTEREST_HEADLESS=false`
  - run a Pinterest post flow once so session state file is created
  - then set `PINTEREST_HEADLESS=true` for normal automation
- Session is stored at `PINTEREST_SESSION_STATE_PATH`.
- Image preflight:
  - Pinterest image uploads require width >= 1000px.
  - If `PINTEREST_AUTO_RESIZE_IMAGES=true`, script creates a 1000x1500 copy when needed.
  - If disabled, script fails fast with a clear width error.
