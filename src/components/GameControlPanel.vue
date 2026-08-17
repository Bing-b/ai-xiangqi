<template>
  <aside class="side-panel left-panel">
    <div class="card-panel">
      <h2 class="card-title">⚙️ 游戏设置</h2>
      <div class="control-group">
        <div class="control-item">
          <label>对战模式:</label>
          <select :value="mode" @change="$emit('update:mode', $event.target.value)">
            <option value="pvp">同屏双人对决</option>
            <option value="online">🌐 好友联机对战 (免登录)</option>
            <option value="pvai">人机对弈</option>
            <option value="endgame">🏆 残局闯关</option>
          </select>
        </div>

        <!-- Online Mode Info Box -->
        <div v-if="mode === 'online'" class="online-status-banner">
          <div class="online-tag">
            <span class="status-dot" :class="{ connected: isConnected }"></span>
            <span>{{ isConnected ? '已连线: ' + opponentNickname : '未连接对局' }}</span>
          </div>
          <button class="btn btn-primary btn-sm" @click="$emit('open-online-modal')">
            {{ isConnected ? '👥 房间详情 / 互动' : '🚪 创建或加入房间' }}
          </button>
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
              <optgroup label="⚡ 本地算力引擎">
                <option value="easy">🥉 业余初级 (轻松休闲)</option>
                <option value="medium">🥈 业余高手 (县级水平)</option>
                <option value="hard">🥇 大师级 (省级棋王)</option>
                <option value="master">👑 特级大师 (算无遗策 - 深度计算)</option>
              </optgroup>
              <optgroup label="✨ 大模型 AI 对弈 (联网思考+棋评)">
                <option value="llm_master">🤖 大模型·特级大师 (全局推演)</option>
                <option value="llm_attack">🤖 大模型·狂暴刺客 (弃子强攻)</option>
              </optgroup>
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
        <button
          class="btn"
          style="grid-column: span 2; background: rgba(56, 189, 248, 0.18); border-color: #38bdf8; color: #e0f2fe;"
          @click="$emit('open-online-modal')"
        >
          🌐 双人联机大厅 {{ isConnected ? '(已连线)' : '' }}
        </button>
        <button class="btn btn-primary" @click="$emit('start-new-game')">🎮 重新开始</button>
        <button class="btn" @click="$emit('undo-move')">↩️ 悔棋</button>
        <button class="btn" @click="$emit('show-hint')">💡 提示</button>
        <button class="btn" @click="$emit('toggle-sound')">
          {{ soundEnabled ? '🔊 音效' : '🔇 静音' }}
        </button>
        <button class="btn" style="grid-column: span 2; background: rgba(212, 163, 115, 0.2); border-color: var(--accent-gold);" @click="$emit('open-help-modal')">
          📖 玩法指南与帮助
        </button>
        <button class="btn" style="grid-column: span 2; background: rgba(129, 140, 248, 0.2); border-color: #818cf8;" @click="$emit('open-api-modal')">
          🔑 大模型接口设置
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
  soundEnabled: Boolean,
  isConnected: Boolean,
  opponentNickname: String
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
  'open-help-modal',
  'open-api-modal',
  'open-online-modal',
  'toggle-sound'
]);
</script>

<style scoped>
.online-status-banner {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 10px;
  border-radius: 8px;
  margin: 6px 0 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.online-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #bae6fd;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.status-dot.connected {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.85rem;
}
</style>
