const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseKaizenTxt,
  extractTeamIds,
  extractTimePairs,
  normalizeTime,
} = require('../shared/kaizenParser');

test('normaliza horario valido e rejeita horario invalido', () => {
  assert.equal(normalizeTime('7:05'), '07:05');
  assert.equal(normalizeTime('23:59'), '23:59');
  assert.equal(normalizeTime('24:00'), null);
  assert.equal(normalizeTime('aa:bb'), null);
});

test('extrai ids de equipe em formato SIGA', () => {
  const ids = extractTeamIds('Equipe MA-OBRAS-001 e MA-BCB-0004M na mesma linha');
  assert.deepEqual(ids, ['MA-OBRAS-001', 'MA-BCB-0004M']);
});

test('extrai faixa de horario em uma linha', () => {
  const pairs = extractTimePairs('Turno previsto 07:00 - 17:00');
  assert.deepEqual(pairs, [{ shiftStart: '07:00', shiftEnd: '17:00' }]);
});

test('parseia txt com uma equipe por linha', () => {
  const rawText = [
    'MA-OBRAS-001 07:00 - 17:00',
    'MA-BCB-0004M 08:15 - 18:00',
  ].join('\n');

  const parsed = parseKaizenTxt(rawText, { referenceDate: '2026-04-05' });

  assert.equal(parsed.referenceDate, '2026-04-05');
  assert.equal(parsed.summary.matchedRecords, 2);
  assert.equal(parsed.records[0].teamId, 'MA-BCB-0004M');
  assert.equal(parsed.records[0].shiftStart, '08:15');
  assert.equal(parsed.records[1].teamId, 'MA-OBRAS-001');
  assert.equal(parsed.records[1].shiftEnd, '17:00');
});

test('usa a linha seguinte quando horario nao esta na primeira linha', () => {
  const rawText = [
    'Equipe MA-OBRAS-001',
    'Inicio 06:30 Fim 16:30',
  ].join('\n');

  const parsed = parseKaizenTxt(rawText, { referenceDate: '2026-04-05' });

  assert.equal(parsed.summary.matchedRecords, 1);
  assert.equal(parsed.records[0].teamId, 'MA-OBRAS-001');
  assert.equal(parsed.records[0].shiftStart, '06:30');
  assert.equal(parsed.records[0].shiftEnd, '16:30');
});

test('deduplica equipe repetida na mesma data', () => {
  const rawText = [
    'MA-OBRAS-001 07:00 - 17:00',
    'MA-OBRAS-001 07:00 - 17:00',
  ].join('\n');

  const parsed = parseKaizenTxt(rawText, { referenceDate: '2026-04-05' });

  assert.equal(parsed.summary.matchedRecords, 1);
  assert.equal(parsed.records.length, 1);
});
