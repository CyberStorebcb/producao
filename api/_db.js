require('dotenv').config();

const { Pool } = require('pg');

function shouldUseSsl(connectionString) {
  if (!connectionString) return false;

  const sslOverride = String(process.env.DATABASE_SSL || '').trim().toLowerCase();
  if (['true', '1', 'require'].includes(sslOverride)) return true;
  if (['false', '0', 'disable'].includes(sslOverride)) return false;

  try {
    const parsed = new URL(connectionString);
    const sslmode = String(parsed.searchParams.get('sslmode') || '').trim().toLowerCase();
    if (['disable', 'allow', 'prefer'].includes(sslmode)) return false;
    if (['require', 'verify-ca', 'verify-full'].includes(sslmode)) return true;

    const hostname = String(parsed.hostname || '').trim().toLowerCase();
    return !['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return true;
  }
}

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

if (shouldUseSsl(process.env.DATABASE_URL)) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (error) => {
  console.error('PostgreSQL pool error', error);
});

const BASE_TABLE_MAP = {
  BCB:   'producao_bcb',
  ITM:   'producao_itm',
  STI:   'producao_sti',
  BDC:   'producao_bdc',
  PDT:   'producao_pdt',
  PDS:   'producao_pds',
  LV169: 'producao_lv169',
  LV127: 'producao_lv127',
  PODA:  'producao_poda',
};

function getTableName(baseName) {
  return BASE_TABLE_MAP[String(baseName || 'BCB').toUpperCase()] || 'producao_bcb';
}

async function ensureBaseTable(client, tableName) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      data DATE NOT NULL,
      equipe VARCHAR(255) NOT NULL,
      lider VARCHAR(255),
      producao NUMERIC(14, 2) NOT NULL DEFAULT 0,
      meta NUMERIC(14, 2),
      ocorrencias TEXT,
      sheet_name VARCHAR(100) NOT NULL DEFAULT 'DIÁRIO',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_${tableName}_sheet_data
    ON ${tableName} (sheet_name, data);
  `);
}

async function migrateFromLegacyTable(client) {
  const legacyExists = await client.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'producao_diaria'
  `);
  if (!legacyExists.rows.length) return;

  for (const [baseKey, tableName] of Object.entries(BASE_TABLE_MAP)) {
    const alreadyMigrated = await client.query(
      `SELECT 1 FROM ${tableName} LIMIT 1`
    );
    if (alreadyMigrated.rows.length > 0) continue;

    const legacyCount = await client.query(
      `SELECT COUNT(*) FROM producao_diaria WHERE base_name = $1`,
      [baseKey]
    );
    if (Number(legacyCount.rows[0].count) === 0) continue;

    await client.query(`
      INSERT INTO ${tableName} (data, equipe, lider, producao, meta, ocorrencias, sheet_name, created_at)
      SELECT data, equipe, lider, producao, meta, ocorrencias, sheet_name, created_at
      FROM producao_diaria
      WHERE base_name = $1
      ON CONFLICT DO NOTHING
    `, [baseKey]);

    console.log(`Migrado dados de producao_diaria (${baseKey}) → ${tableName}`);
  }
}

// Memoize: the schema only needs to run once per warm process instance.
// Cold starts pay the cost once; subsequent requests in the same instance skip it.
let _schemaReady = false;

async function ensureDatabaseSchema(client) {
  if (_schemaReady) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS producao_diaria (
      id SERIAL PRIMARY KEY,
      data DATE,
      equipe VARCHAR(255),
      lider VARCHAR(255),
      producao NUMERIC(14, 2),
      meta NUMERIC(14, 2),
      ocorrencias TEXT,
      sheet_name VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    ALTER TABLE producao_diaria
    ADD COLUMN IF NOT EXISTS base_name VARCHAR(16);
  `);

  await client.query(`
    UPDATE producao_diaria
       SET base_name = 'BCB'
     WHERE base_name IS NULL OR TRIM(base_name) = '';
  `);

  await client.query(`
    ALTER TABLE producao_diaria
    ALTER COLUMN base_name SET DEFAULT 'BCB';
  `);

  await client.query(`
    ALTER TABLE producao_diaria
    ALTER COLUMN base_name SET NOT NULL;
  `);

  await client.query(`
    ALTER TABLE producao_diaria
    ALTER COLUMN producao TYPE NUMERIC(14, 2)
    USING producao::NUMERIC(14, 2),
    ALTER COLUMN meta TYPE NUMERIC(14, 2)
    USING meta::NUMERIC(14, 2);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_producao_diaria_sheet_data
    ON producao_diaria (sheet_name, data);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_producao_diaria_base_sheet_data
    ON producao_diaria (base_name, sheet_name, data);
  `);

  await ensureBaseTable(client, 'producao_bcb');
  await ensureBaseTable(client, 'producao_itm');
  await ensureBaseTable(client, 'producao_sti');
  await ensureBaseTable(client, 'producao_bdc');
  await ensureBaseTable(client, 'producao_pdt');
  await ensureBaseTable(client, 'producao_pds');
  await ensureBaseTable(client, 'producao_lv169');
  await ensureBaseTable(client, 'producao_lv127');
  await ensureBaseTable(client, 'producao_poda');
  await migrateFromLegacyTable(client);

  await client.query(`
    CREATE TABLE IF NOT EXISTS kaizen_runs (
      id SERIAL PRIMARY KEY,
      reference_date DATE NOT NULL,
      source VARCHAR(64) NOT NULL DEFAULT 'siga',
      status VARCHAR(32) NOT NULL DEFAULT 'completed',
      records_count INTEGER NOT NULL DEFAULT 0,
      raw_filename VARCHAR(255),
      raw_text TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS kaizen_turnos (
      id SERIAL PRIMARY KEY,
      run_id INTEGER REFERENCES kaizen_runs(id) ON DELETE CASCADE,
      reference_date DATE NOT NULL,
      team_id VARCHAR(255) NOT NULL,
      team_label VARCHAR(255),
      shift_start TIME,
      shift_end TIME,
      raw_line TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(reference_date, team_id)
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_kaizen_turnos_reference_date
    ON kaizen_turnos (reference_date DESC, team_id);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_kaizen_runs_reference_date
    ON kaizen_runs (reference_date DESC, created_at DESC);
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS kaizen_sync_jobs (
      id SERIAL PRIMARY KEY,
      job_id UUID NOT NULL UNIQUE,
      status VARCHAR(32) NOT NULL DEFAULT 'queued',
      reference_date DATE NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      progress_percentage INTEGER NOT NULL DEFAULT 0,
      processed_dates INTEGER NOT NULL DEFAULT 0,
      total_dates INTEGER NOT NULL DEFAULT 0,
      "current_date" VARCHAR(32),
      current_message TEXT,
      warning TEXT,
      error TEXT,
      result JSONB,
      logs JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_kaizen_sync_jobs_updated_at
    ON kaizen_sync_jobs (updated_at DESC);
  `);

  _schemaReady = true;
}

module.exports = {
  pool,
  ensureDatabaseSchema,
  getTableName,
};