const XLSX = require('xlsx');
const { pool, ensureDatabaseSchema } = require('./_db');
const { loadWorkbookFromDropbox } = require('../shared/dropboxWorkbook');
const { normalizeDiarioRows } = require('../shared/diarioParser');
const { loadNormalizedSheetFromDb } = require('../shared/producaoDb');

const DEFAULT_DROPBOX_URL = 'https://www.dropbox.com/scl/fi/mf5kmedg7r35bcjoatrsw/PRODU-O-FEVEREIRO.xlsm?rlkey=kxngf1hurtzb9h8atqvmoaxlx&st=s7rqeswx&dl=1';

async function loadNormalizedSheetFromDropbox(sheetName) {
  const workbook = await loadWorkbookFromDropbox(process.env.DIARIO_DROPBOX_URL || DEFAULT_DROPBOX_URL);
  const diarioSheet = workbook.Sheets[sheetName] || workbook.Sheets['DIÁRIO'];

  if (!diarioSheet) {
    throw new Error(`Não foi possível localizar a aba ${sheetName} na planilha`);
  }

  const rows = XLSX.utils.sheet_to_json(diarioSheet, { header: 1, raw: true });
  return normalizeDiarioRows(rows, { sheetName });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    const sheetName = req.query && req.query.sheet ? String(req.query.sheet) : 'DIÁRIO';

    if (!process.env.DATABASE_URL) {
      const normalized = await loadNormalizedSheetFromDropbox(sheetName);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        data: normalized,
        origin: 'remote',
        generatedAt: new Date().toISOString(),
      });
    }

    client = await pool.connect();
    await ensureDatabaseSchema(client);

    const { rows, normalized } = await loadNormalizedSheetFromDb(client, sheetName);

    // Se não houver dados no banco, talvez seja a primeira execução.
    // O ideal seria o frontend tentar chamar a rota de sincronização.
    if (rows.length === 0) {
        return res.status(404).json({ 
            error: 'Nenhum dado encontrado no banco para esta aba.',
            data: [],
            origin: 'database-empty',
        });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // Cache de 5 minutos
    return res.status(200).json({
      data: normalized,
      origin: 'database',
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const sheetName = req.query && req.query.sheet ? String(req.query.sheet) : 'DIÁRIO';

    try {
      const normalized = await loadNormalizedSheetFromDropbox(sheetName);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        data: normalized,
        origin: 'remote',
        generatedAt: new Date().toISOString(),
        warning: err.message,
      });
    } catch (dropboxError) {
      console.error('get-producao-from-db error', err);
      console.error('get-producao-from-db dropbox fallback error', dropboxError);
      return res.status(500).json({
        error: 'Erro ao consultar o banco de dados',
        detail: dropboxError.message || err.message,
      });
    }
  } finally {
    if (client) client.release();
  }
};
