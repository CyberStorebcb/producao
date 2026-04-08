require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright-core');
const { parseKaizenTxt } = require('./kaizenParser');

let serverlessChromium = null;
try {
  serverlessChromium = require('@sparticuz/chromium');
} catch {
  serverlessChromium = null;
}

const DEFAULT_URL = 'https://equatorialenergia.fs.ocs.oraclecloud.com/';
const PT_MONTHS = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const PT_WEEKDAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const OBRAS_MA_PATTERN = /OBRAS-MA/i;
const CENTRO_MA_OBRAS_PATTERN = /Centro\s*-?\s*MA-OBRAS(?:\s*\(\d+\))?/i;
const LINHA_MORTA_PATTERN = /Linha\s*Morta\s*[\-–]\s*Centro\s*MA(?:\s*\(\d+\))?/i;

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL
    || process.env.AWS_REGION
    || process.env.AWS_EXECUTION_ENV
    || process.env.LAMBDA_TASK_ROOT,
  );
}

async function resolveChromiumLaunchOptions(headless) {
  const launchOptions = {
    headless,
  };

  if (!isServerlessRuntime() || !serverlessChromium) {
    return launchOptions;
  }

  const executablePath = await serverlessChromium.executablePath();
  return {
    ...launchOptions,
    headless: true,
    executablePath,
    args: serverlessChromium.args,
  };
}

function normalizeReferenceDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const rawValue = String(value).trim();
  const slashOrDashMatch = rawValue.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2}|\d{4}))?$/);

  if (slashOrDashMatch) {
    const day = Number(slashOrDashMatch[1]);
    const month = Number(slashOrDashMatch[2]);
    const currentYear = new Date().getFullYear();
    const yearToken = slashOrDashMatch[3];
    const year = !yearToken
      ? currentYear
      : yearToken.length === 2
        ? 2000 + Number(yearToken)
        : Number(yearToken);

    const parsedFromParts = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (
      parsedFromParts.getUTCFullYear() === year
      && parsedFromParts.getUTCMonth() === month - 1
      && parsedFromParts.getUTCDate() === day
    ) {
      return parsedFromParts.toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data de referência inválida para o Kaizen Bot. Use YYYY-MM-DD, DD/MM ou DD/MM/AAAA.');
  }
  return parsed.toISOString().slice(0, 10);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emitBotLog(options, message, extra = {}) {
  if (typeof options?.onLog === 'function') {
    options.onLog({
      message,
      ...extra,
    });
  }
}
async function emitBotPreview(page, options, payload = {}) {
  if (typeof options?.onPreview !== 'function' || !page) return;

  try {
    const imageBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 45,
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
    });

    options.onPreview({
      timestamp: new Date().toISOString(),
      imageDataUrl: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
      ...payload,
    });
  } catch {
    // noop
  }
}

function isTransientNavigationError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return [
    'err_socket_not_connected',
    'err_connection_reset',
    'err_connection_closed',
    'err_connection_timed_out',
    'err_timed_out',
    'etimedout',
    'econnreset',
    'econnrefused',
    'enotfound',
    'navigation timeout',
  ].some((item) => message.includes(item));
}

async function gotoWithRetries(page, url, options = {}) {
  const attempts = Math.max(Number(options.attempts || 3), 1);
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      emitBotLog(options, `Abrindo SIGA (${attempt}/${attempts}).`, {
        stage: 'siga-navigation-attempt',
        referenceDate: options.referenceDate || '',
      });
      await page.goto(url, {
        waitUntil: options.waitUntil || 'domcontentloaded',
        timeout: Number(options.timeout || 45000),
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientNavigationError(error)) {
        break;
      }

      emitBotLog(options, `Falha de rede ao abrir o SIGA. Nova tentativa ${attempt + 1}/${attempts}.`, {
        level: 'warning',
        stage: 'siga-navigation-retry',
        referenceDate: options.referenceDate || '',
      });
      await wait(1500 * attempt);
    }
  }

  const suffix = isServerlessRuntime()
    ? ' O host do SIGA pode estar inacessível a partir do runtime serverless atual.'
    : '';
  throw new Error(`Falha ao acessar ${url}: ${lastError?.message || String(lastError)}${suffix}`);
}

function parsePortugueseUiDate(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const monthIndex = PT_MONTHS.findIndex((month) => normalized.includes(month));
  const yearMatch = normalized.match(/20\d{2}/);
  const dayMatch = normalized.match(/\b(\d{1,2})(?:o|º)?\b/);

  if (monthIndex === -1 || !yearMatch || !dayMatch) {
    return null;
  }

  const year = Number(yearMatch[0]);
  const day = Number(dayMatch[1]);
  if (!year || !day) return null;

  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
}

function parseCalendarMonthYearLabel(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const monthIndex = PT_MONTHS.findIndex((month) => normalized.includes(month));
  const yearMatch = normalized.match(/\b20\d{2}\b/);
  if (monthIndex === -1 || !yearMatch) return null;

  return {
    text: String(value || '').replace(/\s+/g, ' ').trim(),
    monthIndex,
    year: Number(yearMatch[0]),
  };
}

function calculateCalendarMonthDelta(current, target) {
  if (!current || !target) return null;
  return ((Number(target.year) - Number(current.year)) * 12) + (Number(target.monthIndex) - Number(current.monthIndex));
}

function escapeXpathLiteral(value) {
  const text = String(value || '');
  if (!text.includes("'")) return `'${text}'`;
  if (!text.includes('"')) return `"${text}"`;
  return `concat('${text.split("'").join(`', "'", '`)}')`;
}

function buildCalendarDayXPathCandidates(headerText, dayNumber) {
  const monthLiteral = escapeXpathLiteral(headerText);
  const dayLiteral = escapeXpathLiteral(String(dayNumber));

  return [
    `xpath=(//*[self::div or self::span or self::button or self::th][normalize-space(.) = ${monthLiteral}])[1]`,
    `xpath=((//*[self::div or self::span or self::button or self::th][normalize-space(.) = ${monthLiteral}])[1]/ancestor::*[self::div or self::section or self::article or self::table or self::oj-popup][1]//*[self::button or self::td or self::span or self::div][normalize-space(.) = ${dayLiteral}])`,
    `xpath=((//*[self::div or self::span or self::button or self::th][normalize-space(.) = ${monthLiteral}])[1]/following::*[self::button or self::td or self::span or self::div][normalize-space(.) = ${dayLiteral}])`,
  ];
}

async function fillFirstMatching(page, selectors, value) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: 2500 });
      await locator.fill(value);
      return selector;
    } catch {
      // tenta o próximo seletor
    }
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
    } catch {
      // tenta o próximo rótulo
    }
  }
  return null;
}

async function isTextVisible(page, labels, options = {}) {
  for (const label of labels) {
    const locator = page.getByText(label, { exact: options.exact ?? true }).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: options.timeout || 1200 });
      return label;
    } catch {
      // tenta o próximo rótulo
    }
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
    } catch {
      // tenta o próximo seletor
    }
  }
  return null;
}

async function clickButtonByNamePattern(page, patterns, options = {}) {
  const attempts = Array.isArray(patterns) ? patterns : [patterns];
  for (const pattern of attempts) {
    const locator = page.getByRole('button', { name: pattern }).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: options.timeout || 3000 });
      await locator.click();
      return pattern;
    } catch {
      // tenta o próximo padrão
    }
  }
  return null;
}

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function isLocatorVisible(locator, timeout = 1500) {
  return locator.waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
}

async function saveDebugScreenshot(page, name) {
  const debugDir = path.join(os.tmpdir(), 'kaizen-bot-debug');
  fs.mkdirSync(debugDir, { recursive: true });

  const safeName = String(name || 'debug')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  const targetPath = path.join(debugDir, `${Date.now()}-${safeName || 'debug'}.png`);
  await page.screenshot({ path: targetPath, fullPage: true }).catch(() => {});
  return targetPath;
}

async function clickConnectButton(page) {
  const connected = await clickButtonByNamePattern(page, [
    /^Conectar$/i,
    /^Entrar$/i,
    /^Sign In$/i,
  ], { timeout: 6000 });

  if (connected) {
    return connected;
  }

  return clickSelector(page, [
    'button[type="submit"]',
    'input[type="submit"]',
    'button.oj-button-button',
  ], { timeout: 4000 });
}

async function ensureCheckboxChecked(page, labelPattern) {
  const checkbox = page.getByRole('checkbox', { name: labelPattern }).first();
  const checkboxVisible = await checkbox.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
  if (checkboxVisible) {
    const isChecked = await checkbox.isChecked().catch(() => false);
    if (!isChecked) {
      await checkbox.check().catch(async () => {
        await checkbox.click();
      });
    }
    return true;
  }

  const label = page.getByText(labelPattern, { exact: false }).first();
  const labelVisible = await label.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
  if (labelVisible) {
    await label.click().catch(() => {});
    return true;
  }

  return false;
}

async function handleExceededSessionLogin(page, password) {
  const warningVisible = await page.getByText(/numero maximo de sessoes excedido|número máximo de sessões excedido/i).first()
    .waitFor({ state: 'visible', timeout: 1500 })
    .then(() => true)
    .catch(() => false);

  if (!warningVisible) {
    return false;
  }

  await ensureCheckboxChecked(page, /Excluir a sessao de usuario e login mais antigos|Excluir a sessão de usuário e login mais antigos/i);
  await ensureCheckboxChecked(page, /Lembrar meu Nome de usuario|Lembrar meu Nome de usuário/i);

  await fillFirstMatching(page, [
    'input[name="password"]',
    'input[type="password"]',
    'input[aria-label*="Senha"]',
    'input[placeholder*="Senha"]',
  ], password);

  const connected = await clickConnectButton(page);
  if (!connected) {
    throw new Error('Não foi possível reconectar após o aviso de sessões excedidas no SIGA.');
  }

  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2000);
  return true;
}

async function getTreeItemLocator(page, label) {
  const items = page.locator('[role="treeitem"], li, .oj-treeview-item');
  const target = normalizeLabel(label);
  const total = await items.count();

  for (let index = 0; index < total; index += 1) {
    const item = items.nth(index);
    const ownText = await item.evaluate((node) => {
      const normalize = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

      const clone = node.cloneNode(true);
      clone.querySelectorAll('[role="treeitem"], li, .oj-treeview-item').forEach((child) => child.remove());

      const ownLabel = clone.querySelector('.rtl-text, .oj-treeview-item-text, [role="presentation"], span, div');
      return normalize((ownLabel && ownLabel.textContent) || clone.textContent || '');
    }).catch(() => '');

    if (ownText === target || ownText.startsWith(`${target} (`)) {
      return item;
    }
  }

  return items.filter({
    has: page.getByText(label, { exact: false }),
  }).first();
}

function getTreeItemLocatorByPattern(page, pattern) {
  return page.locator('[role="treeitem"], li, .oj-treeview-item').filter({
    has: page.getByText(pattern),
  }).first();
}

async function clickTreeLabel(page, pattern, options = {}) {
  const locator = page.getByText(pattern, { exact: false }).first();
  await locator.waitFor({ state: 'visible', timeout: options.timeout || 8000 });
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click();
  return locator;
}

async function clickTreeArrow(page, pattern, expectedChildPattern) {
  const locator = page.getByText(pattern, { exact: false }).first();
  await locator.waitFor({ state: 'visible', timeout: 8000 });
  await locator.scrollIntoViewIfNeeded().catch(() => {});

  const isChildVisible = async () => {
    if (!expectedChildPattern) return false;
    return page.getByText(expectedChildPattern, { exact: false }).first()
      .waitFor({ state: 'visible', timeout: 1200 })
      .then(() => true)
      .catch(() => false);
  };

  if (await isChildVisible()) {
    return true;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const box = await locator.boundingBox().catch(() => null);
    if (box) {
      const offsets = [30, 22, 14, 8];
      for (const offset of offsets) {
        await page.mouse.click(Math.max(box.x - offset, 4), box.y + box.height / 2);
        await page.waitForTimeout(450);
        if (!expectedChildPattern || await isChildVisible()) {
          return true;
        }
      }
    }

    await locator.click().catch(() => {});
    await page.keyboard.press('ArrowRight').catch(() => {});
    await page.keyboard.press('Space').catch(() => {});
    await page.waitForTimeout(700);
    if (!expectedChildPattern || await isChildVisible()) {
      return true;
    }
  }

  return false;
}

async function searchTreeNode(page, query, targetPattern) {
  const searchSelector = await fillFirstMatching(page, [
    'input[placeholder*="Nome ou ID"]',
    'input[aria-label*="Nome ou ID"]',
    'input[placeholder*="nome ou id"]',
    'input[type="search"]',
  ], query);

  if (!searchSelector) {
    return false;
  }

  await page.waitForTimeout(900);

  const target = page.getByText(targetPattern, { exact: false }).first();
  const visible = await isLocatorVisible(target, 3500);
  if (!visible) {
    return false;
  }

  await target.scrollIntoViewIfNeeded().catch(() => {});
  await target.click({ force: true }).catch(async () => {
    await target.click().catch(() => {});
  });
  await page.waitForTimeout(700);
  return true;
}

async function expandTreeNodeByText(page, labelText, expectedChildText) {
  const itemLocator = await getTreeItemLocator(page, labelText);
  await itemLocator.waitFor({ state: 'visible', timeout: 8000 });
  await itemLocator.scrollIntoViewIfNeeded().catch(() => {});

  const childLocator = expectedChildText
    ? page.getByText(expectedChildText, { exact: false }).first()
    : null;

  const isChildVisible = async () => {
    if (!childLocator) return false;
    return isLocatorVisible(childLocator, 1200);
  };

  const isExpanded = async () => itemLocator.evaluate((node) => {
    const container = node.closest('[role="treeitem"], li, .oj-treeview-item') || node;
    const directExpanded = container.getAttribute('aria-expanded') || node.getAttribute('aria-expanded');
    if (directExpanded === 'true') {
      return true;
    }

    const toggle = container.querySelector(
      '.oj-treeview-disclosure-icon, .oj-component-icon, [aria-expanded], [aria-label*="Expand"], [aria-label*="Collapse"]',
    );

    if (!toggle) {
      return false;
    }

    const className = String(toggle.className || '');
    return /collapse|expanded|open/i.test(className);
  }).catch(() => false);

  const clickPreciseToggle = async () => itemLocator.evaluate((node) => {
    const container = node.closest('[role="treeitem"], li, .oj-treeview-item') || node;
    const toggle = container.querySelector(
      '.oj-treeview-disclosure-icon, .oj-component-icon, [aria-expanded], [aria-label*="Expand"], [aria-label*="Collapse"]',
    );

    if (!toggle) {
      return false;
    }

    const rect = toggle.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;

    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      toggle.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
      }));
    });

    return true;
  }).catch(() => false);

  const clickLeftGutter = async () => {
    const box = await itemLocator.boundingBox().catch(() => null);
    if (!box) {
      return false;
    }

    const clickX = Math.max(box.x - 14, 4);
    const clickY = box.y + (box.height / 2);
    await page.mouse.click(clickX, clickY).catch(() => {});
    return true;
  };

  const focusAndExpandByKeyboard = async () => {
    await itemLocator.click({ force: true }).catch(async () => {
      await itemLocator.click().catch(() => {});
    });
    await page.keyboard.press('ArrowRight').catch(() => {});
    await page.keyboard.press('Space').catch(() => {});
  };

  if (await isChildVisible()) {
    return true;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await clickPreciseToggle()) {
      await page.waitForTimeout(700);
      if (await isChildVisible() || await isExpanded()) {
        return true;
      }
    }

    if (await clickLeftGutter()) {
      await page.waitForTimeout(700);
      if (await isChildVisible() || await isExpanded()) {
        return true;
      }
    }

    await focusAndExpandByKeyboard();
    await page.waitForTimeout(700);
    if (await isChildVisible() || await isExpanded()) {
      return true;
    }
  }

  return false;
}

async function expandTreeNode(page, label, expectedChildren = []) {
  const itemLocator = await getTreeItemLocator(page, label);
  await itemLocator.waitFor({ state: 'visible', timeout: 8000 });

  const childrenVisible = async () => {
    if (!expectedChildren.length) return false;
    const found = await isTextVisible(page, expectedChildren, { exact: false, timeout: 900 });
    return Boolean(found);
  };

  if (await childrenVisible()) {
    return true;
  }

  const tryArrowClick = async () => itemLocator.evaluate((node) => {
    const labelNode = node.querySelector('.rtl-text, .oj-treeview-item-text, span, div') || node;
    const rect = labelNode.getBoundingClientRect();
    const clientX = Math.max(rect.left - 14, 4);
    const clientY = rect.top + rect.height / 2;
    const target = document.elementFromPoint(clientX, clientY) || labelNode;

    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      target.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
      }));
    });

    return true;
  }).catch(() => false);

  const itemFocused = async () => {
    try {
      await itemLocator.click();
      return true;
    } catch {
      return false;
    }
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await itemFocused();
    const arrowClicked = await tryArrowClick();
    if (arrowClicked) {
      await page.waitForTimeout(700);
      if (!expectedChildren.length || await childrenVisible()) {
        return true;
      }
    }
  }

  const expanded = await itemLocator.evaluate((node) => {
    const toggle = node.querySelector('[aria-expanded="false"], [aria-label*="Expand"], [title*="Expand"], .oj-treeview-disclosure-icon, .oj-component-icon');
    if (toggle) {
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    }
    return false;
  }).catch(() => false);

  if (expanded) {
    await page.waitForTimeout(700);
    if (!expectedChildren.length || await childrenVisible()) {
      return true;
    }
  }

  try {
    await itemFocused();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
    return !expectedChildren.length || await childrenVisible();
  } catch {
    return false;
  }
}

async function openTimeVisualization(page) {
  const clickedClock = await clickSelector(page, [
    'button[aria-label*="Tempo"]',
    'button[title*="Tempo"]',
    'button[aria-label*="Visualização de Tempo"]',
    'button[title*="Visualização de Tempo"]',
    'button[aria-label*="clock"]',
    'button[title*="clock"]',
    '[data-test*="time-view"]',
  ]);

  if (clickedClock) return;

  await clickSelector(page, [
    'button[aria-label*="Mais"]',
    'button[title*="Mais"]',
    'button[aria-label*="more"]',
    'button[title*="more"]',
  ], { timeout: 2000 });

  const selected = await clickTextOption(page, ['Visualização de Tempo', 'Time View'], { exact: false, timeout: 3000 });
  if (!selected) {
    throw new Error('Não foi possível localizar a opção de visualização de tempo no SIGA.');
  }
}

async function selectWeekAndDate(page, referenceDate, options = {}) {
  const target = new Date(`${referenceDate}T12:00:00`);

  const monthName = PT_MONTHS[target.getMonth()];
  const dayNumber = String(target.getDate());
  const targetYear = target.getFullYear();
  const targetMonthState = {
    monthIndex: target.getMonth(),
    year: targetYear,
  };

  const readCurrentHeaderDate = async () => {
    const dateButton = page.getByRole('button', {
      name: /(domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
    }).first();

    const visible = await dateButton.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (!visible) return null;

    const values = await Promise.all([
      dateButton.innerText().catch(() => ''),
      dateButton.getAttribute('aria-label').catch(() => ''),
      dateButton.getAttribute('title').catch(() => ''),
    ]);

    const rawText = values.find((value) => String(value || '').trim()) || '';
    const parsedDate = parsePortugueseUiDate(rawText);
    if (!parsedDate) return null;

    return {
      rawText: String(rawText || '').replace(/\s+/g, ' ').trim(),
      parsedDate,
    };
  };

  const moveHeaderDay = async (direction) => {
    const patterns = direction < 0
      ? [/^Anterior$/i, /^Previous$/i]
      : [/^Pr[oó]ximo$/i, /^Next$/i];

    return clickButtonByNamePattern(page, patterns, { timeout: 3000 });
  };

  const navigateUsingHeaderButtons = async () => {
    const initialState = await readCurrentHeaderDate();
    if (!initialState) return false;

    const dayDelta = Math.round((target.getTime() - initialState.parsedDate.getTime()) / 86400000);
    emitBotLog(options, `Cabeçalho do SIGA em ${initialState.rawText}. Ajustando ${Math.abs(dayDelta)} dia(s) até ${referenceDate}.`, {
      stage: 'date-header-navigation-started',
      referenceDate,
      dayDelta,
      currentHeaderDate: initialState.rawText,
    });
    await emitBotPreview(page, options, {
      stage: 'date-header-navigation-started',
      message: `Ajustando a data para ${referenceDate}.`,
      referenceDate,
      dayDelta,
      currentHeaderDate: initialState.rawText,
    });

    if (dayDelta === 0) {
      emitBotLog(options, `Data ${referenceDate} já está visível no cabeçalho do SIGA.`, {
        stage: 'date-header-navigation-finished',
        referenceDate,
      });
      return true;
    }

    const direction = dayDelta < 0 ? -1 : 1;
    const totalSteps = Math.abs(dayDelta);
    let currentLabel = initialState.rawText;

    for (let step = 0; step < totalSteps; step += 1) {
      const clicked = await moveHeaderDay(direction);
      if (!clicked) return false;

      let updated = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await page.waitForTimeout(250);
        updated = await readCurrentHeaderDate();
        if (updated && updated.rawText !== currentLabel) break;
      }

      if (!updated || updated.rawText === currentLabel) {
        return false;
      }

      currentLabel = updated.rawText;
      if ((step + 1) === totalSteps || (step + 1) % 5 === 0) {
        emitBotLog(options, `Navegação da data em andamento: ${step + 1}/${totalSteps}. Cabeçalho atual: ${currentLabel}.`, {
          stage: 'date-header-navigation-progress',
          referenceDate,
          currentHeaderDate: currentLabel,
          step: step + 1,
          totalSteps,
        });
        await emitBotPreview(page, options, {
          stage: 'date-header-navigation-progress',
          message: `Navegação da data em andamento: ${step + 1}/${totalSteps}.`,
          referenceDate,
          currentHeaderDate: currentLabel,
          step: step + 1,
          totalSteps,
        });
      }
    }

    const finalState = await readCurrentHeaderDate();
    if (!finalState) return false;
    const finalDate = finalState.parsedDate.toISOString().slice(0, 10);
    const matched = finalDate === referenceDate;

    if (matched) {
      emitBotLog(options, `Data ${referenceDate} posicionada com sucesso pelo cabeçalho do SIGA.`, {
        stage: 'date-header-navigation-finished',
        referenceDate,
        currentHeaderDate: finalState.rawText,
      });
      await emitBotPreview(page, options, {
        stage: 'date-header-navigation-finished',
        message: `Data ${referenceDate} posicionada com sucesso.`,
        referenceDate,
        currentHeaderDate: finalState.rawText,
      });
    }

    return matched;
  };

  const headerNavigationWorked = await navigateUsingHeaderButtons();
  if (headerNavigationWorked) {
    return;
  }

  emitBotLog(options, `Fallback para seletor de calendário do SIGA na data ${referenceDate}.`, {
    stage: 'date-popup-fallback',
    referenceDate,
  });
  await emitBotPreview(page, options, {
    stage: 'date-popup-fallback',
    message: `Fallback para o calendário popup na data ${referenceDate}.`,
    referenceDate,
  });

  const getVisibleCalendarMonths = async () => page.evaluate(() => {
    const monthNames = [
      'janeiro',
      'fevereiro',
      'marco',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ];

    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const text = normalize(document.body.innerText || '');
    const matches = Array.from(text.matchAll(/(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(20\d{2})/g));
    const unique = [];
    const seen = new Set();

    for (const match of matches) {
      const monthName = match[1];
      const year = Number(match[2]);
      const monthIndex = monthNames.indexOf(monthName);
      if (monthIndex === -1) continue;

      const key = `${year}-${monthIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({
        monthIndex,
        year,
        text: `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`,
      });
    }

    return unique.slice(0, 6);
  });

  const getCalendarHeaderState = async () => {
    const visibleMonths = await getVisibleCalendarMonths();
    if (!visibleMonths.length) return null;

    const primary = visibleMonths[0];
    return parseCalendarMonthYearLabel(primary.text)
      || {
        text: primary.text,
        monthIndex: primary.monthIndex,
        year: primary.year,
      };
  };

  const hasCalendarPopup = async () => page.evaluate(() => {
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const text = normalize(document.body.innerText || '');
    return /nenhuma data especificada|2 dias|3 dias|semana|mes/.test(text)
      && /(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+20\d{2}/.test(text);
  }).catch(() => false);

  const openCalendarPopup = async () => {
    const dateButton = page.getByRole('button', {
      name: /(domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
    }).first();

    const visible = await dateButton.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (!visible) return false;

    const buttonHandle = await dateButton.elementHandle().catch(() => null);
    const buttonBox = await dateButton.boundingBox().catch(() => null);

    const strategies = [
      async () => {
        await dateButton.click().catch(() => {});
      },
      async () => {
        await dateButton.click({ force: true }).catch(() => {});
      },
      async () => {
        if (!buttonBox) return;
        await page.mouse.click(buttonBox.x + (buttonBox.width / 2), buttonBox.y + (buttonBox.height / 2));
      },
      async () => {
        if (!buttonHandle) return;
        await buttonHandle.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const clientX = rect.left + (rect.width / 2);
          const clientY = rect.top + (rect.height / 2);
          ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
            node.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY }));
          });
        }).catch(() => {});
      },
      async () => {
        await dateButton.focus().catch(() => {});
        await page.keyboard.press('Enter').catch(() => {});
      },
      async () => {
        await dateButton.focus().catch(() => {});
        await page.keyboard.press('Space').catch(() => {});
      },
    ];

    for (const strategy of strategies) {
      await strategy();
      await page.waitForTimeout(1200);
      if (await hasCalendarPopup()) return true;
    }

    return false;
  };

  const opened = await openCalendarPopup();
  if (!opened) {
    throw new Error('Não foi possível abrir o seletor de data do SIGA.');
  }

  const moveCalendarMonth = async (direction) => page.evaluate((stepDirection) => {
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const monthHeaders = Array.from(document.querySelectorAll('button, div, span, th, td'))
      .map((node) => {
        const text = normalize(node.textContent);
        const rect = node.getBoundingClientRect();
        const monthIndex = months.findIndex((month) => text.includes(month));
        const yearMatch = text.match(/20\d{2}/);
        if (monthIndex === -1 || !yearMatch) return null;
        if (text !== `${months[monthIndex]} ${yearMatch[0]}`) return null;
        return { node, rect };
      })
      .filter(Boolean)
      .filter((item) => item.rect.top >= 60 && item.rect.top <= 280 && item.rect.width >= 70 && item.rect.width <= 220 && item.rect.height >= 20 && item.rect.height <= 70)
      .sort((left, right) => left.rect.left - right.rect.left);

    if (!monthHeaders.length) return false;

    const anchor = stepDirection < 0 ? monthHeaders[0] : monthHeaders[monthHeaders.length - 1];
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], div, span'))
      .map((node) => ({
        node,
        rect: node.getBoundingClientRect(),
        text: normalize(node.textContent),
        aria: normalize(node.getAttribute('aria-label')),
        title: normalize(node.getAttribute('title')),
      }))
      .filter((item) => item.rect.top >= anchor.rect.top - 20 && item.rect.bottom <= anchor.rect.bottom + 40 && item.rect.width >= 16 && item.rect.width <= 60 && item.rect.height >= 16 && item.rect.height <= 60)
      .filter((item) => {
        if (stepDirection < 0) return item.rect.left < anchor.rect.left - 8;
        return item.rect.left > anchor.rect.right + 8;
      })
      .sort((left, right) => stepDirection < 0 ? right.rect.left - left.rect.left : left.rect.left - right.rect.left);

    const target = buttons.find((item) => /anterior|proximo|previous|next/.test(`${item.aria} ${item.title} ${item.text}`)) || buttons[0];
    if (!target) return false;

    const rect = target.rect;
    const clientX = rect.left + (rect.width / 2);
    const clientY = rect.top + (rect.height / 2);
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      target.node.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY }));
    });
    return true;
  }, direction);

  const jumpCalendarMonths = async (delta) => {
    const totalSteps = Math.abs(Number(delta) || 0);
    if (!totalSteps) return true;

    const direction = delta < 0 ? -1 : 1;
    for (let step = 0; step < totalSteps; step += 1) {
      const moved = await moveCalendarMonth(direction);
      if (!moved) return false;
      await page.waitForTimeout(120);
    }

    await page.waitForTimeout(600);
    return true;
  };

  const alignCalendarToTargetMonth = async () => {
    let emptyRetries = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const currentState = await getCalendarHeaderState();
      if (!currentState) {
        emptyRetries += 1;
        if (emptyRetries >= 3) return null;
        await page.waitForTimeout(1000);
        continue;
      }

      const delta = calculateCalendarMonthDelta(currentState, targetMonthState);
      if (delta === 0) {
        return currentState;
      }

      const moved = await jumpCalendarMonths(delta);
      if (!moved) return null;

      const validatedState = await getCalendarHeaderState();
      if (calculateCalendarMonthDelta(validatedState, targetMonthState) === 0) {
        return validatedState;
      }
    }

    return null;
  };

  const selectDayFromCalendar = async (headerState) => {
    const [headerXPath, scopedXPath, fallbackXPath] = buildCalendarDayXPathCandidates(headerState.text, dayNumber);
    const headerLocator = page.locator(headerXPath).first();
    const headerBox = await headerLocator.boundingBox().catch(() => null);
    const candidates = [scopedXPath, fallbackXPath];

    for (const candidate of candidates) {
      const locator = page.locator(candidate);
      const total = await locator.count().catch(() => 0);

      for (let index = 0; index < total; index += 1) {
        const option = locator.nth(index);
        const visible = await option.isVisible().catch(() => false);
        if (!visible) continue;

        const box = await option.boundingBox().catch(() => null);
        if (!box) continue;
        if (headerBox) {
          const centerX = box.x + (box.width / 2);
          if (box.y <= headerBox.y + headerBox.height) continue;
          if (box.y > headerBox.y + 460) continue;
          if (centerX < headerBox.x - 120 || centerX > headerBox.x + headerBox.width + 120) continue;
        }

        await option.scrollIntoViewIfNeeded().catch(() => {});
        await option.click({ force: true }).catch(async () => {
          await option.click().catch(() => {});
        });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1000);
        return true;
      }
    }

    return false;
  };

  const aligned = await alignCalendarToTargetMonth();
  if (!aligned) {
    throw new Error('Não foi possível alinhar o calendário ao mês da data escolhida no Kaizen.');
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const picked = await selectDayFromCalendar(aligned);
    if (picked) {
      return;
    }

    await page.waitForTimeout(500);
  }

  throw new Error('Não foi possível selecionar o dia desejado no calendário do SIGA.');
}

async function navigateToTargetTree(page) {
  const obrasVisible = await isTextVisible(page, ['OBRAS-MA', 'Obras-MA'], { exact: false, timeout: 1500 });

  if (!obrasVisible) {
    await clickSelector(page, [
      'button[aria-label*="Menu"]',
      'button[title*="Menu"]',
      'button[aria-label*="Navigation"]',
      '[data-test*="drawer-toggle"]',
    ], { timeout: 6000 });

    await clickTextOption(page, ['Console de alocação', 'Console de Alocação'], { exact: false, timeout: 8000 });
    await clickTextOption(page, ['Console de Alocação', 'Console de alocação'], { exact: false, timeout: 8000 });
  }

  const obrasVisibleLabel = await isTextVisible(page, ['OBRAS-MA', 'Obras-MA'], { exact: false, timeout: 8000 });
  if (!obrasVisibleLabel) {
    throw new Error('Não foi possível localizar OBRAS-MA na árvore lateral do SIGA.');
  }

  const obrasExpanded = await expandTreeNodeByText(page, 'OBRAS-MA', 'Centro MA-OBRAS');
  if (!obrasExpanded) {
    const directHit = await searchTreeNode(page, 'Centro MA-OBRAS', CENTRO_MA_OBRAS_PATTERN);
    if (!directHit) {
      const screenshotPath = await saveDebugScreenshot(page, 'obras-ma-expand-failure');
      throw new Error(`Não foi possível expandir OBRAS-MA na árvore lateral do SIGA. Screenshot: ${screenshotPath}`);
    }
  }

  const centroVisible = await page.getByText(CENTRO_MA_OBRAS_PATTERN, { exact: false }).first()
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (!centroVisible) {
    throw new Error('Não foi possível localizar Centro MA-OBRAS na árvore lateral do SIGA.');
  }

  const centroExpanded = await expandTreeNodeByText(page, 'Centro MA-OBRAS', 'Linha Morta - Centro MA');
  if (!centroExpanded) {
    const directHit = await searchTreeNode(page, 'Linha Morta - Centro MA', LINHA_MORTA_PATTERN);
    if (!directHit) {
      const screenshotPath = await saveDebugScreenshot(page, 'centro-ma-obras-expand-failure');
      throw new Error(`Não foi possível expandir Centro MA-OBRAS na árvore lateral do SIGA. Screenshot: ${screenshotPath}`);
    }
  }

  let lineVisible = await page.getByText(LINHA_MORTA_PATTERN, { exact: false }).first()
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (!lineVisible) {
    const directLineHit = await searchTreeNode(page, 'Linha Morta - Centro MA', LINHA_MORTA_PATTERN);
    lineVisible = directLineHit;
  }
  if (!lineVisible) {
    const screenshotPath = await saveDebugScreenshot(page, 'linha-morta-not-found');
    throw new Error(`Não foi possível localizar Linha Morta - Centro MA na árvore lateral do SIGA. Screenshot: ${screenshotPath}`);
  }

  await clickTreeLabel(page, LINHA_MORTA_PATTERN, { timeout: 8000 });
}

async function openSigaSession(options = {}) {
  const url = process.env.KAIZEN_SIGA_URL || DEFAULT_URL;
  const username = process.env.KAIZEN_SIGA_USERNAME;
  const password = process.env.KAIZEN_SIGA_PASSWORD;

  if (!username || !password) {
    throw new Error('Defina KAIZEN_SIGA_USERNAME e KAIZEN_SIGA_PASSWORD nas variáveis de ambiente.');
  }

  const browser = await chromium.launch(await resolveChromiumLaunchOptions(options.headless !== false));
  const downloadsPath = options.downloadsPath || fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-bot-'));

  const context = await browser.newContext({ acceptDownloads: true, locale: 'pt-BR' });
  const page = await context.newPage();

  await gotoWithRetries(page, url, {
    attempts: isServerlessRuntime() ? 4 : 2,
    timeout: isServerlessRuntime() ? 60000 : 45000,
    waitUntil: 'domcontentloaded',
    onLog: options.onLog,
  });
  await emitBotPreview(page, options, {
    stage: 'siga-navigation-attempt',
    message: 'Tela inicial do SIGA carregada.',
    referenceDate: options.referenceDate || '',
  });

  const userFilled = await fillFirstMatching(page, [
    'input[name="userid"]',
    'input[name="username"]',
    'input[type="text"]',
    'input[aria-label*="Usuário"]',
    'input[placeholder*="Usuário"]',
  ], username);
  const passFilled = await fillFirstMatching(page, [
    'input[name="password"]',
    'input[type="password"]',
    'input[aria-label*="Senha"]',
    'input[placeholder*="Senha"]',
  ], password);

  if (!userFilled || !passFilled) {
    await browser.close();
    throw new Error('Não foi possível localizar os campos de login do SIGA.');
  }

  await handleExceededSessionLogin(page, password);

  const connected = await clickConnectButton(page);
  if (!connected) {
    await browser.close();
    throw new Error('Não foi possível acionar o botão de login do SIGA.');
  }

  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await emitBotPreview(page, options, {
    stage: 'login-completed',
    message: 'Login concluído no SIGA.',
    referenceDate: options.referenceDate || '',
  });

  await handleExceededSessionLogin(page, password);

  await navigateToTargetTree(page);
  await emitBotPreview(page, options, {
    stage: 'tree-selection-completed',
    message: 'Árvore lateral posicionada em Linha Morta - Centro MA.',
    referenceDate: options.referenceDate || '',
  });
  await openTimeVisualization(page);
  await emitBotPreview(page, options, {
    stage: 'time-view-opened',
    message: 'Visualização de tempo aberta no SIGA.',
    referenceDate: options.referenceDate || '',
  });

  return { browser, context, page, downloadsPath, url };
}

async function exportDateFromSession(session, referenceDate, options = {}) {
  const { page, downloadsPath, url } = session;
  const normalizedDate = normalizeReferenceDate(referenceDate);

  await selectWeekAndDate(page, normalizedDate, options);
  await clickTextOption(page, ['Ações', 'Actions'], { exact: false, timeout: 5000 });
  await emitBotPreview(page, options, {
    stage: 'actions-menu-opened',
    message: 'Menu de ações aberto para exportação.',
    referenceDate: normalizedDate,
  });

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    clickTextOption(page, ['Exportar', 'Export'], { exact: false, timeout: 5000 }),
  ]);

  const suggestedFilename = download.suggestedFilename();
  const targetPath = path.join(downloadsPath, suggestedFilename || `kaizen-${normalizedDate}.txt`);
  await download.saveAs(targetPath);
  await emitBotPreview(page, options, {
    stage: 'download-finished',
    message: `Arquivo ${path.basename(targetPath)} baixado pelo robô.`,
    referenceDate: normalizedDate,
    rawFilename: path.basename(targetPath),
  });

  // Dismiss any open menus/overlays and let the page settle for the next date
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);

  const rawText = fs.readFileSync(targetPath, 'utf8');
  const parsed = parseKaizenTxt(rawText, {
    referenceDate: normalizedDate,
    rawFilename: path.basename(targetPath),
  });

  return {
    referenceDate: normalizedDate,
    rawText,
    rawFilename: path.basename(targetPath),
    parsed,
    metadata: {
      provider: 'oracle-field-service',
      url,
      downloadsPath,
    },
  };
}

async function closeSigaSession(session) {
  if (session?.browser) {
    await session.browser.close();
  }
}

async function exportTxtFromSiga(options = {}) {
  const session = await openSigaSession(options);
  try {
    return await exportDateFromSession(session, options.referenceDate, options);
  } finally {
    await closeSigaSession(session);
  }
}

module.exports = {
  exportTxtFromSiga,
  openSigaSession,
  exportDateFromSession,
  closeSigaSession,
  normalizeReferenceDate,
  parseCalendarMonthYearLabel,
  calculateCalendarMonthDelta,
  buildCalendarDayXPathCandidates,
};
