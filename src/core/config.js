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

  // 4. API 调用的防滥用频率/次数限制
  MAX_CALLS_PER_MIN: parseInt(import.meta.env.VITE_GPT_MAX_CALLS_PER_MIN || '10', 10),
  MAX_CALLS_PER_DAY: parseInt(import.meta.env.VITE_GPT_MAX_CALLS_PER_DAY || '100', 10),
  MIN_COOLDOWN_MS: parseInt(import.meta.env.VITE_GPT_MIN_COOLDOWN_MS || '2000', 10),

  // 5. 解决浏览器 CORS 跨域限制开关
  USE_CORS_PROXY: true,

  // 6. 自定义 CORS 代理前缀（可选）
  CORS_PROXY_PREFIX: "",
};

