<template>
  <div class="overlay" :class="{ active: modelValue }">
    <div class="overlay-card fen-modal-card" style="max-width: 600px; text-align: left;">
      <h2 class="overlay-title" style="text-align: center;">📖 游戏操作与玩法说明</h2>
      
      <div class="help-section" style="max-height: 420px; overflow-y: auto; padding-right: 8px;">
        <h3 style="color: var(--accent-gold); margin-top: 10px; font-size: 1.05rem;">🎯 基础行棋操作</h3>
        <ul style="padding-left: 20px; font-size: 0.9rem; color: var(--text-main); line-height: 1.6;">
          <li><strong>选择棋子</strong>：点击己方棋子，棋子将呈现高亮选中状态。</li>
          <li><strong>走棋/吃子</strong>：点击棋盘上的绿色高亮圈（可行走目标）或红色目标圈（可吃目标）即可落子。</li>
        </ul>

        <h3 style="color: var(--accent-gold); margin-top: 14px; font-size: 1.05rem;">⚔️ 对战模式介绍</h3>
        <ul style="padding-left: 20px; font-size: 0.9rem; color: var(--text-main); line-height: 1.6;">
          <li><strong>🌐 好友联机对战</strong>：基于 WebRTC P2P 直连，一键生成房间码或邀请链接，好友点开即可免登录实时对弈。</li>
          <li><strong>👥 同屏对决</strong>：支持同屏两人轮流执红/执黑下棋。</li>
          <li><strong>🤖 人机对弈</strong>：内置业余初级、大师级、特级大师以及大模型战术家。</li>
          <li><strong>🏆 残局闯关</strong>：内置《双马饮泉》、《千里独行》等经典杀局。</li>
        </ul>

        <h3 style="color: var(--accent-gold); margin-top: 14px; font-size: 1.05rem;">🤖 大模型 AI 对弈</h3>
        <ul style="padding-left: 20px; font-size: 0.9rem; color: var(--text-main); line-height: 1.6;">
          <li>在 AI 难度中可选择 <strong>特级大师 (全局推演)</strong> 或 <strong>狂暴刺客 (弃子强攻)</strong>。</li>
          <li>可在侧边栏“🔑 大模型接口设置”中配置密钥与接口地址。</li>
          <li>AI 下棋时会在侧边栏输出**实时的战术思路与棋局点评**！</li>
        </ul>

        <h3 style="color: var(--accent-gold); margin-top: 14px; font-size: 1.05rem;">🛠️ 实用工具与辅助</h3>
        <ul style="padding-left: 20px; font-size: 0.9rem; color: var(--text-main); line-height: 1.6;">
          <li><strong>↩️ 悔棋</strong>：撤销上一步走法（人机模式下自动连撤两步，联机模式下向对手发送协商请求）。</li>
          <li><strong>💡 提示</strong>：AI 自动计算并显示当前局势的最优走法。</li>
          <li><strong>🎨 棋盘主题</strong>：可切换【经典木纹】、【典雅水墨】、【赛博暗黑】皮肤。</li>
        </ul>
      </div>

      <button class="btn btn-primary" style="margin-top: 16px; width: 100%;" @click="$emit('update:modelValue', false)">我知道了</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: Boolean
});

defineEmits(['update:modelValue']);
</script>
