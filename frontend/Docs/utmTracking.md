# 📊 UTM Tracking + Success Logs
Want to see which platforms, campaigns, or post styles perform best?  
Here’s how PostPunk tracks UTMs, logs performance, and builds charts.

---

## 🧠 What Are UTM Tags?
UTM parameters are added to links so you can track where traffic came from.

| Parameter        | What It Tracks                     |
|------------------|-------------------------------------|
| `utm_source`     | Platform (e.g., Pinterest, Reddit)  |
| `utm_medium`     | Type (e.g., post, ad, email)        |
| `utm_campaign`   | Specific launch or campaign name    |
| `utm_term`       | Optional keyword or segment         |
| `utm_content`    | Optional differentiator (A/B test)  |

---

## 🔗 Example UTM Link
```bash
https://gumroad.com/l/my-product?utm_source=twitter&utm_medium=post&utm_campaign=launch_2025
```

---

## 📂 How PostPunk Uses UTM Tags
| File             | Role                                                  |
|------------------|-------------------------------------------------------|
| `postQueue.json` | Posts can contain `utm_campaign`, `utm_source`, etc. |
| `recycle.js`     | Evergreen templates can preload UTM values           |
| `posted-log.json`| Logs which UTM tags were actually sent + timestamp   |

---

## 🧾 Suggested `posted-log.json` Format
```json
[
  {
    "id": "2025-06-01-pinterest-launch",
    "platform": "Pinterest",
    "title": "Launch is live!",
    "posted_at": "2025-06-01T08:30:00Z",
    "utm_campaign": "launch_2025",
    "utm_source": "pinterest",
    "utm_medium": "post"
  }
]
```

---

## 📈 Charting With `chart.js`
You can generate UTM performance graphs by parsing `posted-log.json`:
- Bar charts: Most active platforms
- Line charts: Campaign posting frequency
- Pie charts: Success by medium (e.g., CTA, meme, thread)

### Suggested Format for Feeding `chart.js`
```js
const campaignCounts = {
  "launch_2025": 12,
  "summer_sale": 7,
  "postpunk_cta": 5
};
```

Use this in a React `Chart.js` component inside your Admin dashboard.

---

## 🔐 Privacy Tip
You can track what was posted — **but not clicks or sales** unless you connect to:
- Gumroad analytics export (CSV → parse)
- Google Analytics (via UTM tracking)
- Your own webhook/server log endpoint

---

👉 Next: [Scheduler Automation](./scheduler.md)
