# 🧃 PostPunk aka N8tiveFlow

## PostPunk is not open source. 
It is licensed under BSD 2-Clause for private, non-commercial use only. Commercial use requires a paid license.

PostPunk is your feral-but-focused automation system for scheduling, remixing, and tracking content posts across multiple platforms — complete with UTM insights, drag-and-drop frontend tools, optional notification systems, and a killer local dev setup.

For a deep dive into the guiding vision and the 4WD framework, see [PostPunk Core Vision](./Docs/PostPunk_Core_Vision.md).

---

## 🚀 What It Does
| Feature                     | Purpose                                                |
|----------------------------|--------------------------------------------------------|
| ✅ Post Queue              | Schedule and track content across platforms           |
| 🔁 Creative Recycling       | Remix past posts, keep evergreen content alive         |
| 📊 Funnel Analytics         | Review queue health, campaign metrics, and tracked funnel events |
| 📲 Telegram Alerts          | Success/failure/crash notifications from worker       |
| 🖼️ Media Library            | Local image/GIF/video uploads stored per post         |
| 💸 Affiliate Tagging        | Optional auto-tagging of Amazon links                |
| 🤖 Product Finder           | Scored product candidate generation (seed/Creators source) |
| 🧠 Local First Design       | Runs from terminal or always-on service (launchd/systemd) |
| 🧾 BSD Licensing            | Safe for personal use, commercial use via license      |

---

## 📦 Tech Stack
| Tech                | Purpose                          | License  |
|---------------------|----------------------------------|----------|
| React + Zustand     | Frontend UI + lightweight state  | MIT      |
| Tailwind + Vite     | Fast, styled build system        | MIT      |
| Playwright + Bree   | Automation / job runner          | Apache / MIT |
| JSON-based analytics | Funnel and campaign summaries   | Built-in |
| AdminJS             | Admin dashboard UI (optional)    | MIT      |
| React Hook Form     | Dynamic form builder             | MIT      |
| Yup                 | Form validation (optional)       | MIT      |
| Node-RED            | Local automation flows           | Apache 2.0 |
| Apprise             | Alerts to Slack, Discord, etc.   | BSD      |

---

## 🧠 Core Concepts
### Poster Monster Queue Rules
Only posts with `"status": "approved"` in the `postQueue.json` are eligible for publishing.
- Platforms must match `active_platforms` in `settings.json`
- After posting, system updates `status` to `"posted"`
- Posts can be rejected or recycled via logs

---

## ⚙️ System Settings
Control how PostPunk behaves globally:
```json
{
  "active_platforms": ["LinkedIn", "Pinterest"],
  "platform_mode": "exclusive",
  "daily_limit": 3,
  "auto_post": true,
  "campaign_start": "2025-06-01",
  "campaign_end": "2025-07-01"
}
```
📄 See [System Settings](./Docs/settings.md)

## 🔐 Account Secrets
Keep platform credentials in environment variables, not in tracked JSON.

1. Copy `backend/config/accounts.template.json` to `backend/config/accounts.json`
2. Set the referenced env vars in your local `.env`
3. Start backend normally; account placeholders like `${X_API_KEY}` are resolved at runtime

## 📘 Operations Guide
For full runbooks (macOS launchd, Linux systemd, queue/worker ops, backups, health checks), see:

- [`README-OPERATIONS.md`](./README-OPERATIONS.md)

---

## 🧠 Creative Recycling
Use `recycle.js` to store evergreen templates, asset combos, and platform-tailored content.
📄 See [Recycling Templates](./Docs/recycle-templates.md)

---

## 🧾 Licensing
This system is licensed under **BSD 2-Clause** for **personal use only**. 

You **may not**:
- Resell this system
- Sublicense or publicly post modified versions

To obtain a commercial license or team edition:
📬 Contact: `fleurdeviefarmsllc@gmail.com`

Includes third-party libraries under MIT, BSD, and Apache 2.0 — see [Licenses.txt](./Docs/Licenses.txt)

---

## 🧃 Run It Like a Ghost
```bash
cd backend && npm install
cd ../frontend && npm install

# terminal 1
cd backend && npm run start

# terminal 2
cd frontend && npm run dev

# run worker manually (or via launchd/systemd timer)
cd backend && npm run worker
```
---

## 🛠 Roadmap Highlights
- [ ] Replace file-backed analytics with a persistent metrics store
- [ ] Add richer posting/API integration tests
- [ ] Expand credential health checks into preflight UI warnings
- [ ] Add revenue-source integrations for conversion reporting

---

🧃 _Post like a ghost. Track like a boss.  Remix like an automation nerd with a thing for good buttons._

🛒 Want to license PostPunk for your team or product?
Email fleurdeviefarmsllc@gmail.com to get early access + pricing.
