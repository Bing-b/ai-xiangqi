/**
 * Gemini AI Integration for Xiangqi
 * Supports Google AI Studio REST API & Custom Base URL Proxy / OpenAI Endpoint
 */

class GeminiXiangqiAI {
  constructor() {
    this.apiKey = this.loadApiKey();
    this.baseUrl = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.GEMINI_BASE_URL) ? GAME_CONFIG.GEMINI_BASE_URL.trim() : '';
  }

  loadApiKey() {
    if (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.GEMINI_API_KEY) {
      return GAME_CONFIG.GEMINI_API_KEY.trim();
    }
    try {
      return localStorage.getItem('xiangqi_gemini_api_key') || '';
    } catch (e) {
      return '';
    }
  }

  hasApiKey() {
    return this.apiKey.length > 0;
  }

  /**
   * Send prompt to Gemini API / OpenAI API and receive chosen move index + tactical commentary
   */
  async getMoveFromGemini(grid, turn, legalMoves, moveHistoryNotations = []) {
    if (!this.hasApiKey()) {
      throw new Error('未设置 API Key，请在 js/config.js 中配置 GEMINI_API_KEY。');
    }

    const currentFen = gridToFen(grid, turn);
    const sideName = turn === RED ? '红方' : '黑方';

    // Format legal moves for Gemini
    const formattedMoves = legalMoves.map((m, idx) => {
      const piece = grid[m.fromR][m.fromC];
      const name = PIECE_NAMES[piece] || '棋子';
      const notation = Rules.generateNotation(grid, m);
      return `${idx}: ${notation} (从[${m.fromR},${m.fromC}]到[${m.toR},${m.toC}])`;
    }).join('\n');

    const prompt = `你是一位精通中国象棋的特级大师AI。
当前对局局面 FEN 为: "${currentFen}"
轮到你 (${sideName}) 行棋。
近几步历史着法: ${moveHistoryNotations.slice(-6).join(', ') || '对局刚开始'}

你可选的所有合法着法列表如下 (格式为 "索引: 招法名称"):
${formattedMoves}

请分析局势，从中选择最强、最有战略战术意义的一步着法。
必须仅输出合法的 JSON 格式数据，包含以下两个字段：
1. "moveIndex": 你选择的着法索引数字 (例如: 0)
2. "commentary": 一句简明精辟的中文棋评（讲解你选择这一步的战略意图）。

请务必直接输出格式正确的 JSON，不要添加 markdown 格式包裹或其他多余文本。示例：
{"moveIndex": 0, "commentary": "我选择车五平六，封锁敌方马路，夺取中路控制权。"}
`;

    let modelToUse = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.GEMINI_MODEL) ? GAME_CONFIG.GEMINI_MODEL : 'gemini-1.5-flash';
    
    // Check if user set custom Base URL (e.g. OpenAI / OneAPI proxy)
    if (this.baseUrl) {
      return await this.callOpenAICompatibleApi(prompt, modelToUse, legalMoves);
    } else {
      return await this.callGoogleRestApi(prompt, modelToUse, legalMoves);
    }
  }

  async callGoogleRestApi(prompt, initialModel, legalMoves) {
    const fallbackModels = [initialModel, 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'];
    let response = null;
    let lastErrMsg = '';

    for (let model of fallbackModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 256 }
          })
        });

        if (res.ok) {
          response = res;
          break;
        } else {
          const errData = await res.json().catch(() => ({}));
          lastErrMsg = errData.error?.message || `HTTP ${res.status}`;
          if (res.status === 403) {
            throw new Error(`Google API 返回 403 拒绝访问: ${lastErrMsg}。请前往 https://aistudio.google.com 重新生成标准的 API Key (通常以 AIzaSy... 开头)。`);
          }
        }
      } catch (e) {
        lastErrMsg = e.message;
        if (e.message.includes('403')) throw e;
      }
    }

    if (!response) {
      throw new Error(`Gemini API 请求失败 (${lastErrMsg})`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return this.parseJsonResponse(rawText, legalMoves);
  }

  async callOpenAICompatibleApi(prompt, modelName, legalMoves) {
    const endpoint = this.baseUrl.endsWith('/chat/completions') 
      ? this.baseUrl 
      : `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${res.status}`;
      throw new Error(`代理中转 API 请求失败 (${res.status}): ${errMsg}`);
    }

    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    return this.parseJsonResponse(rawText, legalMoves);
  }

  parseJsonResponse(rawText, legalMoves) {
    const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      const result = JSON.parse(cleanedText);
      const chosenIndex = parseInt(result.moveIndex, 10);
      if (!isNaN(chosenIndex) && chosenIndex >= 0 && chosenIndex < legalMoves.length) {
        return {
          move: legalMoves[chosenIndex],
          commentary: result.commentary || 'Gemini 制定了此战略着法。'
        };
      }
    } catch (e) {
      console.warn('JSON parse warning:', rawText);
    }

    return {
      move: legalMoves[0],
      commentary: 'Gemini 已下子。'
    };
  }
}
