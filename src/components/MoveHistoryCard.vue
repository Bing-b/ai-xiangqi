<template>
  <div class="card-panel history-card" style="flex: 1; display: flex; flex-direction: column; min-height: 140px;">
    <h2 class="card-title">📜 走子记录</h2>
    <div class="history-log" style="flex: 1;">
      <div v-for="(pair, idx) in historyPairs" :key="'pair-'+idx" class="history-row">
        <span class="step-num">{{ idx + 1 }}.</span>
        <span class="red-move">{{ pair.red ? pair.red.notation : '' }}</span>
        <span class="black-move">{{ pair.black ? pair.black.notation : '' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  moveHistory: Array
});

const historyPairs = computed(() => {
  const pairs = [];
  for (let i = 0; i < props.moveHistory.length; i += 2) {
    pairs.push({
      red: props.moveHistory[i],
      black: props.moveHistory[i + 1] || null
    });
  }
  return pairs;
});
</script>
