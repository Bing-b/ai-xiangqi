/**
 * 中国象棋 (Xiangqi) 配置文件
 * 
 * 在此处直接配置你的 GPT API Key 及中转地址
 */
const GAME_CONFIG = {
  // 1. 填写你的 API Key
  API_KEY: "sk-f92018380d5562b21ec2ea65cd7e3940056887d55ac5008df63fba6664dec840",

  // 2. 模型名称 ('gpt-5.5', 'gpt-4o-mini', 'deepseek-chat' 等)
  MODEL: "gpt-5.5",

  // 3. API 中转地址 Base URL
  BASE_URL: "https://xuseny.online/v1",

  // 4. 解决浏览器 CORS 跨域限制开关（开启后自动使用代理突破跨域）
  USE_CORS_PROXY: true,

  // 5. 自定义 CORS 代理前缀（可选，留空则自动轮询公共代理）
  CORS_PROXY_PREFIX: ""
};
