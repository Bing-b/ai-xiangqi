<template>
  <div class="card-panel">
    <h2 class="card-title">⚔️ 吃子统计</h2>
    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 2px;">黑方吃掉红方:</div>
    <div class="graveyard">
      <div v-for="(code, idx) in capturedRed" :key="'cred-'+idx" class="piece piece-red piece-small">
        <div class="piece-inner">{{ PIECE_NAMES[code] }}</div>
      </div>
    </div>
    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; margin-bottom: 2px;">红方吃掉黑方:</div>
    <div class="graveyard">
      <div v-for="(code, idx) in capturedBlack" :key="'cblk-'+idx" class="piece piece-black piece-small">
        <div class="piece-inner">{{ PIECE_NAMES[code] }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { PIECE_NAMES } from '../core/constants.js';

defineProps({
  capturedRed: Array,
  capturedBlack: Array
});
</script>
