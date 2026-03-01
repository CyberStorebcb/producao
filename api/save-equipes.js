const GITHUB_API = 'https://api.github.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const filePath = process.env.GITHUB_FILE_PATH || 'src/data/equipes.js';

    if (!token || !owner || !repo) {
      return res.status(500).json({ error: 'Server not configured: set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO env vars.' });
    }

    const equipes = req.body && req.body.equipes ? req.body.equipes : null;
    if (!equipes) return res.status(400).json({ error: 'Missing equipes payload' });

    // build file content similar to existing file
    const contentString = `// Fonte de dados local para equipes\nexport default ${JSON.stringify(equipes, null, 2)};\n`;
    const contentBase64 = Buffer.from(contentString, 'utf8').toString('base64');

    // fetch existing file to get sha (if exists)
    const getUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`;
    const getResp = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
    let sha = null;
    if (getResp.status === 200) {
      const j = await getResp.json();
      sha = j.sha;
    }

    const putUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;
    const body = {
      message: `Update equipes via web UI`,
      content: contentBase64,
      branch
    };
    if (sha) body.sha = sha;

    const putResp = await fetch(putUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const putJson = await putResp.json();
    if (!putResp.ok) {
      return res.status(500).json({ error: 'GitHub API error', detail: putJson });
    }

    return res.status(200).json({ ok: true, result: putJson });
  } catch (e) {
    console.error('save-equipes error', e);
    return res.status(500).json({ error: e.message });
  }
};
