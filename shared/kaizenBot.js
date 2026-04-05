require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
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
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data de referência inválida para o Kaizen Bot. Use o formato YYYY-MM-DD.');
  }
  return parsed.toISOString().slice(0, 10);
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

async function selectWeekAndDate(page, referenceDate) {
  const target = new Date(`${referenceDate}T12:00:00`);

  const opened = await clickButtonByNamePattern(page, [
    /(domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
    /(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?\s*\d+/i,
  ], { timeout: 5000 });

  if (!opened) {
    throw new Error('Não foi possível abrir o seletor de data do SIGA.');
  }

  await clickTextOption(page, ['Dia', 'Day'], { exact: false, timeout: 4000 });
  await page.waitForTimeout(500);

  const monthName = PT_MONTHS[target.getMonth()];
  const dayNumber = String(target.getDate());
  const targetYear = target.getFullYear();

  const getVisibleCalendarMonths = async () => page.evaluate(() => {
    const months = [
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

    const found = Array.from(document.querySelectorAll('button, div, span, th, td'))
      .map((node) => normalize(node.textContent))
      .filter(Boolean)
      .map((text) => {
        const monthIndex = months.findIndex((month) => text.includes(month));
        const yearMatch = text.match(/20\d{2}/);
        if (monthIndex === -1 || !yearMatch) return null;
        return {
          monthIndex,
          year: Number(yearMatch[0]),
          text,
        };
      })
      .filter(Boolean);

    const unique = [];
    const seen = new Set();
    for (const item of found) {
      const key = `${item.year}-${item.monthIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
    return unique.slice(0, 4);
  });

  const moveCalendarMonth = async (direction) => {
    const clicked = await clickSelector(page, direction < 0
      ? ['button[aria-label="Anterior"]', 'button[title="Anterior"]']
      : ['button[aria-label="Próximo"]', 'button[title="Próximo"]'], { timeout: 2000 });
    if (!clicked) return false;
    await page.waitForTimeout(700);
    return true;
  };

  const alignCalendarToTargetMonth = async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const months = await getVisibleCalendarMonths();
      if (months.some((item) => item.monthIndex === target.getMonth() && item.year === targetYear)) {
        return true;
      }

      if (!months.length) return false;

      const firstVisible = months[0];
      const targetKey = targetYear * 12 + target.getMonth();
      const visibleKey = firstVisible.year * 12 + firstVisible.monthIndex;
      const direction = targetKey < visibleKey ? -1 : 1;
      const moved = await moveCalendarMonth(direction);
      if (!moved) return false;
    }

    return false;
  };

  const selectDayFromCalendar = async () => page.evaluate(({ monthName, dayNumber, targetYear }) => {
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const targetMonth = normalize(monthName);
    const headers = Array.from(document.querySelectorAll('body *'))
      .filter((node) => {
        const text = normalize(node.textContent);
        return text.includes(targetMonth) && text.includes(String(targetYear));
      });

    const monthHeader = headers.find((node) => {
      const text = normalize(node.textContent);
      const rect = node.getBoundingClientRect();
      return (
        (text === `${targetMonth} ${targetYear}` || text.includes(`${targetMonth} ${targetYear}`)) &&
        rect.width >= 80 &&
        rect.width <= 260 &&
        rect.height >= 20 &&
        rect.height <= 90 &&
        rect.top >= 80
      );
    });

    if (!monthHeader) return false;

    const headerRect = monthHeader.getBoundingClientRect();
    const candidates = Array.from(document.querySelectorAll('button, td, div, span'))
      .filter((node) => normalize(node.textContent) === dayNumber)
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return (
          rect.width >= 14 &&
          rect.height >= 14 &&
          rect.top > headerRect.bottom &&
          rect.top < headerRect.bottom + 420
        );
      })
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        return centerX >= headerRect.left - 110 && centerX <= headerRect.right + 110;
      })
      .sort((left, right) => {
        const a = left.getBoundingClientRect();
        const b = right.getBoundingClientRect();
        return a.top - b.top || a.left - b.left;
      });

    const chosen = candidates[0];
    if (!chosen) return false;

    chosen.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    chosen.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    chosen.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    chosen.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }, { monthName, dayNumber, targetYear });

  const aligned = await alignCalendarToTargetMonth();
  if (!aligned) {
    throw new Error('Não foi possível alinhar o calendário ao mês da data escolhida no Kaizen.');
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const picked = await selectDayFromCalendar();
    if (picked) {
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
      return;
    }

    await page.waitForTimeout(500);
  }

  const closeCalendar = async () => {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
  };

  const readHeaderDate = async () => {
    const candidate = await page.getByRole('button', {
      name: /(domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
    }).first().textContent().catch(() => '');
    return parsePortugueseUiDate(candidate);
  };

  const clickDayStep = async (direction) => {
    const clicked = await clickSelector(page, direction < 0
      ? ['button[aria-label="Anterior"]', 'button[title="Anterior"]']
      : ['button[aria-label="Próximo"]', 'button[title="Próximo"]'], { timeout: 2000 });
    if (!clicked) return false;
    await page.waitForTimeout(500);
    return true;
  };

  await closeCalendar();

  for (let attempt = 0; attempt < 45; attempt += 1) {
    const current = await readHeaderDate();
    if (!current) break;

    const currentKey = current.toISOString().slice(0, 10);
    const targetKey = target.toISOString().slice(0, 10);
    if (currentKey === targetKey) {
      return;
    }

    const moved = await clickDayStep(target < current ? -1 : 1);
    if (!moved) break;
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

async function exportTxtFromSiga(options = {}) {
  const url = process.env.KAIZEN_SIGA_URL || DEFAULT_URL;
  const username = process.env.KAIZEN_SIGA_USERNAME;
  const password = process.env.KAIZEN_SIGA_PASSWORD;
  const referenceDate = normalizeReferenceDate(options.referenceDate);

  if (!username || !password) {
    throw new Error('Defina KAIZEN_SIGA_USERNAME e KAIZEN_SIGA_PASSWORD nas variáveis de ambiente.');
  }

  const browser = await chromium.launch(await resolveChromiumLaunchOptions(options.headless !== false));
  const downloadsPath = options.downloadsPath || fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-bot-'));

  try {
    const context = await browser.newContext({ acceptDownloads: true, locale: 'pt-BR' });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

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
      throw new Error('Não foi possível localizar os campos de login do SIGA.');
    }

    await handleExceededSessionLogin(page, password);

    const connected = await clickConnectButton(page);
    if (!connected) {
      throw new Error('Não foi possível acionar o botão de login do SIGA.');
    }

    await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await handleExceededSessionLogin(page, password);

    await navigateToTargetTree(page);

    await openTimeVisualization(page);
    await selectWeekAndDate(page, referenceDate);
    await clickTextOption(page, ['Ações', 'Actions'], { exact: false, timeout: 5000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      clickTextOption(page, ['Exportar', 'Export'], { exact: false, timeout: 5000 }),
    ]);

    const suggestedFilename = download.suggestedFilename();
    const targetPath = path.join(downloadsPath, suggestedFilename || `kaizen-${referenceDate}.txt`);
    await download.saveAs(targetPath);

    const rawText = fs.readFileSync(targetPath, 'utf8');
    const parsed = parseKaizenTxt(rawText, {
      referenceDate,
      rawFilename: path.basename(targetPath),
    });

    return {
      referenceDate,
      rawText,
      rawFilename: path.basename(targetPath),
      parsed,
      metadata: {
        provider: 'oracle-field-service',
        url,
        downloadsPath,
      },
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  exportTxtFromSiga,
  normalizeReferenceDate,
};
