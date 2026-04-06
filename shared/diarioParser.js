const XLSX = require('xlsx');

const DEFAULT_TEAM_CODES = [
  'MA-BCB-0001M',
  'MA-BCB-0002M',
  'MA-BCB-0003M',
  'MA-BCB-0004M',
  'MA-BCB-0005M',
  'MA-BCB-0006M',
  'MA-BCB-T001M',
];

const DATA_START_COLUMN = 6;
const MAX_VALUE_LOOKAHEAD = 6;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

const normalizeTeamCode = (code = '') =>
  String(code || '')
    .toUpperCase()
    .replace(/MA-([A-Z]{3})-O(\d{3}M)/, 'MA-$1-0$2');

const roundToCurrency = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

const formatDateLabel = (date) => dateFormatter.format(date);

const buildDateRangeSummary = (dates = []) => ({
  firstDateKey: dates.length ? dates[0].key : '',
  lastDateKey: dates.length ? dates[dates.length - 1].key : '',
});

const normalizeHeaderCell = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const extractTeamCode = (...values) => {
  for (const value of values) {
    const text = String(value || '').toUpperCase();
    if (!text) continue;
    const match = text.match(/MA-[A-Z]{3}-[OT]\d{3}M/);
    if (match) return normalizeTeamCode(match[0]);
  }
  return '';
};

const classifyProgramCategory = (value = '') => {
  const normalized = normalizeHeaderCell(value);
  if (normalized.includes('EME')) return 'EME';
  if (normalized.includes('CUSTEIO')) return 'CUSTEIO';
  return 'OBRAS';
};

const parseNumericValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value
      .replace(/\s+/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^0-9.+-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const excelSerialToDate = (value) => {
  if (typeof value !== 'number') return null;
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
};

const parseHeaderDate = (cellValue) => {
  if (cellValue instanceof Date && !Number.isNaN(cellValue.getTime())) {
    return new Date(Date.UTC(cellValue.getUTCFullYear(), cellValue.getUTCMonth(), cellValue.getUTCDate()));
  }

  if (typeof cellValue === 'number') {
    return excelSerialToDate(cellValue);
  }

  if (typeof cellValue !== 'string') return null;
  const trimmed = cellValue.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return new Date(`${isoMatch[0]}T00:00:00Z`);
  }

  const slashMatch = trimmed.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/);
  if (slashMatch) {
    const [dayStr, monthStr, yearStr] = slashMatch[0].split('/');
    const day = Number(dayStr);
    const month = Number(monthStr);
    if (!Number.isFinite(day) || !Number.isFinite(month)) {
      return null;
    }
    let year = yearStr ? Number(yearStr) : new Date().getFullYear();
    if (Number.isFinite(year) && year < 100) {
      year += 2000;
    }
    if (!Number.isFinite(year)) {
      year = new Date().getFullYear();
    }
    return new Date(Date.UTC(year, month - 1, day));
  }

  return null;
};

const buildDateColumns = (headerRow = []) =>
  headerRow
    .map((value, idx) => ({ value, idx }))
    .map((item) => {
      const date = parseHeaderDate(item.value);
      if (!date) return null;
      return {
        idx: item.idx,
        date,
        key: date.toISOString().slice(0, 10),
        label: formatDateLabel(date),
      };
    })
    .filter(Boolean);

const buildServiceSheetData = (rows, sheetName = '') => {
  const headerIndex = rows.findIndex((row) => {
    const normalized = Array.isArray(row) ? row.map((cell) => normalizeHeaderCell(cell)) : [];
    return normalized.includes('DATA DO SERVICO') && normalized.includes('VALOR');
  });

  if (headerIndex === -1) {
    throw new Error('Cabeçalho de serviços não encontrado.');
  }

  const headerRow = rows[headerIndex] || [];
  const normalizedHeaders = headerRow.map((cell) => normalizeHeaderCell(cell));
  const valueIdx = normalizedHeaders.findIndex((cell) => cell === 'VALOR');
  const dateIdx = normalizedHeaders.findIndex((cell) => cell === 'DATA DO SERVICO');
  const plateIdx = normalizedHeaders.findIndex((cell) => cell === 'PLACA');
  const codeIdx = normalizedHeaders.findIndex((cell) => cell === 'ENCARREGADO');

  if (valueIdx === -1 || dateIdx === -1) {
    throw new Error('Colunas de valor ou data do serviço não encontradas.');
  }

  const teamsMap = new Map();
  const dateMap = new Map();
  const diagnostics = {
    processedRows: 0,
    skippedRows: 0,
    missingTeamRows: 0,
    missingDateRows: 0,
    zeroValueRows: 0,
    totalImportedValue: 0,
  };

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row) || !row.length) continue;

    const code = extractTeamCode(
      codeIdx >= 0 ? row[codeIdx] : '',
      plateIdx >= 0 ? row[plateIdx] : '',
      row[1],
      row[2],
      row[33]
    );
    if (!code) {
      diagnostics.skippedRows += 1;
      diagnostics.missingTeamRows += 1;
      continue;
    }

    const date = parseHeaderDate(row[dateIdx]);
    if (!date) {
      diagnostics.skippedRows += 1;
      diagnostics.missingDateRows += 1;
      continue;
    }

    const value = parseNumericValue(row[valueIdx]);
    diagnostics.processedRows += 1;
    if (!value) diagnostics.zeroValueRows += 1;
    diagnostics.totalImportedValue = roundToCurrency(diagnostics.totalImportedValue + value);

    const key = date.toISOString().slice(0, 10);
    if (!dateMap.has(key)) {
      dateMap.set(key, { key, label: formatDateLabel(date), date });
    }

    const existing = teamsMap.get(code) || {
      code,
      display: code,
      type: sheetName || row[3] || row[2] || '',
      plate: plateIdx >= 0 && row[plateIdx] ? String(row[plateIdx]).trim() : '',
      valuesByDate: {},
      colD: row[3] || '',
      colL: row[valueIdx] || '',
      colAH: code,
    };

    if (!existing.plate && plateIdx >= 0 && row[plateIdx]) {
      existing.plate = String(row[plateIdx]).trim();
    }

    existing.valuesByDate[key] = roundToCurrency((Number(existing.valuesByDate[key]) || 0) + value);
    teamsMap.set(code, existing);
  }

  const dates = Array.from(dateMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ key, label }) => ({ key, label }));

  const teams = Array.from(teamsMap.values()).sort((a, b) => a.display.localeCompare(b.display));

  const summary = {
    layout: 'service',
    sheetName,
    rowCount: rows.length,
    headerRowIndex: headerIndex,
    dateCount: dates.length,
    teamCount: teams.length,
    processedRows: diagnostics.processedRows,
    skippedRows: diagnostics.skippedRows,
    missingTeamRows: diagnostics.missingTeamRows,
    missingDateRows: diagnostics.missingDateRows,
    zeroValueRows: diagnostics.zeroValueRows,
    totalImportedValue: diagnostics.totalImportedValue,
    nonZeroTeams: teams.filter((team) => Object.values(team.valuesByDate).some((value) => Number(value) > 0)).length,
    ...buildDateRangeSummary(dates),
  };

  return { dates, teams, summary };
};

const buildBaseProgramSheetData = (rows, sheetName = '') => {
  const headerIndex = rows.findIndex((row) => {
    const normalized = Array.isArray(row) ? row.map((cell) => normalizeHeaderCell(cell)) : [];
    return normalized.includes('DATA') && normalized.includes('EQUIPE');
  });

  if (headerIndex === -1) {
    throw new Error('Cabeçalho BASE não encontrado para programação por equipe.');
  }

  const headerRow = rows[headerIndex] || [];
  const normalizedHeaders = headerRow.map((cell) => normalizeHeaderCell(cell));
  const dateIdx = normalizedHeaders.findIndex((cell) => cell === 'DATA');
  const codeIdx = normalizedHeaders.findIndex((cell) => cell === 'EQUIPE');
  const leadIdx = normalizedHeaders.findIndex((cell) => cell === 'ENCARREGADO' || cell === 'SUPERVISOR');
  const pepIdx = normalizedHeaders.findIndex((cell) => cell === 'PEP');
  const statusIdx = normalizedHeaders.findIndex((cell) => cell === 'STATUS');
  const localIdx = normalizedHeaders.findIndex((cell) => cell === 'LOCAL');
  const valueIdx = normalizedHeaders.findIndex((cell) => cell === 'R$ PROGRAMADO');

  if (dateIdx === -1 || codeIdx === -1) {
    throw new Error('Colunas DATA ou EQUIPE não encontradas na aba BASE.');
  }

  const teamsMap = new Map();
  const dateMap = new Map();
  const diagnostics = {
    processedRows: 0,
    skippedRows: 0,
    missingTeamRows: 0,
    missingDateRows: 0,
    zeroValueRows: 0,
    totalImportedValue: 0,
  };

  const hasPositiveMonetaryValue = valueIdx >= 0 && rows.slice(headerIndex + 1).some((row) => Array.isArray(row) && parseNumericValue(row[valueIdx]) > 0);

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row) || !row.length) continue;

    const code = extractTeamCode(codeIdx >= 0 ? row[codeIdx] : '', row[0], row[1], row[2], row[3], row[4]);
    if (!code) {
      diagnostics.skippedRows += 1;
      diagnostics.missingTeamRows += 1;
      continue;
    }

    const date = parseHeaderDate(row[dateIdx]);
    if (!date) {
      diagnostics.skippedRows += 1;
      diagnostics.missingDateRows += 1;
      continue;
    }

    const rawPep = pepIdx >= 0 ? row[pepIdx] : '';
    const category = classifyProgramCategory(rawPep);
    const teamKey = `${code}__${category}`;
    const rawMonetaryValue = valueIdx >= 0 ? parseNumericValue(row[valueIdx]) : 0;
    const value = hasPositiveMonetaryValue ? rawMonetaryValue : 1;
    diagnostics.processedRows += 1;
    if (!value) diagnostics.zeroValueRows += 1;
    diagnostics.totalImportedValue = roundToCurrency(diagnostics.totalImportedValue + value);

    const dateKey = date.toISOString().slice(0, 10);
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { key: dateKey, label: formatDateLabel(date), date });
    }

    const existing = teamsMap.get(teamKey) || {
      code: teamKey,
      display: code,
      type: category,
      plate: leadIdx >= 0 && row[leadIdx] ? String(row[leadIdx]).trim() : '',
      valuesByDate: {},
      colD: localIdx >= 0 ? row[localIdx] || '' : '',
      colL: rawPep || '',
      colAH: statusIdx >= 0 ? row[statusIdx] || '' : '',
    };

    if (!existing.plate && leadIdx >= 0 && row[leadIdx]) {
      existing.plate = String(row[leadIdx]).trim();
    }

    existing.valuesByDate[dateKey] = roundToCurrency((Number(existing.valuesByDate[dateKey]) || 0) + value);
    teamsMap.set(teamKey, existing);
  }

  const dates = Array.from(dateMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ key, label }) => ({ key, label }));

  const teams = Array.from(teamsMap.values()).sort((a, b) => a.display.localeCompare(b.display));

  return {
    dates,
    teams,
    summary: {
      layout: 'base-program',
      metricKind: hasPositiveMonetaryValue ? 'currency' : 'count',
      metricLabel: hasPositiveMonetaryValue ? 'valor programado' : 'programacoes',
      sheetName,
      rowCount: rows.length,
      headerRowIndex: headerIndex,
      dateCount: dates.length,
      teamCount: teams.length,
      processedRows: diagnostics.processedRows,
      skippedRows: diagnostics.skippedRows,
      missingTeamRows: diagnostics.missingTeamRows,
      missingDateRows: diagnostics.missingDateRows,
      zeroValueRows: diagnostics.zeroValueRows,
      totalImportedValue: diagnostics.totalImportedValue,
      nonZeroTeams: teams.filter((team) => Object.values(team.valuesByDate).some((value) => Number(value) > 0)).length,
      ...buildDateRangeSummary(dates),
    },
  };
};

const findValuesRow = (rows, startIndex, dateColumns) => {
  for (let offset = 0; offset < MAX_VALUE_LOOKAHEAD; offset += 1) {
    const candidate = rows[startIndex + offset];
    if (!candidate) continue;
    const hasData = dateColumns.some(({ idx }) => {
      const cell = candidate[idx];
      return cell !== undefined && cell !== null && cell !== '' && cell !== '-';
    });
    if (hasData) {
      return candidate;
    }
  }
  return rows[startIndex] || [];
};

const buildTeams = (rows, headerIndex, dateColumns) => {
  const teamEntries = [];
  const teamMetaMap = new Map();
  let currentTeam = '';
  let currentType = '';
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
    if (row[1]) {
      currentType = row[1].toString().trim();
    }
    if (row[2]) {
      currentTeam = row[2].toString().trim();
    }
    if (!currentTeam) continue;

    const hasApontadoValue = row.some((cell) => {
      if (cell == null) return false;
      return cell.toString().toLowerCase().includes('apontado r$');
    });
    if (!hasApontadoValue) continue;

    const normalizedCode = normalizeTeamCode(currentTeam);
    const valueRow = findValuesRow(rows, i, dateColumns);
    const entry = {
      code: normalizedCode,
      display: currentTeam,
      type: currentType,
      plate: row[3] ? row[3].toString().trim() : '',
      row,
      valueRow,
    };

    const existingMeta = teamMetaMap.get(normalizedCode) || {
      code: normalizedCode,
      display: currentTeam,
      type: currentType,
      plate: row[3] ? row[3].toString().trim() : '',
      row,
      valueRow,
    };

    if (!existingMeta.display && currentTeam) existingMeta.display = currentTeam;
    if (!existingMeta.type && currentType) existingMeta.type = currentType;
    if (!existingMeta.plate && row[3]) existingMeta.plate = row[3].toString().trim();
    if ((!existingMeta.valueRow || !existingMeta.valueRow.length) && valueRow?.length) existingMeta.valueRow = valueRow;
    if ((!existingMeta.row || !existingMeta.row.length) && row?.length) existingMeta.row = row;

    teamMetaMap.set(normalizedCode, existingMeta);
    teamEntries.push(entry);
  }

  let teams = Array.from(teamMetaMap.values());
  if (!teams.length) {
    teams = DEFAULT_TEAM_CODES.map((code) => ({
      code,
      display: code,
      type: '',
      plate: '',
      row: [],
      valueRow: [],
    }));
  }

  const aggregatedTeams = new Map();
  const sourceEntries = teamEntries.length ? teamEntries : teams;
  sourceEntries.forEach((team) => {
    const sourceRow = team.valueRow && team.valueRow.length ? team.valueRow : team.row;
    const aggregate = aggregatedTeams.get(team.code) || {};
    dateColumns.forEach((col) => {
      aggregate[col.key] = roundToCurrency((Number(aggregate[col.key]) || 0) + parseNumericValue(sourceRow ? sourceRow[col.idx] : undefined));
    });
    aggregatedTeams.set(team.code, aggregate);
  });

  if (!sourceEntries.length) {
    return {
      teams: teams.map((team) => ({
      code: team.code,
      display: team.display,
      type: team.type || '',
      plate: team.plate,
      valuesByDate: {},
      })),
      processedRows: 0,
    };
  }

  const normalizedTeams = Array.from(aggregatedTeams.entries())
    .map(([code, valuesByDate]) => {
      const normalizedValues = {};
      Object.entries(valuesByDate).forEach(([key, value]) => {
        normalizedValues[key] = Number(value) || 0;
      });

      const sourceTeam = teamMetaMap.get(code) || { display: code, type: '', plate: '', row: [], valueRow: [] };
      const sourceRow = (sourceTeam.valueRow && sourceTeam.valueRow.length) ? sourceTeam.valueRow : sourceTeam.row || [];

      const safeGet = (arr, idx) => (Array.isArray(arr) && idx >= 0 && idx < arr.length ? arr[idx] : null);

      const colD = safeGet(sourceRow, 3);
      const colL = safeGet(sourceRow, 11);
      const colAH = safeGet(sourceRow, 33);

      return {
        code,
        display: sourceTeam.display || code,
        type: sourceTeam.type || '',
        plate: sourceTeam.plate || '',
        valuesByDate: normalizedValues,
        colD,
        colL,
        colAH,
      };
    })
    .sort((a, b) => a.display.localeCompare(b.display));

  return {
    teams: normalizedTeams,
    processedRows: sourceEntries.length,
  };
};

const normalizeDiarioRows = (rows = [], options = {}) => {
  const sheetName = String(options.sheetName || '').toUpperCase();
  if (sheetName && sheetName !== 'DIÁRIO' && sheetName !== 'DIARIO') {
    try {
      return buildServiceSheetData(rows, sheetName);
    } catch (error) {
      return buildBaseProgramSheetData(rows, sheetName);
    }
  }

  // Try to locate header row: prefer a row that contains 'BASE' in any cell.
  let headerIndex = rows.findIndex((row) =>
    Array.isArray(row) && row.some((cell) => String(cell || '').toString().trim().toUpperCase() === 'BASE')
  );

  // If not found, fallback to first row that looks like a header (contains >=2 parsable dates)
  if (headerIndex === -1) {
    headerIndex = rows.findIndex((row) => Array.isArray(row) && buildDateColumns(row).length >= 2);
  }

  if (headerIndex === -1) {
    throw new Error('Cabeçalho BASE não encontrado e nenhuma linha com colunas de data detectada.');
  }

  const headerRow = rows[headerIndex];
  const allDateColumns = buildDateColumns(headerRow);
  let dateColumns = allDateColumns.filter((c) => c.idx >= DATA_START_COLUMN);
  // Some sheets place the first day one column before DATA_START_COLUMN.
  if (
    allDateColumns.length > 0 &&
    dateColumns.length === allDateColumns.length - 1 &&
    allDateColumns[0].idx === DATA_START_COLUMN - 1
  ) {
    dateColumns = allDateColumns;
  }
  // Fallback for sheets where date columns start earlier than expected
  if (!dateColumns.length) {
    dateColumns = allDateColumns;
  }
  if (!dateColumns.length) {
    throw new Error('Nenhuma coluna de data encontrada.');
  }

  const { teams, processedRows } = buildTeams(rows, headerIndex, dateColumns);
  const dates = dateColumns.map(({ key, label }) => ({ key, label }));
  const summary = {
    layout: 'summary',
    sheetName: sheetName || 'DIÁRIO',
    rowCount: rows.length,
    headerRowIndex: headerIndex,
    dateCount: dates.length,
    teamCount: teams.length,
    processedRows,
    skippedRows: 0,
    missingTeamRows: 0,
    missingDateRows: 0,
    zeroValueRows: teams.reduce(
      (count, team) => count + Object.values(team.valuesByDate).filter((value) => !(Number(value) > 0)).length,
      0
    ),
    totalImportedValue: roundToCurrency(
      teams.reduce(
        (total, team) => total + Object.values(team.valuesByDate).reduce((teamTotal, value) => teamTotal + (Number(value) || 0), 0),
        0
      )
    ),
    nonZeroTeams: teams.filter((team) => Object.values(team.valuesByDate).some((value) => Number(value) > 0)).length,
    ...buildDateRangeSummary(dates),
  };

  return {
    dates,
    teams,
    summary,
  };
};

module.exports = {
  normalizeDiarioRows,
};
