require('dotenv').config();

const WEATHER_API_KEY = process.env.WEATHERAPI_KEY;
const WEATHER_API_BASE = 'https://api.weatherapi.com/v1/current.json';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = String(req.query?.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Missing q query parameter' });
  }

  if (!WEATHER_API_KEY) {
    console.error('Missing WEATHERAPI_KEY environment variable');
    return res.status(500).json({ error: 'Weather API key is not configured' });
  }

  const url = `${WEATHER_API_BASE}?key=${encodeURIComponent(WEATHER_API_KEY)}&q=${encodeURIComponent(query)}&lang=pt`;

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.error?.message || 'Erro ao carregar dados de clima';
      return res.status(response.status).json({ error: message, detail: payload });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ data: payload, origin: 'weatherapi-proxy' });
  } catch (err) {
    console.error('api/weather error', err);
    return res.status(500).json({ error: 'Falha ao consultar o serviço de clima', detail: err.message });
  }
};
