import 'dotenv/config';
import { chromium } from 'playwright';

const profileDir = process.env.PINTEREST_PROFILE_DIR;
const profileName = process.env.PINTEREST_CHROME_PROFILE_NAME || 'Default';
const channel = process.env.PINTEREST_BROWSER_CHANNEL || 'chrome';

const openers = [
  '[data-test-id="board-dropdown-select-button"]',
  'button[aria-label*="board" i]',
  'div[aria-label*="board" i]',
  'text=/Choose a board/i',
  'button:has-text("Board")',
  'text=Board',
];

const run = async () => {
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel,
    args: [`--profile-directory=${profileName}`],
  });
  const page = context.pages()[0] || (await context.newPage());
  await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  let opened = false;
  for (const selector of openers) {
    try {
      const locator = page.locator(selector).first();
      if ((await locator.count()) > 0) {
        await locator.click({ timeout: 3000 });
        opened = true;
        break;
      }
    } catch {}
  }

  if (!opened) throw new Error('board dropdown opener not found');

  await page.waitForTimeout(1500);
  const texts = await page
    .locator('[role="option"], div[role="button"], button, [data-test-id^="board-row-"]')
    .evaluateAll((nodes) =>
      nodes
        .map((n) => (n.innerText || n.textContent || '').trim())
        .filter(Boolean)
        .slice(0, 120),
    );

  console.log(JSON.stringify(texts, null, 2));
  await context.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
