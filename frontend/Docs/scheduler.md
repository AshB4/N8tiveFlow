# ⏰ Scheduler Logic (Bree + node-cron)
This file explains how PostPunk schedules and triggers posts using:
- [Bree](https://github.com/breejs/bree) – full-featured job scheduler
- `node-cron` – lightweight cron alternative

Both work with `settings.json` to manage frequency, timing, and windows.

---

## 🧠 Bree Overview
Bree is a powerful, cron-like job runner for Node.js.  
We use it to:
- Trigger daily or random posting jobs
- Check queue status
- Run cleanup or alert tasks

### Basic Setup Example
```js
const Bree = require('bree');
const bree = new Bree({
  jobs: [
    {
      name: 'post-runner',
      path: './backend/scripts/post-to-devto.js',
      interval: 'at 9:00am'
    }
  ]
});

bree.start();
```

### Job Location
Place all job scripts inside `/backend/scripts/` and name them clearly:
- `post-to-devto.js`
- `post-to-gumroad.js`
- `cleanup-logs.js`

---

## 🔁 node-cron Alternative
`node-cron` works with traditional cron syntax.
Good if you want simpler interval logic.

### Example
```js
const cron = require('node-cron');
cron.schedule('0 8 * * *', () => {
  require('./scripts/post-to-devto')();
});
```

---

## 📂 File Layout for Scheduling
| File                 | Role                                  |
|----------------------|---------------------------------------|
| `settings.json`      | Defines campaign start/end, limits    |
| `bree.config.js`     | (Optional) exports job list to reuse  |
| `/scripts/*.js`      | Your job runners live here            |
| `/logs/`             | Output post logs or errors            |

---

## 🧪 Testing Jobs
Run a job manually:
```bash
node backend/scripts/post-to-devto.js
```

Run the whole scheduler:
```bash
npm run start-scheduler
```

---

## 💡 Tips
- Use Bree for advanced intervals (like "at 9am every Monday")
- Use `node-cron` if you want lightweight scheduling
- Keep each job modular (1 job = 1 task)

---

👉 [See Platform-Specific Notes](./platform-notes.md) to time posts better per site
