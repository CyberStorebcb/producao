const XLSX = require('xlsx');
const { Pool } = require('pg');
const { normalizeDiarioRows } = require('../shared/diarioParser');

const DEFAULT_DROPBOX_URL = 'https://www.dropbox.com/scl/fi/1kz6krn7c8l28fnrhzwy5/03.-PRODU-O-BCB.xlsm?cloud_editor=excel&dl=1&rlkey=tqbxj8o4tpke64z823wk2ptj4';

// Configuração do Pool de Conexões com o PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necessário para conexões com Neon/Heroku
  },
});

async function syncDataWithDB(data) {
  const client = await pool.connect();
  try {
    // Garante que a tabela exista
    await client.query(`
      CREATE TABLE IF NOT EXISTS producao_diaria (
        id SERIAL PRIMARY KEY,
        data DATE,
        equipe VARCHAR(255),
        lider VARCHAR(255),
        producao INTEGER,
        meta INTEGER,
        ocorrencias TEXT,
        sheet_name VARCHAR(100)
      );
    `);

    // Inicia uma transação
    await client.query('BEGIN');

    // Limpa os dados da aba específica para evitar duplicatas
    const sheetName = data.length > 0 ? data[0].sheetName : null;
    if (sheetName) {
        await client.query('DELETE FROM producao_diaria WHERE sheet_name = $1', [sheetName]);
    }

    // Insere os novos dados
    for (const row of data) {
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
        row.sheetName
      ];
      await client.query(query, values);
    }

    // Confirma a transação
    await client.query('COMMIT');
    console.log('Dados sincronizados com o banco de dados com sucesso.');

  } catch (error) { {
    // Em caso de erro, desfaz a transação
    await client.query('ROLLBACK');
    console.error('Erro ao sincronizar dados com o DB:', error);
    throw error; // Propaga o erro para ser tratado no handler principal
  } finally {
    client.release();
  }
}


module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const targetUrl = process.env.DIARIO_DROPBOX_URL || DEFAULT_DROPBOX_URL;
    const fetchUrl = /[?&]dl=/.test(targetUrl) ? targetUrl : `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}dl=1`;

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Falha ao baixar arquivo do Dropbox' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const requestedSheet = req.query && req.query.sheet ? String(req.query.sheet) : 'DIÁRIO';
    const diarioSheet = workbook.Sheets[requestedSheet] || workbook.Sheets['DIÁRIO'];

    if (!diarioSheet) {
      return res.status(500).json({ error: `Não foi possível localizar a aba ${requestedSheet} na planilha` });
    }

    const rows = XLSX.utils.sheet_to_json(diarioSheet, { header: 1, raw: true });
    const normalized = normalizeDiarioRows(rows, { sheetName: requestedSheet });

    // Sincroniza os dados com o banco de dados de forma assíncrona (não bloqueia a resposta)
    syncDataWithDB(normalized).catch(err => {
        console.error("Falha na sincronização em background:", err);
    });

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
