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
      producao INTEGER,
      meta INTEGER,
      ocorrencias TEXT,
      sheet_name VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
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