const { pool, ensureDatabaseSchema } = require('./_db');
const { loadNormalizedSheetFromDb } = require('../shared/producaoDb');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = await pool.connect();
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL não configurada.' });
    }

    await ensureDatabaseSchema(client);

    const sheetName = req.query && req.query.sheet ? String(req.query.sheet) : 'DIÁRIO';

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
    console.error('get-producao-from-db error', err);
    return res.status(500).json({ error: 'Erro ao consultar o banco de dados', detail: err.message });
  } finally {
    client.release();
  }
};
