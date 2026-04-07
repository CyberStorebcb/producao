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
  assert.equal(parsed.summary.matchedRecords, 3);
  assert.equal(parsed.records[0].teamId, 'MA-BCB-O001M');
  assert.equal(parsed.records[0].teamLabel, 'MA-BCB-O001M');
  assert.equal(parsed.records[0].shiftStart, '07:37');
  assert.equal(parsed.records[0].shiftEnd, '16:18');
  assert.equal(parsed.records[1].teamId, 'MA-BCB-O002M');
  assert.equal(parsed.records[1].shiftStart, '07:29');
  assert.equal(parsed.records[1].shiftEnd, '13:45');
  assert.equal(parsed.records[2].teamId, 'MA-BCB-O003M');
  assert.equal(parsed.records[2].shiftStart, '07:58');
  assert.equal(parsed.records[2].shiftEnd, '13:36');
});

test('mapeia blocos do centro MA em ordem sequencial para todas as equipes da base', () => {
  const rawCsv = [
    '"Data","Status da Atividade","Cidade","Início","Fim","Fim do SLA","Duração","Tempo de Deslocamento","Tipo de Atividade","Tipo de Atividade","Ordem de Serviço","Abrangência","Tipo de Natureza - Text","Tipo de Causa - Text","Subcausa","SubTipo de Causa - Text","Tipo de Conclusão Executada","TipoConclusaoOS","Tipo de Conclusão","Tipo de Conclusão Não Executada","Tipo","Tipo de Causas","Número da Conta","Alertas de Conformidade","ID da Atividade","Interface da Primeira Operação Manual","Latitude","Longitude","Posição na Rota"',
    '"24/03/26","concluído","","08:01","08:02","","00:01","00:00","Normal","Checklist Início do Turno","","","","","","","","","","","","","","","72053800","","","","1"',
    '"24/03/26","concluído","","15:30","17:38","","02:08","00:10","Normal","Obras","","","","","","","","","","","","","","","72020028","","","","4"',
    '"24/03/26","concluído","","07:24","07:35","","00:11","00:00","Normal","Checklist Início do Turno","","","","","","","","","","","","","","","72049377","","","","1"',
    '"24/03/26","concluído","","14:55","20:15","","05:20","00:06","Normal","Obras","","","","","","","","","","","","","","","72020089","","","","4"',
    '"24/03/26","concluído","","08:06","08:07","","00:01","00:00","Normal","Checklist Início do Turno","","","","","","","","","","","","","","","72054346","","","","1"',
    '"24/03/26","concluído","","14:17","18:23","","04:06","00:08","Normal","Obras","","","","","","","","","","","","","","","72062321","","","","4"',
    '"24/03/26","concluído","","08:22","08:26","","00:04","00:00","Normal","Checklist Início do Turno","","","","","","","","","","","","","","","72055902","","","","1"',
    '"24/03/26","concluído","","16:02","18:21","","02:19","00:09","Normal","Obras","","","","","","","","","","","","","","","72020252","","","","4"',
  ].join('\n');

  const parsed = parseKaizenSigaCsv(rawCsv, {
    referenceDate: '2026-03-24',
    rawFilename: 'Atividades-Linha Morta - Centro MA_24_03_26.csv',
  });

  assert.equal(parsed.records.length, 4);
  assert.equal(parsed.records[0].teamId, 'MA-BCB-O001M');
  assert.equal(parsed.records[0].shiftStart, '08:01');
  assert.equal(parsed.records[0].shiftEnd, '17:38');
  assert.equal(parsed.records[1].teamId, 'MA-BCB-O002M');
  assert.equal(parsed.records[1].shiftEnd, '20:15');
  assert.equal(parsed.records[2].teamId, 'MA-BCB-O003M');
  assert.equal(parsed.records[2].shiftEnd, '18:23');
  assert.equal(parsed.records[3].teamId, 'MA-BCB-O004M');
  assert.equal(parsed.records[3].shiftEnd, '18:21');
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
  assert.equal(parsed.records[1].teamId, 'MA-BCB-O002M');
});

test('parseia csv do SIGA com BOM, ponto e virgula e cabecalho variavel', () => {
  const rawCsv = [
    '\uFEFF"Data";"Status da Atividade";"Cidade";"Início";"Fim";"Fim do SLA";"Duração";"Tempo de Deslocamento";"Tipo de Atividade";"Tipo de Atividade";"Ordem de Serviço";"Posição na Rota"',
    '"29/03/26";"concluído";"";"07:37";"07:39";"";"00:02";"00:00";"Normal";"Checklist Início do Turno";"";"1"',
    '"29/03/26";"concluído";"";"09:34";"16:18";"";"06:44";"01:55";"Normal";"Obras";"";"4"',
    '"29/03/26";"concluído parcialmente";"";"07:29";"07:31";"";"00:02";"00:00";"Normal";"Checklist Início do Turno";"";"1"',
    '"29/03/26";"concluído";"";"08:14";"13:45";"";"05:31";"00:43";"Normal";"Obras";"";"4"',
  ].join('\n');

  const parsed = parseKaizenTxt(rawCsv, {
    referenceDate: '2026-03-29',
    rawFilename: 'Atividades-Linha Morta - Centro MA_29_03_26.csv',
  });

  assert.equal(parsed.summary.parser, 'kaizen-siga-csv-v1');
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].teamId, 'MA-BCB-O001M');
  assert.equal(parsed.records[0].shiftEnd, '16:18');
  assert.equal(parsed.records[1].teamId, 'MA-BCB-O002M');
  assert.equal(parsed.records[1].shiftStart, '07:29');
});
