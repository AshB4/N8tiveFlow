# 🌐 Platform Notes (Posting Quirks & Tips)
Every platform is a little bit cursed in its own way.  
Here’s how to deal with it.

We recommend **breaking these into separate markdown files later**:
- `platform-pinterest.md`
- `platform-linkedin.md`
- `platform-x.md`
- etc.

For now, this file holds your working notes.

---

## 📌 Pinterest
| Quirk                | Workaround or Rule                                  |
|----------------------|------------------------------------------------------|
| Blocks Gumroad links | Use redirect or intermediate page (like dev.to)     |
| Needs vertical image | Create 2:3 aspect preview in `/assets/`             |
| Requires board name  | Add `board: 'MyBoard'` to your post metadata        |
| Tags limited         | 5 max, comma-separated                              |

**Automation Tips:**
- Use Playwright to screenshot preview cards
- Use markdown frontmatter to store Pinterest-only fields

---

## 💼 LinkedIn
| Quirk                | Workaround or Rule                                  |
|----------------------|------------------------------------------------------|
| Sometimes flags links| Use non-shortened URLs, avoid overly salesy phrases |
| Wants real preview   | Ensure OG tags are set on your redirect pages       |
| Blocks emoji spam    | Light usage only, looks spammy                      |

**Automation Tips:**
- Post in mornings on weekdays for better engagement
- Use `utm_medium=post` not `ad` to avoid flagging

---

## 🧵 X / Twitter
| Quirk                | Workaround or Rule                                  |
|----------------------|------------------------------------------------------|
| Rate limits on bots  | Use intervals between posts (not burst)             |
| Markdown ignored     | Format your tweets manually                         |
| Truncates long links | Always wrap CTAs with `bit.ly` or similar           |

**Automation Tips:**
- Use `status` API and rotate accounts if needed
- Good time to post = 12pm and 5pm user time

---

👉 Add new sections below as needed:
- Reddit
- Threads
- TikTok (link-in-bio, carousel image hacks)
- Ko-fi
- Gumroad
- Dev.to
- Your own site
