<template>
  <aside class="side-panel left-panel">
    <div class="card-panel">
      <h2 class="card-title">⚙️ 游戏设置</h2>
      <div class="control-group">
        <div class="control-item">
          <label>对战模式:</label>
          <select :value="mode" @change="$emit('update:mode', $event.target.value)">
            <option value="pvp">双人对决</option>
            <option value="pvai">人机对弈</option>
            <option value="endgame">🏆 残局闯关</option>
          </select>
        </div>

        <div v-if="mode === 'pvai'" class="control-group">
          <div class="control-item">
            <label>玩家执棋:</label>
            <select :value="playerSide" @change="$emit('update:playerSide', $event.target.value)">
              <option value="r">执红 (先手)</option>
              <option value="b">执黑 (后手)</option>
            </select>
          </div>
          <div class="control-item">
            <label>AI 难度:</label>
            <select :value="aiDifficulty" @change="$emit('update:aiDifficulty', $event.target.value)">
              <option value="easy">入门难度</option>
              <option value="medium">中级难度</option>
              <option value="hard">大师难度</option>
              <option value="gemini">✨ 大模型 AI 对弈</option>
            </select>
          </div>
        </div>

        <div v-if="mode === 'endgame'" class="control-group">
          <div class="control-item">
            <label>残局关卡:</label>
            <select :value="endgameLevelIndex" @change="$emit('update:endgameLevelIndex', parseInt($event.target.value, 10))">
              <option v-for="(lvl, idx) in endgameLevels" :key="lvl.id" :value="idx">
                {{ lvl.name }}
              </option>
            </select>
          </div>
          <div class="endgame-desc-box">{{ currentEndgameDesc }}</div>
        </div>

        <div class="control-item">
          <label>棋盘主题:</label>
          <select :value="currentTheme" @change="$emit('update:currentTheme', $event.target.value)">
            <option value="wood">🪵 经典木纹</option>
            <option value="ink">🖌️ 典雅水墨</option>
            <option value="dark">🌌 赛博暗黑</option>
          </select>
        </div>
      </div>

      <div class="btn-grid" style="margin-top: 10px;">
        <button class="btn btn-primary" @click="$emit('start-new-game')">🎮 重新开始</button>
        <button class="btn" @click="$emit('undo-move')">↩️ 悔棋</button>
        <button class="btn" @click="$emit('show-hint')">💡 提示</button>
        <button class="btn" @click="$emit('open-fen-modal')">📜 局面 / 棋谱</button>
        <button class="btn" style="grid-column: span 2; background: rgba(212, 163, 115, 0.2); border-color: var(--accent-gold);" @click="$emit('open-help-modal')">
          📖 玩法指南与帮助
        </button>
        <button class="btn" style="grid-column: span 2; background: rgba(129, 140, 248, 0.2); border-color: #818cf8;" @click="$emit('open-api-modal')">
          🔑 大模型接口设置
        </button>
        <button class="btn" style="grid-column: span 2" @click="$emit('toggle-sound')">
          {{ soundEnabled ? '🔊 音效: 开' : '🔇 音效: 关' }}
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  mode: String,
  aiDifficulty: String,
  playerSide: String,
  endgameLevels: Array,
  endgameLevelIndex: Number,
  currentEndgameDesc: String,
  currentTheme: String,
  soundEnabled: Boolean
});

defineEmits([
  'update:mode',
  'update:aiDifficulty',
  'update:playerSide',
  'update:endgameLevelIndex',
  'update:currentTheme',
  'start-new-game',
  'undo-move',
  'show-hint',
  'open-fen-modal',
  'open-help-modal',
  'open-api-modal',
  'toggle-sound'
]);
</script>
