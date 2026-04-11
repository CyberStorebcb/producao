/**
 * Mapa fixo Base × Categoria para o painel de monitoramento.
 * Códigos em maiúsculas (MA-XXX-…).
 */

const MONITOR_BASE_ORDER = ['BCB', 'BDC', 'ITM', 'PDS', 'PDT', 'STI'];

const MONITOR_CATEGORIES = [
  { key: 'CONSTRUCAO', label: 'CONSTRUÇÃO' },
  { key: 'TAT', label: 'TAT' },
  { key: 'LV', label: 'LV' },
  { key: 'PODA', label: 'PODA' },
  { key: 'SPOT', label: 'SPOT' },
];

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
    LV: ['MA-BCB-V001M'],
    PODA: ['MA-BCB-P001M', 'MA-BCB-P002M', 'MA-BCB-G202M'],
    SPOT: [],
  },
  BDC: {
    CONSTRUCAO: [],
    TAT: [],
    LV: [],
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
    LV: ['MA-ITM-V001M'],
    PODA: ['MA-ITM-P001M', 'MA-ITM-P002M'],
    SPOT: [],
  },
  PDS: {
    CONSTRUCAO: ['MA-PDS-O001M', 'MA-PDS-O002M', 'MA-PDS-O003M', 'MA-PDS-O004M'],
    TAT: ['MA-PDS-T001M'],
    LV: ['MA-PDS-V001M'],
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
    LV: ['MA-PDT-V001M', 'MA-PDT-V002M'],
    PODA: [],
    SPOT: [],
  },
  STI: {
    CONSTRUCAO: ['MA-STI-O001M', 'MA-STI-O002M', 'MA-STI-O003M', 'MA-STI-O004M'],
    TAT: ['MA-STI-T001M'],
    LV: ['MA-STI-V001M'],
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
    list.forEach((c) => set.add(String(c).toUpperCase()));
  });
  return set;
}

/**
 * Códigos esperados para uma célula (base + categoria).
 */
function getCodesForCell(baseKey, catKey) {
  return TEAM_CODES_BY_BASE_AND_CATEGORY[baseKey]?.[catKey] || [];
}

export {
  MONITOR_BASE_ORDER,
  MONITOR_CATEGORIES,
  TEAM_CODES_BY_BASE_AND_CATEGORY,
  getAllCodesForCategory,
  getCodesForCell,
};
