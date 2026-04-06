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

function buildNormalizedFromRows(rows, sheetName, baseName) {
  const dateMap = new Map();
  const teamMap = new Map();
  const metricKind = baseName !== 'BCB' && sheetName === 'BASE' ? 'count' : 'currency';
  const metricLabel = metricKind === 'count' ? 'programacoes' : 'valor programado';

  rows.forEach((row) => {
    const dateKey = row.data instanceof Date
      ? row.data.toISOString().slice(0, 10)
      : String(row.data).slice(0, 10);

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { key: dateKey, label: formatDateLabel(dateKey) });
    }

    const rawTeamCode = String(row.equipe || '').trim() || 'SEM_EQUIPE';
    const [teamCode, derivedType] = rawTeamCode.split('__');
    const normalizedTeamCode = teamCode || rawTeamCode;
    const existingTeam = teamMap.get(rawTeamCode) || {
      code: rawTeamCode,
      display: normalizedTeamCode,
      type: derivedType || sheetName,
      plate: row.lider || '',
      valuesByDate: {},
      colD: row.lider || '',
      colL: row.meta,
      colAH: row.ocorrencias,
    };

    existingTeam.valuesByDate[dateKey] = Number(row.producao) || 0;
    teamMap.set(rawTeamCode, existingTeam);
  });

  const dates = Array.from(dateMap.values()).sort((left, right) => left.key.localeCompare(right.key));
  const teams = Array.from(teamMap.values()).sort((left, right) => left.display.localeCompare(right.display));
  const totalImportedValue = rows.reduce((total, row) => total + (Number(row.producao) || 0), 0);

  return {
    dates,
    teams,
    summary: {
      layout: 'service',
      metricKind,
      metricLabel,
      sheetName,
      baseName,
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

async function loadRowsFromDb(client, sheetName, baseName) {
  const { rows } = await client.query(
    'SELECT * FROM producao_diaria WHERE sheet_name = $1 AND base_name = $2 ORDER BY data ASC',
    [sheetName, baseName]
  );
  return rows;
}

async function loadNormalizedSheetFromDb(client, sheetName, baseName) {
  const rows = await loadRowsFromDb(client, sheetName, baseName);
  return {
    rows,
    normalized: buildNormalizedFromRows(rows, sheetName, baseName),
  };
}

module.exports = {
  formatDateLabel,
  buildNormalizedFromRows,
  loadRowsFromDb,
  loadNormalizedSheetFromDb,
};