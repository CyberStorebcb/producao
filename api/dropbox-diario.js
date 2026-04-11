const XLSX = require('xlsx');
const { pool, ensureDatabaseSchema, getTableName } = require('./_db');
const { normalizeDiarioRows } = require('../shared/diarioParser');
const { fetchDropboxBinary } = require('../shared/dropboxWorkbook');
const { getDropboxUrlCandidatesForBase, getProducaoBaseConfig, normalizeBaseKey } = require('../shared/producaoBases');

function isHtmlResponse(response, buffer) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const bufferPreview = buffer.slice(0, 512).toString('utf8').toLowerCase();
  return contentType.includes('text/html') || bufferPreview.includes('<!doctype html') || bufferPreview.includes('<html');
}

function buildDatabaseRows(normalized, sheetName, baseName) {
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
      base_name: baseName,
    }))
  );
}

async function syncDataWithDB(normalized, sheetName, baseName) {
  const tableName = getTableName(baseName);
  const client = await pool.connect();
  try {
    await ensureDatabaseSchema(client);

    const rows = buildDatabaseRows(normalized, sheetName, baseName);

    await client.query('BEGIN');

    if (sheetName) {
      await client.query(`DELETE FROM ${tableName} WHERE sheet_name = $1`, [sheetName]);
    }

    // Bulk INSERT em lotes de 100 para reduzir round-trips ao banco
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(
        (_, j) => `($${j * 7 + 1}, $${j * 7 + 2}, $${j * 7 + 3}, $${j * 7 + 4}, $${j * 7 + 5}, $${j * 7 + 6}, $${j * 7 + 7})`
      ).join(', ');
      const values = batch.flatMap((row) => [
        row.data, row.equipe, row.lider, row.producao, row.meta, row.ocorrencias, row.sheet_name,
      ]);
      await client.query(
        `INSERT INTO ${tableName} (data, equipe, lider, producao, meta, ocorrencias, sheet_name) VALUES ${placeholders}`,
        values
      );
    }

    await client.query('COMMIT');
    console.log(`Dados sincronizados em ${tableName} com sucesso.`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao sincronizar dados com o DB:', error);
    throw error;
  } finally {
    client.release();
  }
}


module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL não configurada.' });
    }

    const baseName = normalizeBaseKey(req.query && req.query.base ? String(req.query.base) : 'BCB');
    const baseConfig = getProducaoBaseConfig(baseName);

    const candidateUrls = getDropboxUrlCandidatesForBase(baseName);

    let response;
    let buffer;
    let htmlFallbackDetected = false;
    let lastFetchError = null;

    for (const candidateUrl of candidateUrls) {
      try {
        const fetched = await fetchDropboxBinary(candidateUrl);
        if (isHtmlResponse(fetched.response, fetched.buffer)) {
          htmlFallbackDetected = true;
          continue;
        }

        response = fetched.response;
        buffer = fetched.buffer;
        break;
      } catch (error) {
        if (String(error?.message || '').toLowerCase().includes('html')) {
          htmlFallbackDetected = true;
        }
        lastFetchError = error;
      }
    }

    if (!response || !buffer) {
      if (htmlFallbackDetected) {
        return res.status(400).json({
          error: 'O Dropbox retornou HTML em vez do arquivo Excel.',
          detail: `O link compartilhado da base ${baseConfig.label} está inválido, privado ou aponta para um item deletado. Atualize ${baseConfig.envVars.join(' / ')} na Vercel com o novo link do arquivo.`,
        });
      }

      return res.status(500).json({
        error: 'Falha ao baixar arquivo do Dropbox.',
        detail: lastFetchError ? lastFetchError.message : 'Nenhuma URL válida foi encontrada para sincronização.',
      });
    }

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const requestedSheet = req.query && req.query.sheet ? String(req.query.sheet) : 'DIÁRIO';

    // Para abas especiais (FORMULÁRIO, etc.) não fazemos fallback para DIÁRIO.
    // Tentamos variantes com/sem acento para tolerar diferenças de codificação no Excel.
    const SPECIAL_SHEETS = ['FORMULÁRIO', 'FORMULARIO'];
    const isSpecial = SPECIAL_SHEETS.includes(requestedSheet.toUpperCase());

    let diarioSheet = workbook.Sheets[requestedSheet];

    if (!diarioSheet && isSpecial) {
      // Tenta variante sem acento e outras grafias comuns
      const variants = ['FORMULÁRIO', 'FORMULARIO', 'Formulário', 'Formulario', 'FORMULARIO'];
      for (const v of variants) {
        if (workbook.Sheets[v]) { diarioSheet = workbook.Sheets[v]; break; }
      }
    }

    if (!diarioSheet && !isSpecial) {
      diarioSheet = workbook.Sheets['DIÁRIO'] || workbook.Sheets['DIARIO'];
    }

    if (!diarioSheet) {
      const availableSheets = Object.keys(workbook.Sheets).join(', ');
      return res.status(404).json({
        error: `Aba "${requestedSheet}" não encontrada na planilha da base ${baseName}.`,
        detail: `Abas disponíveis: ${availableSheets}`,
      });
    }

    const rows = XLSX.utils.sheet_to_json(diarioSheet, { header: 1, raw: true });
    const normalized = normalizeDiarioRows(rows, { sheetName: requestedSheet });

    await syncDataWithDB(normalized, requestedSheet, baseName);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      data: normalized,
      base: baseName,
      origin: 'remote-db-sync',
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('dropbox-diario error', err);
    return res.status(500).json({ error: 'Erro ao processar planilha', detail: err.message });
  }
};
