async function saveKaizenSnapshot(client, payload) {
  const referenceDate = payload.referenceDate;
  const source = payload.source || 'siga';
  const records = Array.isArray(payload.records) ? payload.records : [];
  const rawText = payload.rawText || null;
  const rawFilename = payload.rawFilename || null;
  const metadata = payload.metadata || {};

  await client.query('BEGIN');
  try {
    const runResult = await client.query(
      `
        INSERT INTO kaizen_runs (
          reference_date,
          source,
          status,
          records_count,
          raw_filename,
          raw_text,
          metadata,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
        RETURNING id, created_at
      `,
      [referenceDate, source, 'completed', records.length, rawFilename, rawText, JSON.stringify(metadata)]
    );

    const runId = runResult.rows[0].id;

    await client.query('DELETE FROM kaizen_turnos WHERE reference_date = $1', [referenceDate]);

    for (const record of records) {
      await client.query(
        `
          INSERT INTO kaizen_turnos (
            run_id,
            reference_date,
            team_id,
            team_label,
            shift_start,
            shift_end,
            raw_line,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          ON CONFLICT (reference_date, team_id)
          DO UPDATE SET
            run_id = EXCLUDED.run_id,
            team_label = EXCLUDED.team_label,
            shift_start = EXCLUDED.shift_start,
            shift_end = EXCLUDED.shift_end,
            raw_line = EXCLUDED.raw_line,
            metadata = EXCLUDED.metadata
        `,
        [
          runId,
          referenceDate,
          record.teamId,
          record.teamLabel || record.teamId,
          record.shiftStart,
          record.shiftEnd,
          record.rawLine || null,
          JSON.stringify(record.metadata || {}),
        ]
      );
    }

    await client.query('COMMIT');

    return {
      runId,
      recordsCount: records.length,
      createdAt: runResult.rows[0].created_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function loadKaizenHistory(client, options = {}) {
  const referenceDate = options.referenceDate || null;
  const limit = Number(options.limit || 180);
  const params = [];
  const filters = [];

  if (referenceDate) {
    params.push(referenceDate);
    filters.push(`kt.reference_date = $${params.length}`);
  }

  params.push(limit);
  const entriesResult = await client.query(
    `
      SELECT
        kt.reference_date,
        kt.team_id,
        kt.team_label,
        TO_CHAR(kt.shift_start, 'HH24:MI') AS shift_start,
        TO_CHAR(kt.shift_end, 'HH24:MI') AS shift_end,
        kt.raw_line,
        kr.source,
        kr.created_at AS synced_at
      FROM kaizen_turnos kt
      JOIN kaizen_runs kr ON kr.id = kt.run_id
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY kt.reference_date DESC, kt.team_id ASC
      LIMIT $${params.length}
    `,
    params
  );

  const runsParams = [];
  const runsFilters = [];
  if (referenceDate) {
    runsParams.push(referenceDate);
    runsFilters.push(`reference_date = $${runsParams.length}`);
  }
  runsParams.push(Math.min(limit, 30));

  const runsResult = await client.query(
    `
      SELECT
        id,
        reference_date,
        source,
        status,
        records_count,
        raw_filename,
        created_at,
        metadata
      FROM kaizen_runs
      ${runsFilters.length ? `WHERE ${runsFilters.join(' AND ')}` : ''}
      ORDER BY reference_date DESC, created_at DESC
      LIMIT $${runsParams.length}
    `,
    runsParams
  );

  return {
    entries: entriesResult.rows,
    runs: runsResult.rows,
  };
}

module.exports = {
  saveKaizenSnapshot,
  loadKaizenHistory,
};
