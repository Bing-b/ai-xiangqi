/**
 * Xiangqi Game Controller - Upgraded Edition (with Gemini Pro AI)
 */

class XiangqiGame {
  constructor() {
    this.board = new XiangqiBoard();
    this.ui = new XiangqiUI('game-board-container', (r, c) => this.handleCellClick(r, c));
    this.ai = new XiangqiAI('medium');
    this.llmAi = new LLMXiangqiAI();
    this.endgameManager = new EndgameManager();

    this.mode = 'pvai'; // 'pvp', 'pvai', or 'endgame'
    this.aiDifficulty = 'medium';
    this.playerSide = RED; // Human side in PvAI mode
    this.selectedSquare = null;
    this.validMoves = [];
    this.isAiThinking = false;
    this.gameActive = false;

    this.timer = null;
    this.redTime = 600; // 10 mins
    this.blackTime = 600;

    this.ui.initApiModal(this.llmAi);
    const savedTheme = localStorage.getItem('xiangqi_theme') || 'wood';
    this.ui.applyTheme(savedTheme);

    this.initEventListeners();
    this.populateEndgameDropdown();
    this.startNewGame();
  }

  initEventListeners() {
    document.getElementById('btn-new-game').addEventListener('click', () => this.startNewGame());
    document.getElementById('btn-undo').addEventListener('click', () => this.undoMove());
    document.getElementById('btn-hint').addEventListener('click', () => this.showHint());
    document.getElementById('btn-sound').addEventListener('click', (e) => {
      const enabled = sounds.toggleSound();
      e.target.textContent = enabled ? '🔊 音效: 开' : '🔇 音效: 关';
    });

    document.getElementById('select-mode').addEventListener('change', (e) => {
      this.mode = e.target.value;
      const aiSettings = document.getElementById('ai-settings');
      const endgameSettings = document.getElementById('endgame-settings');

      if (aiSettings) aiSettings.style.display = this.mode === 'pvai' ? 'flex' : 'none';
      if (endgameSettings) endgameSettings.style.display = this.mode === 'endgame' ? 'flex' : 'none';

      this.startNewGame();
    });

    document.getElementById('select-difficulty').addEventListener('change', (e) => {
      this.aiDifficulty = e.target.value;
      if (this.aiDifficulty !== 'gemini') {
        this.ai.setDifficulty(this.aiDifficulty);
        const card = document.getElementById('gemini-commentary-card');
        if (card) card.style.display = 'none';
      } else {
        const card = document.getElementById('gemini-commentary-card');
        if (card) card.style.display = 'block';
        if (!this.llmAi.hasApiKey()) {
          this.ui.showGeminiCommentary('⚠️ 未检测到 API Key，已为您打开【🔑 API 安全设置】窗口。');
          this.ui.showApiConfigModal();
        }
      }
    });

    document.getElementById('select-player-side').addEventListener('change', (e) => {
      this.playerSide = e.target.value;
      this.startNewGame();
    });

    document.getElementById('select-endgame-level')?.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      this.endgameManager.getLevel(idx);
      this.updateEndgameDesc();
      this.startNewGame();
    });

    document.getElementById('select-theme')?.addEventListener('change', (e) => {
      this.ui.applyTheme(e.target.value);
    });

    document.getElementById('btn-restart-overlay')?.addEventListener('click', () => {
      this.hideGameOverOverlay();
      this.startNewGame();
    });

    // FEN & PGN Modal Events
    document.getElementById('btn-fen-tools')?.addEventListener('click', () => this.openFenModal());
    document.getElementById('btn-close-fen-modal')?.addEventListener('click', () => this.closeFenModal());
    document.getElementById('btn-copy-fen')?.addEventListener('click', () => this.copyFenToClipboard());
    document.getElementById('btn-apply-fen')?.addEventListener('click', () => this.applyCustomFen());
    document.getElementById('btn-copy-pgn')?.addEventListener('click', () => this.copyPgnToClipboard());

    // Help Modal Events
    document.getElementById('btn-help-modal')?.addEventListener('click', () => this.openHelpModal());
    document.getElementById('btn-close-help-modal')?.addEventListener('click', () => this.closeHelpModal());
  }

  openHelpModal() {
    const overlay = document.getElementById('help-modal-overlay');
    if (overlay) overlay.classList.add('active');
  }

  closeHelpModal() {
    const overlay = document.getElementById('help-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  populateEndgameDropdown() {
    const dropdown = document.getElementById('select-endgame-level');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    const levels = this.endgameManager.getAllLevels();
    levels.forEach((lvl, index) => {
      const option = document.createElement('option');
      option.value = index;
      const isDone = this.endgameManager.isLevelCompleted(lvl.id);
      option.textContent = `${isDone ? '✅ ' : '🔒 '}${lvl.name} (${lvl.difficulty})`;
      dropdown.appendChild(option);
    });

    this.updateEndgameDesc();
  }

  updateEndgameDesc() {
    const descBox = document.getElementById('endgame-desc');
    const lvl = this.endgameManager.getLevel(this.endgameManager.currentLevelIndex);
    if (descBox && lvl) {
      descBox.textContent = `📋 关卡说明: ${lvl.desc} (目标步数: ${lvl.targetSteps} 步内化解/将死)`;
    }
  }

  startNewGame() {
    if (this.mode === 'endgame') {
      const lvl = this.endgameManager.getLevel(this.endgameManager.currentLevelIndex);
      if (lvl) {
        this.board.loadFen(lvl.fen);
        this.playerSide = lvl.playerSide;
      } else {
        this.board.reset();
      }
    } else {
      this.board.reset();
    }

    this.selectedSquare = null;
    this.validMoves = [];
    this.isAiThinking = false;
    this.gameActive = true;

    this.redTime = 600;
    this.blackTime = 600;
    this.stopTimer();
    this.startTimer();

    this.updateStatus();
    this.updateHistoryUI();
    this.ui.updateCapturedPieces([], []);
    this.ui.renderBoard(this.board, null, [], null);
    this.updateEvaluationUI();

    if (this.aiDifficulty === 'gemini') {
      const card = document.getElementById('gemini-commentary-card');
      if (card) card.style.display = 'block';
    }

    // If PvAI or Endgame mode and AI moves first
    if ((this.mode === 'pvai' || this.mode === 'endgame') && this.board.turn !== this.playerSide) {
      this.triggerAiTurn();
    }
  }

  handleCellClick(r, c) {
    if (!this.gameActive || this.isAiThinking) return;

    // In PvAI / Endgame mode, ignore click during AI turn
    if ((this.mode === 'pvai' || this.mode === 'endgame') && this.board.turn !== this.playerSide) {
      return;
    }

    const clickedPiece = this.board.getPiece(r, c);
    const clickedSide = Rules.getSide(clickedPiece);

    // If square already selected
    if (this.selectedSquare) {
      // Check if click target is a valid move destination
      const move = this.validMoves.find(m => m.toR === r && m.toC === c);

      if (move) {
        this.makeMove(move);
        this.selectedSquare = null;
        this.validMoves = [];
        return;
      }
    }

    // Select own piece
    if (clickedPiece && clickedSide === this.board.turn) {
      sounds.playSelect();
      this.selectedSquare = { r, c };
      this.validMoves = Rules.getLegalMoves(this.board.grid, r, c);
      this.ui.renderBoard(this.board, this.selectedSquare, this.validMoves, this.board.getLastMove());
    } else {
      // Deselect
      this.selectedSquare = null;
      this.validMoves = [];
      this.ui.renderBoard(this.board, null, [], this.board.getLastMove());
    }
  }

  async makeMove(move) {
    const isCapture = move.captured !== null;
    const record = this.board.executeMove(move);

    if (isCapture) {
      sounds.playCapture();
    } else {
      sounds.playMove();
    }

    this.ui.renderBoard(this.board, null, [], move);
    this.ui.updateCapturedPieces(this.board.capturedRed, this.board.capturedBlack);
    this.addHistoryRecord(record.notation);
    this.updateEvaluationUI();

    // Check game state (Check, Checkmate, Stalemate)
    const currentTurn = this.board.turn;

    if (Rules.isKingInCheck(this.board.grid, currentTurn)) {
      if (Rules.isCheckmate(this.board.grid, currentTurn)) {
        const winner = currentTurn === RED ? BLACK : RED;
        this.handleGameEnd(winner, '将死 (Checkmate)');
        return;
      } else {
        sounds.playCheck();
        this.ui.showCheckBanner(currentTurn);
      }
    } else if (Rules.isStalemate(this.board.grid, currentTurn)) {
      this.handleGameEnd(null, '困毙和棋 (Stalemate)');
      return;
    }

    this.updateStatus();

    // Trigger AI turn if needed
    if (this.gameActive && (this.mode === 'pvai' || this.mode === 'endgame') && this.board.turn !== this.playerSide) {
      await this.triggerAiTurn();
    }
  }

  handleGameEnd(winner, reason) {
    if (this.mode === 'endgame' && winner === this.playerSide) {
      const lvl = this.endgameManager.getLevel(this.endgameManager.currentLevelIndex);
      if (lvl) {
        this.endgameManager.saveCompletedLevel(lvl.id);
        this.populateEndgameDropdown();
      }
    }

    this.endGame(winner, reason);
  }

  async triggerAiTurn() {
    this.isAiThinking = true;
    try {
      if (this.aiDifficulty === 'gemini' || this.aiDifficulty === 'gpt') {
        this.updateStatus('✨ GPT 大模型思考中...');
        const legalMoves = Rules.getAllLegalMoves(this.board.grid, this.board.turn);

        if (legalMoves.length === 0) return;

        if (!this.llmAi.hasApiKey()) {
          this.ui.showGeminiCommentary('⚠️ 未检测到 API Key，请通过【🔑 GPT 大模型 API 设置】填入。现已为您自动使用本地 AI 代下。');
          this.ui.showApiConfigModal();
          const fallbackMove = await this.ai.getBestMove(this.board.grid, this.board.turn);
          if (fallbackMove && this.gameActive) await this.makeMove(fallbackMove);
          return;
        }

        try {
          this.ui.showGeminiCommentary('🤖 GPT 正在深度推演最佳棋路中...');
          const historyNotations = this.board.moveHistory.map(h => h.notation);
          const result = await this.llmAi.getMoveFromGPT(this.board.grid, this.board.turn, legalMoves, historyNotations);
          this.ui.showGeminiCommentary(`🤖 GPT 棋评: "${result.commentary}"`);

          if (result.move && this.gameActive) {
            await this.makeMove(result.move);
          }
        } catch (err) {
          console.error('GPT error:', err);
          this.ui.showGeminiCommentary(`⚠️ GPT 调用提示: ${err.message}。已自动使用本地 AI 代下。`);
          const fallbackMove = await this.ai.getBestMove(this.board.grid, this.board.turn);
          if (fallbackMove && this.gameActive) await this.makeMove(fallbackMove);
        }
      } else {
        this.updateStatus('AI 思考中...');
        const aiMove = await this.ai.getBestMove(this.board.grid, this.board.turn);
        if (aiMove && this.gameActive) {
          await this.makeMove(aiMove);
        }
      }
    } finally {
      this.isAiThinking = false;
    }
  }

  async showHint() {
    if (!this.gameActive || this.isAiThinking) return;

    this.updateStatus('求解最佳招法...');
    const bestMove = await this.ai.getBestMove(this.board.grid, this.board.turn);

    if (bestMove) {
      this.selectedSquare = { r: bestMove.fromR, c: bestMove.fromC };
      this.validMoves = [bestMove];
      this.ui.renderBoard(this.board, this.selectedSquare, this.validMoves, this.board.getLastMove());
      sounds.playSelect();
    }

    this.updateStatus();
  }

  undoMove() {
    if (!this.gameActive || this.isAiThinking) return;

    // In PvAI or Endgame mode, undo two moves (Player & AI)
    let steps = (this.mode === 'pvai' || this.mode === 'endgame') ? 2 : 1;

    for (let i = 0; i < steps; i++) {
      if (this.board.moveHistory.length > 0) {
        this.board.undoMove();
        this.popHistoryRecord();
      }
    }

    this.selectedSquare = null;
    this.validMoves = [];
    this.ui.renderBoard(this.board, null, [], this.board.getLastMove());
    this.ui.updateCapturedPieces(this.board.capturedRed, this.board.capturedBlack);
    this.updateStatus();
    this.updateEvaluationUI();
    sounds.playMove();
  }

  updateEvaluationUI() {
    const evalData = this.ai.getEvaluationScore(this.board.grid);
    this.ui.updateEvaluationBar(evalData.redPct, evalData.blackPct);
  }

  openFenModal() {
    const fenStr = gridToFen(this.board.grid, this.board.turn);
    const fenInput = document.getElementById('fen-input-text');
    const pgnExport = document.getElementById('pgn-export-text');
    const overlay = document.getElementById('fen-modal-overlay');

    if (fenInput) fenInput.value = fenStr;
    if (pgnExport) pgnExport.value = this.generatePgnString();
    if (overlay) overlay.classList.add('active');
  }

  closeFenModal() {
    const overlay = document.getElementById('fen-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  copyFenToClipboard() {
    const fenInput = document.getElementById('fen-input-text');
    if (fenInput) {
      navigator.clipboard.writeText(fenInput.value).then(() => {
        alert('📋 FEN 已成功复制到剪贴板！');
      });
    }
  }

  applyCustomFen() {
    const fenInput = document.getElementById('fen-input-text');
    if (!fenInput || !fenInput.value.trim()) return;

    try {
      this.board.loadFen(fenInput.value.trim());
      this.selectedSquare = null;
      this.validMoves = [];
      this.gameActive = true;
      this.ui.renderBoard(this.board, null, [], null);
      this.ui.updateCapturedPieces([], []);
      this.updateHistoryUI();
      this.updateStatus();
      this.updateEvaluationUI();
      this.closeFenModal();
    } catch (e) {
      alert('❌ FEN 格式解析错误，请检查输入格式。');
    }
  }

  openGeminiKeyModal() {
    const input = document.getElementById('gemini-api-key-input');
    const overlay = document.getElementById('gemini-key-modal-overlay');
    if (input) input.value = this.geminiAi.apiKey;
    if (overlay) overlay.classList.add('active');
  }

  closeGeminiKeyModal() {
    const overlay = document.getElementById('gemini-key-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  saveGeminiKey() {
    const input = document.getElementById('gemini-api-key-input');
    if (input) {
      this.geminiAi.saveApiKey(input.value);
      alert('🔑 Gemini API Key 已成功保存至本地！');
      this.closeGeminiKeyModal();
    }
  }

  generatePgnString() {
    let pgn = '[Game "Chinese Chess (Xiangqi)"]\n';
    pgn += `[Date "${new Date().toISOString().slice(0, 10)}"]\n`;
    pgn += `[Mode "${this.mode}"]\n\n`;

    let stepNum = 1;
    for (let i = 0; i < this.board.moveHistory.length; i += 2) {
      const redRecord = this.board.moveHistory[i];
      const blackRecord = this.board.moveHistory[i + 1];

      pgn += `${stepNum}. ${redRecord ? redRecord.notation : ''} `;
      if (blackRecord) pgn += `${blackRecord.notation} `;
      stepNum++;
    }

    return pgn.trim();
  }

  copyPgnToClipboard() {
    const pgnExport = document.getElementById('pgn-export-text');
    if (pgnExport) {
      navigator.clipboard.writeText(pgnExport.value).then(() => {
        alert('📋 PGN 棋谱已成功复制到剪贴板！');
      });
    }
  }

  endGame(winner, reason) {
    this.gameActive = false;
    this.stopTimer();

    sounds.playWin();

    const overlay = document.getElementById('game-over-overlay');
    const title = document.getElementById('overlay-title');
    const desc = document.getElementById('overlay-desc');

    if (winner) {
      const winnerText = winner === RED ? '红方' : '黑方';
      title.textContent = `🏆 ${winnerText} 获胜！`;
      desc.textContent = `结束原因: ${reason}`;
    } else {
      title.textContent = '🤝 双方和棋！';
      desc.textContent = `结束原因: ${reason}`;
    }

    if (overlay) overlay.classList.add('active');
  }

  hideGameOverOverlay() {
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  updateStatus(customMsg) {
    const statusElem = document.getElementById('turn-status');
    if (!statusElem) return;

    if (customMsg) {
      statusElem.textContent = customMsg;
      return;
    }

    const currentName = this.board.turn === RED ? '红方 (先手)' : '黑方 (后手)';
    statusElem.textContent = `${currentName} 行棋`;
    statusElem.className = `status-badge ${this.board.turn === RED ? 'status-red' : 'status-black'}`;
  }

  addHistoryRecord(notation) {
    const historyList = document.getElementById('move-history-list');
    if (!historyList) return;

    const moveIndex = Math.ceil(this.board.moveHistory.length / 2);
    const isRed = this.board.turn === BLACK; // record was just played

    if (isRed) {
      const row = document.createElement('div');
      row.className = 'history-row';
      row.innerHTML = `<span class="step-num">${moveIndex}.</span><span class="red-move">${notation}</span><span class="black-move"></span>`;
      historyList.appendChild(row);
    } else {
      const lastRow = historyList.lastElementChild;
      if (lastRow) {
        const blackSpan = lastRow.querySelector('.black-move');
        if (blackSpan) blackSpan.textContent = notation;
      }
    }

    historyList.scrollTop = historyList.scrollHeight;
  }

  popHistoryRecord() {
    const historyList = document.getElementById('move-history-list');
    if (!historyList || historyList.children.length === 0) return;

    const lastRow = historyList.lastElementChild;
    const blackSpan = lastRow.querySelector('.black-move');

    if (blackSpan && blackSpan.textContent !== '') {
      blackSpan.textContent = '';
    } else {
      historyList.removeChild(lastRow);
    }
  }

  updateHistoryUI() {
    const historyList = document.getElementById('move-history-list');
    if (historyList) historyList.innerHTML = '';
  }

  startTimer() {
    this.timer = setInterval(() => {
      if (!this.gameActive || this.isAiThinking) return;

      if (this.board.turn === RED) {
        this.redTime--;
        if (this.redTime <= 0) this.handleGameEnd(BLACK, '红方超时');
      } else {
        this.blackTime--;
        if (this.blackTime <= 0) this.handleGameEnd(RED, '黑方超时');
      }

      this.renderTimer();
    }, 1000);
  }

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
  }

  renderTimer() {
    const format = s => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const redTimerElem = document.getElementById('red-timer');
    const blackTimerElem = document.getElementById('black-timer');

    if (redTimerElem) redTimerElem.textContent = format(this.redTime);
    if (blackTimerElem) blackTimerElem.textContent = format(this.blackTime);
  }
}

// Global instance launcher
window.addEventListener('DOMContentLoaded', () => {
  window.xiangqiApp = new XiangqiGame();
});
