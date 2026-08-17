import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { XiangqiBoard } from "../core/board.js";
import { XiangqiAI } from "../core/ai.js";
import { LLMXiangqiAI } from "../core/llm-ai.js";
import { EndgameManager } from "../core/endgame.js";
import { sounds } from "../core/audio.js";
import { Rules } from "../core/rules.js";
import { RED, BLACK, gridToFen, GAME_THEMES } from "../core/constants.js";
import { useOnlineMatch } from "./useOnlineMatch.js";

export function useXiangqiGame() {
  const board = new XiangqiBoard();
  const ai = new XiangqiAI("medium");
  const llmAi = new LLMXiangqiAI();
  const endgameManager = new EndgameManager();
  const onlineMatch = useOnlineMatch();

  // Reactive Game States
  const grid = ref(board.getInitialGrid());
  const turn = ref(RED);
  const mode = ref("pvai"); // 'pvp', 'pvai', 'endgame', 'online'
  const aiDifficulty = ref("medium");
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
  const currentTheme = ref(localStorage.getItem("xiangqi_theme") || "wood");
  const soundEnabled = ref(true);

  const checkBanner = reactive({ active: false, text: "" });
  const vibrateBoard = ref(false);

  const gptCommentary = ref("");
  const showGptCard = ref(false);

  const gameOverOverlay = reactive({ active: false, title: "", desc: "" });
  const fenModalActive = ref(false);
  const helpModalActive = ref(false);
  const apiModalActive = ref(false);
  const onlineModalActive = ref(false);

  // Endgame Challenge State
  const endgameLevels = ref(endgameManager.getAllLevels());
  const endgameLevelIndex = ref(0);
  const currentEndgameDesc = computed(() => {
    const lvl = endgameLevels.value[endgameLevelIndex.value];
    return lvl ? `${lvl.name} (${lvl.difficulty}): ${lvl.desc}` : "";
  });

  // Timers helper
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
    const winningSideName = losingSide === RED ? "黑方" : "红方";
    gameOverOverlay.title = "⏱️ 超时获胜！";
    gameOverOverlay.desc = `${winningSideName}因对方用时耗尽获胜！`;
    gameOverOverlay.active = true;
  };

  const updateStateFromBoard = () => {
    grid.value = board.grid.map((row) => [...row]);
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
    Object.values(GAME_THEMES).forEach((t) =>
      document.body.classList.remove(t.class),
    );
    document.body.classList.add(themeObj.class);
    try {
      localStorage.setItem("xiangqi_theme", themeKey);
    } catch (e) {}
  };

  const triggerVibrate = () => {
    vibrateBoard.value = true;
    setTimeout(() => {
      vibrateBoard.value = false;
    }, 400);
  };

  const triggerCheckBanner = (side) => {
    const sideName = side === RED ? "红方" : "黑方";
    checkBanner.text = `⚡ 将军！${sideName}被照将！`;
    checkBanner.active = true;
    triggerVibrate();
    sounds.playCheck();
    setTimeout(() => {
      checkBanner.active = false;
    }, 2000);
  };

  const startNewGame = () => {
    stopTimer();
    board.reset();
    selectedSquare.value = null;
    validMoves.value = [];
    isAiThinking.value = false;
    gameOverOverlay.active = false;
    resetTimers();

    if (mode.value === "endgame") {
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
    if (
      (mode.value === "pvai" || mode.value === "endgame") &&
      turn.value !== playerSide.value
    ) {
      triggerAiTurn();
    }
  };

  const handleCellClick = async (r, c) => {
    if (!gameActive.value || isAiThinking.value) return;

    // In AI mode or Endgame mode, restrict to player's turn
    if (
      (mode.value === "pvai" || mode.value === "endgame") &&
      turn.value !== playerSide.value
    ) {
      return;
    }

    // In Online mode, only allow moving if it's player's turn
    if (mode.value === "online") {
      if (!onlineMatch.isConnected.value) {
        onlineModalActive.value = true;
        return;
      }
      if (turn.value !== playerSide.value) {
        return;
      }
    }

    const clickedPiece = board.getPiece(r, c);

    // If square is selected, try to move
    if (selectedSquare.value) {
      const move = validMoves.value.find((m) => m.toR === r && m.toC === c);
      if (move) {
        selectedSquare.value = null;
        validMoves.value = [];
        await makeMove(move, false);
        return;
      }
    }

    // Select piece if it belongs to current turn player
    if (clickedPiece && Rules.getSide(clickedPiece) === turn.value) {
      // In online mode, can only pick own pieces
      if (mode.value === "online" && Rules.getSide(clickedPiece) !== playerSide.value) {
        return;
      }
      selectedSquare.value = { r, c };
      validMoves.value = Rules.getLegalMoves(board.grid, r, c);
      sounds.playSelect();
    } else {
      selectedSquare.value = null;
      validMoves.value = [];
    }
  };

  const makeMove = async (move, isRemote = false) => {
    const record = board.executeMove(move);
    updateStateFromBoard();

    // Send move to peer if in online mode and move was made locally
    if (mode.value === "online" && !isRemote) {
      onlineMatch.sendMove(move);
    }

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
        const winnerName = currentTurn === RED ? "黑方" : "红方";
        gameOverOverlay.title = "🏆 绝杀胜出！";
        gameOverOverlay.desc = `${winnerName}将死对手，赢得了本局比赛！`;
        gameOverOverlay.active = true;

        if (mode.value === "endgame") {
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
      gameOverOverlay.title = "🤝 困毙和棋！";
      gameOverOverlay.desc = "当前一方无合法走步，判定为和棋。";
      gameOverOverlay.active = true;
      return;
    }

    // Trigger AI if applicable
    if (
      (mode.value === "pvai" || mode.value === "endgame") &&
      turn.value !== playerSide.value &&
      gameActive.value
    ) {
      triggerAiTurn();
    }
  };

  const isLLMDifficulty = (diff) => {
    return diff === 'gemini' || (typeof diff === 'string' && diff.startsWith('llm_'));
  };

  const triggerAiTurn = async () => {
    if (!gameActive.value) return;
    isAiThinking.value = true;

    try {
      if (isLLMDifficulty(aiDifficulty.value) && llmAi.hasApiKey()) {
        const fen = gridToFen(board.grid, board.turn);
        const historyNotations = board.moveHistory.map((m) => m.notation);
        const result = await llmAi.getNextMove(
          fen,
          board.turn,
          board.grid,
          historyNotations,
          aiDifficulty.value
        );
        llmAi.recordCallSuccess();
        gptCommentary.value = `🤖 AI 棋评: "${result.commentary}"`;

        if (result.move && gameActive.value) {
          await makeMove(result.move);
        }
      } else {
        const aiMove = await ai.getBestMove(board.grid, board.turn);
        if (aiMove && gameActive.value) {
          await makeMove(aiMove);
        }
      }
    } catch (err) {
      console.error("AI error:", err);
      gptCommentary.value = `⚠️ AI 思考异常 (${err.message || "网络问题"})，已自动使用本地 AI 代下。`;
      const fallbackMove = await ai.getBestMove(board.grid, board.turn);
      if (fallbackMove && gameActive.value) await makeMove(fallbackMove);
    } finally {
      isAiThinking.value = false;
    }
  };

  const undoMove = async () => {
    if (!gameActive.value || isAiThinking.value) return;

    if (mode.value === "online") {
      if (!onlineMatch.isConnected.value) return;
      onlineMatch.requestUndo();
      alert("已向对手发送悔棋请求，等待对方同意...");
      return;
    }

    if (mode.value === "pvai" || mode.value === "endgame") {
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
    if (newMode === "online") {
      onlineModalActive.value = true;
    } else {
      startNewGame();
    }
  };

  const setDifficulty = (newDiff) => {
    aiDifficulty.value = newDiff;
    if (isLLMDifficulty(newDiff)) {
      showGptCard.value = true;
      if (!llmAi.hasApiKey()) {
        gptCommentary.value =
          "⚠️ 未检测到接口密钥，若需使用大模型 AI 请在侧边栏手动配置。";
      } else {
        gptCommentary.value = "🤖 已切换为大模型 AI 对手！";
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
      alert("FEN 格式有误，请输入标准的 Forsyth–Edwards Notation！");
    }
  };

  // Setup Online Listeners
  onlineMatch.listeners.onConnected = ({ isHost }) => {
    mode.value = "online";
    playerSide.value = isHost ? RED : BLACK;
    startNewGame();
  };

  onlineMatch.listeners.onMove = (remoteMove) => {
    if (mode.value === "online") {
      makeMove(remoteMove, true);
    }
  };

  onlineMatch.listeners.onUndoReq = () => {
    const agree = confirm(`【${onlineMatch.opponentNickname.value}】请求悔棋，是否同意？`);
    onlineMatch.respondUndo(agree);
    if (agree) {
      board.undoMove();
      selectedSquare.value = null;
      validMoves.value = [];
      updateStateFromBoard();
    }
  };

  onlineMatch.listeners.onUndoAccept = () => {
    alert("对方已同意您的悔棋请求！");
    board.undoMove();
    selectedSquare.value = null;
    validMoves.value = [];
    updateStateFromBoard();
  };

  onlineMatch.listeners.onUndoReject = () => {
    alert("对方拒绝了您的悔棋请求。");
  };

  onlineMatch.listeners.onResign = () => {
    gameActive.value = false;
    stopTimer();
    sounds.playWin();
    gameOverOverlay.title = "🏆 对方认输！";
    gameOverOverlay.desc = `${onlineMatch.opponentNickname.value} 主动认输，恭喜获胜！`;
    gameOverOverlay.active = true;
  };

  // Initial Theme Apply
  applyTheme(currentTheme.value);

  onMounted(() => {
    startNewGame();
  });

  onUnmounted(() => {
    stopTimer();
    onlineMatch.leaveRoom();
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
    onlineModalActive,
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
    llmAi,
    onlineMatch,
  };
}
