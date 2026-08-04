/**
 * OpenAI / GPT Integration for Xiangqi
 * Supports GPT-4o, GPT-4o-mini, GPT-3.5-Turbo, DeepSeek & OpenAI-compatible proxy Base URLs
 */

class LLMXiangqiAI {
  constructor() {
    this.apiKey = this.loadApiKey();
    this.baseUrl = this.loadBaseUrl();
    this.modelName = this.loadModelName();
  }

  refreshConfig() {
    this.apiKey = this.loadApiKey();
    this.baseUrl = this.loadBaseUrl();
    this.modelName = this.loadModelName();
  }

  loadApiKey() {
    try {
      const localKey = localStorage.getItem('xiangqi_llm_api_key');
      if (localKey && localKey.trim()) {
        return localKey.trim();
      }
    } catch (e) {}

    if (typeof GAME_CONFIG !== 'undefined') {
      return (GAME_CONFIG.API_KEY || GAME_CONFIG.GEMINI_API_KEY || '').trim();
    }
    return '';
  }

  loadBaseUrl() {
    try {
      const localUrl = localStorage.getItem('xiangqi_llm_base_url');
      if (localUrl && localUrl.trim()) {
        return localUrl.trim();
      }
    } catch (e) {}

    if (typeof GAME_CONFIG !== 'undefined') {
      return (GAME_CONFIG.BASE_URL || GAME_CONFIG.GEMINI_BASE_URL || '').trim();
    }
    return 'https://api.openai.com/v1';
  }

  loadModelName() {
    try {
      const localModel = localStorage.getItem('xiangqi_llm_model');
      if (localModel && localModel.trim()) {
        return localModel.trim();
      }
    } catch (e) {}

    if (typeof GAME_CONFIG !== 'undefined') {
      return (GAME_CONFIG.MODEL || GAME_CONFIG.GEMINI_MODEL || 'gpt-5.5').trim();
    }
    return 'gpt-5.5';
  }

  hasApiKey() {
    this.refreshConfig();
    return this.apiKey.length > 0;
  }

  /**
   * Send prompt to GPT API and receive chosen move index + tactical commentary
   */
  async getMoveFromGPT(grid, turn, legalMoves, moveHistoryNotations = []) {
    if (!this.hasApiKey()) {
      throw new Error('未设置 API Key，请在 js/config.js 中配置 API_KEY。');
    }

    const currentFen = gridToFen(grid, turn);
    const sideName = turn === RED ? '红方' : '黑方';

    // Format legal moves for GPT
    const formattedMoves = legalMoves.map((m, idx) => {
      const piece = grid[m.fromR][m.fromC];
      const name = PIECE_NAMES[piece] || '棋子';
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

    // Determine Candidate Endpoints for Proxy Platforms
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

    const useCorsProxy = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.USE_CORS_PROXY !== false);
    const customProxyPrefix = (typeof GAME_CONFIG !== 'undefined' && (GAME_CONFIG.CORS_PROXY_PREFIX || '')).trim();

    // Prepare list of target URLs (CORS proxies to bypass browser preflight, plus direct request)
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
        // Public CORS proxy candidates to prevent single-proxy 429 rate limit
        candidateUrls.push(`https://corsproxy.io/?${encodeURIComponent(ep)}`);
        candidateUrls.push(`https://thingproxy.freeboard.io/fetch/${ep}`);
      }
      candidateUrls.push(ep); // Direct request
    });

    // Remove duplicates while keeping order
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

    // Clean markdown formatting if present
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

    // Fallback: Pick first move if parsing failed
    return {
      move: legalMoves[0],
      commentary: 'GPT 已下子。'
    };
  }
}

// Alias for backward compatibility
const GeminiXiangqiAI = LLMXiangqiAI;
