const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const DATA_FILE = path.join(__dirname, '..', 'src', 'data', 'equipes.js');

app.post('/save-equipes', (req, res) => {
  const equipes = req.body;
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
