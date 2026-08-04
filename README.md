# 中国象棋 - Xiangqi (Vue 3 + Vite + Sass Edition)

![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat&logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite&logoColor=white)
![Sass](https://img.shields.io/badge/Sass-1.83-CC6699?style=flat&logo=sass&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![pnpm](https://img.shields.io/badge/pnpm-8.15+-F69220?style=flat&logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

基于 **Vue 3 + Vite + Sass (SCSS)** 重构的工程化中国象棋 Web 应用。保持了 100% 原汁原味的视觉美学、三大主题皮肤与动画微交互，集成了经典 PvP 双人同屏对战、本地 Minimax 剪枝算法 AI、经典残局闯关，以及支持结合大语言模型的 **GPT 智能对弈与实时棋局解说**。

---

## 🌟 核心功能特性

### ⚔️ 多样化对战模式
* **👥 双人同屏对决 (PvP)**：支持两人在同一设备上轮流执红/执黑切磋。
* **🤖 智能人机对弈 (PvAI)**：
  * **入门 (Easy)**：随机+基础估值走法，适合新手快速熟悉规则。
  * **中级 (Medium)**：具备一定算力的常规 Alpha-Beta 剪枝搜索。
  * **大师 (Hard)**：深层搜索加位置分值矩阵评估，走法严密老练。
* **🏆 经典残局闯关 (Endgame)**：
  * 内置《双马饮泉》、《千里独行》等经典杀局名局。
  * 自动保存关卡通关记录与解局进度。
* **✨ GPT 大模型对弈**：
  * 结合 GPT 大语言模型进行棋局分析与精准着法推演。
  * 侧边栏提供**实时战术思路解说与棋局点评**。

---

### 🎨 视觉美学与皮肤系统
* **🪵 经典木纹 (Wood)**：古色古香的古朴木质棋盘风格。
* **🖌️ 典雅水墨 (Ink)**：静谧雅致的水墨风尚。
* **🌌 赛博暗黑 (Dark Cyber)**：充满未来科技感的暗黑高对比度主题。
* **动态视觉反馈**：选中目标高亮、走子轨迹标记、将军闪烁特效以及平滑的吃子动画。

---

### 🛠️ 丰富辅助工具
* **📊 实时胜率/局势评估**：根据棋盘剩余棋子与位置价值，动态显示红黑双方优势百分比。
* **↩️ 悔棋与提示**：
  * 支持悔棋功能（人机模式下自动连撤两步）。
  * 点击“💡 提示”由 AI 自动推演当前局面最佳走法。
* **📜 FEN 局面与 PGN 棋谱**：
  * 支持复制或输入 **FEN** 串一键摆设特定棋局。
  * 支持导出 **PGN** 标准格式棋谱并复制到剪贴板。
* **⚔️ 吃子统计与棋谱记录**：实时记录每步着法及双方被吃棋子。
* **🔊 原生 Web Audio 音效**：包含落子、吃子、将军、绝杀胜利等丰富音效，支持一键静音。

---

## 📂 项目架构说明

```
ai-xiangqi/
├── index.html                   # Vite 入口 HTML
├── package.json                 # pnpm 依赖配置
├── vite.config.js               # Vite 配置文件
├── src/
│   ├── main.js                  # Vue 3 应用挂载入口
│   ├── App.vue                  # 根组件
│   ├── assets/
│   │   └── styles/
│   │       ├── main.scss        # 全局基础样式
│   │       ├── _themes.scss     # 木纹、水墨、赛博暗黑皮肤定义
│   │       └── _board.scss      # SVG 棋盘、棋子与吃子动画样式
│   ├── core/                    # 纯 JavaScript 游戏核心引擎
│   │   ├── config.js            # GPT API 参数配置
│   │   ├── constants.js         # 棋盘常量与 FEN 解析器
│   │   ├── rules.js             # 中国象棋规则引擎
│   │   ├── ai.js                # 本地 Minimax + Alpha-Beta AI
│   │   ├── llm-ai.js            # GPT 大模型对弈接口
│   │   ├── endgame.js           # 残局闯关关卡数据
│   │   └── audio.js             # Web Audio 音效引擎
│   ├── composables/
│   │   └── useXiangqiGame.js    # 象棋核心全响应式 Hook
│   └── components/
│       ├── GameHeader.vue       # 顶栏标题组件
│       ├── GameBoard.vue        # 动态 SVG 棋盘与棋子渲染
│       ├── GameControlPanel.vue # 左侧设置面板
│       ├── GameStatusPanel.vue  # 右侧计时、胜率条、吃子统计
│       ├── GptCommentaryCard.vue # GPT 实时棋评卡片
│       ├── MoveHistoryCard.vue  # 历史着法记录列表
│       ├── FenModal.vue         # FEN / PGN 工具弹窗
│       ├── HelpModal.vue        # 玩法指南弹窗
│       └── ApiModal.vue         # GPT API 安全设置弹窗
```

---

## 🚀 快速开始

项目使用 **pnpm** 进行依赖管理。

### 1. 安装依赖
```bash
pnpm install
```

### 2. 启动本地开发服务 (Hot Reloading)
```bash
pnpm dev
```
启动后在浏览器打开控制台提示的本地地址（如 `http://localhost:3000`）即可体验。

### 3. 构建生产打包
```bash
pnpm build
```
打包输出文件将存放于 `dist/` 目录中。

---

## 📄 开源许可

本项目基于 [MIT License](LICENSE) 开源发布。
