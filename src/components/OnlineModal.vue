<template>
  <div class="overlay" :class="{ active: modelValue }" @click.self="closeModal">
    <div class="overlay-card fen-modal-card online-modal">
      <!-- Fixed Header -->
      <div class="modal-header">
        <h3 class="modal-title">🌐 双人实时联机 (免登录)</h3>
        <button class="close-btn" aria-label="关闭" @click="closeModal">&times;</button>
      </div>

      <!-- Scrollable Modal Body for Mobile -->
      <div class="online-modal-body">
        <!-- Player Profile / Nickname Bar -->
        <div class="nickname-bar">
          <span class="label">昵称:</span>
          <input
            type="text"
            v-model="tempNickname"
            maxlength="10"
            placeholder="输入你的大名"
            class="nickname-input"
            @blur="handleNicknameChange"
            @keyup.enter="handleNicknameChange"
          />
          <span class="tip-badge">已存</span>
        </div>

        <!-- Not Connected State: Tabs for Create or Join -->
        <div v-if="!isConnected" class="online-setup">
          <div class="tab-header">
            <button
              class="tab-item"
              :class="{ active: activeTab === 'create' }"
              @click="activeTab = 'create'"
            >
              🎮 创建房间 (执红)
            </button>
            <button
              class="tab-item"
              :class="{ active: activeTab === 'join' }"
              @click="activeTab = 'join'"
            >
              🚪 加入房间 (执黑)
            </button>
          </div>

          <!-- Create Room Tab -->
          <div v-if="activeTab === 'create'" class="tab-content">
            <div v-if="onlineStatus === 'disconnected' || onlineStatus === 'error'" class="action-box">
              <p class="desc">生成专属 6 位房间码，微信/QQ 分享链接给好友即可秒级连线！</p>
              <button class="btn btn-primary create-btn" @click="handleCreate">
                ✨ 立即生成对战房间
              </button>
            </div>

            <div v-else-if="onlineStatus === 'creating' || onlineStatus === 'waiting'" class="waiting-box">
              <div class="room-code-display">
                <span class="room-code-label">6位房间码</span>
                <div class="room-code-number">{{ roomId }}</div>
              </div>

              <div class="copy-actions">
                <button class="btn btn-primary copy-btn" @click="copyRoomLink">
                  {{ copiedLink ? '✅ 链接已复制' : '📋 复制邀请链接' }}
                </button>
                <button class="btn copy-btn" @click="copyRoomCode">
                  {{ copiedCode ? '✅ 房间码已复制' : '🔢 复制房间码' }}
                </button>
              </div>

              <div class="spinner-container">
                <div class="pulse-ring"></div>
                <p class="waiting-text">正在等待好友连线中...</p>
                <p class="waiting-subtext">好友点击链接或输入房间码即可自动进房！</p>
              </div>

              <button class="btn btn-danger-outline cancel-btn" @click="handleLeave">
                取消并退出房间
              </button>
            </div>
          </div>

          <!-- Join Room Tab -->
          <div v-if="activeTab === 'join'" class="tab-content">
            <div class="join-box">
              <p class="desc">请输入好友分享给你的 6 位房间码：</p>
              <div class="join-input-row">
                <input
                  type="text"
                  v-model="inputCode"
                  maxlength="6"
                  placeholder="6位码"
                  class="room-input"
                  @keyup.enter="handleJoin"
                />
                <button
                  class="btn btn-primary join-action-btn"
                  :disabled="!inputCode.trim() || onlineStatus === 'joining'"
                  @click="handleJoin"
                >
                  {{ onlineStatus === 'joining' ? '连接中...' : '🚀 加入对局' }}
                </button>
              </div>
              <p v-if="onlineStatus === 'joining'" class="status-msg joining">
                正在建立 P2P 毫秒级直连，请稍候...
              </p>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="error-banner">
            ⚠️ {{ errorMessage }}
          </div>
        </div>

        <!-- Connected State -->
        <div v-else class="connected-box">
          <div class="vs-card">
            <div class="player-card me" :class="isHost ? 'red-side' : 'black-side'">
              <div class="side-tag">{{ isHost ? '红方 (先手)' : '黑方 (后手)' }}</div>
              <div class="player-name">{{ myNickname }} (你)</div>
            </div>
            <div class="vs-divider">VS</div>
            <div class="player-card opp" :class="!isHost ? 'red-side' : 'black-side'">
              <div class="side-tag">{{ !isHost ? '红方 (先手)' : '黑方 (后手)' }}</div>
              <div class="player-name">{{ opponentNickname }}</div>
            </div>
          </div>

          <div class="quick-emoji-bar">
            <span class="emoji-title">发个表情互动:</span>
            <div class="emoji-list">
              <button
                v-for="emo in emojis"
                :key="emo"
                class="emoji-btn"
                @click="handleSendEmoji(emo)"
              >
                {{ emo }}
              </button>
            </div>
          </div>

          <div class="connected-actions">
            <button class="btn btn-primary" @click="closeModal">
              🎯 返回棋盘对弈
            </button>
            <button class="btn btn-danger-outline" @click="handleLeave">
              🚪 退出当前房间
            </button>
          </div>
        </div>

        <div class="modal-footer-tip">
          💡 基于 WebRTC 浏览器直连，无需注册、零中转延迟。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  onlineMatch: Object,
  autoJoinCode: String
});

const emit = defineEmits(['update:modelValue', 'room-connected']);

const activeTab = ref('create');
const tempNickname = ref(props.onlineMatch.myNickname.value);
const inputCode = ref('');
const copiedLink = ref(false);
const copiedCode = ref(false);

const emojis = ['🍵', '☕', '👍', '👏', '😭', '💥', '🏆', '🤔', '🔥', '🤝'];

const {
  roomId,
  isHost,
  onlineStatus,
  isConnected,
  errorMessage,
  myNickname,
  opponentNickname,
  setNickname,
  createRoom,
  joinRoom,
  sendEmoji,
  leaveRoom
} = props.onlineMatch;

watch(() => props.autoJoinCode, (code) => {
  if (code) {
    activeTab.value = 'join';
    inputCode.value = code;
    handleJoin();
  }
}, { immediate: true });

function closeModal() {
  emit('update:modelValue', false);
}

function handleNicknameChange() {
  if (tempNickname.value.trim()) {
    setNickname(tempNickname.value.trim());
  }
}

function handleCreate() {
  handleNicknameChange();
  createRoom();
}

function handleJoin() {
  if (!inputCode.value.trim()) return;
  handleNicknameChange();
  joinRoom(inputCode.value.trim());
}

function handleLeave() {
  leaveRoom();
}

function handleSendEmoji(emoji) {
  sendEmoji(emoji);
}

function copyRoomCode() {
  if (!roomId.value) return;
  navigator.clipboard.writeText(roomId.value);
  copiedCode.value = true;
  setTimeout(() => { copiedCode.value = false; }, 2000);
}

function copyRoomLink() {
  if (!roomId.value) return;
  const url = `${window.location.origin}${window.location.pathname}?room=${roomId.value}`;
  navigator.clipboard.writeText(url);
  copiedLink.value = true;
  setTimeout(() => { copiedLink.value = false; }, 2000);
}
</script>

<style scoped>
.online-modal {
  max-width: 480px;
  width: 94%;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  text-align: left;
  box-sizing: border-box;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(212, 163, 115, 0.25);
  padding-bottom: 10px;
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--accent-gold, #d4a373);
  margin: 0;
  line-height: 1.3;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.6rem;
  color: #a89f91;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  touch-action: manipulation;
}

.close-btn:hover {
  color: #fff;
}

.online-modal-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 1px;
}

.nickname-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.25);
  padding: 6px 10px;
  border-radius: 8px;
  margin: 10px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.nickname-bar .label {
  font-size: 0.85rem;
  color: #d4a373;
  flex-shrink: 0;
}

.nickname-input {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 1px dashed rgba(212, 163, 115, 0.5);
  color: #fff;
  font-size: 15px;
  padding: 3px 6px;
  outline: none;
  min-width: 0;
}

.tip-badge {
  font-size: 0.75rem;
  color: #888;
  flex-shrink: 0;
}

.tab-header {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.tab-item {
  flex: 1;
  padding: 8px 4px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 163, 115, 0.2);
  color: #c4b998;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  text-align: center;
  white-space: nowrap;
}

.tab-item.active {
  background: rgba(212, 163, 115, 0.25);
  color: #fff;
  border-color: var(--accent-gold, #d4a373);
}

.tab-content {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 14px 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.desc {
  font-size: 0.85rem;
  color: #b5a995;
  line-height: 1.45;
  margin: 0 0 12px;
}

.create-btn {
  width: 100%;
  padding: 10px;
  font-size: 0.95rem;
  font-weight: bold;
}

.room-code-display {
  text-align: center;
  background: rgba(0, 0, 0, 0.4);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--accent-gold, #d4a373);
  margin-bottom: 12px;
}

.room-code-label {
  font-size: 0.75rem;
  color: #aaa;
  display: block;
}

.room-code-number {
  font-size: 1.8rem;
  font-family: monospace;
  font-weight: bold;
  letter-spacing: 4px;
  color: #f7d070;
  line-height: 1.2;
}

.copy-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.copy-btn {
  padding: 8px 4px;
  font-size: 0.82rem;
  white-space: nowrap;
}

.spinner-container {
  text-align: center;
  padding: 8px 0;
}

.pulse-ring {
  width: 26px;
  height: 26px;
  border: 3px solid #d4a373;
  border-top-color: transparent;
  border-radius: 50%;
  margin: 0 auto 6px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.waiting-text {
  font-size: 0.9rem;
  font-weight: bold;
  color: #f7d070;
  margin: 2px 0;
}

.waiting-subtext {
  font-size: 0.75rem;
  color: #888;
  margin: 2px 0;
}

.cancel-btn {
  width: 100%;
  margin-top: 8px;
  padding: 7px;
  font-size: 0.82rem;
  border-color: #ef4444;
  color: #fca5a5;
  background: transparent;
}

.cancel-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.join-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.room-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(212, 163, 115, 0.4);
  color: #fff;
  font-size: 1.1rem;
  text-align: center;
  letter-spacing: 3px;
  font-family: monospace;
  border-radius: 6px;
  padding: 7px 4px;
  min-width: 0;
}

.join-action-btn {
  flex-shrink: 0;
  padding: 8px 14px;
  font-size: 0.9rem;
}

.status-msg {
  font-size: 0.8rem;
  margin-top: 8px;
}

.status-msg.joining {
  color: #818cf8;
}

.error-banner {
  margin-top: 10px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #fca5a5;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
}

/* VS Card */
.vs-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid rgba(212, 163, 115, 0.3);
}

.player-card {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.player-card .side-tag {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  display: inline-block;
  margin-bottom: 4px;
  white-space: nowrap;
}

.player-card.red-side .side-tag {
  background: #dc2626;
  color: #fff;
}

.player-card.black-side .side-tag {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #475569;
}

.player-name {
  font-size: 0.9rem;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vs-divider {
  font-size: 1.1rem;
  font-weight: 900;
  color: #f59e0b;
  padding: 0 8px;
  flex-shrink: 0;
}

.quick-emoji-bar {
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.emoji-title {
  font-size: 0.75rem;
  color: #aaa;
  display: block;
  margin-bottom: 5px;
}

.emoji-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.emoji-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 1.15rem;
  padding: 4px 6px;
  cursor: pointer;
  transition: transform 0.1s;
  touch-action: manipulation;
  min-width: 32px;
  min-height: 32px;
}

.emoji-btn:active {
  transform: scale(1.25);
  background: rgba(255, 255, 255, 0.25);
}

.connected-actions {
  display: flex;
  gap: 8px;
}

.connected-actions .btn {
  flex: 1;
  padding: 8px;
  font-size: 0.85rem;
}

.modal-footer-tip {
  font-size: 0.7rem;
  color: #888;
  text-align: center;
  margin-top: 10px;
}

/* Mobile & Small Screen Adaptation */
@media (max-width: 480px) {
  .online-modal {
    width: 95vw;
    padding: 14px 12px;
    max-height: 90vh;
    border-radius: 12px;
  }

  .modal-title {
    font-size: 1rem;
  }

  .tab-item {
    font-size: 0.8rem;
    padding: 7px 2px;
  }

  .tab-content {
    padding: 10px 8px;
  }

  .room-code-number {
    font-size: 1.6rem;
    letter-spacing: 3px;
  }

  .copy-btn {
    font-size: 0.78rem;
    padding: 8px 2px;
  }

  .room-input {
    font-size: 1rem;
    letter-spacing: 2px;
  }

  .join-action-btn {
    padding: 8px 10px;
    font-size: 0.82rem;
  }
}
</style>
