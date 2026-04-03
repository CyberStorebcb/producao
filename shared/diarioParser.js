const XLSX = require('xlsx');
const aq = require('arquero');

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
});

const normalizeTeamCode = (code = '') => code.replace(/MA-BCB-O(\d{3}M)/, 'MA-BCB-0$1');

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
    .filter((item) => item.idx >= DATA_START_COLUMN)
    .map((item) => {
      const date = parseHeaderDate(item.value);
      if (!date) return null;
      return {
        idx: item.idx,
        date,
        key: date.toISOString().slice(0, 10),
        label: dateFormatter.format(date),
      };
    })
    .filter(Boolean);

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
  const teamsMap = new Map();
  let currentTeam = '';
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
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
      plate: row[3] ? row[3].toString().trim() : '',
      row,
      valueRow,
    };
    teamsMap.set(normalizedCode, entry);
  }

  let teams = Array.from(teamsMap.values());
  if (!teams.length) {
    teams = DEFAULT_TEAM_CODES.map((code) => ({
      code,
      display: code,
      plate: '',
      row: [],
      valueRow: [],
    }));
  }

  const tidyRows = [];
  teams.forEach((team) => {
    const sourceRow = team.valueRow && team.valueRow.length ? team.valueRow : team.row;
    dateColumns.forEach((col) => {
      tidyRows.push({
        code: team.code,
        display: team.display,
        plate: team.plate,
        dateKey: col.key,
        value: parseNumericValue(sourceRow ? sourceRow[col.idx] : undefined),
      });
    });
  });

  if (!tidyRows.length) {
    return teams.map((team) => ({
      code: team.code,
      display: team.display,
      plate: team.plate,
      valuesByDate: {},
    }));
  }

  const table = aq.from(tidyRows);
  const pivoted = table
    .groupby('code', 'display', 'plate')
    .pivot('dateKey', 'value', aq.op.first)
    .objects();

  return pivoted
    .map((record) => {
      const { code, display, plate, ...dates } = record;
      const valuesByDate = {};
      Object.entries(dates).forEach(([key, value]) => {
        valuesByDate[key] = Number(value) || 0;
      });
      return { code, display, plate, valuesByDate };
    })
    .sort((a, b) => a.display.localeCompare(b.display));
};

const normalizeDiarioRows = (rows = []) => {
  const headerIndex = rows.findIndex(
    (row) => (row?.[0] || '').toString().trim().toUpperCase() === 'BASE'
  );
  if (headerIndex === -1) {
    throw new Error('Cabeçalho BASE não encontrado.');
  }

  const headerRow = rows[headerIndex];
  const dateColumns = buildDateColumns(headerRow);
  if (!dateColumns.length) {
    throw new Error('Nenhuma coluna de data encontrada.');
  }

  const teams = buildTeams(rows, headerIndex, dateColumns);

  return {
    dates: dateColumns.map(({ key, label }) => ({ key, label })),
    teams,
  };
};

module.exports = {
  normalizeDiarioRows,
};
