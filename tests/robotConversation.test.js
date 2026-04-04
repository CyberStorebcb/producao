const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classify,
  generateResponse,
  extractMinValue,
  extractMaxValue,
  extractDistricts,
  extractStatuses,
  extractProgress,
} = require('../shared/robotConversation');

test('classifica cumprimentos', () => {
  const c = classify('Oi');
  assert.equal(c.intent, 'greet');
});

test('classifica variação de cumprimento', () => {
  const c = classify('boa noite');
  assert.equal(c.intent, 'greet');
});

test('classifica encerramento', () => {
  const c = classify('Tchau');
  assert.equal(c.intent, 'bye');
});

test('classifica pedido de resumo/top', () => {
  const c = classify('Resuma o top atual');
  assert.equal(c.intent, 'ask_top');
});

test('classifica sinônimo de resumo', () => {
  const c = classify('me mostre o top');
  assert.equal(c.intent, 'ask_top');
});

test('extrai valor minimo de comando', () => {
  const v = extractMinValue('Quero so obras acima de 300 mil');
  assert.equal(v, 300000);
});

test('classifica filtro por valor minimo', () => {
  const c = classify('so obras acima de 300 mil');
  assert.equal(c.intent, 'filter_min');
  assert.equal(c.entities.min, 300000);
});

test('extrai valor maximo de comando', () => {
  const v = extractMaxValue('Filtre obras de até 100 mil');
  assert.equal(v, 100000);
});

test('classifica filtro por valor maximo', () => {
  const c = classify('Filtre obras de até 100 mil');
  assert.equal(c.intent, 'filter_max');
  assert.equal(c.entities.max, 100000);
});

test('classifica filtro por status', () => {
  const c = classify('quero só obras programadas');
  assert.equal(c.intent, 'filter_status');
  assert.deepEqual(c.entities.statuses, { include: ['PROGRAMADA'], exclude: [] });
});

test('extrai exclusao de status em linguagem natural', () => {
  const statuses = extractStatuses('não quero programadas');
  assert.deepEqual(statuses, { include: [], exclude: ['PROGRAMADA'] });
});

test('gera resposta estruturada para exclusao de status', () => {
  const reply = generateResponse('filter_status', { statuses: { include: [], exclude: ['PROGRAMADA'] } });
  assert.equal(reply.action, 'exclude_statuses');
  assert.deepEqual(reply.params.statuses, ['PROGRAMADA']);
});

test('classifica filtro por andamento', () => {
  const c = classify('mostre somente obras em andamento');
  assert.equal(c.intent, 'filter_progress');
  assert.deepEqual(c.entities.progress, { include: ['EM ANDAMENTO'], exclude: [] });
});

test('extrai exclusao de andamento', () => {
  const progress = extractProgress('nao quero em andamento');
  assert.deepEqual(progress, { include: [], exclude: ['EM ANDAMENTO'] });
});

test('gera resposta estruturada para exclusao de andamento', () => {
  const reply = generateResponse('filter_progress', { progress: { include: [], exclude: ['EM ANDAMENTO'] } });
  assert.equal(reply.action, 'exclude_progress');
  assert.deepEqual(reply.params.progress, ['EM ANDAMENTO']);
});

test('gera resposta estruturada para filtro maximo', () => {
  const reply = generateResponse('filter_max', { max: 100000 });
  assert.equal(reply.action, 'apply_filter_max');
  assert.equal(reply.params.max, 100000);
});

test('classifica sinonimo humano para obras baratas', () => {
  const c = classify('quero obras baratas');
  assert.equal(c.intent, 'filter_max');
  assert.equal(c.entities.auto, true);
});

test('gera resposta estruturada para filtro automatico de obras baratas', () => {
  const reply = generateResponse('filter_max', { auto: true });
  assert.equal(reply.action, 'apply_filter_max_auto');
});

test('classifica sinonimo humano para obras grandes', () => {
  const c = classify('quero obras grandes');
  assert.equal(c.intent, 'filter_min');
  assert.equal(c.entities.auto, true);
});

test('gera resposta estruturada para filtro automatico de obras grandes', () => {
  const reply = generateResponse('filter_min', { auto: true });
  assert.equal(reply.action, 'apply_filter_min_auto');
});

test('extrai distritais usando expressão compare', () => {
  const ds = extractDistricts('Compare Bacabal com Santa Ines');
  assert.deepEqual(ds.map(d => d.toLowerCase()), ['bacabal', 'santa ines']);
});

test('classifica comparacao e gera resposta', () => {
  const c = classify('Compare Bacabal com Santa Ines');
  assert.equal(c.intent, 'compare');
  const reply = generateResponse(c.intent, { districts: ['Bacabal', 'Santa Ines'] });
  assert.ok(reply && typeof reply === 'object');
  assert.match(reply.text, /Comparando|comparando|Vou comparar/i);
  assert.equal(reply.action, 'compare');
});

test('fallback para desconhecido retorna mensagem amigavel', () => {
  const reply = generateResponse('nonexistent_intent');
  assert.ok(reply && typeof reply.text === 'string' && reply.text.length > 5);
  assert.equal(reply.action, null);
});
