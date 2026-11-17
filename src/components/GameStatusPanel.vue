<template>
  <aside class="side-panel right-panel">
    <div class="card-panel">
      <div class="status-badge" :class="turn === 'r' ? 'status-red' : 'status-black'">
        {{ turn === 'r' ? '红方 (先手) 行棋' : '黑方 (后手) 行棋' }}
      </div>

      <!-- Real-time Advantage Evaluation Bar -->
      <div class="eval-bar-container" style="margin-top: 14px;">
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
  </aside>
</template>

<script setup>
defineProps({
  turn: String,
  evalRedPct: Number,
  evalBlackPct: Number
});
</script>
