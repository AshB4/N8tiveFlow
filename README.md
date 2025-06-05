# 🧃 PostPunk aka N8tiveFlow

*This project’s been renamed a few times — a bunch of things, really. PostPunk stuck. Chaos refined.*  
_Automated chaos. Tracked. Styled. Queued._

<pre>
🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧
🪚 Work in Progress — Chaos is still under construction.
🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧
</pre>

## PostPunk is not open source. 
It is licensed under BSD 2-Clause for private, non-commercial use only. Commercial use requires a paid license.

PostPunk is your feral-but-focused automation system for scheduling, remixing, and tracking content posts across multiple platforms — complete with UTM insights, drag-and-drop frontend tools, optional notification systems, and a killer local dev setup.

---

## 🚀 What It Does
| Feature                     | Purpose                                                |
|----------------------------|--------------------------------------------------------|
| ✅ Post Queue              | Schedule and track content across platforms           |
| 🔁 Creative Recycling       | Remix past posts, keep evergreen content alive         |
| 📊 UTM Chart Tracking       | Visualize post performance and campaign ROI            |
| 🔌 Optional Integrations    | Alerts (Apprise) and flow automation (Node-RED)        |
| 🧠 Local First Design       | Runs from terminal or via cron without cloud lock-in   |
| 🧾 BSD Licensing            | Safe for personal use, commercial use via license      |

---

## 📦 Tech Stack
| Tech                | Purpose                          | License  |
|---------------------|----------------------------------|----------|
| React + Zustand     | Frontend UI + lightweight state  | MIT      |
| Tailwind + Vite     | Fast, styled build system        | MIT      |
| Playwright + Bree   | Automation / job runner          | Apache / MIT |
| Chart.js            | UTM analytics                    | MIT      |
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

📄 See [Queue Rules](./Docs/queue-rules.md) for full logic.

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

---

## 🧠 Creative Recycling
Use `recycle.js` to store evergreen templates, asset combos, and platform-tailored content.
📄 See [Recycling Templates](./Docs/recycle-templates.md)

---

## 🛰️ Optional: Notifications (Apprise)
Trigger alerts on success/failure or large queues:
- Supports Discord, Slack, Email, etc.
- Configured via `.apprise.yml`
📄 [Apprise Setup](./Docs/apprise.md)

---

## 🔁 Optional: Node-RED
Build flows that push data into PostPunk or trigger scripts based on external triggers.
📄 [Node-RED Integration](./Docs/nodered.md)

---

## 🧾 Licensing
This system is licensed under **BSD 2-Clause** for **personal use only**. 

You **may not**:
- Resell this system
- Sublicense or publicly post modified versions

To obtain a commercial license or team edition:
📬 Contact: `ash@fleurdevie.com`

Includes third-party libraries under MIT, BSD, and Apache 2.0 — see [Licenses.txt](./Docs/Licenses.txt)

---

## 🔥 Enterprise Mode Features
These modules expand PostPunk with additional tracking and scheduling tools.

- **Memory-Driven Remix Engine** – stores platform performance per post.
- **Post DNA Tracker** – logs hook, insight, CTA and tone for every draft.
- **Evergreen Post Queue** – rotates content with cooldown logic.
- **A/B Test Scheduler** – record engagement by post variant.
- **Ritual Engine** – assign posts to recurring workflows.
- **Platform Filter Checker** – warns if content is missing CTAs or alt text.
- **Post Mood Selector** – save tone and overlay choices.
- **Private Ritual Drafts** – hide WIP or NSFW content from normal queues.
- **Signal Booster Tools** – resurface popular posts for new threads.

All JSON data for these modules lives under `backend/enterprise/data/`.

---

## 🧃 Run It Like a Ghost
```bash
npm install
npm run start-scheduler     # bree kicks off
node backend/scripts/post-to-devto.js    # or run a script manually
```
---

## 🛠 Roadmap Highlights
- [ ] AdminJS UI for logs & queue
- [ ] Drag/drop image + asset manager
- [ ] Chart dashboard for campaign insights
- [ ] GPT prompt loader (for auto post gen)

---

🧃 _Post like a ghost. Track like a boss. Remix like a misfit._

🛒 Want to license PostPunk for your team or product?
Email fleurdeviefarmsllc@gmail.com to get early access + pricing.
