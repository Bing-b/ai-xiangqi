<template>
  <div class="overlay" :class="{ active: modelValue }" @click.self="$emit('update:modelValue', false)">
    <div class="overlay-card fen-modal-card" style="max-width: 520px; text-align: left;">
      <h2 class="overlay-title" style="text-align: center;">🔑 大模型接口设置</h2>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.5;">
        🛡️ <strong>安全防泄漏提示</strong>：您的密钥将仅保存在您浏览器的本地存储中，绝不会写入源代码或上传至远程仓库。
      </p>

      <div class="fen-field-group">
        <label>接口密钥 (API Key):</label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input :type="keyVisible ? 'text' : 'password'" v-model="inputKey" class="fen-textarea" style="height: 38px; resize: none; flex: 1; padding: 8px 12px;" placeholder="例如: sk-***" />
          <button class="btn" style="padding: 8px 12px; height: 38px;" title="显示/隐藏密钥" @click="keyVisible = !keyVisible">
            {{ keyVisible ? '🙈' : '👁️' }}
          </button>
        </div>
      </div>

      <div class="fen-field-group" style="margin-top: 12px;">
        <label>接口域名地址 (Base URL):</label>
        <input type="text" v-model="inputBaseUrl" class="fen-textarea" style="height: 38px; resize: none; padding: 8px 12px;" placeholder="例如: https://api.openai.com/v1" />
      </div>

      <div class="fen-field-group" style="margin-top: 12px;">
        <label>模型名称 (Model):</label>
        <input type="text" v-model="inputModel" class="fen-textarea" style="height: 38px; resize: none; padding: 8px 12px;" placeholder="例如: gpt-4o-mini / deepseek-chat" />
      </div>

      <div v-if="statusMsg" style="font-size: 0.85rem; margin-top: 10px; min-height: 20px; font-weight: bold;" :style="{ color: statusColor }">
        {{ statusMsg }}
      </div>

      <div class="fen-btn-row" style="margin-top: 16px;">
        <button class="btn btn-primary" style="flex: 1;" @click="saveConfig">💾 保存配置</button>
        <button class="btn" style="color: #ff7675; border-color: #ff7675;" @click="clearConfig">🗑️ 清除</button>
        <button class="btn" @click="$emit('update:modelValue', false)">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  llmAi: Object
});

const emit = defineEmits(['update:modelValue']);

const inputKey = ref('');
const inputBaseUrl = ref('');
const inputModel = ref('');
const keyVisible = ref(false);
const statusMsg = ref('');
const statusColor = ref('#2ecc71');

watch(() => props.modelValue, (val) => {
  if (val && props.llmAi) {
    inputKey.value = props.llmAi.loadApiKey();
    inputBaseUrl.value = props.llmAi.loadBaseUrl();
    inputModel.value = props.llmAi.loadModelName();
    statusMsg.value = '';
  }
});

const saveConfig = () => {
  const key = inputKey.value.trim();
  const url = inputBaseUrl.value.trim();
  const model = inputModel.value.trim();

  try {
    if (key) localStorage.setItem('xiangqi_llm_api_key', key);
    else localStorage.removeItem('xiangqi_llm_api_key');

    if (url) localStorage.setItem('xiangqi_llm_base_url', url);
    else localStorage.removeItem('xiangqi_llm_base_url');

    if (model) localStorage.setItem('xiangqi_llm_model', model);
    else localStorage.removeItem('xiangqi_llm_model');

    if (props.llmAi) props.llmAi.refreshConfig();

    statusColor.value = '#2ecc71';
    statusMsg.value = '✅ 配置已成功保存至浏览器本地！';
  } catch (e) {
    statusColor.value = '#e74c3c';
    statusMsg.value = '❌ 本地存储写入失败: ' + e.message;
  }
};

const clearConfig = () => {
  try {
    localStorage.removeItem('xiangqi_llm_api_key');
    localStorage.removeItem('xiangqi_llm_base_url');
    localStorage.removeItem('xiangqi_llm_model');
    if (props.llmAi) props.llmAi.refreshConfig();
    inputKey.value = '';
    inputBaseUrl.value = '';
    inputModel.value = '';
    statusColor.value = '#e67e22';
    statusMsg.value = '🗑️ 已成功清除本地 Key 及相关设置！';
  } catch (e) {}
};
</script>
