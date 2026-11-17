import { build } from 'vite'
import vue from '@vitejs/plugin-vue'
import sass from 'sass'
import { fileURLToPath, URL } from 'node:url'

// Programmatic build with plugins passed inline: avoids loading
// vite.config.js through esbuild's child process (blocked in this sandbox).
await build({
  root: 'E:/ai/ai-xiangqi',
  configFile: false,
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler', implementation: sass },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
