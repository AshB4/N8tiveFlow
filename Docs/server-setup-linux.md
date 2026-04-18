# Linux Server Setup

Use this when you set up the always-on server laptop for PostPunk/N8tiveFlow.

This guide assumes Debian or Ubuntu. Debian stable is the calmer choice if you want fewer surprises. Ubuntu is also fine.

## Goal

The server should do one job:

- run the backend API as a service
- run the queue worker on a timer
- keep the machine awake and boring
- store runtime state locally
- back up queue/config/media on a schedule

It should not be your daily personal machine.

## Recommended Shape

- OS: Debian stable or Ubuntu LTS
- App root: `/opt/postpunk`
- Backend path: `/opt/postpunk/backend`
- Env file: `/opt/postpunk/.env`
- Runtime user: `postpunk`
- Primary data store: SQLite in `backend/data/postpunk.sqlite`
- Queue JSON files: mirrors only, not the source of truth

## What Belongs In Git vs Local State

Keep in Git:

- code
- docs
- stable config
- reusable batch templates

Keep local on the server:

- `.env`
- `backend/data/`
- `backend/queue/`
- `backend/media/`
- logs
- browser/session state

## Minimum Machine Spec

- 2 CPU cores
- 4 GB RAM
- 20+ GB disk
- reliable internet
- sleep disabled

For your `8 GB RAM` server laptop:

- this is enough for PostPunk itself
- this is not a great reason to run local AI by default

## Should You Put AI On The Server?

Short answer:

- not yet

For this server, local AI does not buy you much right now. The server’s main job is to be reliable:

- keep the worker running
- keep the API up
- keep the queue safe
- keep browser automation stable

Local AI on an `8 GB` machine usually adds:

- memory pressure
- more heat and swap usage
- more moving parts to debug
- weaker uptime for the thing you actually care about

### When local AI would make sense

Only add it later if you have a very specific server-side use case such as:

- local text cleanup jobs
- local draft rewriting
- offline helper tooling you actually use often

Even then, treat it as optional sidecar infrastructure, not part of the core posting path.

### Recommended choice for now

Use the server for:

- API
- worker timer
- backup timer
- queue state
- browser-session lanes

Use external AI or your normal workstation for:

- generation
- rewriting
- planning
- batch prep

That keeps the server boring, which is what you want.

## Base Packages

Install the basics first:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential ufw
```

Install Node.js. Use the version you already trust locally if possible. If you want a simple baseline, install Node 20 LTS.

Example with NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## Create the Runtime User

```bash
sudo useradd -r -m -d /opt/postpunk -s /usr/sbin/nologin postpunk || true
sudo mkdir -p /opt/postpunk
sudo chown -R postpunk:postpunk /opt/postpunk
```

## Deploy the Repo

If cloning directly on the box:

```bash
sudo -u postpunk git clone <YOUR_REPO_URL> /opt/postpunk
```

If copying from another machine, copy the repo into `/opt/postpunk` and then fix ownership:

```bash
sudo chown -R postpunk:postpunk /opt/postpunk
```

## Install App Dependencies

Backend is required. Frontend is only needed if you plan to run the UI on this machine too.

```bash
cd /opt/postpunk/backend
sudo -u postpunk npm install
```

Optional:

```bash
cd /opt/postpunk/frontend
sudo -u postpunk npm install
```

## Create the Env File

Create `/opt/postpunk/.env`.

At minimum, include:

- platform credentials you actually use
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Useful worker-related flags:

```bash
POSTPUNK_TELEGRAM_ALERTS_ENABLED=true
POSTPUNK_INVENTORY_ALERTS_ENABLED=true
POSTPUNK_LOW_RUNWAY_DAYS_FACEBOOK=7
POSTPUNK_LOW_RUNWAY_DAYS_PINTEREST=14
POSTPUNK_LOW_RUNWAY_DAYS_DEVTO=21
POSTPUNK_DEVTO_POSTS_PER_DAY=0.142857
POSTPUNK_PINTEREST_HOLIDAY_LEAD_DAYS=60
POSTPUNK_PINTEREST_HOLIDAY_MIN_PINS=5
POSTPUNK_MAX_ATTEMPTS=2
POSTPUNK_RETRY_DELAY_MINUTES=30
```

If using Pinterest browser automation:

```bash
PINTEREST_HEADLESS=true
PINTEREST_SESSION_STATE_PATH=backend/config/pinterest-state.json
PINTEREST_AUTO_RESIZE_IMAGES=true
```

Do not commit this file.

## Directory Reality Check

The runtime state you care about lives here:

- `/opt/postpunk/backend/data/`
- `/opt/postpunk/backend/queue/`
- `/opt/postpunk/backend/media/`
- `/opt/postpunk/backend/config/`

Important operational note:

- SQLite in `backend/data/postpunk.sqlite` is the real store.
- `backend/queue/postQueue.json`, `postedLog.json`, and `rejections.json` are compatibility mirrors.

## Systemd Setup

This repo already includes the units:

- [postpunk-api.service](/Users/ash/Desktop/N8tiveFlow/backend/systemd/postpunk-api.service)
- [postpunk-worker.service](/Users/ash/Desktop/N8tiveFlow/backend/systemd/postpunk-worker.service)
- [postpunk-worker.timer](/Users/ash/Desktop/N8tiveFlow/backend/systemd/postpunk-worker.timer)
- [postpunk-backup.service](/Users/ash/Desktop/N8tiveFlow/backend/systemd/postpunk-backup.service)
- [postpunk-backup.timer](/Users/ash/Desktop/N8tiveFlow/backend/systemd/postpunk-backup.timer)

Install them:

```bash
sudo cp /opt/postpunk/backend/systemd/postpunk-api.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-worker.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-worker.timer /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-backup.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

Enable them:

```bash
sudo systemctl enable --now postpunk-api.service
sudo systemctl enable --now postpunk-worker.timer
sudo systemctl enable --now postpunk-backup.timer
```

Current timer behavior:

- worker runs at `:00` and `:30` every hour
- backup runs nightly at `02:05`

Because `Persistent=true` is set on the timers, missed runs while the machine was off should fire on next boot.

## First Boot Validation

Run these after setup:

```bash
systemctl status postpunk-api.service
systemctl status postpunk-worker.timer
systemctl status postpunk-backup.timer
systemctl list-timers | rg postpunk
```

Then run one manual worker job:

```bash
cd /opt/postpunk/backend
sudo -u postpunk npm run worker
```

If you use the API/UI on the box, confirm the API too:

```bash
curl -I http://localhost:3001/api/posts
```

## Log Paths

```bash
tail -f /opt/postpunk/backend/api.log
tail -f /opt/postpunk/backend/api.err.log
tail -f /opt/postpunk/backend/worker.log
tail -f /opt/postpunk/backend/worker.err.log
tail -f /opt/postpunk/backend/backup.log
tail -f /opt/postpunk/backend/backup.err.log
```

## Security Baseline

Do this early:

```bash
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

Recommended:

- use SSH keys, not passwords
- do not expose the app publicly until you actually need to
- prefer Tailscale or local-network access first
- keep browser automation profiles dedicated to the app, not your personal browsing

## Sleep / Power

This machine should stay awake.

On a laptop server:

- disable suspend on lid close if it will be closed
- disable automatic sleep
- keep it on stable power

If the machine sleeps, scheduled posting windows can be missed.

## Backups

The included backup job snapshots:

- `queue`
- `media`
- `config`

That is useful, but you should also think about off-machine backups later for:

- `/opt/postpunk/backend/data/`
- `/opt/postpunk/backend/backups/`

## Operational Habits

Good habits:

- trust SQLite first, not the queue JSON mirrors
- check `worker.log` and `worker.err.log` when something “should have posted”
- use `npm run queue:dry-run` to inspect near-term queue state
- use `npm run summary:daily -- --send` for active operational checks
- keep runtime JSON noise out of Git

## Debian vs Ubuntu

Both are fine for this plan.

Choose Debian if:

- you want fewer moving parts
- you prefer stability over convenience

Choose Ubuntu if:

- you want more familiar package/install docs
- you want a slightly easier desktop-to-server transition

For PostPunk itself, the service layout stays the same either way.
