<template>
  <aside class="side-panel right-panel">
    <!-- Status & Timer Card -->
    <div class="card-panel">
      <div class="status-badge" :class="turn === 'r' ? 'status-red' : 'status-black'">
        {{ turn === 'r' ? '红方 (先手) 行棋' : '黑方 (后手) 行棋' }}
      </div>
      <div class="timer-box">
        <div class="timer-item">
          <span class="timer-label">红方用时</span>
          <span class="timer-val" style="color: #ff7675">{{ formattedRedTime }}</span>
        </div>
        <div class="timer-item">
          <span class="timer-label">黑方用时</span>
          <span class="timer-val" style="color: #74b9ff">{{ formattedBlackTime }}</span>
        </div>
      </div>

      <!-- Real-time Advantage Evaluation Bar -->
      <div class="eval-bar-container" style="margin-top: 10px;">
        <div class="eval-labels">
          <span class="eval-label red-text">红 {{ evalRedPct }}%</span>
          <span class="eval-label black-text">黑 {{ evalBlackPct }}%</span>
        </div>
        <div class="eval-track">
          <div class="eval-fill eval-red" :style="{ width: evalRedPct + '%' }"></div>
          <div class="eval-fill eval-black" :style="{ width: evalBlackPct + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- GPT Real-time AI Commentary Card -->
    <GptCommentaryCard :show-gpt-card="showGptCard" :gpt-commentary="gptCommentary" />

    <!-- History Log Card -->
    <MoveHistoryCard :move-history="moveHistory" />

    <!-- Captured Pieces Card -->
    <CapturedPiecesCard :captured-red="capturedRed" :captured-black="capturedBlack" />
  </aside>
</template>

<script setup>
import GptCommentaryCard from './GptCommentaryCard.vue';
import MoveHistoryCard from './MoveHistoryCard.vue';
import CapturedPiecesCard from './CapturedPiecesCard.vue';

defineProps({
  turn: String,
  formattedRedTime: String,
  formattedBlackTime: String,
  evalRedPct: Number,
  evalBlackPct: Number,
  showGptCard: Boolean,
  gptCommentary: String,
  moveHistory: Array,
  capturedRed: Array,
  capturedBlack: Array
});
</script>
