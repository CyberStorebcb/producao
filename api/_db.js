const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

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