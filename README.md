# 中国象棋 - Xiangqi (Vibecoding Edition)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green.svg)

基于 **HTML5 + ES6 JavaScript + Vanilla CSS** 构建的现代化网页端中国象棋游戏。集成了经典 PvP 双人同屏对决、本地 Minimax 剪枝算法 AI、经典残局闯关，以及支持结合大语言模型的 **GPT 智能对弈与实时棋局解说**。

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

## 📂 项目文件结构

```
ai-xiangqi/
├── index.html         # 网页主入口及 UI 节点结构
├── style.css          # 全局样式表（包含三大主题皮肤、卡片布局与响应式）
├── js/
│   ├── config.js      # GPT API 密钥、模型名称与 Base URL 配置
│   ├── constants.js   # 棋盘常量、FEN解析器与棋子基础价值表
│   ├── rules.js       # 中国象棋核心规则引擎（合法走法、长将/将军检测）
│   ├── board.js       # 棋盘 DOM 绘制与落子/吃子交互渲染
│   ├── ai.js          # 本地 Minimax 极大极小搜索与 Alpha-Beta 剪枝算法
│   ├── llm-ai.js      # GPT 大模型 API 通信、着法解析与实时棋评生成
│   ├── endgame.js     # 经典残局关卡配置与通关判定
│   ├── audio.js       # Web Audio API 音效合成引擎
│   ├── ui.js          # 界面交互绑定、弹窗、计时器与评估条更新
│   └── game.js        # 游戏主循环控制器与状态管理
└── README.md          # 项目说明文档
```

---

## 🚀 快速开始

由于本项目采用**原生纯前端**设计（Zero Build Required），无需安装任何 Node.js 依赖或打包构建工具。

### 1. 本地直接运行
* 方式一：直接双击 `index.html` 在浏览器中打开。
* 方式二：使用 VS Code 的 `Live Server` 扩展或 Python 快速搭建本地服务：
  ```bash
  # 使用 Python 搭建静态服务器
  python -m http.server 8080
  ```
  然后访问 `http://localhost:8080` 即可体验。

### 2. 配置 GPT 大模型对弈（安全方案）
为防范 API Key 泄露，代码仓库中**不再硬编码任何 API 秘钥**。体验 **✨ GPT 大模型对弈** 模式：

* **方式一：通过 UI 界面安全设置（推荐 🛡️）**
  1. 在游戏左侧控制面板点击 **🔑 GPT 大模型 API 设置** 按钮。
  2. 填入您的 API Key、API Base URL（中转地址）与模型名称。
  3. 点击 **💾 保存配置**。Key 将加密且仅存储在您浏览器的 `localStorage` 中，绝不上传远程仓库。

* **方式二：修改配置文件**
  也可在 [js/config.js](file:///e:/ai/ai-xiangqi/js/config.js) 中直接配置默认缺省参数：
  ```javascript
  const GAME_CONFIG = {
    API_KEY: "",                   // 默认留空，避免泄露
    MODEL: "gpt-5.5",              // 调用的模型名称
    BASE_URL: "https://xuseny.online/v1", // API 中转地址
    USE_CORS_PROXY: true,          // 是否开启跨域代理（内置自动多代理降级）
    CORS_PROXY_PREFIX: ""          // 自定义 CORS 代理前缀（可选）
  };
  ```

> 💡 **解决跨域与 429 报错**：若遇到 `429 (Too Many Requests)` 或 `CORS policy` 报错，系统已自动启用备用代理通道；您也可在 `CORS_PROXY_PREFIX` 中指定第三方代理前缀（如 `https://thingproxy.freeboard.io/fetch/`）。

---

## 📖 操作指南

1. **选择棋子**：鼠标左键点击己方棋子，选中后显示高亮圈。
2. **走棋/吃子**：点击绿色圆圈可移动，点击红色目标圈可吃子。
3. **切换主题**：在侧边栏“棋盘主题”下拉菜单中随时切换木纹、水墨或暗黑风格。
4. **局势分析**：右侧面板实时更新双方用时倒计时与优势百分比评估条。

---

## 📄 开源许可

本项目基于 [MIT License](LICENSE) 开源发布。
