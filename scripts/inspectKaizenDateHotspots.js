require('dotenv').config();

const { openSigaSession, closeSigaSession } = require('../shared/kaizenBot');

(async () => {
  const session = await openSigaSession({ headless: true });
  try {
    const { page } = session;
    const hotspots = await page.evaluate(() => {
      const points = [];
      for (let x = 1040; x <= 1260; x += 10) {
        for (let y = 80; y <= 140; y += 10) {
          const node = document.elementFromPoint(x, y);
          if (!node) continue;
          const rect = node.getBoundingClientRect();
          points.push({
            x,
            y,
            tag: node.tagName,
            text: String(node.textContent || '').replace(/\s+/g, ' ').trim(),
            aria: node.getAttribute('aria-label'),
            title: node.getAttribute('title'),
            role: node.getAttribute('role'),
            cls: String(node.className || ''),
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
      return points;
    });

    console.log(JSON.stringify(hotspots, null, 2));
  } finally {
    await closeSigaSession(session);
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
