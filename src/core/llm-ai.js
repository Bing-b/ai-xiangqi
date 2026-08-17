/**
 * OpenAI / GPT / Gemini Integration for Xiangqi with Difficulty & Style Engine
 */
import { GAME_CONFIG } from './config.js';
import { RED, BLACK, gridToFen } from './constants.js';
import { Rules } from './rules.js';

export const LLM_DIFFICULTY_PRESETS = {
  llm_easy: {
    name: '大模型·初窥门径 (轻松休闲)',
    temp: 0.7,
    system: `你是一位正在学中国象棋的可爱初学者。你性格随和，下棋以防守和试探为主。偶尔会走出有趣或出人意料的休闲步法。`
  },
  llm_medium: {
    name: '大模型·业余好手 (攻守平衡)',
    temp: 0.3,
    system: `你是一位经验丰富的业余中国象棋好手。你注重开局出子效率（抢占中路、快速出车、兵卒控制），不轻易丢子，攻守兼备。`
  },
  llm_hard: {
    name: '大模型·省级大师 (战术严密)',
    temp: 0.1,
    system: `你是一位战术素养极高的象棋省级大师。你精通各种杀法（双车错、马后炮、天地炮、夹车炮），严格评估双方子力价值与战术威胁，步步紧逼。`
  },
  llm_master: {
    name: '大模型·特级大师 (全局深算)',
    temp: 0.0,
    system: `你是一位殿堂级中国象棋特级大师与特级裁判。你具备顶级的算路深度与大局观，善于推演对手意图、制造牵制与反击，绝不走任何随手软手。`
  },
  llm_attack: {
    name: '大模型·狂暴刺客 (弃子强攻)',
    temp: 0.2,
    system: `你是一位极度好斗、嗜杀成性的狂暴象棋刺客。你的棋风凶悍凌厉，极度偏好弃子攻杀、下二道压制、沉底炮轰士、车强换双等玉石俱焚的攻势！`
  }
};

export class LLMXiangqiAI {
  constructor() {
    this.apiKey = this.loadApiKey();
    this.baseUrl = this.loadBaseUrl();
    this.modelName = this.loadModelName();
    this.callTimestamps = [];
    this.lastCallTime = 0;
  }

  refreshConfig() {
    this.apiKey = this.loadApiKey();
    this.baseUrl = this.loadBaseUrl();
    this.modelName = this.loadModelName();
  }

  checkRateLimit() {
    const now = Date.now();

    // 1. 最小调用时间间隔限制 (Cooldown)
    const minCooldown = GAME_CONFIG.MIN_COOLDOWN_MS || 2000;
    if (this.lastCallTime > 0 && (now - this.lastCallTime < minCooldown)) {
      const waitSec = Math.ceil((minCooldown - (now - this.lastCallTime)) / 1000);
      return { allowed: false, reason: `请求过于频繁，请等待 ${waitSec} 秒` };
    }

    // 2. 每分钟最大调用次数限制 (Calls per minute)
    const maxPerMin = GAME_CONFIG.MAX_CALLS_PER_MIN || 10;
    this.callTimestamps = this.callTimestamps.filter(t => now - t < 60000);
    if (this.callTimestamps.length >= maxPerMin) {
      return { allowed: false, reason: `已达到每分钟 API 调用上限 (${maxPerMin}次/分)` };
    }

    // 3. 每日最大调用次数限制 (Calls per day)
    const maxPerDay = GAME_CONFIG.MAX_CALLS_PER_DAY || 100;
    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `xiangqi_llm_calls_${today}`;
    let dailyCalls = 0;
    try {
      dailyCalls = parseInt(localStorage.getItem(storageKey) || '0', 10);
    } catch (e) {}

    if (dailyCalls >= maxPerDay) {
      return { allowed: false, reason: `今日 API 调用已达上限 (${maxPerDay}次/日)` };
    }

    return { allowed: true };
  }

  recordCallSuccess() {
    const now = Date.now();
    this.lastCallTime = now;
    this.callTimestamps.push(now);

    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `xiangqi_llm_calls_${today}`;
    try {
      const current = parseInt(localStorage.getItem(storageKey) || '0', 10);
      localStorage.setItem(storageKey, (current + 1).toString());
    } catch (e) {}
  }

  loadApiKey() {
    const envKey = import.meta.env.VITE_GPT_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
    if (envKey && envKey.trim()) return envKey.trim();

    try {
      const localKey = localStorage.getItem('xiangqi_llm_api_key');
      if (localKey && localKey.trim()) {
        return localKey.trim();
      }
    } catch (e) {}

    return (GAME_CONFIG.API_KEY || '').trim();
  }

  loadBaseUrl() {
    const envUrl = import.meta.env.VITE_GPT_BASE_URL || import.meta.env.VITE_OPENAI_BASE_URL;
    if (envUrl && envUrl.trim()) return envUrl.trim();

    try {
      const localUrl = localStorage.getItem('xiangqi_llm_base_url');
      if (localUrl && localUrl.trim()) {
        return localUrl.trim();
      }
    } catch (e) {}

    return (GAME_CONFIG.BASE_URL || 'https://api.openai.com/v1').trim();
  }

  loadModelName() {
    const envModel = import.meta.env.VITE_GPT_MODEL || import.meta.env.VITE_OPENAI_MODEL;
    if (envModel && envModel.trim()) return envModel.trim();

    try {
      const localModel = localStorage.getItem('xiangqi_llm_model');
      if (localModel && localModel.trim()) {
        return localModel.trim();
      }
    } catch (e) {}

    return (GAME_CONFIG.MODEL || 'gpt-5.5').trim();
  }

  hasApiKey() {
    this.refreshConfig();
    return this.apiKey.length > 0;
  }

  /**
   * Unified Entry Point for LLM Move Selection with Difficulty Preset
   */
  async getNextMove(fen, turn, grid, moveHistoryNotations = [], difficulty = 'llm_hard') {
    const legalMoves = Rules.getAllLegalMoves(grid, turn);
    if (!legalMoves || legalMoves.length === 0) {
      return { move: null, commentary: '无合法走步。' };
    }

    return this.getMoveFromGPT(grid, turn, legalMoves, moveHistoryNotations, difficulty);
  }

  async getMoveFromGPT(grid, turn, legalMoves, moveHistoryNotations = [], difficulty = 'llm_hard') {
    if (!this.hasApiKey()) {
      throw new Error('未设置 API Key，请在侧边栏【🔑 大模型接口设置】中配置。');
    }

    const currentFen = gridToFen(grid, turn);
    const sideName = turn === RED ? '红方' : '黑方';
    const preset = LLM_DIFFICULTY_PRESETS[difficulty] || LLM_DIFFICULTY_PRESETS.llm_hard;

    const formattedMoves = legalMoves.map((m, idx) => {
      const notation = Rules.generateNotation(grid, m);
      return `${idx}: ${notation} (从[${m.fromR},${m.fromC}]到[${m.toR},${m.toC}]${m.captured ? '，吃'+m.captured : ''})`;
    }).join('\n');

    const systemPrompt = `${preset.system}\n你必须根据当前棋局严格选择一个最具战术价值且符合你性格风格的着法索引，并输出简短有趣的棋评。`;

    const userPrompt = `当前局面 FEN: "${currentFen}"
当前轮到你走棋 (${sideName})。
近几步棋路历史: ${moveHistoryNotations.slice(-5).join(' -> ') || '刚刚开局'}

当前全部合法可选着法列表:
${formattedMoves}

请从中选择你认为最符合你战略意图的一步棋，严格仅输出 JSON 格式（不要包含任何 markdown 块或多余字符）：
{"moveIndex": 着法索引数字, "commentary": "15~25字以内结合你性格风格的精辟棋评/挑衅/战术点评"}
示例: {"moveIndex": 3, "commentary": "中炮横扫当阳，看你如何招架！"}`;

    let cleanBase = (this.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    let rawEndpoints = [];

    if (cleanBase.endsWith('/chat/completions')) {
      rawEndpoints.push(cleanBase);
    } else if (cleanBase.endsWith('/v1')) {
      rawEndpoints.push(`${cleanBase}/chat/completions`);
    } else {
      rawEndpoints.push(`${cleanBase}/v1/chat/completions`);
      rawEndpoints.push(`${cleanBase}/chat/completions`);
    }

    const useCorsProxy = GAME_CONFIG.USE_CORS_PROXY !== false;
    const customProxyPrefix = (GAME_CONFIG.CORS_PROXY_PREFIX || '').trim();

    let candidateUrls = [];
    rawEndpoints.forEach(ep => {
      if (ep.startsWith('/')) {
        candidateUrls.push(ep);
        return;
      }
      if (useCorsProxy && !ep.includes('localhost') && !ep.includes('127.0.0.1')) {
        candidateUrls.push(`/api/proxy?url=${encodeURIComponent(ep)}`);
      }
      candidateUrls.push(ep);
      if (customProxyPrefix) {
        if (customProxyPrefix.includes('%s')) {
          candidateUrls.push(customProxyPrefix.replace('%s', encodeURIComponent(ep)));
        } else {
          candidateUrls.push(customProxyPrefix + (customProxyPrefix.includes('?') ? encodeURIComponent(ep) : ep));
        }
      }
    });

    candidateUrls = Array.from(new Set(candidateUrls));

    let response = null;
    let errorLog = [];

    for (let fetchUrl of candidateUrls) {
      try {
        const res = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: preset.temp,
            max_tokens: 150
          })
        });

        if (res.ok) {
          response = res;
          break;
        } else {
          const errData = await res.json().catch(() => ({}));
          const msg = errData.error?.message || `HTTP ${res.status}`;
          errorLog.push(`[${fetchUrl.slice(0, 35)}...]: HTTP ${res.status} (${msg})`);
        }
      } catch (e) {
        errorLog.push(`[${fetchUrl.slice(0, 35)}...]: ${e.message}`);
      }
    }

    if (!response) {
      const summaryMsg = errorLog.join('; ');
      throw new Error(`API 请求失败: ${summaryMsg}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      const result = JSON.parse(cleanedText);
      const chosenIndex = parseInt(result.moveIndex, 10);
      if (!isNaN(chosenIndex) && chosenIndex >= 0 && chosenIndex < legalMoves.length) {
        return {
          move: legalMoves[chosenIndex],
          commentary: result.commentary || '大模型已深思熟虑落子。'
        };
      }
    } catch (e) {
      console.warn('GPT JSON parse warning, raw output:', rawText);
    }

    return {
      move: legalMoves[0],
      commentary: '大模型已落子。'
    };
  }
}
