/**
 * 中国象棋 (Xiangqi) 配置文件
 * 优先读取环境变量 (.env)，未提供时使用默认配置
 */
export const GAME_CONFIG = {
  // 1. API Key
  API_KEY: import.meta.env.VITE_GPT_API_KEY,

  // 2. 模型名称 ('gpt-5.5', 'gpt-4o-mini', 'deepseek-chat' 等)
  MODEL: import.meta.env.VITE_GPT_MODEL,

  // 3. API 中转地址 Base URL
  BASE_URL: import.meta.env.VITE_GPT_BASE_URL,

  // 4. 解决浏览器 CORS 跨域限制开关
  USE_CORS_PROXY: true,

  // 5. 自定义 CORS 代理前缀（可选）
  CORS_PROXY_PREFIX: "",
};
