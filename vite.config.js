import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

function devApiProxyPlugin() {
  return {
    name: 'dev-api-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/proxy')) {
          const parsedUrl = new URL(req.url, 'http://localhost:3000');
          const targetUrl = parsedUrl.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing target url parameter' }));
            return;
          }

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.end();
            return;
          }

          try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = Buffer.concat(chunks);

            const fetchHeaders = {};
            for (const [key, value] of Object.entries(req.headers)) {
              if (!['host', 'origin', 'referer', 'content-length'].includes(key.toLowerCase())) {
                fetchHeaders[key] = value;
              }
            }

            const proxyRes = await fetch(targetUrl, {
              method: req.method,
              headers: fetchHeaders,
              body: ['GET', 'HEAD'].includes(req.method) ? undefined : body
            });

            res.statusCode = proxyRes.status;
            proxyRes.headers.forEach((v, k) => {
              if (k.toLowerCase() !== 'content-encoding') {
                res.setHeader(k, v);
              }
            });
            res.setHeader('Access-Control-Allow-Origin', '*');
            const data = await proxyRes.arrayBuffer();
            res.end(Buffer.from(data));
          } catch (e) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Local Proxy Error: ${e.message}` }));
          }
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), devApiProxyPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    open: true
  }
});

