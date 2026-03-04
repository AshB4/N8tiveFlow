/** @format */

import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "..");
const PROJECT_ROOT = path.join(__dirname, "../..");

loadEnv({ path: path.join(PROJECT_ROOT, ".env"), override: false });
loadEnv({ path: path.join(BACKEND_ROOT, ".env"), override: false });

function isAlertsEnabled() {
	const raw = process.env.POSTPUNK_TELEGRAM_ALERTS_ENABLED;
	if (!raw) return true;
	return !["0", "false", "off", "no"].includes(String(raw).toLowerCase());
}

export async function sendPostPunkTelegramAlert(text) {
	if (!isAlertsEnabled()) return { skipped: true, reason: "alerts_disabled" };
	const token = process.env.TELEGRAM_BOT_TOKEN;
	const chatId = process.env.TELEGRAM_CHAT_ID;
	if (!token || !chatId) {
		return { skipped: true, reason: "missing_telegram_env" };
	}

	const url = `https://api.telegram.org/bot${token}/sendMessage`;
	const payload = {
		chat_id: chatId,
		text: `PostPunk Alert\n${text}`,
		disable_web_page_preview: true,
	};

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!response.ok) {
			const body = await response.text();
			return { ok: false, status: response.status, body };
		}
		return { ok: true };
	} catch (error) {
		return { ok: false, error: error?.message || "telegram_send_failed" };
	}
}

