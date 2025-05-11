# Poster Monster Queue Rules

- Only posts with `"status": "approved"` will publish
- Posts must match platforms listed in `active_platforms`
- After posting, update `"status": "posted"` and log it

🧠 settings.json = Global System Controls
"How Poster Monster behaves."

Field	Meaning
active_platforms	Platforms allowed to post right now (e.g., LinkedIn, Pinterest, X)
platform_mode	"exclusive" means only post to one per post, "multi" could mean all matched platforms
daily_limit	Maximum number of posts per day system-wide
auto_post	Whether automation runs without manual approval
campaign_start/end	When to begin or stop queue checking/posting

🔁 recycle.js = Creative Post Templates
"What kind of messages we reuse and remix."

Use Case	Purpose
Store platform-tailored body text	Helps you prep copy per audience
Keep assets & templates evergreen	So you can clone or remix for future drops
Pre-load common post combos	Reuse what already works (like magic macros)

✅ They Work Together Like This:
File	Example Use
settings.json	“Post 1 item per day only to LinkedIn during campaign window”
postQueue.js	“These are the active posts we want to send out”
recycle.js	“Here are my favorite past posts, ready to be reused or tweaked”
posted-log.js	“This is what actually got sent”
rejected-log.js	“Here’s what failed and why”

