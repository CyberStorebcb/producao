const XLSX = require('xlsx');
const { loadWorkbookFromDropbox } = require('../shared/dropboxWorkbook');
const { buildObrasStatusSummary } = require('../shared/oportunidadesRobot');

const DEFAULT_DROPBOX_URL = 'https://www.dropbox.com/scl/fi/wu9hl40m1xrncgdx9gjpv/ACOM-OBRAS.xlsx?rlkey=sfuyra3tijrl46qqw6app4u0k&st=u9ngkfas&dl=0';
const SOURCE_SHEET_NAME = 'OBRAS';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const workbook = await loadWorkbookFromDropbox(process.env.OBRAS_STATUS_DROPBOX_URL || DEFAULT_DROPBOX_URL);
    const sourceSheet = workbook.Sheets[SOURCE_SHEET_NAME];

    if (!sourceSheet) {
      return res.status(500).json({ error: `Não foi possível localizar a aba ${SOURCE_SHEET_NAME} na planilha.` });
    }

    const rows = XLSX.utils.sheet_to_json(sourceSheet, { header: 1, raw: false });
    const payload = buildObrasStatusSummary(rows);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({
      data: payload,
      origin: 'dropbox-obras-status',
    });
  } catch (err) {
    console.error('get-obras-status error', err);
    return res.status(500).json({ error: 'Erro ao calcular o resumo de obras', detail: err.message });
  }
};
