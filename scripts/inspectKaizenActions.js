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

async function clickTextOption(page, labels, options = {}) {
  for (const label of labels) {
    const locator = page.getByText(label, { exact: options.exact ?? true }).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: options.timeout || 3000 });
      await locator.click();
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

  await page.getByRole('button', { name: /^Conectar$/i }).click();
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await exportTxtFromSiga;

  const bot = require('../shared/kaizenBot');
  await bot.exportTxtFromSiga;

  const treeVisible = await page.getByText('OBRAS-MA', { exact: false }).first().isVisible().catch(() => false);
  if (!treeVisible) {
    await clickSelector(page, [
      'button[aria-label*="Menu"]',
      'button[title*="Menu"]',
      'button[aria-label*="Navigation"]',
      '[data-test*="drawer-toggle"]',
    ], { timeout: 6000 });
    await clickTextOption(page, ['Console de alocação', 'Console de Alocação'], { exact: false, timeout: 8000 });
    await clickTextOption(page, ['Console de Alocação', 'Console de alocação'], { exact: false, timeout: 8000 });
  }

  const obras = page.getByText('OBRAS-MA', { exact: false }).first();
  await obras.click();
  await page.keyboard.press('ArrowRight').catch(() => {});
  const centro = page.getByText(/Centro.*MA-OBRAS/i).first();
  await centro.click();
  await page.keyboard.press('ArrowRight').catch(() => {});
  await clickTextOption(page, ['Linha Morta - Centro MA'], { exact: false, timeout: 8000 });

  await clickSelector(page, [
    'button[aria-label*="Tempo"]',
    'button[title*="Tempo"]',
    'button[aria-label*="Visualização de Tempo"]',
    'button[title*="Visualização de Tempo"]',
  ], { timeout: 5000 });

  const dateHeader = page.getByRole('button', { name: /(domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i }).first();
  await dateHeader.click();
  await clickTextOption(page, ['Dia', 'Day'], { exact: false, timeout: 4000 });
  await clickTextOption(page, ['Abril 5º, 2026', 'Abril 5, 2026', '5'], { exact: false, timeout: 4000 });
  await page.waitForTimeout(1000);

  const actionsClicked = await clickTextOption(page, ['Ações', 'Actions'], { exact: false, timeout: 5000 });

  const visibleTexts = await page.locator('body *:visible').evaluateAll((nodes) => nodes
    .map((node) => (node.innerText || '').trim())
    .filter(Boolean)
    .slice(0, 400));

  const buttons = await page.locator('button:visible').evaluateAll((nodes) => nodes
    .map((node) => ({ text: (node.innerText || '').trim(), aria: node.getAttribute('aria-label'), title: node.getAttribute('title') }))
    .slice(0, 120));

  console.log(JSON.stringify({ actionsClicked, visibleTexts, buttons }, null, 2));
  await page.screenshot({ path: 'kaizen-actions-inspect.png', fullPage: true });
  await browser.close();
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
