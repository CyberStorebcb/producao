const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseKaizenTxt,
  parseKaizenSigaCsv,
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

test('reconhece id externo do Kaizen e converte para a equipe padrao', () => {
  const ids = extractTeamIds('ID Externo MA_MA-BCB-O004M em atividade');
  assert.deepEqual(ids, ['MA-BCB-O004M']);
});

test('reconhece id numerico do Kaizen e converte para a equipe padrao', () => {
  const ids = extractTeamIds('Equipe com identificador 10791 em campo');
  assert.deepEqual(ids, ['MA-BCB-O004M']);
});

test('reconhece aliases de ITM e STI e converte para a equipe padrao', () => {
  assert.deepEqual(extractTeamIds('ID Externo MA_MA-ITM-O001M em atividade'), ['MA-ITM-O001M']);
  assert.deepEqual(extractTeamIds('Equipe com identificador 10812 em campo'), ['MA-STI-O001M']);
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

test('deriva inicio e fim de turno a partir do csv real do SIGA', () => {
  const rawCsv = [
    '"Data","Status da Atividade","Cidade","Início","Fim","Fim do SLA","Duração","Tempo de Deslocamento","Tipo de Atividade","Tipo de Atividade","Ordem de Serviço"',
    '"29/03/26","cancelado","","","","","00:00","00:00","Normal","Intervalo para almoço",""',
    '"29/03/26","concluído","","07:37","07:39","","00:02","00:00","Normal","Checklist Início do Turno",""',
    '"29/03/26","concluído","","09:34","16:18","","06:44","01:55","Normal","Obras",""',
    '"29/03/26","concluído","","07:29","07:31","","00:02","00:00","Normal","Checklist Início do Turno",""',
    '"29/03/26","concluído","","08:14","13:45","","05:31","00:43","Normal","Obras",""',
    '"29/03/26","concluído","","07:58","09:44","","01:46","00:00","Normal","Checklist Início do Turno",""',
    '"29/03/26","concluído","","09:50","13:36","","03:46","00:06","Normal","Obras",""',
  ].join('\n');

  const parsed = parseKaizenSigaCsv(rawCsv, {
    referenceDate: '2026-03-29',
    rawFilename: 'Atividades-Linha Morta - Centro MA_29_03_26.csv',
  });

  assert.equal(parsed.summary.parser, 'kaizen-siga-csv-v1');
  assert.equal(parsed.summary.matchedRecords, 2);
  assert.equal(parsed.records[0].teamId, 'MA-BCB-O002M');
  assert.equal(parsed.records[0].teamLabel, 'MA-BCB-O002M');
  assert.equal(parsed.records[0].shiftStart, '07:37');
  assert.equal(parsed.records[0].shiftEnd, '16:18');
  assert.equal(parsed.records[1].teamId, 'MA-BCB-O005M');
  assert.equal(parsed.records[1].shiftStart, '07:29');
  assert.equal(parsed.records[1].shiftEnd, '13:45');
});

test('parseKaizenTxt detecta csv do SIGA automaticamente', () => {
  const rawCsv = [
    '"Data","Status da Atividade","Cidade","Início","Fim","Fim do SLA","Duração","Tempo de Deslocamento","Tipo de Atividade","Tipo de Atividade","Ordem de Serviço"',
    '"29/03/26","concluído","","07:37","07:39","","00:02","00:00","Normal","Checklist Início do Turno",""',
    '"29/03/26","concluído","","09:34","16:18","","06:44","01:55","Normal","Obras",""',
    '"29/03/26","concluído","","07:29","07:31","","00:02","00:00","Normal","Checklist Início do Turno",""',
    '"29/03/26","concluído","","08:14","13:45","","05:31","00:43","Normal","Obras",""',
  ].join('\n');

  const parsed = parseKaizenTxt(rawCsv, {
    referenceDate: '2026-03-29',
    rawFilename: 'Atividades-Linha Morta - Centro MA_29_03_26.csv',
  });

  assert.equal(parsed.summary.parser, 'kaizen-siga-csv-v1');
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].shiftStart, '07:37');
  assert.equal(parsed.records[0].shiftEnd, '16:18');
  assert.equal(parsed.records[1].teamId, 'MA-BCB-O005M');
});
