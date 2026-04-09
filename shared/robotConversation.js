// Lightweight conversation training data and helpers for the robot
// Purpose: hold intents, examples, simple classifier and response templates.

const intents = [
  {
    name: 'greet',
    examples: ['oi', 'olá', 'bom dia', 'boa tarde', 'e aí', 'fala', 'oiie', 'olá robô', 'bom dia robô', 'saudações', 'boa noite'],
    responses: ['Oi! Como posso ajudar?', 'Olá — em que posso ajudar hoje?', 'Oi — em que posso ser útil?']
  },
  {
    name: 'bye',
    examples: ['tchau', 'até', 'até mais', 'valeu', 'flw', 'até logo'],
    responses: ['Até! Se precisar, chame o robô novamente.', 'Tchau — bom trabalho!', 'Até logo — qualquer coisa me chama.']
  },
  {
    name: 'thanks',
    examples: ['obrigado', 'valeu', 'obrigada', 'grato', 'muito obrigado', 'brigadão', 'obrigadissimo'],
    responses: ['Disponha!', 'Por nada — fico feliz em ajudar.', 'Imagina — estou aqui para isso.']
  },
  {
    name: 'help',
    examples: ['ajuda', 'o que você faz', 'como usar', 'comandos', 'o que voce faz', 'como te usar', 'me ajuda', 'como funciona'],
    responses: ['Posso mostrar obras, comparar municípios, e filtrar por valores. Tente: “mostre Bacabal contra Santa Inês” ou “só obras acima de 300 mil”.', 'Posso resumir o top, aplicar filtros por valor, comparar distritais e restaurar filtros.']
  },
  {
    name: 'ask_top',
    examples: ['mostre os melhores', 'top', 'maiores obras', 'maiores valores', 'melhores oportunidades', 'resuma o top', 'resumo', 'me mostre o top', 'show top'],
    responses: ['Aqui estão os principais itens que encontrei. Quer comparar municípios específicos ou filtrar por valor?', 'Resumo do top: veja os maiores valores e se quer que eu foque em alguma distrital.']
  },
  {
    name: 'compare',
    examples: ['compare', 'contra', 'vs', 'x', 'compare Bacabal com Santa Inês', 'comparar', 'compare A com B', 'compare entre'],
    responses: ['Comparando os municípios pedidos...', 'Vou comparar as distritais solicitadas e trazer a diferença.']
  },
  {
    name: 'filter_min',
    examples: ['acima de', 'maior que', 'só obras acima de 300 mil', 'acima de 500000', 'mostrar apenas acima de 100k', 'so acima de 200 mil', 'só maiores que 100k', 'aplicar corte de 50 mil'],
    responses: ['Filtrando por valor mínimo...', 'Ok — aplicando filtro por valor mínimo.']
  },
  {
    name: 'filter_max',
    examples: ['ate 100 mil', 'até 100 mil', 'abaixo de 100 mil', 'menor que 100 mil', 'no maximo 200 mil', 'obras baratas', 'obras pequenas'],
    responses: ['Ok — aplicando filtro por valor máximo.', 'Filtrando por valor máximo...']
  },
  {
    name: 'filter_progress',
    examples: ['em andamento', 'sem andamento', 'sem execucao em campo', 'só obras em andamento', 'nao quero em andamento'],
    responses: ['Aplicando filtro de andamento.', 'Filtrando pelo andamento informado.']
  },
  {
    name: 'filter_status',
    examples: ['só programada', 'só nao liberada', 'somente obra liberada', 'apenas reprogramar', 'não quero programadas', 'sem programadas'],
    responses: ['Aplicando filtro de status.', 'Filtrando pelo status solicitado.']
  }
];

// additional small-talk and utility intents
intents.push({
  name: 'origin',
  examples: ['qual a origem', 'de onde vem os dados', 'origem dos dados', 'planilha'],
  responses: ['Os dados vêm da planilha ACOM-OBRAS na aba OBRAS; uso campos NOTA, DESCRITIVO, DISTRITAL, MUNICIPIO, STATUS OBRA e PROJETADO R$.']
});

intents.push({
  name: 'restore',
  examples: ['restaurar filtros', 'restaurar', 'reset', 'voltar ao padrão'],
  responses: ['Restaurando filtros para o padrão.']
});

intents.push({
  name: 'small_talk',
  examples: ['como voce esta', 'tudo bem', 'beleza', 'como vai'],
  responses: ['Estou bem, obrigado!', 'Tudo certo por aqui — prontinho para ajudar.']
});

// fallback/unknown intent responses
const unknownResponses = [
  'Desculpe, não entendi — pode reformular?',
  'Não captei. Tente: resumo, comparar, ou “acima de 300 mil”.',
];

function normalize(text = '') {
  return String(text).toLowerCase().trim();
}

function extractMinValue(text) {
  // capture numbers like 300000, 300k, 300 mil
  const t = normalize(text);
  const re = /([0-9]+(?:[.,][0-9]+)?)(?:\s*(k|mil|m))?/i;
  const m = t.match(re);
  if (!m) return null;
  let n = Number(m[1].replace(',', '.'));
  const suf = (m[2] || '').toLowerCase();
  if (suf === 'k') n *= 1000;
  if (suf === 'mil') n *= 1000;
  if (suf === 'm') n *= 1000000;
  return Math.round(n);
}

function extractMaxValue(text) {
  const t = normalize(text);
  const re = /(?:ate|até|abaixo de|menor que|no maximo|no máximo)\s*([0-9]+(?:[.,][0-9]+)?)(?:\s*(k|mil|m))?/i;
  const m = t.match(re);
  if (!m) return null;
  let n = Number(m[1].replace(',', '.'));
  const suf = (m[2] || '').toLowerCase();
  if (suf === 'k') n *= 1000;
  if (suf === 'mil') n *= 1000;
  if (suf === 'm') n *= 1000000;
  return Math.round(n);
}

function extractStatuses(text) {
  const t = normalize(text);
  const include = [];
  const exclude = [];
  const rules = [
    { needles: ['nao liberada', 'não liberada'], value: 'NAO LIBERADA' },
    { needles: ['programada', 'programadas'], value: 'PROGRAMADA' },
    { needles: ['obra liberada', 'obras liberadas', 'liberada', 'liberadas'], value: 'OBRA LIBERADA' },
    { needles: ['reprogramar', 'reprogramada', 'reprogramadas'], value: 'REPROGRAMAR' },
  ];

  rules.forEach(({ needles, value }) => {
    const matchedNeedle = needles.find((needle) => t.includes(needle));
    if (!matchedNeedle) return;
    const negativePatterns = [
      `nao quero ${matchedNeedle}`,
      `não quero ${matchedNeedle}`,
      `sem ${matchedNeedle}`,
      `tirar ${matchedNeedle}`,
      `exceto ${matchedNeedle}`,
    ];
    if (negativePatterns.some((pattern) => t.includes(pattern))) {
      exclude.push(value);
    } else {
      include.push(value);
    }
  });

  return {
    include: Array.from(new Set(include)),
    exclude: Array.from(new Set(exclude)),
  };
}

function extractProgress(text) {
  const t = normalize(text);
  const include = [];
  const exclude = [];

  if (t.includes('em andamento')) {
    if (t.includes('nao quero em andamento') || t.includes('não quero em andamento') || t.includes('sem em andamento')) {
      exclude.push('EM ANDAMENTO');
    } else {
      include.push('EM ANDAMENTO');
    }
  }

  if (t.includes('sem andamento') || t.includes('sem execucao') || t.includes('sem execução')) {
    include.push('SEM ANDAMENTO');
  }

  return {
    include: Array.from(new Set(include)),
    exclude: Array.from(new Set(exclude)),
  };
}

function extractDistricts(text) {
  // detect patterns like "A contra B", "A vs B", "compare A com B"
  const t = normalize(text).replace(/\s+/g, ' ');
  const reBetween = /(?:compare|comparar)?\s*([\wãâáàéêíóôõúç\- ]{2,50})\s*(?:contra|vs|x|com)\s*([\wãâáàéêíóôõúç\- ]{2,50})/i;
  const m = text.match(reBetween);
  if (m) {
    return [m[1].trim(), m[2].trim()];
  }
  return [];
}

function classify(text) {
  const t = normalize(text);
  if (!t) return { intent: 'unknown', entities: {} };
  const cheapIntent = /(barat|baratas|barato|pequen|pequenas|pequeno)/i.test(t);
  const expensiveIntent = /(caras|caros|caro|grandes|grande|alto valor|maiores)/i.test(t);

  // greetings
  if (/^((oi|ol[áa]|bom dia|boa tarde|boa noite|e aí|saudac|sauda[cç][aã]o|sauda[cç]oes)\b)/i.test(t)) return { intent: 'greet', entities: {} };
  if (/^(tchau|até( mais)?|flw|valeu)\b/i.test(t)) return { intent: 'bye', entities: {} };
  if (/(obrigad|valeu|gratidão)/i.test(t)) return { intent: 'thanks', entities: {} };
  if (/(ajuda|o que voce faz|comandos|como usar)/i.test(t)) return { intent: 'help', entities: {} };

  // compare
  if (/\b(vs|contra|compare|comparar| x )\b/i.test(t) || extractDistricts(t).length === 2) {
    const districts = extractDistricts(t);
    const min = extractMinValue(t);
    return { intent: 'compare', entities: { districts, min } };
  }

  // filter by min value
  if (/\b(ate|até|abaixo de|menor que|no maximo|no máximo)(?:\s*)[0-9]/i.test(t) || extractMaxValue(t) || cheapIntent) {
    const max = extractMaxValue(t);
    return { intent: 'filter_max', entities: { max, auto: !max && cheapIntent } };
  }

  if (/\b(acima de|maior que|>)(?:\s*)[0-9]/i.test(t) || extractMinValue(t) || expensiveIntent) {
    const min = extractMinValue(t);
    return { intent: 'filter_min', entities: { min, auto: !min && expensiveIntent } };
  }

  const statuses = extractStatuses(t);
  if (statuses.include.length || statuses.exclude.length) {
    return { intent: 'filter_status', entities: { statuses } };
  }

  const progress = extractProgress(t);
  if (progress.include.length || progress.exclude.length) {
    return { intent: 'filter_progress', entities: { progress } };
  }

  // ask top
  if (/\b(top|maior|melhor|principais|melhores)\b/i.test(t)) {
    return { intent: 'ask_top', entities: {} };
  }

  return { intent: 'unknown', entities: {} };
}

function _formatValue(v) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  } catch {
    return String(v);
  }
}

function generateResponse(intentName, entities = {}, context = {}) {
  const intent = intents.find(i => i.name === intentName);
  const unknown = unknownResponses[Math.floor(Math.random() * unknownResponses.length)];
  if (!intent) return { text: unknown, action: null, params: {} };

  let r = intent.responses[Math.floor(Math.random() * intent.responses.length)];
  let action = null;
  let params = {};

  // entity-aware responses with action hints
  if (intentName === 'filter_min' && entities.min) {
    r = `Ok — mostrando apenas itens acima de ${_formatValue(entities.min)}.`;
    action = 'apply_filter_min';
    params = { min: entities.min };
  }

  if (intentName === 'filter_min' && entities.auto) {
    r = 'Ok — vou focar nas obras maiores.';
    action = 'apply_filter_min_auto';
    params = {};
  }

  if (intentName === 'filter_max' && entities.max) {
    r = `Ok — mostrando apenas itens até ${_formatValue(entities.max)}.`;
    action = 'apply_filter_max';
    params = { max: entities.max };
  }

  if (intentName === 'filter_max' && entities.auto) {
    r = 'Ok — vou focar nas obras menores.';
    action = 'apply_filter_max_auto';
    params = {};
  }

  if (intentName === 'filter_status' && entities.statuses?.include?.length) {
    r = `Ok — aplicando status ${entities.statuses.include.join(', ')}.`;
    action = 'set_statuses';
    params = { statuses: entities.statuses.include };
  }

  if (intentName === 'filter_status' && entities.statuses?.exclude?.length) {
    r = `Ok — removendo status ${entities.statuses.exclude.join(', ')}.`;
    action = 'exclude_statuses';
    params = { statuses: entities.statuses.exclude };
  }

  if (intentName === 'filter_progress' && entities.progress?.include?.length) {
    r = `Ok — aplicando andamento ${entities.progress.include.join(', ')}.`;
    action = 'set_progress';
    params = { progress: entities.progress.include };
  }

  if (intentName === 'filter_progress' && entities.progress?.exclude?.length) {
    r = `Ok — removendo andamento ${entities.progress.exclude.join(', ')}.`;
    action = 'exclude_progress';
    params = { progress: entities.progress.exclude };
  }

  if (intentName === 'compare' && entities.districts && entities.districts.length >= 2) {
    r = `Comparando ${entities.districts[0]} com ${entities.districts[1]}...`;
    action = 'compare';
    params = { districts: entities.districts.slice(0, 2) };
  }

  if (intentName === 'ask_top') {
    action = 'summary';
    params = {};
  }

  if (intentName === 'restore') {
    action = 'restore_filters';
    params = {};
  }

  // context substitutions: {district}, {count}, {value}
  if (context) {
    if (context.district) r = r.replace(/\{district\}/g, context.district);
    if (typeof context.count !== 'undefined') r = r.replace(/\{count\}/g, String(context.count));
    if (typeof context.value !== 'undefined') r = r.replace(/\{value\}/g, _formatValue(context.value));
  }

  return { text: r, action, params };
}

// Export for CommonJS (tests) and allow bundlers to interop with ESM
module.exports = { intents, classify, generateResponse, extractMinValue, extractMaxValue, extractDistricts, extractStatuses, extractProgress };
