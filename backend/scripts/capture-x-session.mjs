import "dotenv/config";
import fs from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { chromium } from "playwright";

const DEFAULT_STATE_PATH = path.join(process.cwd(), "config", "x-state.json");

function getStatePath() {
  const configured = process.env.X_SESSION_STATE_PATH || "backend/config/x-state.json";
  if (path.isAbsolute(configured)) return configured;
  if (configured.startsWith("backend/")) {
    return path.join(process.cwd(), "..", configured.replace(/^backend\//, ""));
  }
  return path.join(process.cwd(), configured);
}

async function saveSessionState(context, statePath) {
  await mkdir(path.dirname(statePath), { recursive: true });
  await context.storageState({ path: statePath });
}

function looksLoggedIn(page) {
  return Promise.race([
    page.locator('[data-testid="SideNav_NewTweet_Button"]').count().then((count) => count > 0),
    page.locator('[data-testid="tweetTextarea_0"]').count().then((count) => count > 0),
    page.locator('[data-testid="AppTabBar_Home_Link"]').count().then((count) => count > 0),
  ]);
}

async function main() {
  const rl = readline.createInterface({ input, output });
  const statePath = getStatePath() || DEFAULT_STATE_PATH;
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`Opening X login flow. Session state will be saved to: ${statePath}`);
    console.log("Log in manually in the browser window. Use Google login if that is how you normally sign in.");
    await page.goto("https://x.com/i/flow/login", { waitUntil: "domcontentloaded" });

    while (true) {
      await rl.question("Press Enter after you believe login is complete...");
      await page.waitForTimeout(1000);
      if (await looksLoggedIn(page)) {
        await saveSessionState(context, statePath);
        console.log(`Saved X session state to ${statePath}`);
        return;
      }
      console.log("Login not detected yet. Finish the flow in the browser, then press Enter again.");
    }
  } finally {
    rl.close();
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
