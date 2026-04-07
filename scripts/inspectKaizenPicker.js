require('dotenv').config();

const path = require('path');
const os = require('os');
const { openSigaSession, closeSigaSession } = require('../shared/kaizenBot');

(async () => {
  const session = await openSigaSession({ headless: true });
  try {
    const { page } = session;
    const selectors = [
      'button[aria-label*="data"]',
      'button[title*="data"]',
      '[data-test*="date-picker"]',
      'button[aria-label*="Date"]',
      'button[title*="Date"]',
      'button[aria-label*="calendar"]',
      'button[title*="calendar"]',
    ];

    let clicked = null;
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const isVisible = await locator.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
      if (!isVisible) continue;
      await locator.click().catch(() => {});
      clicked = selector;
      break;
    }

    await page.waitForTimeout(1500);
    const screenshot = path.join(os.tmpdir(), 'kaizen-calendar-picker-debug.png');
    await page.screenshot({ path: screenshot, fullPage: true });

    const visible = await page.evaluate(() => Array.from(document.querySelectorAll('button, div, span, td, th'))
      .map((node) => ({
        text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
        aria: node.getAttribute('aria-label'),
        title: node.getAttribute('title'),
        cls: node.className,
        role: node.getAttribute('role'),
        top: Math.round(node.getBoundingClientRect().top),
        left: Math.round(node.getBoundingClientRect().left),
        width: Math.round(node.getBoundingClientRect().width),
        height: Math.round(node.getBoundingClientRect().height),
      }))
      .filter((item) => (item.text || item.aria || item.title) && item.top >= 0 && item.top <= 160 && item.height > 0)
      .slice(0, 300));

    console.log(JSON.stringify({ clicked, screenshot, visible }, null, 2));
  } finally {
    await closeSigaSession(session);
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
