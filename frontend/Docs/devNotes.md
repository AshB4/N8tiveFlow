# 🧠 Dev Notes (Internal Use Only)
This doc is **not** for public eyes — just you (or trusted contributors).  
It holds rough logic, shortcuts, warnings, and edge cases.

## 🔒 Hide from Normies
- Keep this file out of user-facing dashboards
- Do not render or expose this in production
- This is your spellbook, not your sales pitch

---

## 🧪 System Logic Tips

### Cron Job Behavior
- `bree` reads jobs from `/scripts/`, expects them to be standalone runnable
- If a job crashes, it may silently fail unless logged manually
- Always `try/catch` with `console.warn()` to avoid scheduler crashes

### Playwright Gotchas
- Headless can break on Pinterest previews → try headful for screenshots
- Wait for specific selectors, not just `page.goto()`
- Rate limit aggressively (1 post per 45s to 2m)

### UTM Sync Warnings
- Only log UTMs that were actually sent (not ones intended)
- Check for `utm_source` mismatch in `posted-log.json`

---

## 🧰 Local Dev Setup
- Run frontend with: `npm run dev` in `/frontend`
- Run backend with: `npm run start-scheduler` or directly via node
- Use `.env.local` for testing API keys

## 🐛 Debugging Tools
- Use `chalk` for colored logs: red = errors, green = success
- Add `console.table()` to show post queues visually
- Dump `process.env` only in local/test mode

---

## 🗃️ File Naming Conventions
| Folder          | Format Example                         |
|------------------|-----------------------------------------|
| `/posts/`         | `2025-06-02-linkedin-meme.md`           |
| `/scripts/`       | `post-to-pinterest.js`                  |
| `/logs/`          | `failed-pins.log`, `posted-log.json`    |
| `/carousel/`      | `launch2025/1.jpg`, `2.jpg`, `text.txt` |

---

## 🚫 Anti-Patterns to Avoid
- Hardcoding platform logic in multiple files (use helpers)
- Forgetting to mark posts as `"status": "posted"`
- Mixing Dev.to and Pinterest markdown formatting

---

## 🚧 To-Do / Future Refactor
- 🔄 Move Playwright into reusable utility module
- 🧼 Add `cleanup-old-logs.js` with retention period
- 🧪 Write test cases for `recycle.js` random logic
- 🔒 Encrypt `.env` with optional key file

---

End of notes. Add chaos below as needed. 🌀