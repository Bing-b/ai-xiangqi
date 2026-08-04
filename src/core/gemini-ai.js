/**
 * Official Google Gen AI Integration for Xiangqi (Gemini 2.5 Flash)
 * Uses official @google/genai SDK
 */
import { GoogleGenAI } from "@google/genai";
import { RED, gridToFen } from "./constants.js";
import { Rules } from "./rules.js";

export class GeminiXiangqiAI {
  constructor() {
    this.apiKey = this.loadApiKey();
    this.modelName = "gemini-2.5-flash";
    this.ai = null;
    if (this.apiKey) {
      this.initClient();
    }
  }

  loadApiKey() {
    return (
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.GEMINI_API_KEY ||
      localStorage.getItem("xiangqi_gemini_official_key") ||
      ""
    ).trim();
  }

  initClient() {
    this.apiKey = this.loadApiKey();
    if (this.apiKey) {
      try {
        this.ai = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (e) {
        console.error("GoogleGenAI init error:", e);
      }
    }
  }

  hasApiKey() {
    return this.loadApiKey().length > 0;
  }

  async getMoveFromGemini(grid, turn, legalMoves, moveHistoryNotations = []) {
    if (!this.hasApiKey()) {
      throw new Error("未检测到 Gemini API Key，请在 .env 文件中设置 VITE_GEMINI_API_KEY。");
    }

    if (!this.ai) {
      this.initClient();
    }

    const currentFen = gridToFen(grid, turn);
    const sideName = turn === RED ? "红方" : "黑方";

    const formattedMoves = legalMoves
      .map((m, idx) => {
        const notation = Rules.generateNotation(grid, m);
        return `${idx}: ${notation} (从[${m.fromR},${m.fromC}]到[${m.toR},${m.toC}])`;
      })
      .join("\n");

    const systemInstruction = `你是一位精通中国象棋的特级大师AI。你需要分析局面并从提供的合法着法列表中选择最佳着法。必须只输出合法的 JSON 格式数据。`;

    const userPrompt = `当前对局 FEN 局面: "${currentFen}"
轮到你 (${sideName}) 行棋。近几步着法: ${moveHistoryNotations.slice(-4).join(", ") || "开局"}
你可选的所有合法着法列表如下:
${formattedMoves}

请分析局势从中选出最优一步，必须仅输出格式正确的 JSON 数据，字段包括：
1. "moveIndex": 你选择的着法索引数字 (例如: 0)
2. "commentary": 20字以内精辟中文战略战术点评。

请直接输出 JSON，不要添加 Markdown 代码块包裹或额外文字。`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2
        }
      });

      const rawText = response.text || "";
      const cleanedText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      const result = JSON.parse(cleanedText);
      const chosenIndex = parseInt(result.moveIndex, 10);

      if (!isNaN(chosenIndex) && chosenIndex >= 0 && chosenIndex < legalMoves.length) {
        return {
          move: legalMoves[chosenIndex],
          commentary: result.commentary || "Gemini 2.5 制定了此战略着法。"
        };
      }
    } catch (e) {
      console.warn("Gemini generateContent error:", e);
      throw new Error(`Gemini 2.5 响应异常: ${e.message}`);
    }

    return {
      move: legalMoves[0],
      commentary: "Gemini 2.5-Flash 已下子。"
    };
  }
}
