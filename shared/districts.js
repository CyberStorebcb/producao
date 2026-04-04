// Small registry of distritais/municipios to improve entity extraction.
// Exports helper to find matches in free text.

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
  const n = normalize(text);
  const found = [];
  DISTRICTS.forEach((d) => {
    const key = normalize(d);
    if (n.includes(key)) found.push(d);
  });
  return Array.from(new Set(found));
}

module.exports = { DISTRICTS, findDistrictsInText };
