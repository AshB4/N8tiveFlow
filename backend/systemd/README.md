# PostPunk on Linux Mint (systemd)

This folder provides unit files to run PostPunk backend on a Linux server that stays on:

- `postpunk-api.service`: always-on API server
- `postpunk-worker.service`: one-shot queue worker
- `postpunk-worker.timer`: runs worker at `:00` and `:30` each hour

## Assumptions
- Repo deployed at `/opt/postpunk`
- Backend path: `/opt/postpunk/backend`
- Env file at `/opt/postpunk/.env`
- Runtime user/group: `postpunk`

If your paths differ, edit the unit files before installing.

## 1) Create user and set ownership (once)
```bash
sudo useradd -r -s /usr/sbin/nologin postpunk || true
sudo mkdir -p /opt/postpunk
sudo chown -R postpunk:postpunk /opt/postpunk
```

## 2) Install dependencies
```bash
cd /opt/postpunk/backend
npm install
```

## 3) Install unit files
```bash
sudo cp /opt/postpunk/backend/systemd/postpunk-api.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-worker.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-worker.timer /etc/systemd/system/
```

## 4) Enable and start
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now postpunk-api.service
sudo systemctl enable --now postpunk-worker.timer
```

## 5) Check status
```bash
systemctl status postpunk-api.service
systemctl status postpunk-worker.timer
systemctl list-timers | rg postpunk
```

## 6) Logs
```bash
tail -f /opt/postpunk/backend/api.log
tail -f /opt/postpunk/backend/worker.log
tail -f /opt/postpunk/backend/worker.err.log
```

## Notes
- `Persistent=true` on timer means missed runs while powered off are executed on next boot.
- API runs continuously and Telegram alerts continue to work from the worker.

