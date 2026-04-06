const DEFAULT_PRODUCAO_BASE = 'BCB';

const PRODUCAO_BASES = [
  {
    key: 'BCB',
    label: 'BCB',
    envVars: ['DIARIO_DROPBOX_URL_BCB', 'DIARIO_DROPBOX_URL'],
    defaultUrl: 'https://www.dropbox.com/scl/fi/mf5kmedg7r35bcjoatrsw/PRODU-O-FEVEREIRO.xlsm?rlkey=kxngf1hurtzb9h8atqvmoaxlx&st=s7rqeswx&dl=1',
  },
  {
    key: 'ITM',
    label: 'ITM',
    envVars: ['DIARIO_DROPBOX_URL_ITM'],
    defaultUrl: 'https://www.dropbox.com/scl/fi/4l4awi6j323qk3qnv9yjj/03.-PRODU-O-ITM.xlsm?rlkey=hm9xxklo5ye9yvgs71fqowzkl&st=uxqnvdb6&dl=1',
  },
  {
    key: 'STI',
    label: 'STI',
    envVars: ['DIARIO_DROPBOX_URL_STI'],
    defaultUrl: 'https://www.dropbox.com/scl/fi/dei4r9r3s6j4ejk28gyho/03.-PRODU-O-STI.xlsm?rlkey=5ciiqqvo8xzx2yayh8vb78e21&st=tyn93tun&dl=1',
  },
];

function normalizeBaseKey(value) {
  const normalized = String(value || DEFAULT_PRODUCAO_BASE).trim().toUpperCase();
  return PRODUCAO_BASES.some((base) => base.key === normalized) ? normalized : DEFAULT_PRODUCAO_BASE;
}

function getProducaoBaseConfig(baseKey) {
  const normalized = normalizeBaseKey(baseKey);
  return PRODUCAO_BASES.find((base) => base.key === normalized) || PRODUCAO_BASES[0];
}

function getDropboxUrlCandidatesForBase(baseKey) {
  const config = getProducaoBaseConfig(baseKey);
  const candidates = [];

  config.envVars.forEach((envVar) => {
    const envValue = process.env[envVar];
    if (envValue) candidates.push(envValue);
  });

  if (config.defaultUrl) candidates.push(config.defaultUrl);

  return Array.from(new Set(candidates.filter(Boolean)));
}

module.exports = {
  DEFAULT_PRODUCAO_BASE,
  PRODUCAO_BASES,
  normalizeBaseKey,
  getProducaoBaseConfig,
  getDropboxUrlCandidatesForBase,
};