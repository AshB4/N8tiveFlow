import 'dotenv/config';
import { chromium } from 'playwright';

const run = async () => {
  const browser = await chromium.launchPersistentContext(process.env.PINTEREST_PROFILE_DIR, {
    headless: false,
    channel: process.env.PINTEREST_BROWSER_CHANNEL || 'chrome',
    args: [`--profile-directory=${process.env.PINTEREST_CHROME_PROFILE_NAME || 'Default'}`],
  });
  const page = browser.pages()[0] || (await browser.newPage());
  await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const pick = (el) => ({
      tag: el.tagName,
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      role: el.getAttribute('role'),
      placeholder: el.getAttribute('placeholder'),
      ariaLabel: el.getAttribute('aria-label'),
      contenteditable: el.getAttribute('contenteditable'),
      text: (el.innerText || el.textContent || '').trim().slice(0, 120),
      outer: el.outerHTML.slice(0, 400),
    });
    return {
      url: location.href,
      matches: Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"], button, div[aria-label], span, label')).map(pick).filter(x => {
        const blob = `${x.placeholder || ''} ${x.ariaLabel || ''} ${x.text || ''} ${x.outer || ''}`.toLowerCase();
        return blob.includes('title') || blob.includes('description') || blob.includes('board') || blob.includes('choose a board') || blob.includes('add a detailed description') || blob.includes('add a link');
      }).slice(0, 120)
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
};
run().catch((error) => { console.error(error); process.exit(1); });
