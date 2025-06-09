# 🧠 Post Queue Rules: How Poster Monster Decides What Goes Out

This file explains how PostPunk’s automation system handles post approval, platform targeting, and queue behavior.

---

## ✅ Posting Criteria
Only posts in `postQueue.json` that meet **all** of the following are eligible for publishing:

| Condition                      | Description                                                       |
|-------------------------------|-------------------------------------------------------------------|
| `status: "approved"`          | Must be manually or programmatically marked as approved           |
| `platform` matches `active_platforms` | Must be one of the platforms listed in `settings.json`        |
| Within campaign window        | Must fall between `campaign_start` and `campaign_end` dates       |
| Not over `daily_limit`        | Stops posting if the daily max has been hit                       |

---

## 🔁 Post Lifecycle
| Phase          | What Happens                                                                 |
|----------------|------------------------------------------------------------------------------|
| Draft          | Post is created but not yet ready for approval                              |
| Approved       | Post is queued for release based on settings                                |
| Posted         | Post is marked with `status: "posted"` and written to `posted-log.json`     |
| Rejected       | Invalid or errored posts are moved to `rejected-log.json`                   |

---

## 🧪 Posting Modes (from `settings.json`)
| Setting            | Behavior                                                                 |
|--------------------|--------------------------------------------------------------------------|
| `platform_mode: "exclusive"` | Pick **one** eligible platform per post                         |
| `platform_mode: "multi"`     | Post to **all** matching platforms listed                        |

---

## 📂 Logs + Tracking
| File              | Purpose                                                              |
|-------------------|----------------------------------------------------------------------|
| `posted-log.json` | Stores all successfully published posts                              |
| `rejected-log.json` | Records posts that were invalid, errored, or skipped               |
| `queue-history.json` | (optional) Keeps timestamps for post attempts or status changes   |

---

## 📌 Example `postQueue.json` Entry
```json
{
  "id": "2025-06-01-pinterest-001",
  "platform": "Pinterest",
  "status": "approved",
  "title": "Summer Launch Is Live!",
  "media": "./assets/summer_banner.png",
  "utm_campaign": "launch_2025"
}
```

---

Want to see how posts are recycled and reused?  
👉 Head to [Recycling Templates](./recycle-templates.md)
