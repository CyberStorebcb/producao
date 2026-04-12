/**
 * Mapa fixo Base × Categoria para o painel de monitoramento.
 * Códigos em maiúsculas (MA-XXX-…).
 *
 * Alinhado a shared/diarioParser.js: normalizeTeamCode troca MA-XXX-O###M por MA-XXX-0###M.
 * Os dados carregados usam o formato com zero; o mapa costuma listar com "O" — precisamos dos dois na resolução.
 */
const MONITOR_BASE_ORDER = ['BCB', 'BDC', 'ITM', 'PDS', 'PDT', 'STI'];

/**
 * Normaliza código de equipe: O→0 e V→0 (LV), alinhado a shared/diarioParser.js.
 */
function canonicalTeamCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/MA-([A-Z]{3})-O(\d{3}M)/, 'MA-$1-0$2')
    .replace(/MA-([A-Z]{3})-V(\d{3}M)/, 'MA-$1-0$2');
}

/** Funde sufixos __EME / __OBRAS (layout base-program) na mesma equipe do painel. */
function productionMergeTeamKey(code) {
  const raw = String(code || '').trim().toUpperCase();
  const basePart = raw.split('__')[0].trim();
  return canonicalTeamCode(basePart);
}

/**
 * LV na planilha pode aparecer como MA-XXX-V001M; após normalize (O→0) vira MA-XXX-0001M.
 * Inclui todas as variantes no Set para cruzar com team.code carregado.
 */
function addCodeAndLvAliases(set, c) {
  const u = String(c || '').trim().toUpperCase();
  if (!u) return;
  set.add(u);
  set.add(canonicalTeamCode(u));
  if (/-V\d{3}M$/.test(u)) {
    const zeroForm = u.replace(/V(\d{3}M)$/, '0$1');
    set.add(zeroForm);
    set.add(canonicalTeamCode(zeroForm));
    const oForm = u.replace(/-V(\d{3}M)$/, '-O$1');
    set.add(oForm);
    set.add(canonicalTeamCode(oForm));
  }
}

/**
 * Localiza a linha de equipe no payload: tenta V001M, 0001M (pós-normalização) e O001M.
 */
function resolveTeamForMonitorCode(teamByCode, teamRows, code) {
  if (!code || !teamRows?.length) return null;
  const raw = String(code).trim().toUpperCase();
  const tryGet = (k) => (k && teamByCode.get(k)) || null;
  let t = tryGet(raw) || tryGet(canonicalTeamCode(raw));
  if (t) return t;
  if (/-V\d{3}M$/.test(raw)) {
    const zeroForm = raw.replace(/V(\d{3}M)$/, '0$1');
    t = tryGet(zeroForm) || tryGet(canonicalTeamCode(zeroForm));
    if (t) return t;
    const oForm = raw.replace(/-V(\d{3}M)$/, '-O$1');
    t = tryGet(oForm) || tryGet(canonicalTeamCode(oForm));
    if (t) return t;
  }
  const targetCanon = canonicalTeamCode(raw);
  for (const row of teamRows) {
    const rc = String(row.code || '').trim().toUpperCase();
    if (canonicalTeamCode(rc) === targetCanon) return row;
  }
  if (/-V\d{3}M$/.test(raw)) {
    const zeroForm = raw.replace(/V(\d{3}M)$/, '0$1');
    const zc = canonicalTeamCode(zeroForm);
    for (const row of teamRows) {
      const rc = String(row.code || '').trim().toUpperCase();
      if (canonicalTeamCode(rc) === zc) return row;
    }
  }
  return null;
}

/** Garante que a linha carregada é mesmo a equipe pedida (V001M vs 0001M na planilha). */
function teamResolvedMatchesExpectedCode(teamCode, expectedCode) {
  if (!teamCode || !expectedCode) return false;
  const allowed = new Set();
  addCodeAndLvAliases(allowed, expectedCode);
  const tc = String(teamCode).trim().toUpperCase();
  return allowed.has(tc) || allowed.has(canonicalTeamCode(tc));
}

const MONITOR_CATEGORIES = [
  { key: 'CONSTRUCAO', label: 'CONSTRUÇÃO' },
  { key: 'TAT', label: 'TAT' },
  { key: 'LV', label: 'LV' },
  { key: 'PODA', label: 'PODA' },
  { key: 'SPOT', label: 'SPOT' },
];

/**
 * LV por base: produção exclusiva destas equipes na célula LV da coluna (lista fechada).
 * Bacabal (BCB): somente MA-BCB-V001M.
 */
const LV_TEAMS_BY_BASE = {
  BCB: ['MA-BCB-V001M'],
  BDC: [],
  ITM: ['MA-ITM-V001M'],
  PDS: ['MA-PDS-V001M'],
  PDT: ['MA-PDT-V001M', 'MA-PDT-V002M'],
  STI: ['MA-STI-V001M'],
};

/** Mapa base → categoria → lista de códigos de equipe */
const TEAM_CODES_BY_BASE_AND_CATEGORY = {
  BCB: {
    CONSTRUCAO: [
      'MA-BCB-O001M',
      'MA-BCB-O002M',
      'MA-BCB-O003M',
      'MA-BCB-O004M',
      'MA-BCB-O005M',
      'MA-BCB-O006M',
    ],
    TAT: ['MA-BCB-T001M'],
    LV: [...LV_TEAMS_BY_BASE.BCB],
    PODA: ['MA-BCB-P001M', 'MA-BCB-P002M', 'MA-BCB-G202M'],
    SPOT: [],
  },
  BDC: {
    CONSTRUCAO: [],
    TAT: [],
    LV: [...LV_TEAMS_BY_BASE.BDC],
    PODA: [],
    SPOT: [
      'MA-BDC-O001M',
      'MA-BDC-O002M',
      'MA-BDC-O003M',
      'MA-BDC-O004M',
      'MA-BDC-O005M',
      'MA-BDC-O006M',
    ],
  },
  ITM: {
    CONSTRUCAO: ['MA-ITM-O001M', 'MA-ITM-O002M', 'MA-ITM-O003M', 'MA-ITM-O004M'],
    TAT: [],
    LV: [...LV_TEAMS_BY_BASE.ITM],
    PODA: ['MA-ITM-P001M', 'MA-ITM-P002M'],
    SPOT: [],
  },
  PDS: {
    CONSTRUCAO: ['MA-PDS-O001M', 'MA-PDS-O002M', 'MA-PDS-O003M', 'MA-PDS-O004M'],
    TAT: ['MA-PDS-T001M'],
    LV: [...LV_TEAMS_BY_BASE.PDS],
    PODA: [],
    SPOT: [],
  },
  PDT: {
    CONSTRUCAO: [
      'MA-PDT-O033M',
      'MA-PDT-O031M',
      'MA-PDT-O032M',
      'MA-PDT-O038M',
      'MA-PDT-O034M',
      'MA-PDT-O035M',
      'MA-PDT-O036M',
    ],
    TAT: ['MA-PDT-T001M'],
    LV: [...LV_TEAMS_BY_BASE.PDT],
    PODA: [],
    SPOT: [],
  },
  STI: {
    CONSTRUCAO: ['MA-STI-O001M', 'MA-STI-O002M', 'MA-STI-O003M', 'MA-STI-O004M'],
    TAT: ['MA-STI-T001M'],
    LV: [...LV_TEAMS_BY_BASE.STI],
    PODA: ['MA-STI-P001M', 'MA-STI-P002M'],
    SPOT: [],
  },
};

/**
 * Todos os códigos previstos no mapa (para totais por categoria na linha TOTAL).
 */
function getAllCodesForCategory(catKey) {
  const set = new Set();
  MONITOR_BASE_ORDER.forEach((base) => {
    const list = TEAM_CODES_BY_BASE_AND_CATEGORY[base]?.[catKey] || [];
    list.forEach((c) => addCodeAndLvAliases(set, c));
  });
  return set;
}

/**
 * Códigos de uma categoria só na base escolhida (filtro global ≠ ALL).
 * Usado no Σ da matriz para alinhar ao recorte de dados carregado.
 */
function getCodesForCategoryScope(catKey, selectedBaseKey) {
  const set = new Set();
  const addList = (list) => {
    (list || []).forEach((c) => addCodeAndLvAliases(set, c));
  };
  if (!selectedBaseKey || selectedBaseKey === 'ALL') {
    return getAllCodesForCategory(catKey);
  }
  const row = TEAM_CODES_BY_BASE_AND_CATEGORY[selectedBaseKey];
  if (!row) {
    return getAllCodesForCategory(catKey);
  }
  addList(row[catKey] || []);
  return set;
}

/**
 * Códigos esperados para uma célula (base + categoria).
 */
function getCodesForCell(baseKey, catKey) {
  return TEAM_CODES_BY_BASE_AND_CATEGORY[baseKey]?.[catKey] || [];
}

/** LV: sempre a lista fechada em LV_TEAMS_BY_BASE (ex.: BCB = só MA-BCB-V001M). */
function getCodesForMonitorCell(baseKey, catKey, _selectedBaseKey) {
  if (catKey === 'LV') {
    return [...(LV_TEAMS_BY_BASE[baseKey] || [])];
  }
  return getCodesForCell(baseKey, catKey);
}

export {
  MONITOR_BASE_ORDER,
  MONITOR_CATEGORIES,
  TEAM_CODES_BY_BASE_AND_CATEGORY,
  LV_TEAMS_BY_BASE,
  canonicalTeamCode,
  productionMergeTeamKey,
  addCodeAndLvAliases,
  resolveTeamForMonitorCode,
  teamResolvedMatchesExpectedCode,
  getAllCodesForCategory,
  getCodesForCategoryScope,
  getCodesForCell,
  getCodesForMonitorCell,
};

/** Nome legado — mesmo mapa que LV_TEAMS_BY_BASE */
export const LV_V_TEAMS_BY_BASE = LV_TEAMS_BY_BASE;
