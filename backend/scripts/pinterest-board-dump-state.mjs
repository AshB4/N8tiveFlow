import "dotenv/config";
import { chromium } from "playwright";

const run = async () => {
  const channel = process.env.PINTEREST_BROWSER_CHANNEL || "chrome";
  const executablePath = process.env.PINTEREST_EXECUTABLE_PATH || undefined;
  const statePath = process.env.PINTEREST_SESSION_STATE_PATH || "config/pinterest-state.json";
  const headless = false;

  const browser = await chromium.launch({
    headless,
    channel,
    executablePath,
  });
  const context = await browser.newContext({
    storageState: statePath,
  });
  const page = await context.newPage();

  await page.goto("https://www.pinterest.com/pin-creation-tool/", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);

  const openers = [
    '[data-test-id="board-dropdown-select-button"]',
    'button[aria-label*="board" i]',
    'div[aria-label*="board" i]',
    "text=/Choose a board/i",
    'button:has-text("Board")',
    "text=Board",
  ];

  let opened = false;
  for (const selector of openers) {
    try {
      const locator = page.locator(selector).first();
      if ((await locator.count()) > 0) {
        await locator.click({ timeout: 3000 });
        opened = true;
        break;
      }
    } catch {
      // continue
    }
  }

  if (!opened) {
    throw new Error(`Board dropdown opener not found. Final URL: ${page.url()}`);
  }

  await page.waitForTimeout(1500);
  const texts = await page
    .locator('[role="option"], div[role="button"], button, [data-test-id^="board-row-"]')
    .evaluateAll((nodes) =>
      nodes
        .map((n) => (n.innerText || n.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 200),
    );

  console.log(JSON.stringify({ finalUrl: page.url(), texts }, null, 2));
  await context.close();
  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
