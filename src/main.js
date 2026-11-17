import { createApp } from 'vue';
import App from './App.vue';

function escapeHtml(s) {
  return String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

// Only show the fallback when nothing was rendered; a live app stays untouched.
function showFatal(message) {
  const el = document.getElementById('app');
  if (!el || el.querySelector('*')) return;
  el.innerHTML =
    '<div style="padding:24px;font-family:system-ui,-apple-system,sans-serif;color:#fff;background:#1e1b16;min-height:100vh;box-sizing:border-box">' +
    '<h2 style="color:#f87171;margin:0 0 12px">页面初始化失败</h2>' +
    '<p style="color:#d6d3d1;font-size:13px;margin:0 0 12px">以下是原始错误堆栈，可直接复制反馈：</p>' +
    '<pre style="white-space:pre-wrap;font-size:12px;line-height:1.6;color:#fca5a5;background:#000;padding:12px;border-radius:6px;overflow:auto">' +
    escapeHtml(message) +
    '</pre></div>';
}

window.addEventListener('error', (e) => {
  showFatal(e.error && e.error.stack ? e.error.stack : e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason;
  showFatal(r && r.stack ? r.stack : r);
});

try {
  const app = createApp(App);
  app.config.errorHandler = (err, instance, info) => {
    console.error('[xiangqi] errorHandler:', info, err);
    showFatal((err && err.stack ? err.stack : String(err)) + '\n\n[location] ' + info);
  };
  app.mount('#app');
} catch (err) {
  console.error('[xiangqi] mount failed:', err);
  // Rethrow after a tick so Vue's own handler can also report the stack.
  showFatal(err && err.stack ? err.stack : String(err));
  throw err;
}
