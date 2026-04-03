const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeDiarioRows } = require('../shared/diarioParser');

test('agrega linhas repetidas da mesma equipe no layout DIARIO', () => {
  const rows = [
    ['cabecalho irrelevante'],
    ['BASE', '', '', '', '', '', '25/02/2026', '26/02/2026'],
    ['', 'OBRAS', 'MA-BCB-0001M', 'RZR 5J07', '', 'Apontado R$', 1000, '2.500,50'],
    ['', '', 'MA-BCB-0001M', '', '', 'Apontado R$', '500,25', 100],
    ['', 'EME', 'MA-BCB-0002M', 'SPB 8F97', '', 'Apontado R$', 300, 0],
  ];

  const parsed = normalizeDiarioRows(rows, { sheetName: 'DIÁRIO' });
  const teamOne = parsed.teams.find((team) => team.code === 'MA-BCB-0001M');
  const teamTwo = parsed.teams.find((team) => team.code === 'MA-BCB-0002M');

  assert.equal(parsed.dates.length, 2);
  assert.equal(parsed.summary.teamCount, 2);
  assert.equal(teamOne.valuesByDate['2026-02-25'], 1500.25);
  assert.equal(teamOne.valuesByDate['2026-02-26'], 2600.5);
  assert.equal(teamTwo.valuesByDate['2026-02-25'], 300);
  assert.equal(parsed.summary.totalImportedValue, 4400.75);
});

test('ignora linhas sem equipe ou sem data no layout de servicos e aceita formatos numericos distintos', () => {
  const rows = [
    ['DATA DO SERVICO', 'VALOR', 'PLACA', 'ENCARREGADO'],
    ['25/02/2026', '1.234,56', 'ROU 6E64', 'MA-BCB-O004M'],
    ['2026-02-26', 2000, 'ROU 6E64', 'MA-BCB-O004M'],
    ['', '500,00', 'ROU 6E64', 'MA-BCB-O004M'],
    ['25/02/2026', '100,00', 'ROU 6E64', ''],
  ];

  const parsed = normalizeDiarioRows(rows, { sheetName: 'OBRAS' });
  const team = parsed.teams.find((entry) => entry.code === 'MA-BCB-0004M');

  assert.equal(parsed.summary.processedRows, 2);
  assert.equal(parsed.summary.skippedRows, 2);
  assert.equal(parsed.summary.missingDateRows, 1);
  assert.equal(parsed.summary.missingTeamRows, 1);
  assert.equal(parsed.summary.totalImportedValue, 3234.56);
  assert.equal(team.valuesByDate['2026-02-25'], 1234.56);
  assert.equal(team.valuesByDate['2026-02-26'], 2000);
});

test('detecta datas em objetos Date e cabecalho BASE fora da primeira coluna', () => {
  const rows = [
    ['linha', 'solta'],
    ['prefixo', 'BASE', '', '', '', '', new Date(Date.UTC(2026, 1, 27)), '2026-02-28'],
    ['', 'CUSTEIO', 'MA-BCB-0005M', 'SNQ 1J62', '', 'Apontado R$', 10, 20],
  ];

  const parsed = normalizeDiarioRows(rows, { sheetName: 'DIÁRIO' });

  assert.deepEqual(
    parsed.dates.map((date) => date.key),
    ['2026-02-27', '2026-02-28']
  );
  assert.equal(parsed.summary.firstDateKey, '2026-02-27');
  assert.equal(parsed.summary.lastDateKey, '2026-02-28');
  assert.equal(parsed.teams[0].valuesByDate['2026-02-27'], 10);
  assert.equal(parsed.teams[0].valuesByDate['2026-02-28'], 20);
});