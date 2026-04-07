require('dotenv').config();

const path = require('path');
const os = require('os');
const { openSigaSession, closeSigaSession } = require('../shared/kaizenBot');

(async () => {
  const session = await openSigaSession({ headless: true });
  try {
    const { page } = session;
    const locator = page.getByRole('button', {
      name: /(domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
    }).first();

    const before = path.join(os.tmpdir(), 'kaizen-date-button-before.png');
    const after = path.join(os.tmpdir(), 'kaizen-date-button-after.png');
    await page.screenshot({ path: before, fullPage: true });

    await locator.click({ force: true });
    await page.waitForTimeout(1500);

    const popupTexts = await page.evaluate(() => Array.from(document.querySelectorAll('button, div, span, th, td'))
      .map((node) => String(node.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .filter((text) => /2026|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i.test(text))
      .slice(0, 100));

    await page.screenshot({ path: after, fullPage: true });
    console.log(JSON.stringify({ before, after, popupTexts }, null, 2));
  } finally {
    await closeSigaSession(session);
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
