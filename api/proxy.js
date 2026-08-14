/**
 * Vercel Serverless Function - API Proxy (/api/proxy)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target "url" query parameter' });
  }

  try {
    const fetchHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!['host', 'origin', 'referer', 'content-length'].includes(key.toLowerCase())) {
        fetchHeaders[key] = value;
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: !['GET', 'HEAD'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (err) {
    res.status(502).json({ error: `Vercel Proxy Error: ${err.message}` });
  }
}
