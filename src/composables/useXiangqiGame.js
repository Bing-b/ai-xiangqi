import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { XiangqiBoard } from '../core/board.js';
import { XiangqiAI } from '../core/ai.js';
import { LLMXiangqiAI } from '../core/llm-ai.js';
import { GeminiXiangqiAI } from '../core/gemini-ai.js';
import { EndgameManager } from '../core/endgame.js';
import { sounds } from '../core/audio.js';
import { Rules } from '../core/rules.js';
import { RED, BLACK, gridToFen, GAME_THEMES } from '../core/constants.js';

export function useXiangqiGame() {
  const board = new XiangqiBoard();
  const ai = new XiangqiAI('medium');
  const llmAi = new LLMXiangqiAI();
  const officialGeminiAi = new GeminiXiangqiAI();
  const endgameManager = new EndgameManager();

  // Reactive Game States
  const grid = ref(board.getInitialGrid());
  const turn = ref(RED);
  const mode = ref('pvai'); // 'pvp', 'pvai', 'endgame'
  const aiDifficulty = ref('medium');
  const playerSide = ref(RED);

  const selectedSquare = ref(null);
  const validMoves = ref([]);
  const lastMove = ref(null);
  const isAiThinking = ref(false);
  const gameActive = ref(false);

  // Timers & Score Evaluation
  const redTime = ref(600);
  const blackTime = ref(600);
  let timerId = null;

  const evalRedPct = ref(50);
  const evalBlackPct = ref(50);

  // Lists & Histories
  const moveHistory = ref([]);
  const capturedRed = ref([]);
  const capturedBlack = ref([]);

  // UI Overlays & Commentary
  const currentTheme = ref(localStorage.getItem('xiangqi_theme') || 'wood');
  const soundEnabled = ref(true);

  const checkBanner = reactive({ active: false, text: '' });
  const vibrateBoard = ref(false);

  const gptCommentary = ref('');
  const showGptCard = ref(false);

  const gameOverOverlay = reactive({ active: false, title: '', desc: '' });
  const fenModalActive = ref(false);
  const helpModalActive = ref(false);
  const apiModalActive = ref(false);

  // Endgame Challenge State
  const endgameLevels = ref(endgameManager.getAllLevels());
  const endgameLevelIndex = ref(0);
  const currentEndgameDesc = computed(() => {
    const lvl = endgameLevels.value[endgameLevelIndex.value];
    return lvl ? `${lvl.name} (${lvl.difficulty}): ${lvl.desc}` : '';
  });

  // Timers helper
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formattedRedTime = computed(() => formatTime(redTime.value));
  const formattedBlackTime = computed(() => formatTime(blackTime.value));

  const startTimer = () => {
    stopTimer();
    timerId = setInterval(() => {
      if (!gameActive.value) return;
      if (turn.value === RED) {
        if (redTime.value > 0) redTime.value--;
        else handleTimeOut(RED);
      } else {
        if (blackTime.value > 0) blackTime.value--;
        else handleTimeOut(BLACK);
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const resetTimers = () => {
    redTime.value = 600;
    blackTime.value = 600;
  };

  const handleTimeOut = (losingSide) => {
    gameActive.value = false;
    stopTimer();
    const winningSideName = losingSide === RED ? '黑方' : '红方';
    gameOverOverlay.title = '⏱️ 超时获胜！';
    gameOverOverlay.desc = `${winningSideName}因对方用时耗尽获胜！`;
    gameOverOverlay.active = true;
  };

  const updateStateFromBoard = () => {
    grid.value = board.grid.map(row => [...row]);
    turn.value = board.turn;
    lastMove.value = board.getLastMove();
    moveHistory.value = [...board.moveHistory];
    capturedRed.value = [...board.capturedRed];
    capturedBlack.value = [...board.capturedBlack];

    // Update real-time evaluation
    const score = ai.getEvaluationScore(board.grid);
    evalRedPct.value = score.redPct;
    evalBlackPct.value = score.blackPct;
  };

  const applyTheme = (themeKey) => {
    currentTheme.value = themeKey;
    const themeObj = GAME_THEMES[themeKey] || GAME_THEMES.wood;
    Object.values(GAME_THEMES).forEach(t => document.body.classList.remove(t.class));
    document.body.classList.add(themeObj.class);
    try {
      localStorage.setItem('xiangqi_theme', themeKey);
    } catch (e) {}
  };

  const triggerVibrate = () => {
    vibrateBoard.value = true;
    setTimeout(() => { vibrateBoard.value = false; }, 400);
  };

  const triggerCheckBanner = (side) => {
    const sideName = side === RED ? '红方' : '黑方';
    checkBanner.text = `⚡ 将军！${sideName}被照将！`;
    checkBanner.active = true;
    triggerVibrate();
    sounds.playCheck();
    setTimeout(() => { checkBanner.active = false; }, 2000);
  };

  const startNewGame = () => {
    stopTimer();
    board.reset();
    selectedSquare.value = null;
    validMoves.value = [];
    isAiThinking.value = false;
    gameOverOverlay.active = false;
    resetTimers();

    if (mode.value === 'endgame') {
      const lvl = endgameManager.getLevel(endgameLevelIndex.value);
      if (lvl) {
        board.loadFen(lvl.fen);
        playerSide.value = lvl.playerSide || RED;
      }
    }

    updateStateFromBoard();
    gameActive.value = true;
    startTimer();

    // Trigger AI if computer goes first
    if ((mode.value === 'pvai' || mode.value === 'endgame') && turn.value !== playerSide.value) {
      triggerAiTurn();
    }
  };

  const handleCellClick = async (r, c) => {
    if (!gameActive.value || isAiThinking.value) return;

    if ((mode.value === 'pvai' || mode.value === 'endgame') && turn.value !== playerSide.value) return;

    const clickedPiece = board.getPiece(r, c);

    // If square is selected, try to move
    if (selectedSquare.value) {
      const move = validMoves.value.find(m => m.toR === r && m.toC === c);
      if (move) {
        await makeMove(move);
        selectedSquare.value = null;
        validMoves.value = [];
        return;
      }
    }

    // Select piece if it belongs to current turn player
    if (clickedPiece && Rules.getSide(clickedPiece) === turn.value) {
      selectedSquare.value = { r, c };
      validMoves.value = Rules.getLegalMoves(board.grid, r, c);
      sounds.playSelect();
    } else {
      selectedSquare.value = null;
      validMoves.value = [];
    }
  };

  const makeMove = async (move) => {
    const record = board.executeMove(move);
    updateStateFromBoard();

    if (record.captured) {
      sounds.playCapture();
    } else {
      sounds.playMove();
    }

    // Check game over or check status
    const currentTurn = turn.value;
    const inCheck = Rules.isKingInCheck(board.grid, currentTurn);

    if (inCheck) {
      if (Rules.isCheckmate(board.grid, currentTurn)) {
        gameActive.value = false;
        stopTimer();
        sounds.playWin();
        const winnerName = currentTurn === RED ? '黑方' : '红方';
        gameOverOverlay.title = '🏆 绝杀胜出！';
        gameOverOverlay.desc = `${winnerName}将死对手，赢得了本局比赛！`;
        gameOverOverlay.active = true;

        if (mode.value === 'endgame') {
          const currentLvl = endgameLevels.value[endgameLevelIndex.value];
          if (currentLvl && currentTurn !== playerSide.value) {
            endgameManager.saveCompletedLevel(currentLvl.id);
          }
        }
        return;
      } else {
        triggerCheckBanner(currentTurn);
      }
    } else if (Rules.isStalemate(board.grid, currentTurn)) {
      gameActive.value = false;
      stopTimer();
      gameOverOverlay.title = '🤝 困毙和棋！';
      gameOverOverlay.desc = '当前一方无合法走步，判定为和棋。';
      gameOverOverlay.active = true;
      return;
    }

    // Trigger AI if applicable
    if (gameActive.value && (mode.value === 'pvai' || mode.value === 'endgame') && turn.value !== playerSide.value) {
      await triggerAiTurn();
    }
  };

  const triggerAiTurn = async () => {
    if (!gameActive.value || isAiThinking.value) return;
    isAiThinking.value = true;

    try {
      if (aiDifficulty.value === 'gemini_official') {
        const legalMoves = Rules.getAllLegalMoves(board.grid, board.turn);
        if (legalMoves.length === 0) return;

        if (!officialGeminiAi.hasApiKey()) {
          gptCommentary.value = '⚠️ 未在 .env 文件中检测到 VITE_GEMINI_API_KEY。现已自动使用本地 AI 代下。';
          const fallbackMove = await ai.getBestMove(board.grid, board.turn);
          if (fallbackMove && gameActive.value) await makeMove(fallbackMove);
          return;
        }

        gptCommentary.value = '♊ Gemini 2.5-Flash 正在思考最佳棋路中...';
        const historyNotations = board.moveHistory.map(h => h.notation);
        const result = await officialGeminiAi.getMoveFromGemini(board.grid, board.turn, legalMoves, historyNotations);
        gptCommentary.value = `♊ Gemini 棋评: "${result.commentary}"`;

        if (result.move && gameActive.value) {
          await makeMove(result.move);
        }
      } else if (aiDifficulty.value === 'gemini') {
        const legalMoves = Rules.getAllLegalMoves(board.grid, board.turn);
        if (legalMoves.length === 0) return;

        if (!llmAi.hasApiKey()) {
          gptCommentary.value = '⚠️ 未检测到 API Key，请点击设置配置。现已自动使用本地 AI 代下。';
          apiModalActive.value = true;
          const fallbackMove = await ai.getBestMove(board.grid, board.turn);
          if (fallbackMove && gameActive.value) await makeMove(fallbackMove);
          return;
        }

        gptCommentary.value = '🤖 GPT 正在深度推演最佳棋路中...';
        const historyNotations = board.moveHistory.map(h => h.notation);
        const result = await llmAi.getMoveFromGPT(board.grid, board.turn, legalMoves, historyNotations);
        gptCommentary.value = `🤖 GPT 棋评: "${result.commentary}"`;

        if (result.move && gameActive.value) {
          await makeMove(result.move);
        }
      } else {
        const aiMove = await ai.getBestMove(board.grid, board.turn);
        if (aiMove && gameActive.value) {
          await makeMove(aiMove);
        }
      }
    } finally {
      isAiThinking.value = false;
    }
  };

  const undoMove = async () => {
    if (!gameActive.value || isAiThinking.value) return;

    if (mode.value === 'pvai' || mode.value === 'endgame') {
      board.undoMove();
      board.undoMove();
    } else {
      board.undoMove();
    }
    selectedSquare.value = null;
    validMoves.value = [];
    updateStateFromBoard();
  };

  const showHint = async () => {
    if (!gameActive.value || isAiThinking.value) return;
    const bestMove = await ai.getBestMove(board.grid, turn.value);
    if (bestMove) {
      selectedSquare.value = { r: bestMove.fromR, c: bestMove.fromC };
      validMoves.value = [bestMove];
      sounds.playSelect();
    }
  };

  const toggleSound = () => {
    soundEnabled.value = sounds.toggleSound();
  };

  const setMode = (newMode) => {
    mode.value = newMode;
    startNewGame();
  };

  const setDifficulty = (newDiff) => {
    aiDifficulty.value = newDiff;
    if (newDiff === 'gemini_official') {
      showGptCard.value = true;
      if (!officialGeminiAi.hasApiKey()) {
        gptCommentary.value = '⚠️ 未在 .env 文件中检测到 VITE_GEMINI_API_KEY。';
      } else {
        gptCommentary.value = '♊ 已切换为 Gemini 2.5-Flash 大模型对手！';
      }
    } else if (newDiff === 'gemini') {
      showGptCard.value = true;
      if (!llmAi.hasApiKey()) {
        gptCommentary.value = '⚠️ 未检测到 API Key，已为您打开配置窗口。';
        apiModalActive.value = true;
      } else {
        gptCommentary.value = '🤖 已切换为 GPT 大模型对手！';
      }
    } else {
      ai.setDifficulty(newDiff);
      showGptCard.value = false;
    }
  };

  const setPlayerSide = (side) => {
    playerSide.value = side;
    startNewGame();
  };

  const setEndgameLevel = (idx) => {
    endgameLevelIndex.value = idx;
    startNewGame();
  };

  const currentFen = computed(() => gridToFen(grid.value, turn.value));

  const applyFen = (fenStr) => {
    try {
      board.loadFen(fenStr);
      updateStateFromBoard();
      fenModalActive.value = false;
    } catch (e) {
      alert('FEN 格式有误，请输入标准的 Forsyth–Edwards Notation！');
    }
  };

  // Initial Theme Apply
  applyTheme(currentTheme.value);

  onMounted(() => {
    startNewGame();
  });

  onUnmounted(() => {
    stopTimer();
  });

  return {
    grid,
    turn,
    mode,
    aiDifficulty,
    playerSide,
    selectedSquare,
    validMoves,
    lastMove,
    isAiThinking,
    gameActive,
    formattedRedTime,
    formattedBlackTime,
    evalRedPct,
    evalBlackPct,
    moveHistory,
    capturedRed,
    capturedBlack,
    currentTheme,
    soundEnabled,
    checkBanner,
    vibrateBoard,
    gptCommentary,
    showGptCard,
    gameOverOverlay,
    fenModalActive,
    helpModalActive,
    apiModalActive,
    endgameLevels,
    endgameLevelIndex,
    currentEndgameDesc,
    currentFen,
    startNewGame,
    handleCellClick,
    undoMove,
    showHint,
    toggleSound,
    applyTheme,
    setMode,
    setDifficulty,
    setPlayerSide,
    setEndgameLevel,
    applyFen,
    llmAi
  };
}
