# 🧮 Admin Dashboard (Optional Setup)
_PostPunk’s Fancy Control Panel, powered by AdminJS._

This is an **optional** feature that gives you a UI dashboard for managing:
- 🔎 Post queue status
- 📂 Recycled templates
- 🗃️ Logs (posted, rejected)
- 🧠 Settings (if writable)

---

## 🧠 What It Uses
| Tool         | Role                               |
|--------------|-------------------------------------|
| AdminJS      | Admin panel framework               |
| Express.js   | Backend server for the dashboard    |
| `@adminjs/express` | Plug-in to link AdminJS + Express |

---

## ⚙️ Installation
Install via npm:
```bash
npm install adminjs @adminjs/express express
```

Then create a basic admin server file:
```js
// backend/admin/admin.js
const express = require("express");
const AdminJS = require("adminjs");
const AdminJSExpress = require("@adminjs/express");

const app = express();
const admin = new AdminJS({
  rootPath: "/admin",
  resources: [], // you can register custom models or JSON editors here
});

const router = AdminJSExpress.buildRouter(admin);
app.use(admin.options.rootPath, router);

app.listen(3002, () => console.log("🧠 Admin panel ready on http://localhost:3002/admin"));
```

---

## 💡 Ideas for Future Use
| Panel Area      | What You Could Add                                        |
|------------------|-----------------------------------------------------------|
| Posts            | Approve/Reject queued posts with a click                  |
| Recycle Manager  | Add or edit evergreen templates                           |
| Settings         | Update global config via form (with write lock optional) |
| Chart View       | View post success logs + UTM breakdowns                   |

---

## 🔐 Notes
AdminJS is MIT licensed, safe for commercial use.  
It can also be password-protected or embedded into your future hosted version.

Want more secure or visual options? Consider:
- Basic auth middleware
- Custom themes with Tailwind
- Drag & drop file uploads (WIP)

---

👉 Back to [README](../README.md)