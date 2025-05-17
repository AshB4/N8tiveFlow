
# Apprise Integration (Notification Engine)

## ✅ What It Is
[Apprise](https://github.com/caronc/apprise) is a powerful, open-source notification library that lets you send alerts to dozens of platforms (Discord, Slack, Email, Pushover, etc.).

We use it **locally** to trigger optional alerts or updates during N8tiveFlow runs — such as successful posts, failures, or queue warnings.

## 🛠️ Setup Instructions

1. **Install with pip (Python 3 required):**
   ```bash
   pip install apprise
Test an alert:

bash
apprise -t "Hello!" -b "Apprise is now working." discord://webhook_url

Usage in PostPunk:

Trigger notifications on post success or failure

Send alerts when queues grow too large

Optional scripts can reference .apprise.yml or environment variables for config

## 📁 Suggested location for setup:

Place your .apprise.yml config file inside config/ or your system’s home directory

## 🧠 Notes
Apprise is not bundled in this repo — you install it separately for local use.
It supports over 60+ services out of the box.

## 📜 License
BSD 2-Clause License
(Copyright © 2025, Chris Caron lead2gold@gmail.com)

Redistribution and use in source and binary forms, with or without modification, are permitted under the BSD 2-Clause conditions.
See LICENSE-CHRIS-CARON-BSD-2CLAUSE for full text.

## 🧼 Legal Reminder
Using Apprise is approved for commercial use under the BSD license — as long as:

You do not misrepresent authorship.

You retain the original license and copyright notices.

You’re not reselling Apprise itself as a product.

## 📚 Official Apprise Documentation

Full usage examples, service URLs, and troubleshooting:  
🔗 [Apprise Wiki on GitHub](https://github.com/caronc/apprise/wiki)

🔌 Supported Platforms
✅ Discord

✅ Mastodon

✅ Slack

✅ Telegram

✅ Email (SMTP)

✅ Signal (via bridge)

✅ Webhooks

✅ and many more...

Full list here: https://github.com/caronc/apprise#notification-services

