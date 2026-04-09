const BASE_ALIASES = {
  BACABAL: 'BCB',
  'BARRA DO CORDA': 'BDC',
  'ITAPECURU MIRIM': 'ITM',
  PEDREIRAS: 'PDS',
  'PRESIDENTE DUTRA': 'PDT',
  'SANTA INÊS': 'STI',
  'SANTA INES': 'STI',
  BCB: 'BCB',
  BDC: 'BDC',
  ITM: 'ITM',
  PDS: 'PDS',
  PDT: 'PDT',
  STI: 'STI',
};

const DEFAULT_DISTRICT_FILTERS = ['BACABAL', 'ITAPECURU MIRIM', 'SANTA INÊS'];
const DEFAULT_STATUS_FILTERS = ['NAO LIBERADA', 'OBRA LIBERADA', 'PROGRAMADA', 'REPROGRAMAR'];
const DEFAULT_PROGRESS_FILTERS = ['EM ANDAMENTO', 'SEM ANDAMENTO'];

function normalizeHeaderCell(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function parseCurrencyValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value == null || value === '') return 0;

  const text = String(value).trim();
  if (!text) return 0;

  const digits = text.replace(/R\$/gi, '').replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
  const lastComma = digits.lastIndexOf(',');
  const lastDot = digits.lastIndexOf('.');
  const decimalSeparator = lastComma > lastDot ? ',' : (lastDot > lastComma ? '.' : null);

  let normalized = digits;
  if (decimalSeparator === ',') {
    normalized = digits.replace(/\./g, '').replace(',', '.');
  } else if (decimalSeparator === '.') {
    normalized = digits.replace(/,/g, '');
  } else {
    normalized = digits.replace(/[.,]/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveBaseCode(baseName) {
  return BASE_ALIASES[normalizeHeaderCell(baseName)] || String(baseName || '').trim().toUpperCase();
}

function resolveBaseLabel(baseCode) {
  const normalizedCode = resolveBaseCode(baseCode);
  if (normalizedCode === 'BCB') return 'BACABAL';
  if (normalizedCode === 'BDC') return 'BARRA DO CORDA';
  if (normalizedCode === 'ITM') return 'ITAPECURU MIRIM';
  if (normalizedCode === 'PDS') return 'PEDREIRAS';
  if (normalizedCode === 'PDT') return 'PRESIDENTE DUTRA';
  if (normalizedCode === 'STI') return 'SANTA INÊS';
  return normalizedCode;
}

function findBaseNotasHeaderIndex(rows = []) {
  return rows.findIndex((row) => {
    const normalized = Array.isArray(row) ? row.map((cell) => normalizeHeaderCell(cell)) : [];
    return normalized.includes('DISTRITAL') && normalized.includes('CUSTO DA OBRA') && normalized.includes('NOTA SGO');
  });
}

function getColumnIndexes(headerRow = []) {
  const headers = headerRow.map((cell) => normalizeHeaderCell(cell));
  return {
    districtIdx: headers.findIndex((cell) => cell === 'DISTRITAL'),
    cityIdx: headers.findIndex((cell) => cell === 'MUNICIPIO'),
    noteIdx: headers.findIndex((cell) => cell === 'NOTA SGO'),
    pepIdx: headers.findIndex((cell) => cell === 'PEP'),
    pepAltIdx: headers.findIndex((cell) => cell === 'PEP_1'),
    descIdx: headers.findIndex((cell) => cell === 'DESCRICAO'),
    descAltIdx: headers.findIndex((cell) => cell === 'DESCRICAO_2'),
    costIdx: headers.findIndex((cell) => cell === 'CUSTO DA OBRA'),
    statusIdx: headers.findIndex((cell) => cell === 'STATUS SISGB'),
    ownerIdx: headers.findIndex((cell) => cell === 'RESPONSAVEL VALIDACAO SISGB'),
    priorityIdx: headers.findIndex((cell) => cell === 'PRIORIDADE VALIDACAO SISGB'),
    scheduleIdx: headers.findIndex((cell) => cell === 'PROGRAMACAO'),
  };
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function matchesOpportunitySearch({ note, pep }, searchQuery) {
  const normalizedNote = normalizeHeaderCell(note);
  const normalizedPep = normalizeHeaderCell(pep);
  return normalizedNote.includes(searchQuery) || normalizedPep.includes(searchQuery);
}

function resolveProgressLabel(executedFieldValue) {
  return (Number(executedFieldValue) || 0) > 0 ? 'EM ANDAMENTO' : 'SEM ANDAMENTO';
}

function dedupeByNote(items = []) {
  const byNote = new Map();

  items.forEach((item) => {
    const key = normalizeHeaderCell(item.note || item.code);
    const existing = byNote.get(key);
    if (!existing) {
      byNote.set(key, item);
      return;
    }

    if (item.total > existing.total) {
      byNote.set(key, item);
      return;
    }

    if (item.total === existing.total) {
      const currentScore = (item.display ? 1 : 0) + (item.pep ? 1 : 0) + (item.municipality ? 1 : 0);
      const existingScore = (existing.display ? 1 : 0) + (existing.pep ? 1 : 0) + (existing.municipality ? 1 : 0);
      if (currentScore > existingScore) {
        byNote.set(key, item);
      }
    }
  });

  return Array.from(byNote.values());
}

function buildBaseClientesColumnIndexes(headerRow = []) {
  const headers = headerRow.map((cell) => normalizeHeaderCell(cell));
  return {
    districtIdx: headers.findIndex((cell) => cell === 'DISTRITAL'),
    municipalityIdx: headers.findIndex((cell) => cell === 'MUNICIPIO'),
    noteIdx: headers.findIndex((cell) => cell === 'NOTA SGO'),
    pepIdx: headers.findIndex((cell) => cell === 'PEP'),
    descriptionIdx: headers.findIndex((cell) => cell === 'DESCRICAO'),
    costIdx: headers.findIndex((cell) => cell === 'CUSTO DA OBRA'),
    statusWorkIdx: headers.findIndex((cell) => cell === 'STATUS ACOMPANHAMENTO'),
    statusSisgbIdx: headers.findIndex((cell) => cell === 'STATUS SISGB'),
    ownerIdx: headers.findIndex((cell) => cell === 'RESPONSAVEL'),
    scheduleIdx: headers.findIndex((cell) => cell === 'PROGRAMACAO DA VALIDACAO'),
  };
}

function buildObrasColumnIndexes(headerRow = []) {
  const headers = headerRow.map((cell) => normalizeHeaderCell(cell));
  return {
    districtIdx: headers.findIndex((cell) => cell === 'DISTRITAL'),
    municipalityIdx: headers.findIndex((cell) => cell === 'MUNICIPIO'),
    noteIdx: headers.findIndex((cell) => cell === 'NOTA'),
    pepIdx: headers.findIndex((cell) => cell === 'PEP'),
    descriptionIdx: headers.findIndex((cell) => cell === 'DESCRITIVO'),
    costIdx: headers.findIndex((cell) => cell === 'PROJETADO R$'),
    executedFieldIdx: headers.findIndex((cell) => cell === 'EXECUTADO EM CAMPO'),
    statusWorkIdx: headers.findIndex((cell) => cell === 'STATUS OBRA'),
    statusSisgbIdx: headers.findIndex((cell) => cell === 'STATUS SISBG'),
    ownerIdx: headers.findIndex((cell) => cell === 'RESPONSAVEL'),
    scheduleIdx: headers.findIndex((cell) => cell === 'PROXIMA PROGRAMACAO'),
    stageIdx: headers.findIndex((cell) => cell === 'ETAPA'),
  };
}

function findBaseClientesHeaderIndex(rows = []) {
  return rows.findIndex((row) => {
    const normalized = Array.isArray(row) ? row.map((cell) => normalizeHeaderCell(cell)) : [];
    return normalized.includes('DISTRITAL') && normalized.includes('CUSTO DA OBRA') && normalized.includes('STATUS ACOMPANHAMENTO');
  });
}

function findObrasHeaderIndex(rows = []) {
  return rows.findIndex((row) => {
    const normalized = Array.isArray(row) ? row.map((cell) => normalizeHeaderCell(cell)) : [];
    return normalized.includes('DISTRITAL') && normalized.includes('PROJETADO R$') && normalized.includes('STATUS OBRA') && normalized.includes('ETAPA');
  });
}

function buildObrasStatusSummary(rows = []) {
  const headerIndex = findObrasHeaderIndex(rows);
  if (headerIndex === -1) {
    throw new Error('Cabeçalho da aba OBRAS não encontrado.');
  }

  const indexes = buildObrasColumnIndexes(rows[headerIndex] || []);
  if (indexes.districtIdx === -1 || indexes.costIdx === -1 || indexes.stageIdx === -1) {
    throw new Error('Colunas obrigatórias para o resumo de obras não foram encontradas na aba OBRAS.');
  }

  const items = [];
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row) || !row.length) continue;

    const districtCode = resolveBaseCode(row[indexes.districtIdx]);
    const note = firstNonEmpty(row[indexes.noteIdx]);
    const pep = firstNonEmpty(row[indexes.pepIdx]);
    const stage = firstNonEmpty(row[indexes.stageIdx]) || 'SEM ETAPA';
    const total = parseCurrencyValue(row[indexes.costIdx]);
    if (!(total > 0)) continue;
    if (!note && !pep) continue;

    items.push({
      code: note || pep || `${districtCode}-${rowIndex}`,
      note,
      pep,
      stage,
      districtCode,
      districtLabel: resolveBaseLabel(districtCode),
      total,
    });
  }

  const stagesMap = new Map();
  const basesMap = new Map();

  items.forEach((item) => {
    const stageKey = item.stage;
    const stageEntry = stagesMap.get(stageKey) || {
      stage: stageKey,
      count: 0,
      totalValue: 0,
      bases: new Map(),
    };
    stageEntry.count += 1;
    stageEntry.totalValue += item.total;

    const baseKey = item.districtLabel || item.districtCode;
    const baseEntry = stageEntry.bases.get(baseKey) || {
      code: item.districtCode,
      label: item.districtLabel,
      count: 0,
      totalValue: 0,
    };
    baseEntry.count += 1;
    baseEntry.totalValue += item.total;
    stageEntry.bases.set(baseKey, baseEntry);
    stagesMap.set(stageKey, stageEntry);

    const totalBaseEntry = basesMap.get(baseKey) || {
      code: item.districtCode,
      label: item.districtLabel,
      count: 0,
      totalValue: 0,
    };
    totalBaseEntry.count += 1;
    totalBaseEntry.totalValue += item.total;
    basesMap.set(baseKey, totalBaseEntry);
  });

  const stages = Array.from(stagesMap.values()).map((stageEntry) => ({
    stage: stageEntry.stage,
    count: stageEntry.count,
    totalValue: stageEntry.totalValue,
    bases: Array.from(stageEntry.bases.values()).sort((a, b) => b.totalValue - a.totalValue),
  })).sort((a, b) => a.stage.localeCompare(b.stage));

  const bases = Array.from(basesMap.values()).sort((a, b) => b.totalValue - a.totalValue);
  const totalValue = items.reduce((sum, item) => sum + item.total, 0);

  return {
    totalRows: items.length,
    totalValue,
    stages,
    bases,
    rows: items,
    sourceSheet: 'OBRAS',
  };
}

function buildFilteredTopOpportunities(rows, options = {}) {
  const topN = Number(options.topN) > 0 ? Number(options.topN) : 10;
  const districtFilters = (Array.isArray(options.districtFilters) ? options.districtFilters : DEFAULT_DISTRICT_FILTERS)
    .map(resolveBaseCode);
  const statusFilters = (Array.isArray(options.statusFilters) ? options.statusFilters : DEFAULT_STATUS_FILTERS)
    .map((item) => normalizeHeaderCell(item));
  const progressFilters = (Array.isArray(options.progressFilters) ? options.progressFilters : DEFAULT_PROGRESS_FILTERS)
    .map((item) => normalizeHeaderCell(item));
  const searchQuery = String(options.searchQuery || '').trim().toUpperCase();

  const headerIndex = findObrasHeaderIndex(rows);
  if (headerIndex === -1) {
    throw new Error('Cabeçalho da aba OBRAS não encontrado.');
  }

  const indexes = buildObrasColumnIndexes(rows[headerIndex] || []);
  if (
    indexes.districtIdx === -1 ||
    indexes.costIdx === -1 ||
    indexes.statusWorkIdx === -1 ||
    indexes.noteIdx === -1
  ) {
    throw new Error('Colunas obrigatórias para o robô de oportunidades não foram encontradas na aba OBRAS.');
  }

  const filtered = [];
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row) || !row.length) continue;

    const districtCode = resolveBaseCode(row[indexes.districtIdx]);
    if (!districtFilters.includes(districtCode)) continue;

    const statusWork = normalizeHeaderCell(row[indexes.statusWorkIdx]);
    if (!statusFilters.includes(statusWork)) continue;

    const executedField = parseCurrencyValue(row[indexes.executedFieldIdx]);
    const progressLabel = normalizeHeaderCell(resolveProgressLabel(executedField));
    if (!progressFilters.includes(progressLabel)) continue;

    const total = parseCurrencyValue(row[indexes.costIdx]);
    if (!(total > 0)) continue;

    const note = firstNonEmpty(row[indexes.noteIdx]);
    const pep = firstNonEmpty(row[indexes.pepIdx]);
    const description = firstNonEmpty(row[indexes.descriptionIdx], pep, note);
    const primaryDisplay = firstNonEmpty(pep, note, description);
    if (searchQuery && !matchesOpportunitySearch({ note, pep }, searchQuery)) continue;
    const secondaryDisplay = pep && note && note !== pep ? note : '';
    const municipality = firstNonEmpty(row[indexes.municipalityIdx]);
    const statusSisgb = firstNonEmpty(row[indexes.statusSisgbIdx]);
    const owner = firstNonEmpty(row[indexes.ownerIdx]);
    const scheduledAt = firstNonEmpty(row[indexes.scheduleIdx]);

    filtered.push({
      code: note || pep || `${districtCode}-${rowIndex}`,
      display: primaryDisplay || 'Projeto sem descrição',
      displaySecondary: secondaryDisplay,
      districtCode,
      districtLabel: resolveBaseLabel(districtCode),
      municipality,
      note,
      pep,
      status: statusWork,
      statusLabel: firstNonEmpty(row[indexes.statusWorkIdx]),
      executedField,
      progressLabel: resolveProgressLabel(executedField),
      statusSisgb,
      owner,
      scheduledAt,
      total,
    });
  }

  const uniqueByNote = dedupeByNote(filtered);

  uniqueByNote.sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total;
    return left.display.localeCompare(right.display);
  });

  const top = uniqueByNote.slice(0, topN);
  const byDistrict = districtFilters.map((districtCode) => {
    const items = uniqueByNote.filter((item) => item.districtCode === districtCode);
    return {
      code: districtCode,
      label: resolveBaseLabel(districtCode),
      count: items.length,
      totalValue: items.reduce((sum, item) => sum + item.total, 0),
    };
  });

  return {
    topN,
    filters: {
      districts: districtFilters.map((code) => ({ code, label: resolveBaseLabel(code) })),
      statuses: statusFilters,
      progress: progressFilters,
    },
    top,
    byDistrict,
    totalVisibleValue: top.reduce((sum, item) => sum + item.total, 0),
    summary: {
      totalCandidates: uniqueByNote.length,
      rawCandidates: filtered.length,
      sourceSheet: 'OBRAS',
    },
  };
}

function buildBaseOpportunitiesFromBaseNotas(rows, options = {}) {
  const baseName = options.baseName || options.sheetName || 'BASE';
  const baseCode = resolveBaseCode(options.baseCode || baseName);
  const topN = Number(options.topN) > 0 ? Number(options.topN) : 10;
  const headerIndex = findBaseNotasHeaderIndex(rows);
  if (headerIndex === -1) {
    throw new Error('Cabeçalho da aba BASE NOTAS não encontrado.');
  }

  const indexes = getColumnIndexes(rows[headerIndex] || []);
  if (indexes.districtIdx === -1 || indexes.costIdx === -1 || indexes.noteIdx === -1) {
    throw new Error('Colunas obrigatórias para oportunidades não foram encontradas.');
  }

  const items = [];
  for (let idx = headerIndex + 1; idx < rows.length; idx += 1) {
    const row = rows[idx];
    if (!Array.isArray(row) || !row.length) continue;

    const districtCode = resolveBaseCode(row[indexes.districtIdx]);
    if (districtCode !== baseCode) continue;

    const total = parseCurrencyValue(row[indexes.costIdx]);
    if (!(total > 0)) continue;

    const note = firstNonEmpty(row[indexes.noteIdx]);
    const pep = firstNonEmpty(row[indexes.pepIdx], row[indexes.pepAltIdx]);
    const description = firstNonEmpty(row[indexes.descIdx], row[indexes.descAltIdx], pep, note);
    const city = firstNonEmpty(row[indexes.cityIdx]);
    const status = firstNonEmpty(row[indexes.statusIdx]);
    const owner = firstNonEmpty(row[indexes.ownerIdx]);
    const priority = firstNonEmpty(row[indexes.priorityIdx]);
    const scheduledAt = firstNonEmpty(row[indexes.scheduleIdx]);

    items.push({
      code: note || pep || `${baseCode}-${idx}`,
      display: description || note || pep || 'Projeto sem descrição',
      municipality: city,
      district: districtCode,
      pep,
      note,
      status,
      owner,
      priority,
      scheduledAt,
      total,
    });
  }

  items.sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total;
    return left.display.localeCompare(right.display);
  });

  const top = items.slice(0, topN);
  return {
    name: baseName,
    label: baseName,
    baseCode,
    top,
    totalVisibleValue: top.reduce((sum, item) => sum + item.total, 0),
    lastVisibleDate: null,
    summary: {
      totalCandidates: items.length,
      topN,
      importedValue: items.reduce((sum, item) => sum + item.total, 0),
      firstDateKey: null,
      lastDateKey: null,
    },
  };
}

function sumValues(valuesByDate = {}) {
  return Object.values(valuesByDate).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function resolveLastDate(valuesByDate = {}, dates = []) {
  const lastDateKey = Object.keys(valuesByDate)
    .filter((key) => Number(valuesByDate[key]) > 0)
    .sort()
    .slice(-1)[0] || null;

  const dateMap = new Map((dates || []).map((entry) => [entry.key, entry.label]));
  return {
    lastDateKey,
    lastDateLabel: lastDateKey ? (dateMap.get(lastDateKey) || lastDateKey) : null,
  };
}

function buildBaseOpportunities(normalized, options = {}) {
  const sheetName = options.sheetName || normalized?.summary?.sheetName || 'BASE';
  const topN = Number(options.topN) > 0 ? Number(options.topN) : 10;
  const teams = Array.isArray(normalized?.teams) ? normalized.teams : [];
  const dates = Array.isArray(normalized?.dates) ? normalized.dates : [];

  const ranked = teams
    .map((team) => {
      const total = sumValues(team.valuesByDate || {});
      const { lastDateKey, lastDateLabel } = resolveLastDate(team.valuesByDate || {}, dates);

      return {
        code: team.code || team.display || 'SEM_CODIGO',
        display: team.display || team.code || 'Sem identificacao',
        plate: team.plate || team.colD || '',
        type: team.type || sheetName,
        total,
        lastDateKey,
        lastDateLabel,
      };
    })
    .filter((item) => item.total > 0)
    .sort((left, right) => {
      if (right.total !== left.total) return right.total - left.total;
      return left.display.localeCompare(right.display);
    });

  const top = ranked.slice(0, topN);
  const totalVisibleValue = top.reduce((sum, item) => sum + item.total, 0);
  const lastVisibleDateKey = top
    .map((item) => item.lastDateKey)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null;
  const dateMap = new Map(dates.map((entry) => [entry.key, entry.label]));

  return {
    name: sheetName,
    label: sheetName,
    top,
    totalVisibleValue,
    lastVisibleDate: lastVisibleDateKey ? (dateMap.get(lastVisibleDateKey) || lastVisibleDateKey) : null,
    summary: {
      totalCandidates: ranked.length,
      topN,
      importedValue: Number(normalized?.summary?.totalImportedValue) || 0,
      firstDateKey: normalized?.summary?.firstDateKey || null,
      lastDateKey: normalized?.summary?.lastDateKey || null,
    },
  };
}

function buildOportunidadesPayload(baseResults, options = {}) {
  const topN = Number(options.topN) > 0 ? Number(options.topN) : 10;
  return {
    topN,
    bases: baseResults,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  DEFAULT_DISTRICT_FILTERS,
  DEFAULT_STATUS_FILTERS,
  DEFAULT_PROGRESS_FILTERS,
  resolveBaseCode,
  resolveBaseLabel,
  parseCurrencyValue,
  buildBaseOpportunities,
  buildBaseOpportunitiesFromBaseNotas,
  buildFilteredTopOpportunities,
  buildObrasStatusSummary,
  buildOportunidadesPayload,
};