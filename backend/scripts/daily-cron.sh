#!/usr/bin/env sh
# Launch masterPoster.js via Node for automated daily posting.
#
# Example crontab entry (runs every day at 8AM):
# 0 8 * * * /path/to/N8tiveFlow/backend/scripts/daily-cron.sh >> /path/to/N8tiveFlow/backend/logs/post.log 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
node masterPoster.js
