import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

function notFoundProxy(res) {
  res.statusCode = 502;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "Proxy removed: local AI engine only" }));
}

/** Keep /api/proxy answering instead of hanging. */
function apiProxyPlugin() {
  return {
    name: "api-proxy-plugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith("/api/proxy")) return notFoundProxy(res);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith("/api/proxy")) return notFoundProxy(res);
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), apiProxyPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { port: 3000 },
  preview: { port: 3000 },
  build: {
    target: "es2019",
    // 保留源码地图，线上排错时可定位到原始文件
    sourcemap: true,
  },
});
