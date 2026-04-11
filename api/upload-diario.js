const XLSX = require('xlsx');
const { pool, ensureDatabaseSchema, getTableName } = require('./_db');
const { normalizeDiarioRows } = require('../shared/diarioParser');
const { normalizeBaseKey } = require('../shared/producaoBases');

function buildDatabaseRows(normalized, sheetName) {
  const teams = Array.isArray(normalized?.teams) ? normalized.teams : [];

  return teams.flatMap((team) =>
    Object.entries(team.valuesByDate || {}).map(([dateKey, value]) => ({
      data: dateKey,
      equipe: team.code || team.display || '',
      lider: team.plate || '',
      producao: Number(value) || 0,
      meta: null,
      ocorrencias: team.colAH || team.colL || null,
      sheet_name: sheetName,
    }))
  );
}

async function syncUploadedData(normalized, sheetName, baseName) {
  const tableName = getTableName(baseName);
  const client = await pool.connect();
  try {
    await ensureDatabaseSchema(client);

    const rows = buildDatabaseRows(normalized, sheetName);

    await client.query('BEGIN');
    await client.query(`DELETE FROM ${tableName} WHERE sheet_name = $1`, [sheetName]);

    for (const row of rows) {
      await client.query(
        `INSERT INTO ${tableName} (data, equipe, lider, producao, meta, ocorrencias, sheet_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [row.data, row.equipe, row.lider, row.producao, row.meta, row.ocorrencias, row.sheet_name]
      );
    }

    await client.query('COMMIT');
    return rows.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL não configurada.' });
  }

  try {
    const body = req.body || {};
    const { data: base64Data, sheet, base } = body;

    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({
        error: 'Campo "data" obrigatório: base64 do arquivo Excel.',
      });
    }

    const baseName = normalizeBaseKey(base || 'BCB');
    const sheetName = String(sheet || 'DIÁRIO');

    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length < 4) {
      return res.status(400).json({ error: 'Arquivo inválido ou vazio.' });
    }

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const targetSheet = workbook.Sheets[sheetName] || workbook.Sheets['DIÁRIO'];
    if (!targetSheet) {
      return res.status(400).json({
        error: `Aba "${sheetName}" não encontrada no arquivo.`,
        availableSheets: workbook.SheetNames,
      });
    }

    const rows = XLSX.utils.sheet_to_json(targetSheet, { header: 1, raw: true });
    const normalized = normalizeDiarioRows(rows, { sheetName });

    const teamCount = Array.isArray(normalized?.teams) ? normalized.teams.length : 0;
    const dateCount = Array.isArray(normalized?.dates) ? normalized.dates.length : 0;

    if (teamCount === 0) {
      return res.status(422).json({
        error: 'Nenhuma equipe encontrada na planilha. Verifique o formato do arquivo.',
        sheetName,
        summary: normalized?.summary || null,
      });
    }

    const insertedRows = await syncUploadedData(normalized, sheetName, baseName);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      base: baseName,
      sheet: sheetName,
      teams: teamCount,
      dates: dateCount,
      insertedRows,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('upload-diario error', err);
    return res.status(500).json({
      error: 'Erro ao processar o arquivo enviado.',
      detail: err.message,
    });
  }
};
