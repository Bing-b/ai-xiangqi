<template>
  <div class="overlay" :class="{ active: modelValue }">
    <div class="overlay-card fen-modal-card">
      <h2 class="overlay-title">📜 局面与棋谱工具</h2>
      
      <div class="fen-field-group">
        <label>当前局面字符串 (FEN 局面码):</label>
        <textarea v-model="inputFen" rows="3" class="fen-textarea"></textarea>
        <div class="fen-btn-row">
          <button class="btn" @click="copyFen">📋 复制局面码</button>
          <button class="btn btn-primary" @click="applyFen">🚀 载入此局面</button>
        </div>
      </div>

      <div class="fen-field-group" style="margin-top: 16px;">
        <label>棋谱文本 (PGN 格式):</label>
        <textarea :value="pgnText" rows="4" class="fen-textarea" readonly></textarea>
        <button class="btn" style="margin-top: 6px;" @click="copyPgn">📋 复制棋谱</button>
      </div>

      <button class="btn" style="margin-top: 20px; width: 100%;" @click="$emit('update:modelValue', false)">关闭窗口</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  currentFen: String,
  moveHistory: Array
});

const emit = defineEmits(['update:modelValue', 'apply-fen']);

const inputFen = ref('');

watch(() => props.currentFen, (newVal) => {
  inputFen.value = newVal;
}, { immediate: true });

const pgnText = computed(() => {
  let pgn = '[Event "Chinese Chess Match"]\n[Site "Vue3 Vibecoding Edition"]\n[Format "Xiangqi PGN"]\n\n';
  for (let i = 0; i < props.moveHistory.length; i += 2) {
    const stepNum = Math.floor(i / 2) + 1;
    const redMove = props.moveHistory[i] ? props.moveHistory[i].notation : '';
    const blackMove = props.moveHistory[i + 1] ? props.moveHistory[i + 1].notation : '';
    pgn += `${stepNum}. ${redMove}  ${blackMove}\n`;
  }
  return pgn;
});

const copyFen = () => {
  navigator.clipboard.writeText(inputFen.value);
  alert('局面码已复制到剪贴板！');
};

const copyPgn = () => {
  navigator.clipboard.writeText(pgnText.value);
  alert('棋谱文本已复制到剪贴板！');
};

const applyFen = () => {
  emit('apply-fen', inputFen.value);
};
</script>
