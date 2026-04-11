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
  {
    key: 'BDC',
    label: 'BDC',
    envVars: ['DIARIO_DROPBOX_URL_BDC'],
    defaultUrl: 'https://www.dropbox.com/scl/fi/1431lnjzmaox6hms13txp/03.-PRODU-O-BDC.xlsm?rlkey=b6j4q3612x1gf2ru4z3sbrguu&st=7gs7vc03&dl=1',
    localPath: 'C:\\Users\\Italo\\Dropbox\\PRODUÇÃO BACABAL\\03. PRODUÇÃO BDC.xlsm',
  },
  {
    key: 'PDT',
    label: 'PDT',
    envVars: ['DIARIO_DROPBOX_URL_PDT'],
    defaultUrl: 'https://www.dropbox.com/scl/fi/c004dibhkdklmxfhd3yia/03.-PRODU-O-PDT.xlsm?rlkey=fb38n7814coiu3sjdmwcg4hs1&st=qfquh6ym&dl=1',
    localPath: 'C:\\Users\\Italo\\Dropbox\\PRODUÇÃO BACABAL\\03. PRODUÇÃO PDT.xlsm',
  },
  {
    key: 'PDS',
    label: 'PDS',
    envVars: ['DIARIO_DROPBOX_URL_PDS'],
    defaultUrl: 'https://www.dropbox.com/scl/fi/5z2n4m2eizydyjvpdxtn6/03.-PRODU-O-PDS.xlsm?rlkey=gb1riusj1z1lkcwyxk2flasvw&st=fonjhr8p&dl=1',
    localPath: 'C:\\Users\\Italo\\Dropbox\\PRODUÇÃO BACABAL\\03. PRODUÇÃO PDS.xlsm',
  },
  {
    key: 'LV169',
    label: 'LV 169',
    envVars: ['DIARIO_DROPBOX_URL_LV169'],
    defaultUrl: 'https://www.dropbox.com/scl/fi/91n5m9ygjrjqa82ge9drg/03.-PRODU-O-LV-169.xlsm?rlkey=ienklvupfslm2kz7k0hkn1a5t&st=n8v3la16&dl=1',
    localPath: 'C:\\Users\\Italo\\Dropbox\\PRODUÇÃO BACABAL\\03. PRODUÇÃO LV - 169.xlsm',
  },
  {
    key: 'LV127',
    label: 'LV 127',
    envVars: ['DIARIO_DROPBOX_URL_LV127'],
    // URL do arquivo de produção LV-127 (aba DIÁRIO). Atualize DIARIO_DROPBOX_URL_LV127 na Vercel com o link correto.
    defaultUrl: 'https://www.dropbox.com/scl/fi/11u8vrnhhmyiwgy0cx4vd/03.-PRODU-O-PODA-127.xlsm?rlkey=f7pivcjkkevtdk17ah33dhjt2&st=vj2lhbm7&dl=1',
    localPath: 'C:\\Users\\Italo\\Dropbox\\PRODUÇÃO BACABAL\\03. PRODUÇÃO LV - 127.xlsm',
  },
  {
    key: 'PODA',
    label: 'PODA',
    envVars: ['DIARIO_DROPBOX_URL_PODA'],
    // Arquivo exclusivo da equipe PODA — contém aba FORMULÁRIO com ordens de serviço
    defaultUrl: 'https://www.dropbox.com/scl/fi/11u8vrnhhmyiwgy0cx4vd/03.-PRODU-O-PODA-127.xlsm?rlkey=f7pivcjkkevtdk17ah33dhjt2&st=vj2lhbm7&dl=1',
    localPath: 'C:\\Users\\Italo\\Dropbox\\PRODUÇÃO BACABAL\\03. PRODUÇÃO PODA - 127.xlsm',
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

  // Em dev, arquivo local sincronizado pelo Dropbox tem prioridade —
  // garante que o arquivo correto seja lido mesmo que a defaultUrl aponte para outro arquivo.
  if (config.localPath) {
    try {
      const fs = require('fs');
      if (fs.existsSync(config.localPath)) {
        candidates.push(`file://${config.localPath}`);
      }
    } catch (_) { /* ambiente sem fs */ }
  }

  (config.envVars || []).forEach((envVar) => {
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
