const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Custom CORS + Private Network Access handling to satisfy upcoming browser
// restrictions (preflight will include "Access-Control-Request-Private-Network").
app.use((req, res, next) => {
  const origin = req.get('Origin') || '*';
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // If the browser is asking about private-network access during preflight,
  // explicitly allow it so secure contexts can reach this local server.
  if (req.headers['access-control-request-private-network']) {
    res.header('Access-Control-Allow-Private-Network', 'true');
  }

  // Quick response for preflight
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '5mb' }));

const DATA_FILE = path.join(__dirname, '..', 'src', 'data', 'equipes.js');

app.post('/save-equipes', (req, res) => {
  const { equipes } = req.body;
  if (!Array.isArray(equipes)) return res.status(400).json({ error: 'Payload must be an array' });

  const fileContent = `// Fonte de dados local para equipes\nexport default ${JSON.stringify(equipes, null, 2)};\n`;

  fs.writeFile(DATA_FILE, fileContent, 'utf8', (err) => {
    if (err) {
      console.error('Erro ao gravar arquivo:', err);
      return res.status(500).json({ error: 'Failed to write data file' });
    }
    console.log('Dados salvos em', DATA_FILE);
    return res.json({ ok: true });
  });
});

const port = process.env.PORT || 5176;
app.listen(port, () => console.log(`saveEquipesServer listening on http://localhost:${port}`));
