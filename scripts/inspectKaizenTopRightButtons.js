require('dotenv').config();

const { openSigaSession, closeSigaSession } = require('../shared/kaizenBot');

(async () => {
  const session = await openSigaSession({ headless: true });
  try {
    const { page } = session;
    const dump = await page.evaluate(() => Array.from(document.querySelectorAll('button, [role="button"], div, span, a'))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          text: String(node.textContent || '').replace(/\s+/g, ' ').trim(),
          aria: node.getAttribute('aria-label'),
          title: node.getAttribute('title'),
          role: node.getAttribute('role'),
          cls: String(node.className || ''),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((item) => item.top >= 150 && item.top <= 240 && item.left >= 1050 && item.height > 0 && item.width > 0)
      .slice(0, 300));

    console.log(JSON.stringify(dump, null, 2));
  } finally {
    await closeSigaSession(session);
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
