<template>
  <div v-if="showGptCard" class="card-panel">
    <h2 class="card-title">🤖 AI 实时棋评</h2>
    <div class="gemini-commentary-box">
      {{ gptCommentary || '等待大模型 AI 下子并进行战略分析...' }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  showGptCard: Boolean,
  gptCommentary: String
});
</script>
