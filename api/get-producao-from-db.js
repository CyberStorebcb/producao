const { pool, ensureDatabaseSchema } = require('./_db');

function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateKey;

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

function buildNormalizedFromRows(rows, sheetName) {
  const dateMap = new Map();
  const teamMap = new Map();

  rows.forEach((row) => {
    const dateKey = row.data instanceof Date
      ? row.data.toISOString().slice(0, 10)
      : String(row.data).slice(0, 10);

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { key: dateKey, label: formatDateLabel(dateKey) });
    }

    const teamCode = String(row.equipe || '').trim() || 'SEM_EQUIPE';
    const existingTeam = teamMap.get(teamCode) || {
      code: teamCode,
      display: teamCode,
      type: sheetName,
      plate: row.lider || '',
      valuesByDate: {},
      colD: row.lider || '',
      colL: row.meta,
      colAH: row.ocorrencias,
    };

    existingTeam.valuesByDate[dateKey] = Number(row.producao) || 0;
    teamMap.set(teamCode, existingTeam);
  });

  const dates = Array.from(dateMap.values()).sort((left, right) => left.key.localeCompare(right.key));
  const teams = Array.from(teamMap.values()).sort((left, right) => left.display.localeCompare(right.display));
  const totalImportedValue = rows.reduce((total, row) => total + (Number(row.producao) || 0), 0);

  return {
    dates,
    teams,
    summary: {
      layout: 'service',
      sheetName,
      rowCount: rows.length,
      processedRows: rows.length,
      skippedRows: 0,
      missingTeamRows: 0,
      missingDateRows: 0,
      zeroValueRows: rows.filter((row) => !(Number(row.producao) || 0)).length,
      totalImportedValue,
      teamCount: teams.length,
      dateCount: dates.length,
      nonZeroTeams: teams.filter((team) => Object.values(team.valuesByDate).some((value) => Number(value) > 0)).length,
      firstDateKey: dates.length ? dates[0].key : '',
      lastDateKey: dates.length ? dates[dates.length - 1].key : '',
    },
  };
}

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

    const { rows } = await client.query(
      'SELECT * FROM producao_diaria WHERE sheet_name = $1 ORDER BY data ASC',
      [sheetName]
    );

    // Se não houver dados no banco, talvez seja a primeira execução.
    // O ideal seria o frontend tentar chamar a rota de sincronização.
    if (rows.length === 0) {
        return res.status(404).json({ 
            error: 'Nenhum dado encontrado no banco para esta aba.',
            data: [],
            origin: 'database-empty',
        });
    }

    const normalized = buildNormalizedFromRows(rows, sheetName);

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
