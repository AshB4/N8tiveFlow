# Node-RED Integration (Local Automation)

## ✅ What It Is
[Node-RED](https://nodered.org/) is a flow-based, visual automation tool.
We use it **only locally** to build optional automation pipelines that feed into the N8tiveFlow post system.

## 🛠️ Setup Instructions

1. **Install globally (only needs to be done once):**
   ```bash
   npm install -g --unsafe-perm node-red

### Start Node-RED:
bash
node-red

### Access the flow editor:
Open browser to: http://localhost:1880

Usage:
Add flows that send data to N8tiveFlow's posts/queued.json or trigger scripts in scripts/.

🧠 Notes
Node-RED is not included or bundled in this project.
We do not redistribute Node-RED.

It runs locally on port 1880.

License: Apache 2.0 — commercial-use approved ✅

## 🧼 Legal Reminder
Using Node-RED is 100% safe for commercial integration, as long as:
You’re not modifying and reselling Node-RED itself.
You're using it as a local helper or integration point (like we are).

https://nodered.org/docs/