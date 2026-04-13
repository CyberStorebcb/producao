/**
 * Carrega .env / .env.local da raiz do projeto (independente do cwd).
 * Para URLs do Postgres e credenciais Kaizen/clima: aplica valor do arquivo
 * quando a variável de ambiente atual está ausente ou só com espaços em branco
 * (evita que POSTGRES_URL="" no shell impeça o .env.local de funcionar).
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

/** Chaves que podem ser repovoadas a partir do arquivo se estiverem “vazias” no processo. */
const FILL_IF_EMPTY_KEYS = new Set([
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'KAIZEN_SIGA_USERNAME',
  'KAIZEN_SIGA_PASSWORD',
  'WEATHERAPI_KEY',
]);

function trimVal(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function parseAndApplyFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (FILL_IF_EMPTY_KEYS.has(key)) {
      if (!trimVal(process.env[key]) && trimVal(value)) {
        process.env[key] = trimVal(value);
      }
      continue;
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadProjectEnv() {
  parseAndApplyFile(path.join(PROJECT_ROOT, '.env'));
  parseAndApplyFile(path.join(PROJECT_ROOT, '.env.local'));
}

module.exports = { loadProjectEnv, PROJECT_ROOT, FILL_IF_EMPTY_KEYS };
