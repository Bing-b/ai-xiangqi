/**
 * OpenAI / GPT Integration for Xiangqi
 */
import { GAME_CONFIG } from './config.js';
import { RED, PIECE_NAMES, gridToFen } from './constants.js';
import { Rules } from './rules.js';

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

  async getMoveFromGPT(grid, turn, legalMoves, moveHistoryNotations = []) {
    if (!this.hasApiKey()) {
      throw new Error('未设置 API Key，请在设置中配置 API_KEY。');
    }

    const currentFen = gridToFen(grid, turn);
    const sideName = turn === RED ? '红方' : '黑方';

    const formattedMoves = legalMoves.map((m, idx) => {
      const piece = grid[m.fromR][m.fromC];
      const notation = Rules.generateNotation(grid, m);
      return `${idx}: ${notation} (从[${m.fromR},${m.fromC}]到[${m.toR},${m.toC}])`;
    }).join('\n');

    const systemPrompt = `你是一位精通中国象棋的特级大师AI。按要求速选最佳着法。`;

    const userPrompt = `当前FEN: "${currentFen}"
轮到你 (${sideName})。近几步: ${moveHistoryNotations.slice(-4).join(', ') || '开局'}
可选合法着法:
${formattedMoves}

从列表中选出最优一步，仅输出合法 JSON 格式数据：
{"moveIndex": 索引数字, "commentary": "20字以内精辟战略战术点评"}
请直接输出 JSON，不要添加 Markdown 或多余字符。`;

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
      if (useCorsProxy && !ep.includes('localhost') && !ep.includes('127.0.0.1')) {
        if (customProxyPrefix) {
          if (customProxyPrefix.includes('%s')) {
            candidateUrls.push(customProxyPrefix.replace('%s', encodeURIComponent(ep)));
          } else {
            candidateUrls.push(customProxyPrefix + (customProxyPrefix.includes('?') ? encodeURIComponent(ep) : ep));
          }
        }
        candidateUrls.push(`https://corsproxy.io/?${encodeURIComponent(ep)}`);
        candidateUrls.push(`https://thingproxy.freeboard.io/fetch/${ep}`);
      }
      candidateUrls.push(ep);
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
            temperature: 0.2,
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
      let detailHint = '';
      if (summaryMsg.includes('429')) {
        detailHint = ' (公共跨域代理触发行限流 429)';
      } else if (summaryMsg.includes('Failed to fetch')) {
        detailHint = ' (目标中转站未配置 Access-Control-Allow-Origin 跨域头)';
      }
      throw new Error(`API 请求失败: ${summaryMsg}${detailHint}`);
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
          commentary: result.commentary || 'GPT 制定了此战略着法。'
        };
      }
    } catch (e) {
      console.warn('GPT JSON parse warning, raw output:', rawText);
    }

    return {
      move: legalMoves[0],
      commentary: 'GPT 已下子。'
    };
  }
}
