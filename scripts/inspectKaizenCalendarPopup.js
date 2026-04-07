require('dotenv').config();

const path = require('path');
const os = require('os');
const { openSigaSession, closeSigaSession } = require('../shared/kaizenBot');

async function clickTextOption(page, labels, options = {}) {
  for (const label of labels) {
    const textLocator = page.getByText(label, { exact: options.exact ?? true }).first();
    try {
      await textLocator.waitFor({ state: 'visible', timeout: options.timeout || 3000 });
      await textLocator.click();
      return label;
    } catch {}
  }
  return null;
}

(async () => {
  const session = await openSigaSession({ headless: true });
  try {
    const { page } = session;
    const opened = await page.getByRole('button', {
      name: /(domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i,
    }).first();
    await opened.click();
    await clickTextOption(page, ['Dia', 'Day'], { exact: false, timeout: 3000 });
    await page.waitForTimeout(1200);

    const screenshot = path.join(os.tmpdir(), 'kaizen-calendar-popup-state.png');
    await page.screenshot({ path: screenshot, fullPage: true });

    const dump = await page.evaluate(() => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      return Array.from(document.querySelectorAll('button, div, span, td, th'))
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            text: normalize(node.textContent),
            aria: node.getAttribute('aria-label'),
            title: node.getAttribute('title'),
            cls: String(node.className || ''),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter((item) => (item.text || item.aria || item.title) && item.top >= 0 && item.top <= 380 && item.height > 0)
        .slice(0, 500);
    });

    console.log(JSON.stringify({ screenshot, dump }, null, 2));
  } finally {
    await closeSigaSession(session);
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
