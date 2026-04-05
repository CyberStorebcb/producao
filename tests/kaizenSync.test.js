const test = require('node:test');
const assert = require('node:assert/strict');

const { buildReferenceDateRange } = require('../shared/kaizenSync');

test('monta intervalo inclusivo de datas do Kaizen', () => {
  assert.deepEqual(buildReferenceDateRange('2026-02-25', '2026-02-28'), [
    '2026-02-25',
    '2026-02-26',
    '2026-02-27',
    '2026-02-28',
  ]);
});

test('rejeita intervalo invertido do Kaizen', async () => {
  assert.throws(
    () => buildReferenceDateRange('2026-04-05', '2026-02-25'),
    /data inicial do Kaizen deve ser menor ou igual/i,
  );
});