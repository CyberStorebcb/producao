const { KAIZEN_TEAM_LOOKUP } = require('./kaizenTeamMap');

const TEAM_ID_REGEX = /(?<![A-Z0-9_-])[A-Z]{1,4}(?:-[A-Z0-9]{1,12}){1,5}(?![A-Z0-9_])/g;
const TIME_RANGE_REGEX = /(\d{1,2}:\d{2})\s*(?:-|–|—|a|até|to)\s*(\d{1,2}:\d{2})/gi;
const START_TIME_REGEX = /(?:in[ií]cio|entrada|start)\D{0,12}(\d{1,2}:\d{2})/i;
const END_TIME_REGEX = /(?:fim|sa[ií]da|end|t[eé]rmino)\D{0,12}(\d{1,2}:\d{2})/i;
const NUMERIC_ID_REGEX = /\b\d{5}\b/g;

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
  extractTeamIds,
  extractTimePairs,
  normalizeTime,
};
