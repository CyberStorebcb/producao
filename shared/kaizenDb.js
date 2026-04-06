function normalizeDateOnly(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const base = new Date(`${dateString}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function subtractMonthsAndDays(dateString, months, days) {
  const base = new Date(`${normalizeDateOnly(dateString)}T12:00:00Z`);
  base.setUTCMonth(base.getUTCMonth() - months);
  base.setUTCDate(base.getUTCDate() - days);
  return base.toISOString().slice(0, 10);
}

function getRetentionCutoffDate(anchorDate = new Date()) {
  return subtractMonthsAndDays(anchorDate, 1, 15);
}

function getDateWindow(referenceDate, period) {
  const normalizedDate = normalizeDateOnly(referenceDate);
  if (period === 'month') {
    const base = new Date(`${normalizedDate}T12:00:00Z`);
    const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1, 12, 0, 0));
    const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 12, 0, 0));
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  if (period === 'week') {
    const base = new Date(`${normalizedDate}T12:00:00Z`);
    const day = base.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return {
      startDate: addDays(normalizedDate, mondayOffset),
      endDate: addDays(normalizedDate, mondayOffset + 6),
    };
  }

  return {
    startDate: normalizedDate,
    endDate: normalizedDate,
  };
}

async function saveKaizenSnapshot(client, payload) {
  const referenceDate = payload.referenceDate;
  const source = payload.source || 'siga';
  const records = Array.isArray(payload.records) ? payload.records : [];
  const rawText = payload.rawText || null;
  const rawFilename = payload.rawFilename || null;
  const metadata = payload.metadata || {};
  const skipRetention = payload.skipRetention === true;
  const retentionCutoffDate = getRetentionCutoffDate();
  const dedupedRecords = Array.from(
    records.reduce((accumulator, record) => {
      if (!record || !record.teamId) return accumulator;
      accumulator.set(`${referenceDate}:${record.teamId}`, record);
      return accumulator;
    }, new Map()).values(),
  );

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
      [referenceDate, source, 'completed', dedupedRecords.length, rawFilename, rawText, JSON.stringify(metadata)]
    );

    const runId = runResult.rows[0].id;

    await client.query('DELETE FROM kaizen_turnos WHERE reference_date = $1', [referenceDate]);

    if (dedupedRecords.length > 0) {
      const values = [];
      const params = [];
      for (let i = 0; i < dedupedRecords.length; i++) {
        const record = dedupedRecords[i];
        const base = i * 8;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}::jsonb)`);
        params.push(
          runId,
          referenceDate,
          record.teamId,
          record.teamLabel || record.teamId,
          record.shiftStart,
          record.shiftEnd,
          record.rawLine || null,
          JSON.stringify(record.metadata || {}),
        );
      }

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
          ) VALUES ${values.join(', ')}
          ON CONFLICT (reference_date, team_id)
          DO UPDATE SET
            run_id = EXCLUDED.run_id,
            team_label = EXCLUDED.team_label,
            shift_start = EXCLUDED.shift_start,
            shift_end = EXCLUDED.shift_end,
            raw_line = EXCLUDED.raw_line,
            metadata = EXCLUDED.metadata
        `,
        params
      );
    }

    if (!skipRetention) {
      await client.query(
        'DELETE FROM kaizen_runs WHERE reference_date < $1',
        [retentionCutoffDate]
      );
    }

    await client.query('COMMIT');

    return {
      runId,
      recordsCount: dedupedRecords.length,
      createdAt: runResult.rows[0].created_at,
      retentionCutoffDate,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function loadKaizenHistory(client, options = {}) {
  const referenceDate = options.referenceDate || null;
  const period = ['day', 'week', 'month'].includes(options.period) ? options.period : 'day';
  const limit = Number(options.limit || 180);
  const params = [];
  const filters = [];
  const { startDate, endDate } = getDateWindow(referenceDate, period);

  if (referenceDate) {
    params.push(startDate);
    filters.push(`kt.reference_date >= $${params.length}`);
    params.push(endDate);
    filters.push(`kt.reference_date <= $${params.length}`);
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
    runsParams.push(startDate);
    runsFilters.push(`reference_date >= $${runsParams.length}`);
    runsParams.push(endDate);
    runsFilters.push(`reference_date <= $${runsParams.length}`);
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
    range: {
      period,
      startDate,
      endDate,
    },
  };
}

async function cleanupRetention(client) {
  const retentionCutoffDate = getRetentionCutoffDate();
  await client.query('DELETE FROM kaizen_runs WHERE reference_date < $1', [retentionCutoffDate]);
  return retentionCutoffDate;
}

module.exports = {
  saveKaizenSnapshot,
  loadKaizenHistory,
  cleanupRetention,
};
