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

async function ensureDatabaseSchema(client) {
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
    ALTER COLUMN producao TYPE NUMERIC(14, 2)
    USING producao::NUMERIC(14, 2),
    ALTER COLUMN meta TYPE NUMERIC(14, 2)
    USING meta::NUMERIC(14, 2);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_producao_diaria_sheet_data
    ON producao_diaria (sheet_name, data);
  `);
}

module.exports = {
  pool,
  ensureDatabaseSchema,
};