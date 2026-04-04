const XLSX = require('xlsx');
const { pool, ensureDatabaseSchema } = require('./_db');
const { normalizeDiarioRows } = require('../shared/diarioParser');

const DEFAULT_DROPBOX_URL = 'https://www.dropbox.com/scl/fi/mf5kmedg7r35bcjoatrsw/PRODU-O-FEVEREIRO.xlsm?rlkey=kxngf1hurtzb9h8atqvmoaxlx&st=s7rqeswx&dl=1';

function normalizeDropboxUrl(url) {
  if (!url) return '';
  return /[?&]dl=/.test(url) ? url.replace(/([?&])dl=0/, '$1dl=1') : `${url}${url.includes('?') ? '&' : '?'}dl=1`;
}

function isHtmlResponse(response, buffer) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const bufferPreview = buffer.slice(0, 512).toString('utf8').toLowerCase();
  return contentType.includes('text/html') || bufferPreview.includes('<!doctype html') || bufferPreview.includes('<html');
}

async function fetchDropboxBinary(url) {
  const response = await fetch(normalizeDropboxUrl(url));
  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo do Dropbox (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { response, buffer };
}

function buildDatabaseRows(normalized, sheetName) {
  const teams = Array.isArray(normalized?.teams) ? normalized.teams : [];

  return teams.flatMap((team) =>
    Object.entries(team.valuesByDate || {}).map(([dateKey, value]) => ({
      data: dateKey,
      equipe: team.display || team.code || '',
      lider: team.plate || '',
      producao: Number(value) || 0,
      meta: null,
      ocorrencias: null,
      sheet_name: sheetName,
    }))
  );
}

async function syncDataWithDB(normalized, sheetName) {
  const client = await pool.connect();
  try {
    await ensureDatabaseSchema(client);

    const rows = buildDatabaseRows(normalized, sheetName);

    await client.query('BEGIN');

    if (sheetName) {
      await client.query('DELETE FROM producao_diaria WHERE sheet_name = $1', [sheetName]);
    }

    for (const row of rows) {
      const query = `
        INSERT INTO producao_diaria (data, equipe, lider, producao, meta, ocorrencias, sheet_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `;
      const values = [
        row.data,
        row.equipe,
        row.lider,
        row.producao,
        row.meta,
        row.ocorrencias,
        row.sheet_name
      ];
      await client.query(query, values);
    }

    await client.query('COMMIT');
    console.log('Dados sincronizados com o banco de dados com sucesso.');

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

    const candidateUrls = [];
    if (process.env.DIARIO_DROPBOX_URL) candidateUrls.push(process.env.DIARIO_DROPBOX_URL);
    if (DEFAULT_DROPBOX_URL !== process.env.DIARIO_DROPBOX_URL) candidateUrls.push(DEFAULT_DROPBOX_URL);

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
        lastFetchError = error;
      }
    }

    if (!response || !buffer) {
      if (htmlFallbackDetected) {
        return res.status(400).json({
          error: 'O Dropbox retornou HTML em vez do arquivo Excel.',
          detail: 'O link compartilhado configurado está inválido, privado ou aponta para um item deletado. Atualize DIARIO_DROPBOX_URL na Vercel com o novo link do arquivo.',
        });
      }

      return res.status(500).json({
        error: 'Falha ao baixar arquivo do Dropbox.',
        detail: lastFetchError ? lastFetchError.message : 'Nenhuma URL válida foi encontrada para sincronização.',
      });
    }

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const requestedSheet = req.query && req.query.sheet ? String(req.query.sheet) : 'DIÁRIO';
    const diarioSheet = workbook.Sheets[requestedSheet] || workbook.Sheets['DIÁRIO'];

    if (!diarioSheet) {
      return res.status(500).json({ error: `Não foi possível localizar a aba ${requestedSheet} na planilha` });
    }

    const rows = XLSX.utils.sheet_to_json(diarioSheet, { header: 1, raw: true });
    const normalized = normalizeDiarioRows(rows, { sheetName: requestedSheet });

    await syncDataWithDB(normalized, requestedSheet);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      data: normalized,
      origin: 'remote-db-sync',
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('dropbox-diario error', err);
    return res.status(500).json({ error: 'Erro ao processar planilha', detail: err.message });
  }
};
