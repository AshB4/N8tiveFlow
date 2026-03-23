# 🧾 Post Types (Styles & Functions)
PostPunk supports all types of content, from chaos memes to launch announcements.  
Here’s a breakdown of supported types and how they’re used in automation and logs.

---

## 🎯 Why Post Types Matter
They help you:
- Apply different rules per type (e.g., memes recycle more)
- Track success by format in UTM charts
- Customize formatting per platform (e.g., no hashtags on LinkedIn)

Use the `type` field in post metadata.
```json
{
  "title": "We launched!",
  "type": "launch",
  "platforms": ["linkedin", "pinterest"]
}
```

---

## ✨ Supported Types (Add more anytime)

### 1. `launch`
Big news, app drops, product reveals.
- 💬 CTA-heavy copy
- 🔗 Link always included
- 📆 Triggered on specific dates or manually

### 2. `meme`
Low-effort, high-share image content.
- 📸 Uses `/assets/memes/`
- 🔁 Often recycled
- 🧠 Great for engagement tracking

### 3. `thread`
Multi-part posts (e.g., Twitter/X threads)
- 🧵 Stored as array or multiline markdown
- 🧠 Could be split per platform later

### 4. `quote`
Short, emotional, or inspirational content.
- 💬 Usually 1–2 lines
- 🧪 Can be AI-generated

### 5. `tip`
Useful advice posts (dev, productivity, etc.)
- 🧠 May pull from your `recycle.js` pool
- 💡 Great for Ko-fi/Dev.to

### 6. `carousel`
For platforms like Pinterest or IG.
- 🎨 Multiple image assets (e.g., `/carousel/launch2025/`)
- 🧷 Must respect platform file order (1.jpg, 2.jpg...)

---

## 🧠 Tips
- Add your own post types in `recycle.js` or in post metadata
- You can log type to `posted-log.json` for analysis
- Use type-specific templates to auto-fill body text

---

👉 Next: see `Docs/code-map.md` and `Docs/project-state.md` for the current live system
