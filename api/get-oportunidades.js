const XLSX = require('xlsx');
const { loadWorkbookFromDropbox } = require('../shared/dropboxWorkbook');
const {
  DEFAULT_DISTRICT_FILTERS,
  DEFAULT_PROGRESS_FILTERS,
  DEFAULT_STATUS_FILTERS,
  buildFilteredTopOpportunities,
} = require('../shared/oportunidadesRobot');

const DEFAULT_DROPBOX_URL = 'https://www.dropbox.com/scl/fi/wu9hl40m1xrncgdx9gjpv/ACOM-OBRAS-2025.xlsx?rlkey=sfuyra3tijrl46qqw6app4u0k&st=y1qvlicx&dl=0';
const SOURCE_SHEET_NAME = 'OBRAS';

function parseList(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const topN = Number(req.query?.topN) > 0 ? Number(req.query.topN) : 10;
    const districtFilters = parseList(req.query?.districts, DEFAULT_DISTRICT_FILTERS);
    const statusFilters = parseList(req.query?.statuses, DEFAULT_STATUS_FILTERS);
    const progressFilters = parseList(req.query?.progress, DEFAULT_PROGRESS_FILTERS);
    const searchQuery = String(req.query?.searchQuery || '').trim();
    const workbook = await loadWorkbookFromDropbox(process.env.OPORTUNIDADES_DROPBOX_URL || DEFAULT_DROPBOX_URL);
    const sourceSheet = workbook.Sheets[SOURCE_SHEET_NAME];

    if (!sourceSheet) {
      return res.status(500).json({ error: `Não foi possível localizar a aba ${SOURCE_SHEET_NAME} na planilha.` });
    }

    const rows = XLSX.utils.sheet_to_json(sourceSheet, { header: 1, raw: false });
    const payload = buildFilteredTopOpportunities(rows, { topN, districtFilters, statusFilters, progressFilters, searchQuery });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({
      data: payload,
      origin: 'dropbox-opportunities-robot',
    });
  } catch (err) {
    console.error('get-oportunidades error', err);
    return res.status(500).json({ error: 'Erro ao calcular oportunidades', detail: err.message });
  }
};