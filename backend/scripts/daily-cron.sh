#!/bin/bash
# Runs the post queue each day. Add to crontab like:
# 0 8 * * * /path/to/daily-cron.sh

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

node scripts/post-from-queue.js >> logs/cron.log 2>&1
