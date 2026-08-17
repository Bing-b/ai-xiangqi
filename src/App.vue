<template>
  <div id="app-container">
    <!-- Top Header -->
    <GameHeader />

    <!-- Mobile Quick Actions (Shown on Mobile Phones < 768px) -->
    <div class="mobile-quick-actions">
      <button class="btn btn-primary" @click="startNewGame">🎮 新局</button>
      <button class="btn" @click="onlineModalActive = true">🌐 联机</button>
      <button class="btn" @click="undoMove">↩️ 悔棋</button>
      <button class="btn" @click="showHint">💡 提示</button>
      <button class="btn" @click="toggleSound">{{ soundEnabled ? '🔊' : '🔇' }}</button>
    </div>

    <!-- Main Responsive Layout -->
    <main class="main-layout">
      <!-- Left Control Panel -->
      <GameControlPanel
        :class="{ 'mobile-hidden': mobileTab !== 'settings' }"
        :mode="mode"
        :ai-difficulty="aiDifficulty"
        :player-side="playerSide"
        :endgame-level-index="endgameLevelIndex"
        :current-theme="currentTheme"
        :endgame-levels="endgameLevels"
        :current-endgame-desc="currentEndgameDesc"
        :sound-enabled="soundEnabled"
        :is-connected="onlineMatch.isConnected.value"
        :opponent-nickname="onlineMatch.opponentNickname.value"
        @update:mode="setMode"
        @update:aiDifficulty="setDifficulty"
        @update:playerSide="setPlayerSide"
        @update:endgameLevelIndex="setEndgameLevel"
        @update:currentTheme="applyTheme"
        @start-new-game="startNewGame"
        @undo-move="undoMove"
        @show-hint="showHint"
        @open-help-modal="helpModalActive = true"
        @open-api-modal="apiModalActive = true"
        @open-online-modal="onlineModalActive = true"
        @toggle-sound="toggleSound"
      />

      <!-- Center Board Area -->
      <GameBoard
        :grid="grid"
        :selected-square="selectedSquare"
        :valid-moves="validMoves"
        :last-move="lastMove"
        :check-banner="checkBanner"
        :vibrate-board="vibrateBoard"
        :opponent-emoji="onlineMatch.opponentEmoji.value"
        @cell-click="handleCellClick"
      />

      <!-- Mobile Tab Switcher (Shown under board on Mobile Phones < 768px) -->
      <div class="mobile-tab-bar">
        <button
          class="tab-btn"
          :class="{ active: mobileTab === 'status' }"
          @click="mobileTab = 'status'"
        >
          📊 局势与历史
        </button>
        <button
          class="tab-btn"
          :class="{ active: mobileTab === 'settings' }"
          @click="mobileTab = 'settings'"
        >
          ⚙️ 游戏设置
        </button>
      </div>

      <!-- Right Status & History Panel -->
      <GameStatusPanel
        :class="{ 'mobile-hidden': mobileTab !== 'status' }"
        :turn="turn"
        :formatted-red-time="formattedRedTime"
        :formatted-black-time="formattedBlackTime"
        :eval-red-pct="evalRedPct"
        :eval-black-pct="evalBlackPct"
        :show-gpt-card="showGptCard"
        :gpt-commentary="gptCommentary"
        :move-history="moveHistory"
        :captured-red="capturedRed"
        :captured-black="capturedBlack"
      />
    </main>

    <!-- Game Over Modal Overlay -->
    <div class="overlay" :class="{ active: gameOverOverlay.active }">
      <div class="overlay-card">
        <h2 class="overlay-title">{{ gameOverOverlay.title }}</h2>
        <p class="overlay-desc">{{ gameOverOverlay.desc }}</p>
        <button class="btn btn-primary" style="font-size: 1.1rem; padding: 12px 24px" @click="startNewGame">
          再来一局
        </button>
      </div>
    </div>

    <!-- Modals -->
    <HelpModal v-model="helpModalActive" />
    <ApiModal v-model="apiModalActive" :llm-ai="llmAi" />
    <OnlineModal
      v-model="onlineModalActive"
      :online-match="onlineMatch"
      :auto-join-code="autoJoinCode"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import GameHeader from './components/GameHeader.vue';
import GameBoard from './components/GameBoard.vue';
import GameControlPanel from './components/GameControlPanel.vue';
import GameStatusPanel from './components/GameStatusPanel.vue';
import HelpModal from './components/HelpModal.vue';
import ApiModal from './components/ApiModal.vue';
import OnlineModal from './components/OnlineModal.vue';
import { useXiangqiGame } from './composables/useXiangqiGame.js';

const mobileTab = ref('status');
const autoJoinCode = ref('');

const {
  grid,
  turn,
  mode,
  aiDifficulty,
  playerSide,
  selectedSquare,
  validMoves,
  lastMove,
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
  helpModalActive,
  apiModalActive,
  onlineModalActive,
  endgameLevels,
  endgameLevelIndex,
  currentEndgameDesc,
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
  llmAi,
  onlineMatch
} = useXiangqiGame();

onMounted(() => {
  // Detect room code from URL parameters: ?room=884888
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      autoJoinCode.value = roomParam;
      onlineModalActive.value = true;
    }
  } catch (e) {
    console.error('URL parse error:', e);
  }
});
</script>

<style lang="scss">
@use './assets/styles/main.scss';
</style>
