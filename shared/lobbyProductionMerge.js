'use strict';

/**
 * Mesma lógica de shared/monitorTeamMatrix.js (productionMergeTeamKey) em CommonJS
 * para uso no Node (API) e no bundle do Vite.
 */
function canonicalTeamCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/MA-([A-Z]{3})-O(\d{3}M)/, 'MA-$1-0$2')
    .replace(/MA-([A-Z]{3})-V(\d{3}M)/, 'MA-$1-0$2');
}

function productionMergeTeamKey(code) {
  const raw = String(code || '').trim().toUpperCase();
  const basePart = raw.split('__')[0].trim();
  return canonicalTeamCode(basePart);
}

/**
 * @param {Array<{ sheetName: string, normalized: object }>} results
 * @param {string[]} lobbyBaseKeys - ex.: ['BCB','ITM','STI'] para o rótulo do resumo
 */
function mergeLobbyNormalizedResults(results, lobbyBaseKeys) {
  const dateMap = new Map();
  const teamMap = new Map();
  const sourceSheets = [];
  const totals = {
    skippedRows: 0,
    totalImportedValue: 0,
  };

  const basesLabel = lobbyBaseKeys && lobbyBaseKeys.length
    ? lobbyBaseKeys.join(' · ')
    : 'BCB · ITM · STI';

  results.forEach(({ sheetName, normalized }) => {
    if (!sourceSheets.includes(sheetName)) sourceSheets.push(sheetName);

    (normalized.dates || []).forEach((date) => {
      if (!dateMap.has(date.key)) {
        dateMap.set(date.key, { ...date });
      }
    });

    (normalized.teams || []).forEach((team) => {
      const mapKey = productionMergeTeamKey(team.code);
      const existing = teamMap.get(mapKey) || {
        code: mapKey,
        display: team.display || mapKey,
        plate: team.plate || '',
        valuesByDate: {},
        sourceSheets: [],
      };

      if (!existing.plate && team.plate) existing.plate = team.plate;
      if (team.display && (!existing.display || existing.display === mapKey)) {
        existing.display = team.display;
      }
      if (!existing.sourceSheets.includes(sheetName)) existing.sourceSheets.push(sheetName);

      Object.entries(team.valuesByDate || {}).forEach(([dateKey, value]) => {
        existing.valuesByDate[dateKey] = Number(
          ((Number(existing.valuesByDate[dateKey]) || 0) + (Number(value) || 0)).toFixed(2)
        );
      });

      teamMap.set(mapKey, existing);
    });

    totals.skippedRows += Number(normalized.summary?.skippedRows) || 0;
    totals.totalImportedValue = Number(
      (totals.totalImportedValue + (Number(normalized.summary?.totalImportedValue) || 0)).toFixed(2)
    );
  });

  const dates = Array.from(dateMap.values()).sort((left, right) => left.key.localeCompare(right.key));
  const teams = Array.from(teamMap.values()).sort((left, right) => left.display.localeCompare(right.display));

  return {
    dates,
    teams,
    summary: {
      sourceSheets,
      skippedRows: totals.skippedRows,
      totalImportedValue: totals.totalImportedValue,
      teamCount: teams.length,
      dateCount: dates.length,
      firstDateKey: dates.length ? dates[0].key : '',
      lastDateKey: dates.length ? dates[dates.length - 1].key : '',
      lobbyBases: basesLabel,
    },
  };
}

module.exports = {
  mergeLobbyNormalizedResults,
  productionMergeTeamKey,
  canonicalTeamCode,
};
