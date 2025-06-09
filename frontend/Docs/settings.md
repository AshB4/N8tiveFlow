# ⚙️ System Settings Overview
PostPunk’s behavior is governed by a single JSON file: `settings.json`. Think of it as the automation brain — it controls post limits, platform logic, campaign windows, and more.

---

## 🧠 Example: `settings.json`
```json
{
  "active_platforms": ["LinkedIn", "Pinterest", "X"],
  "platform_mode": "exclusive",
  "daily_limit": 3,
  "auto_post": true,
  "campaign_start": "2025-06-01",
  "campaign_end": "2025-07-01"
}
```

---

## 🔍 Field Breakdown
| Field             | What It Does                                                                 |
|------------------|------------------------------------------------------------------------------|
| `active_platforms` | Limits posting to only these platforms                                     |
| `platform_mode`    | "exclusive" = 1 platform per post, "multi" = post everywhere it matches     |
| `daily_limit`      | Max # of posts allowed per day across all platforms                        |
| `auto_post`        | If `true`, automation runs without needing manual trigger                  |
| `campaign_start`   | ISO date (yyyy-mm-dd) for when posting starts                              |
| `campaign_end`     | ISO date for when posting ends — disables queue outside this range         |

---

## 🧩 How It Connects
| File             | Role                                                                      |
|------------------|---------------------------------------------------------------------------|
| `postQueue.json` | Only posts that match `active_platforms` and dates will run               |
| `recycle.js`     | Pulls from templates, but still honors global rules                       |
| `bree` / `node-cron` | Triggers post jobs based on your defined windows + frequency         |

---

## 🔐 Pro Tip: Override Locally
If you're testing locally, you can override dates or platform rules temporarily with:
```bash
npm run start-scheduler -- --force
```
Or use an override file like `settings.override.json` and merge at runtime (optional).

---

Need to understand how this ties into automation triggers?  
👉 See [Scheduler Setup](./scheduler.md) (coming soon)
