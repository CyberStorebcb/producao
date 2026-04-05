require('dotenv').config();

const { chromium } = require('playwright');
const { exportTxtFromSiga } = require('../shared/kaizenBot');

async function fillFirstMatching(page, selectors, value) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: 2500 });
      await locator.fill(value);
      return selector;
    } catch {}
  }
  return null;
}

async function clickSelector(page, selectors, timeout = 4000) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      await locator.click();
      return selector;
    } catch {}
  }
  return null;
}

async function clickText(page, labels, exact = false, timeout = 5000) {
  for (const label of labels) {
    const locator = page.getByText(label, { exact }).first();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      await locator.click();
      return label;
    } catch {}
  }
  return null;
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ acceptDownloads: true, locale: 'pt-BR' });
  const page = await context.newPage();

  await page.goto('https://equatorialenergia.fs.ocs.oraclecloud.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await fillFirstMatching(page, ['input[name="userid"]','input[name="username"]','input[type="text"]'], process.env.KAIZEN_SIGA_USERNAME);
  await fillFirstMatching(page, ['input[name="password"]','input[type="password"]'], process.env.KAIZEN_SIGA_PASSWORD);
  await page.getByRole('button', { name: /^Conectar$/i }).click();
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const pageText = await page.locator('body').innerText();
  if (!/OBRAS-MA/i.test(pageText)) {
    await clickSelector(page, ['button[aria-label*="Menu"]','button[title*="Menu"]'], 6000);
    await clickText(page, ['Console de alocação', 'Console de Alocação'], false, 8000);
    await clickText(page, ['Console de Alocação', 'Console de alocação'], false, 8000);
  }

  const obras = page.getByText('OBRAS-MA', { exact: false }).first();
  await obras.waitFor({ state: 'visible', timeout: 8000 });
  const obrasBox = await obras.boundingBox();
  if (obrasBox) await page.mouse.click(Math.max(obrasBox.x - 14, 4), obrasBox.y + obrasBox.height / 2);
  await page.waitForTimeout(800);

  const centro = page.getByText(/Centro.*MA-OBRAS/i).first();
  await centro.waitFor({ state: 'visible', timeout: 8000 });
  const centroBox = await centro.boundingBox();
  if (centroBox) await page.mouse.click(Math.max(centroBox.x - 14, 4), centroBox.y + centroBox.height / 2);
  await page.waitForTimeout(800);

  await clickText(page, ['Linha Morta - Centro MA'], false, 8000);
  await clickSelector(page, [
    'button[aria-label*="Tempo"]',
    'button[title*="Tempo"]',
    'button[aria-label*="Visualização de Tempo"]',
    'button[title*="Visualização de Tempo"]'
  ], 5000);

  const header = page.getByRole('button', { name: /(domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|janeiro|fevereiro|marco|março|abril|maio)/i }).first();
  await header.click();
  await clickText(page, ['Dia', 'Day'], false, 4000);
  await page.waitForTimeout(1500);

  const dump = await page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const elements = Array.from(document.querySelectorAll('button, td, th, span, div'));
    return elements
      .map((node) => {
        const text = normalize(node.textContent);
        if (!text) return null;
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          text,
          aria: node.getAttribute('aria-label'),
          title: node.getAttribute('title'),
          role: node.getAttribute('role'),
          className: node.className,
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter(Boolean)
      .filter((item) => /dia|abril|maio|dom|seg|ter|qua|qui|sex|sab|5|2026/i.test(item.text) || /dia|abril|maio/i.test(item.aria || '') || /dia|abril|maio/i.test(item.title || ''))
      .slice(0, 400);
  });

  console.log(JSON.stringify(dump, null, 2));
  await page.screenshot({ path: 'kaizen-calendar-dom.png', fullPage: true });
  await browser.close();
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
