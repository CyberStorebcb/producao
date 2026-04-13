const XLSX = require('xlsx');
const { pool, ensureDatabaseSchema, isDatabaseConfigured } = require('./_db');
const { loadWorkbookFromDropbox } = require('../shared/dropboxWorkbook');
const { normalizeDiarioRows } = require('../shared/diarioParser');
const { loadNormalizedSheetFromDb } = require('../shared/producaoDb');
const { getDropboxUrlCandidatesForBase, normalizeBaseKey } = require('../shared/producaoBases');

async function loadNormalizedSheetFromDropbox(sheetName, baseName) {
  const candidates = getDropboxUrlCandidatesForBase(baseName);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const workbook = await loadWorkbookFromDropbox(candidate);
      const diarioSheet = workbook.Sheets[sheetName] || workbook.Sheets['DIÁRIO'];

      if (!diarioSheet) {
        throw new Error(`Não foi possível localizar a aba ${sheetName} na planilha`);
      }

      const rows = XLSX.utils.sheet_to_json(diarioSheet, { header: 1, raw: true });
      return normalizeDiarioRows(rows, { sheetName });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Não foi possível carregar a base ${baseName} a partir do Dropbox.`);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    const sheetName = req.query && req.query.sheet ? String(req.query.sheet) : 'DIÁRIO';
    const baseName = normalizeBaseKey(req.query && req.query.base ? String(req.query.base) : 'BCB');

    if (!isDatabaseConfigured()) {
      const normalized = await loadNormalizedSheetFromDropbox(sheetName, baseName);
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json({
        data: normalized,
        base: baseName,
        origin: 'remote',
        generatedAt: new Date().toISOString(),
      });
    }

    try {
      client = await pool.connect();
      await ensureDatabaseSchema(client);
    } catch (connectErr) {
      console.warn('get-producao-from-db: Postgres indisponível, usando Dropbox', connectErr?.message || connectErr);
      const normalized = await loadNormalizedSheetFromDropbox(sheetName, baseName);
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
      return res.status(200).json({
        data: normalized,
        base: baseName,
        origin: 'remote',
        generatedAt: new Date().toISOString(),
        warning:
          'Não foi possível conectar ao Postgres; exibindo dados do Dropbox. Verifique DATABASE_URL / POSTGRES_URL e reinicie o servidor.',
        detail: connectErr?.message || String(connectErr),
      });
    }

    const { rows, normalized } = await loadNormalizedSheetFromDb(client, sheetName, baseName);

    const generatedAt = rows
      .map((row) => row.created_at)
      .filter(Boolean)
      .sort()
      .pop() || new Date().toISOString();

    // Aba sem dados é uma resposta válida (não um erro 404) — retorna 200 com dados vazios.
    // Isso acontece normalmente quando "Todas" está selecionado e uma base não tem determinada aba.
    if (rows.length === 0) {
      return res.status(200).json({
        data: { dates: [], teams: [], summary: { rowCount: 0, sheetName, baseName } },
        base: baseName,
        origin: 'database-empty',
        generatedAt,
      });
    }

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({
      data: normalized,
      base: baseName,
      origin: 'database',
      generatedAt,
    });
  } catch (err) {
    console.error('get-producao-from-db error', err);
    return res.status(500).json({
      error: 'Erro ao consultar o banco de dados',
      detail: err.message,
    });
  } finally {
    if (client) client.release();
  }
};
