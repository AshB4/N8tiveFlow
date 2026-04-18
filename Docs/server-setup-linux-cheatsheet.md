# Linux Server Setup Cheat Sheet

Use this when you want the shortest possible bring-up path.

Full version:

- [server-setup-linux.md](/Users/ash/Desktop/N8tiveFlow/Docs/server-setup-linux.md)

## 1. Base Packages

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 2. Runtime User

```bash
sudo useradd -r -m -d /opt/postpunk -s /usr/sbin/nologin postpunk || true
sudo mkdir -p /opt/postpunk
sudo chown -R postpunk:postpunk /opt/postpunk
```

## 3. Deploy Repo

```bash
sudo -u postpunk git clone <YOUR_REPO_URL> /opt/postpunk
sudo chown -R postpunk:postpunk /opt/postpunk
```

If you copied the repo instead of cloning, just make sure it ends up at `/opt/postpunk`.

## 4. Install Backend

```bash
cd /opt/postpunk/backend
sudo -u postpunk npm install
```

Optional frontend:

```bash
cd /opt/postpunk/frontend
sudo -u postpunk npm install
```

## 5. Create Env

```bash
sudo -u postpunk nano /opt/postpunk/.env
```

At minimum put in:

- your platform credentials
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## 6. Install Systemd Units

```bash
sudo cp /opt/postpunk/backend/systemd/postpunk-api.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-worker.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-worker.timer /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-backup.service /etc/systemd/system/
sudo cp /opt/postpunk/backend/systemd/postpunk-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

## 7. Enable Services

```bash
sudo systemctl enable --now postpunk-api.service
sudo systemctl enable --now postpunk-worker.timer
sudo systemctl enable --now postpunk-backup.timer
```

## 8. Validate

```bash
systemctl status postpunk-api.service
systemctl status postpunk-worker.timer
systemctl status postpunk-backup.timer
systemctl list-timers | rg postpunk
```

Manual worker test:

```bash
cd /opt/postpunk/backend
sudo -u postpunk npm run worker
```

## 9. Logs

```bash
tail -f /opt/postpunk/backend/api.log
tail -f /opt/postpunk/backend/api.err.log
tail -f /opt/postpunk/backend/worker.log
tail -f /opt/postpunk/backend/worker.err.log
tail -f /opt/postpunk/backend/backup.log
tail -f /opt/postpunk/backend/backup.err.log
```

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

## 11. Important Reality Check

- SQLite is the real store: `/opt/postpunk/backend/data/postpunk.sqlite`
- `backend/queue/*.json` are mirrors only
- machine must stay awake
- do not use this box as your daily machine
- do not add local AI on the `8 GB` box yet unless you have a real server-side need
