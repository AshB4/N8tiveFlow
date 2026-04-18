import "dotenv/config";
import { chromium } from "playwright";

function boolFromEnv(name, fallback = true) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

async function clickFirst(page, selectors) {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if ((await locator.count()) > 0) {
        await locator.click({ timeout: 4000 });
        return selector;
      }
    } catch {
      // continue
    }
  }
  return null;
}

async function fillFirst(page, selectors, value) {
  if (!value) return false;
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if ((await locator.count()) > 0) {
        await locator.click({ timeout: 4000 });
        await locator.fill(value, { timeout: 4000 });
        return true;
      }
    } catch {
      // continue
    }
  }
  return false;
}

async function handleRestoreSession(page) {
  const selectors = [
    'button:has-text("Restore session")',
    'button:has-text("Restore")',
    "text=/Restore session/i",
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

async function ensureLoggedIn(page, email, password, statePath) {
  await page.goto("https://www.pinterest.com/pin-creation-tool/", {
    waitUntil: "domcontentloaded",
  });
  await handleRestoreSession(page);
  await page.waitForTimeout(2000);

  const onLoginScreen =
    page.url().includes("/login") ||
    (await page.locator('input[type="password"]').count()) > 0;

  if (!onLoginScreen) return;

  await fillFirst(page, ['input[type="email"]', 'input[name="id"]'], email);
  await fillFirst(page, ['input[type="password"]'], password);
  const loginClicked = await clickFirst(page, [
    'button[type="submit"]',
    'button:has-text("Log in")',
    'button:has-text("Continue")',
  ]);
  if (!loginClicked) {
    throw new Error("Unable to find Pinterest login submit button");
  }

  await page.waitForURL((url) => !url.toString().includes("/login"), {
    timeout: 30000,
  });
  await page.context().storageState({ path: statePath });
}

const run = async () => {
  const profileDir = process.env.PINTEREST_PROFILE_DIR;
  const profileName = process.env.PINTEREST_CHROME_PROFILE_NAME || "Default";
  const channel = process.env.PINTEREST_BROWSER_CHANNEL || "chrome";
  const executablePath = process.env.PINTEREST_EXECUTABLE_PATH || undefined;
  const statePath = process.env.PINTEREST_SESSION_STATE_PATH;
  const email =
    process.env.PINTEREST_LOGIN_EMAIL || process.env.PINTEREST_USERNAME || "";
  const password = process.env.PINTEREST_PASSWORD || "";
  const headless = boolFromEnv("PINTEREST_HEADLESS", false);

  const context = await chromium.launchPersistentContext(profileDir, {
    headless,
    channel,
    executablePath,
    args: [`--profile-directory=${profileName}`],
  });
  const page = context.pages()[0] || (await context.newPage());

  await ensureLoggedIn(page, email, password, statePath);
  await page.goto("https://www.pinterest.com/pin-creation-tool/", {
    waitUntil: "domcontentloaded",
  });
  await handleRestoreSession(page);
  await page.waitForTimeout(2500);

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
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
