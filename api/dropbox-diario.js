const XLSX = require('xlsx');

const DEFAULT_DROPBOX_URL = 'https://www.dropbox.com/scl/fi/1kz6krn7c8l28fnrhzwy5/03.-PRODU-O-BCB.xlsm?cloud_editor=excel&dl=1&rlkey=tqbxj8o4tpke64z823wk2ptj4';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const targetUrl = process.env.DIARIO_DROPBOX_URL || DEFAULT_DROPBOX_URL;
    const fetchUrl = /[?&]dl=/.test(targetUrl) ? targetUrl : `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}dl=1`;

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Falha ao baixar arquivo do Dropbox' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const diarioSheet = workbook.Sheets['DIÁRIO'];

    if (!diarioSheet) {
      return res.status(500).json({ error: 'Não foi possível localizar a aba DIÁRIO na planilha' });
    }

    const json = XLSX.utils.sheet_to_json(diarioSheet, { header: 1 });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ data: json });
  } catch (err) {
    console.error('dropbox-diario error', err);
    return res.status(500).json({ error: 'Erro ao processar planilha', detail: err.message });
  }
};
