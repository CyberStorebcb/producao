const DISTRICTS = [
  'BACABAL',
  'ITAPECURU MIRIM',
  'SANTA INÊS',
  'PEDREIRAS',
  'BARRA DO CORDA',
  'SÃO LUÍS',
  'SAO LUIS',
  'IMPERATRIZ',
  'CAXIAS',
  'TIMON',
  'CODÓ',
];

function normalize(text = '') {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function findDistrictsInText(text) {
  const normalized = normalize(text);
  const found = [];
  DISTRICTS.forEach((district) => {
    if (normalized.includes(normalize(district))) found.push(district);
  });
  return Array.from(new Set(found));
}

export { DISTRICTS, findDistrictsInText };
