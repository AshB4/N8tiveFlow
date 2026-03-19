import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../../..");
const DEFAULT_STATE_PATH = path.join(
  BACKEND_ROOT,
  "config",
  "pinterest-state.json",
);
const DEFAULT_PROFILE_DIR = path.join(
  BACKEND_ROOT,
  "config",
  "pinterest-chrome-profile",
);

async function handleRestoreSession(page) {
  const selectors = [
    'button:has-text("Restore session")',
    'button:has-text("Restore")',
    'text=/Restore session/i',
  ];
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if ((await locator.count()) > 0) {
        await locator.click({ timeout: 4000 });
        await page.waitForTimeout(1500);
        return true;
      }
    } catch {
      // continue
    }
  }
  return false;
}

function boolFromEnv(name, fallback = true) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

function getDefaultChromeUserDataDir() {
  return path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "Google",
    "Chrome",
  );
}

async function main() {
  const statePath =
    process.env.PINTEREST_SESSION_STATE_PATH || DEFAULT_STATE_PATH;
  const channel = process.env.PINTEREST_BROWSER_CHANNEL || "chrome";
  const executablePath = process.env.PINTEREST_EXECUTABLE_PATH || undefined;
  const useSystemProfile = boolFromEnv(
    "PINTEREST_USE_SYSTEM_CHROME_PROFILE",
    true,
  );
  const systemProfileDir = getDefaultChromeUserDataDir();
  const profileDir =
    process.env.PINTEREST_PROFILE_DIR ||
    (useSystemProfile && fs.existsSync(systemProfileDir)
      ? systemProfileDir
      : DEFAULT_PROFILE_DIR);
  const profileName = process.env.PINTEREST_CHROME_PROFILE_NAME || "Default";
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel,
    executablePath,
    args: [`--profile-directory=${profileName}`],
  });
  const page = context.pages()[0] || (await context.newPage());

  console.log("Opening Pinterest login flow...");
  console.log("Log in manually, then wait until you are clearly signed in.");
  console.log(`Session state will be saved to: ${statePath}`);
  console.log(`Chrome profile dir: ${profileDir}`);
  console.log(`Chrome profile name: ${profileName}`);

  await page.goto("https://www.pinterest.com/pin-creation-tool/", {
    waitUntil: "domcontentloaded",
  });
  await handleRestoreSession(page);

  await page.waitForTimeout(3000);

  if (page.url().includes("/login")) {
    console.log("Pinterest redirected to login. Finish signing in in the browser window.");
    await page.waitForURL(
      (url) => !url.toString().includes("/login"),
      { timeout: 0 },
    );
  }

  await page.goto("https://www.pinterest.com/pin-creation-tool/", {
    waitUntil: "domcontentloaded",
  });
  await handleRestoreSession(page);
  try {
    await page.waitForURL(
      (url) => url.toString().includes("pin-creation-tool"),
      { timeout: 30000 },
    );
  } catch {
    if (page.url().includes("business/hub")) {
      console.log("Pinterest landed on business hub after login. Redirecting to pin builder before saving session.");
      await page.goto("https://www.pinterest.com/pin-creation-tool/", {
        waitUntil: "domcontentloaded",
      });
      await page.waitForURL(
        (url) => url.toString().includes("pin-creation-tool"),
        { timeout: 30000 },
      );
    } else {
      throw new Error(`Pinterest did not reach pin builder. Final URL: ${page.url()}`);
    }
  }

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  await context.storageState({ path: statePath });
  console.log(`Saved Pinterest session state to ${statePath}`);

  await context.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
