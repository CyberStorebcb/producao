const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeLobbyNormalizedResults } = require('../shared/lobbyProductionMerge');

test('mergeLobbyNormalizedResults soma equipes e datas de várias abas', () => {
  const a = {
    dates: [{ key: '2026-01-01', label: 'qui' }],
    teams: [
      {
        code: 'MA-BCB-0001M',
        display: 'MA-BCB-0001M',
        valuesByDate: { '2026-01-01': 100 },
      },
    ],
    summary: { skippedRows: 0, totalImportedValue: 100 },
  };
  const b = {
    dates: [{ key: '2026-01-01', label: 'qui' }],
    teams: [
      {
        code: 'MA-BCB-0001M',
        display: 'MA-BCB-0001M',
        valuesByDate: { '2026-01-01': 50 },
      },
    ],
    summary: { skippedRows: 1, totalImportedValue: 50 },
  };

  const merged = mergeLobbyNormalizedResults(
    [
      { sheetName: 'OBRAS', normalized: a },
      { sheetName: 'EME', normalized: b },
    ],
    ['BCB', 'ITM']
  );

  assert.equal(merged.teams.length, 1);
  assert.equal(merged.teams[0].valuesByDate['2026-01-01'], 150);
  assert.equal(merged.summary.totalImportedValue, 150);
  assert.equal(merged.summary.skippedRows, 1);
  assert.equal(merged.summary.lobbyBases, 'BCB · ITM');
});
