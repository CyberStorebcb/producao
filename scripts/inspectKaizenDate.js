require('dotenv').config();

const { chromium } = require('playwright');

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

async function clickSelector(page, selectors, options = {}) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: options.timeout || 3000 });
      await locator.click();
      return selector;
    } catch {}
  }
  return null;
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ acceptDownloads: true, locale: 'pt-BR' });
  const page = await context.newPage();

  await page.goto('https://equatorialenergia.fs.ocs.oraclecloud.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });

  await fillFirstMatching(page, [
    'input[name="userid"]',
    'input[name="username"]',
    'input[type="text"]',
    'input[aria-label*="Usuário"]',
    'input[placeholder*="Usuário"]',
  ], process.env.KAIZEN_SIGA_USERNAME);

  await fillFirstMatching(page, [
    'input[name="password"]',
    'input[type="password"]',
    'input[aria-label*="Senha"]',
    'input[placeholder*="Senha"]',
  ], process.env.KAIZEN_SIGA_PASSWORD);

  await clickTextOption(page, ['Conectar', 'Entrar', 'Sign In'], { exact: false, timeout: 5000 });
  await page.waitForLoadState('networkidle', { timeout: 45000 });

  await clickSelector(page, [
    'button[aria-label*="Menu"]',
    'button[title*="Menu"]',
    'button[aria-label*="Navigation"]',
    '[data-test*="drawer-toggle"]',
  ], { timeout: 6000 });

  await clickTextOption(page, ['Console de alocação', 'Console de Alocação'], { exact: false, timeout: 8000 });
  await clickTextOption(page, ['Console de Alocação', 'Console de alocação'], { exact: false, timeout: 8000 });
  await clickTextOption(page, ['Obras'], { exact: true, timeout: 8000 });
  await clickTextOption(page, ['Centro - MA-OBRAS', 'Centro - MA-OBRAS '], { exact: false, timeout: 8000 });
  await clickTextOption(page, ['Linha Morta - Centro MA'], { exact: false, timeout: 8000 });

  await clickSelector(page, [
    'button[aria-label*="Tempo"]',
    'button[title*="Tempo"]',
    'button[aria-label*="clock"]',
    'button[title*="clock"]',
    '[data-test*="time-view"]',
  ], { timeout: 5000 });

  await clickSelector(page, [
    'button[aria-label*="data"]',
    'button[title*="data"]',
    '[data-test*="date-picker"]',
    'input[type="date"]',
  ], { timeout: 5000 });

  const visibleTexts = await page.locator('body *:visible').evaluateAll((nodes) => nodes
    .map((node) => (node.innerText || '').trim())
    .filter(Boolean)
    .slice(0, 250));

  const buttons = await page.locator('button:visible').evaluateAll((nodes) => nodes
    .map((node) => ({ text: (node.innerText || '').trim(), aria: node.getAttribute('aria-label'), title: node.getAttribute('title') }))
    .slice(0, 120));

  console.log(JSON.stringify({ visibleTexts, buttons }, null, 2));

  await page.screenshot({ path: 'kaizen-date-inspect.png', fullPage: true });
  await browser.close();
})().catch(async (error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
