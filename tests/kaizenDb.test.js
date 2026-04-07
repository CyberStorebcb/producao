const test = require('node:test');
const assert = require('node:assert/strict');

const { saveKaizenSnapshot } = require('../shared/kaizenDb');

test('rejeita persistencia do Kaizen quando o parser nao extrai turnos', async () => {
  const calls = [];
  const fakeClient = {
    async query(sql) {
      calls.push(sql);
      throw new Error('nao deveria consultar o banco');
    },
  };

  await assert.rejects(
    () => saveKaizenSnapshot(fakeClient, {
      referenceDate: '2026-04-06',
      rawFilename: 'Atividades-Linha Morta - Centro MA_06_04_26.csv',
      rawText: 'arquivo bruto',
      records: [],
      metadata: {
        parserSummary: {
          parser: 'kaizen-siga-csv-v1',
          totalLines: 12,
          matchedRecords: 0,
          unmatchedLines: ['linha 1 sem match'],
        },
      },
    }),
    /persistência no Neon foi abortada|Nenhum turno foi extraído/i,
  );

  assert.equal(calls.length, 0);
});
