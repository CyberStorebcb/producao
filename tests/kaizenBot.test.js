const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeReferenceDate,
  parseCalendarMonthYearLabel,
  calculateCalendarMonthDelta,
  buildCalendarDayXPathCandidates,
} = require('../shared/kaizenBot');

test('normaliza datas amigaveis vindas do chat', () => {
  assert.equal(normalizeReferenceDate('18/03/2026'), '2026-03-18');
  assert.equal(normalizeReferenceDate('18-03-26'), '2026-03-18');
  assert.equal(normalizeReferenceDate('18/03'), '2026-03-18');
});

test('interpreta o cabecalho do calendario em portugues', () => {
  assert.deepEqual(parseCalendarMonthYearLabel('Abril 2026'), {
    text: 'Abril 2026',
    monthIndex: 3,
    year: 2026,
  });
});

test('calcula salto positivo e negativo entre meses', () => {
  assert.equal(
    calculateCalendarMonthDelta(
      { monthIndex: 10, year: 2025 },
      { monthIndex: 3, year: 2026 },
    ),
    5,
  );

  assert.equal(
    calculateCalendarMonthDelta(
      { monthIndex: 5, year: 2026 },
      { monthIndex: 3, year: 2026 },
    ),
    -2,
  );
});

test('gera seletores xpath dinamicos para o dia', () => {
  const selectors = buildCalendarDayXPathCandidates('Abril 2026', '6');

  assert.equal(selectors.length, 3);
  assert.match(selectors[0], /Abril 2026/);
  assert.match(selectors[1], /normalize-space\(\.\) = '6'/);
  assert.match(selectors[2], /following::/);
});
