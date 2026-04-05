const { KAIZEN_CENTER_TEAM_ROSTERS, KAIZEN_TEAM_LOOKUP } = require('./kaizenTeamMap');

const TEAM_ID_REGEX = /(?<![A-Z0-9_-])[A-Z]{1,4}(?:-[A-Z0-9]{1,12}){1,5}(?![A-Z0-9_])/g;
const TIME_RANGE_REGEX = /(\d{1,2}:\d{2})\s*(?:-|–|—|a|até|to)\s*(\d{1,2}:\d{2})/gi;
const START_TIME_REGEX = /(?:in[ií]cio|entrada|start)\D{0,12}(\d{1,2}:\d{2})/i;
const END_TIME_REGEX = /(?:fim|sa[ií]da|end|t[eé]rmino)\D{0,12}(\d{1,2}:\d{2})/i;
const NUMERIC_ID_REGEX = /\b\d{5}\b/g;
const CSV_STATUS_INDEX = 1;
const CSV_START_INDEX = 3;
const CSV_END_INDEX = 4;
const CSV_ACTIVITY_TYPE_INDEX = 9;

function normalizeTime(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => String(cell || '').trim());
}

function looksLikeSigaCsv(content) {
  const firstLine = String(content || '').split(/\r?\n/, 1)[0] || '';
  return normalizeLabel(firstLine.replace(/"/g, '')).includes('data,status da atividade');
}

function toMinutes(time) {
  const normalized = normalizeTime(time);
  if (!normalized) return -1;
  const [hours, minutes] = normalized.split(':').map(Number);
  return (hours * 60) + minutes;
}

function deriveTeamLabel(options = {}) {
  const rawFilename = String(options.rawFilename || '');
  const filenameMatch = rawFilename.match(/Atividades-(.+?)_\d{2}_\d{2}_\d{2}/i);
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1].trim();
  }
  return options.teamLabel || 'Linha Morta - Centro MA';
}

function deriveTeamIdFromLabel(label) {
  return `SIGA-${normalizeLabel(label)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()}`;
}

function getCenterRoster(options = {}) {
  const explicitRoster = Array.isArray(options.expectedTeamIds) ? options.expectedTeamIds : [];
  if (explicitRoster.length) {
    return explicitRoster
      .map((item) => KAIZEN_TEAM_LOOKUP.get(String(item).trim().toUpperCase()) || String(item).trim().toUpperCase())
      .filter(Boolean);
  }

  const teamLabel = deriveTeamLabel(options);
  const roster = KAIZEN_CENTER_TEAM_ROSTERS[teamLabel.toUpperCase()] || [];
  return roster.map((item) => KAIZEN_TEAM_LOOKUP.get(String(item).trim().toUpperCase()) || item);
}

function parseKaizenSigaCsv(rawText, options = {}) {
  const referenceDate = options.referenceDate || new Date().toISOString().slice(0, 10);
  const rows = String(rawText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);

  if (rows.length <= 1) {
    return {
      referenceDate,
      records: [],
      summary: {
        parser: 'kaizen-siga-csv-v1',
        totalLines: rows.length,
        matchedRecords: 0,
        unmatchedLines: rows.slice(0, 10).map((cells) => cells.join(',')),
      },
    };
  }

  const dataRows = rows.slice(1).map((cells) => ({
    cells,
    rowIndex: rows.indexOf(cells),
    status: normalizeLabel(cells[CSV_STATUS_INDEX]),
    shiftStart: normalizeTime(cells[CSV_START_INDEX]),
    shiftEnd: normalizeTime(cells[CSV_END_INDEX]),
    activityType: normalizeLabel(cells[CSV_ACTIVITY_TYPE_INDEX]),
    rawLine: cells.join(', '),
  }));

  const completedRows = dataRows.filter((row) => row.status === 'concluido');
  const startRows = completedRows.filter((row) => row.activityType === 'checklist inicio do turno' && row.shiftStart);

  const productiveRows = completedRows.filter((row) => {
    if (!row.shiftEnd) return false;
    if (!row.activityType) return false;
    if (row.activityType.includes('checklist')) return false;
    if (row.activityType.includes('intervalo')) return false;
    if (row.activityType.includes('almoco')) return false;
    return true;
  });

  if (!startRows.length && !productiveRows.length) {
    return {
      referenceDate,
      records: [],
      summary: {
        parser: 'kaizen-siga-csv-v1',
        totalLines: rows.length,
        matchedRecords: 0,
        unmatchedLines: rows.slice(0, 10).map((cells) => cells.join(',')),
      },
    };
  }

  const groups = startRows.map((startRow, index) => {
    const nextStartRow = startRows[index + 1] || null;
    const groupProductiveRows = productiveRows.filter((row) => {
      if (row.rowIndex <= startRow.rowIndex) return false;
      if (nextStartRow && row.rowIndex >= nextStartRow.rowIndex) return false;
      return true;
    });

    const endRow = [...groupProductiveRows].sort((left, right) => toMinutes(right.shiftEnd) - toMinutes(left.shiftEnd))[0]
      || null;

    return {
      startRow,
      endRow,
      groupProductiveRows,
    };
  }).filter((group) => group.startRow || group.endRow);

  const teamLabel = deriveTeamLabel(options);
  const centerRoster = getCenterRoster(options);
  const selectedGroups = centerRoster.length ? groups.slice(0, centerRoster.length) : groups;
  const records = selectedGroups.map((group, index) => {
    const mappedTeamId = centerRoster[index] || null;
    const derivedTeamLabel = mappedTeamId || `${teamLabel} ${index + 1}`;
    const teamId = mappedTeamId || deriveTeamIdFromLabel(derivedTeamLabel);

    return {
      referenceDate,
      teamId,
      teamLabel: derivedTeamLabel,
      shiftStart: group.startRow ? group.startRow.shiftStart : null,
      shiftEnd: group.endRow ? group.endRow.shiftEnd : null,
      rawLine: [
        group.startRow ? `Inicio derivado de ${group.startRow.activityType} as ${group.startRow.shiftStart}` : null,
        group.endRow ? `Fim derivado de ${group.endRow.activityType} as ${group.endRow.shiftEnd}` : null,
      ].filter(Boolean).join(' | '),
      metadata: {
        parser: 'kaizen-siga-csv-v1',
        extractionMode: 'csv-derived-shift',
        startActivityType: group.startRow ? group.startRow.activityType : null,
        endActivityType: group.endRow ? group.endRow.activityType : null,
        completedRows: completedRows.length,
        productiveRows: group.groupProductiveRows.length,
        groupIndex: index,
      },
    };
  }).filter((record) => record.shiftStart || record.shiftEnd);

  return {
    referenceDate,
    records,
    summary: {
      parser: 'kaizen-siga-csv-v1',
      totalLines: rows.length,
      matchedRecords: records.length,
      unmatchedLines: [],
    },
  };
}

function extractTimePairs(text) {
  const ranges = Array.from(String(text || '').matchAll(TIME_RANGE_REGEX)).map((match) => ({
    shiftStart: normalizeTime(match[1]),
    shiftEnd: normalizeTime(match[2]),
  })).filter((item) => item.shiftStart || item.shiftEnd);

  if (ranges.length) return ranges;

  const shiftStart = normalizeTime((String(text || '').match(START_TIME_REGEX) || [])[1]);
  const shiftEnd = normalizeTime((String(text || '').match(END_TIME_REGEX) || [])[1]);
  return shiftStart || shiftEnd ? [{ shiftStart, shiftEnd }] : [];
}

function extractTeamIds(text) {
  const normalizedText = String(text || '').toUpperCase();
  const directMatches = (normalizedText.match(TEAM_ID_REGEX) || []).map((item) => item.trim().toUpperCase());
  const numericMatches = (normalizedText.match(NUMERIC_ID_REGEX) || []).map((item) => item.trim().toUpperCase());
  const prefixedMatches = Array.from(KAIZEN_TEAM_LOOKUP.keys()).filter((alias) => alias.includes('_') && normalizedText.includes(alias));

  const mapped = [...directMatches, ...numericMatches, ...prefixedMatches]
    .map((item) => KAIZEN_TEAM_LOOKUP.get(item) || item);

  return unique(mapped);
}

function parseKaizenTxt(rawText, options = {}) {
  const referenceDate = options.referenceDate || new Date().toISOString().slice(0, 10);
  const content = String(rawText || '');

  if (looksLikeSigaCsv(content)) {
    return parseKaizenSigaCsv(content, options);
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const recordsMap = new Map();
  const unmatchedLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1] || '';
    const mergedLine = nextLine ? `${line} ${nextLine}` : line;

    const teamIds = extractTeamIds(line);
    const mergedTeamIds = teamIds.length ? teamIds : extractTeamIds(mergedLine);
    const timePairs = extractTimePairs(line);
    const mergedTimePairs = timePairs.length ? timePairs : extractTimePairs(mergedLine);

    if (!mergedTeamIds.length || !mergedTimePairs.length) {
      unmatchedLines.push(line);
      continue;
    }

    const selectedTime = mergedTimePairs[0];
    mergedTeamIds.forEach((teamId) => {
      recordsMap.set(`${referenceDate}:${teamId}`, {
        referenceDate,
        teamId,
        teamLabel: teamId,
        shiftStart: selectedTime.shiftStart,
        shiftEnd: selectedTime.shiftEnd,
        rawLine: line,
        metadata: {
          parser: 'kaizen-text-v1',
        },
      });
    });
  }

  const records = Array.from(recordsMap.values()).sort((left, right) => left.teamId.localeCompare(right.teamId));

  return {
    referenceDate,
    records,
    summary: {
      parser: 'kaizen-text-v1',
      totalLines: lines.length,
      matchedRecords: records.length,
      unmatchedLines: unmatchedLines.slice(0, 25),
    },
  };
}

module.exports = {
  parseKaizenTxt,
  parseKaizenSigaCsv,
  extractTeamIds,
  extractTimePairs,
  normalizeTime,
};
