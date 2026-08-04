/**
 * Xiangqi UI Renderer & User Interaction
 */

class XiangqiUI {
  constructor(containerId, onCellClick) {
    this.container = document.getElementById(containerId);
    this.onCellClick = onCellClick;

    this.selectedSquare = null;
    this.validMoves = [];
    this.lastMove = null;

    this.boardElement = null;
    this.cellsGrid = []; // 10x9 2D array of cell DOM nodes

    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'board-wrapper';

    // SVG background for board lines (River, Palace, Grid)
    const svgBoard = this.createBoardSVG();
    wrapper.appendChild(svgBoard);

    // Interactive piece layer. Cells are centered on the same intersections
    // used by the SVG board: x = 50 + c * 100, y = 50 + r * 100.
    const pieceLayer = document.createElement('div');
    pieceLayer.className = 'piece-layer';

    for (let r = 0; r < BOARD_ROWS; r++) {
      this.cellsGrid[r] = [];
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.style.left = `${((50 + c * 100) / 900) * 100}%`;
        cell.style.top = `${((50 + r * 100) / 1000) * 100}%`;

        cell.addEventListener('click', () => {
          if (this.onCellClick) {
            this.onCellClick(parseInt(cell.dataset.row), parseInt(cell.dataset.col));
          }
        });

        pieceLayer.appendChild(cell);
        this.cellsGrid[r][c] = cell;
      }
    }

    wrapper.appendChild(pieceLayer);
    this.container.appendChild(wrapper);
    this.boardElement = wrapper;
  }

  createBoardSVG() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 900 1000");
    svg.setAttribute("class", "board-svg");

    // Board background texture rect
    const bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", "900");
    bg.setAttribute("height", "1000");
    bg.setAttribute("class", "board-bg-rect");
    bg.setAttribute("rx", "16");
    svg.appendChild(bg);

    // Definitions (gradients, filters)
    const defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML = `
      <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="var(--board-bg-grad-1)" />
        <stop offset="50%" stop-color="var(--board-bg-grad-2)" />
        <stop offset="100%" stop-color="var(--board-bg-grad-3)" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.3"/>
      </filter>
    `;
    svg.appendChild(defs);

    // Grid coordinates mapping (50px border, 100px per grid block)
    // col 0..8 => x: 50 + c * 100
    // row 0..9 => y: 50 + r * 100
    const getX = c => 50 + c * 100;
    const getY = r => 50 + r * 100;

    // Outer border frame
    const outerFrame = document.createElementNS(svgNS, "rect");
    outerFrame.setAttribute("x", "35");
    outerFrame.setAttribute("y", "35");
    outerFrame.setAttribute("width", "830");
    outerFrame.setAttribute("height", "930");
    outerFrame.setAttribute("fill", "none");
    outerFrame.setAttribute("class", "board-outer-frame");
    outerFrame.setAttribute("stroke-width", "6");
    svg.appendChild(outerFrame);

    const innerFrame = document.createElementNS(svgNS, "rect");
    innerFrame.setAttribute("x", "45");
    innerFrame.setAttribute("y", "45");
    innerFrame.setAttribute("width", "810");
    innerFrame.setAttribute("height", "910");
    innerFrame.setAttribute("fill", "none");
    innerFrame.setAttribute("class", "board-inner-frame");
    innerFrame.setAttribute("stroke-width", "3");
    svg.appendChild(innerFrame);

    // Grid lines group
    const gLines = document.createElementNS(svgNS, "g");
    gLines.setAttribute("class", "board-grid-lines");
    gLines.setAttribute("stroke-width", "2.5");

    // Horizontal lines (10 lines)
    for (let r = 0; r < 10; r++) {
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", getX(0));
      line.setAttribute("y1", getY(r));
      line.setAttribute("x2", getX(8));
      line.setAttribute("y2", getY(r));
      gLines.appendChild(line);
    }

    // Vertical lines (9 lines) - split across river for middle 7 columns
    for (let c = 0; c < 9; c++) {
      if (c === 0 || c === 8) {
        // Outer vertical boundary lines run straight through
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", getX(c));
        line.setAttribute("y1", getY(0));
        line.setAttribute("x2", getX(c));
        line.setAttribute("y2", getY(9));
        gLines.appendChild(line);
      } else {
        // Top half (Row 0 to 4)
        const lineTop = document.createElementNS(svgNS, "line");
        lineTop.setAttribute("x1", getX(c));
        lineTop.setAttribute("y1", getY(0));
        lineTop.setAttribute("x2", getX(c));
        lineTop.setAttribute("y2", getY(4));
        gLines.appendChild(lineTop);

        // Bottom half (Row 5 to 9)
        const lineBot = document.createElementNS(svgNS, "line");
        lineBot.setAttribute("x1", getX(c));
        lineBot.setAttribute("y1", getY(5));
        lineBot.setAttribute("x2", getX(c));
        lineBot.setAttribute("y2", getY(9));
        gLines.appendChild(lineBot);
      }
    }

    // Palace diagonal lines
    // Black Palace (cols 3..5, rows 0..2)
    const bp1 = document.createElementNS(svgNS, "line");
    bp1.setAttribute("x1", getX(3)); bp1.setAttribute("y1", getY(0));
    bp1.setAttribute("x2", getX(5)); bp1.setAttribute("y2", getY(2));
    gLines.appendChild(bp1);

    const bp2 = document.createElementNS(svgNS, "line");
    bp2.setAttribute("x1", getX(5)); bp2.setAttribute("y1", getY(0));
    bp2.setAttribute("x2", getX(3)); bp2.setAttribute("y2", getY(2));
    gLines.appendChild(bp2);

    // Red Palace (cols 3..5, rows 7..9)
    const rp1 = document.createElementNS(svgNS, "line");
    rp1.setAttribute("x1", getX(3)); rp1.setAttribute("y1", getY(7));
    rp1.setAttribute("x2", getX(5)); rp1.setAttribute("y2", getY(9));
    gLines.appendChild(rp1);

    const rp2 = document.createElementNS(svgNS, "line");
    rp2.setAttribute("x1", getX(5)); rp2.setAttribute("y1", getY(7));
    rp2.setAttribute("x2", getX(3)); rp2.setAttribute("y2", getY(9));
    gLines.appendChild(rp2);

    svg.appendChild(gLines);

    // River Text ("楚 河"  "漢 界")
    const text1 = document.createElementNS(svgNS, "text");
    text1.setAttribute("x", getX(1.8));
    text1.setAttribute("y", getY(4.65));
    text1.setAttribute("font-family", "'Ma Shan Zheng', 'Kaiti', 'STKaiti', serif");
    text1.setAttribute("font-size", "52");
    text1.setAttribute("font-weight", "bold");
    text1.setAttribute("class", "river-text");
    text1.textContent = "楚  河";
    svg.appendChild(text1);

    const text2 = document.createElementNS(svgNS, "text");
    text2.setAttribute("x", getX(5.8));
    text2.setAttribute("y", getY(4.65));
    text2.setAttribute("font-family", "'Ma Shan Zheng', 'Kaiti', 'STKaiti', serif");
    text2.setAttribute("font-size", "52");
    text2.setAttribute("font-weight", "bold");
    text2.setAttribute("class", "river-text");
    text2.textContent = "漢  界";
    svg.appendChild(text2);

    // Position mark crosshairs for Cannon and Pawn starting points
    const starCoords = [
      [2, 1], [2, 7], // Cannons Black
      [7, 1], [7, 7], // Cannons Red
      [3, 0], [3, 2], [3, 4], [3, 6], [3, 8], // Pawns Black
      [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]  // Pawns Red
    ];

    const gStars = document.createElementNS(svgNS, "g");
    gStars.setAttribute("stroke", "#3d2314");
    gStars.setAttribute("stroke-width", "2");

    starCoords.forEach(([r, c]) => {
      const cx = getX(c);
      const cy = getY(r);
      const d = 6, l = 16;

      // Top-Left corner
      if (c > 0) {
        let p = document.createElementNS(svgNS, "path");
        p.setAttribute("d", `M ${cx-d-l} ${cy-d} L ${cx-d} ${cy-d} L ${cx-d} ${cy-d-l}`);
        gStars.appendChild(p);
      }
      // Top-Right corner
      if (c < 8) {
        let p = document.createElementNS(svgNS, "path");
        p.setAttribute("d", `M ${cx+d+l} ${cy-d} L ${cx+d} ${cy-d} L ${cx+d} ${cy-d-l}`);
        gStars.appendChild(p);
      }
      // Bottom-Left corner
      if (c > 0) {
        let p = document.createElementNS(svgNS, "path");
        p.setAttribute("d", `M ${cx-d-l} ${cy+d} L ${cx-d} ${cy+d} L ${cx-d} ${cy+d+l}`);
        gStars.appendChild(p);
      }
      // Bottom-Right corner
      if (c < 8) {
        let p = document.createElementNS(svgNS, "path");
        p.setAttribute("d", `M ${cx+d+l} ${cy+d} L ${cx+d} ${cy+d} L ${cx+d} ${cy+d+l}`);
        gStars.appendChild(p);
      }
    });

    svg.appendChild(gStars);
    return svg;
  }

  renderBoard(boardState, selectedSquare, validMoves, lastMove) {
    this.selectedSquare = selectedSquare;
    this.validMoves = validMoves || [];
    this.lastMove = lastMove;

    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = this.cellsGrid[r][c];
        cell.className = 'board-cell'; // reset classes

        const piece = boardState.getPiece(r, c);

        // Highlight selection
        if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
          cell.classList.add('selected');
        }

        // Highlight last move
        if (lastMove && ((lastMove.fromR === r && lastMove.fromC === c) || (lastMove.toR === r && lastMove.toC === c))) {
          cell.classList.add('last-move');
        }

        // Highlight valid target moves
        const isValidTarget = this.validMoves.some(m => m.toR === r && m.toC === c);
        if (isValidTarget) {
          if (piece) {
            cell.classList.add('valid-capture');
          } else {
            cell.classList.add('valid-move');
          }
        }

        // Piece badge rendering
        cell.innerHTML = '';
        if (piece) {
          const pieceNode = this.createPieceElement(piece);
          cell.appendChild(pieceNode);
        }
      }
    }
  }

  createPieceElement(pieceCode) {
    const side = Rules.getSide(pieceCode);
    const pieceName = PIECE_NAMES[pieceCode];

    const elem = document.createElement('div');
    elem.className = `piece ${side === RED ? 'piece-red' : 'piece-black'}`;

    const inner = document.createElement('div');
    inner.className = 'piece-inner';
    inner.textContent = pieceName;

    elem.appendChild(inner);
    return elem;
  }

  updateCapturedPieces(redList, blackList) {
    const redGraveyard = document.getElementById('captured-red');
    const blackGraveyard = document.getElementById('captured-black');

    if (redGraveyard) {
      redGraveyard.innerHTML = '';
      redList.forEach(code => {
        const p = this.createPieceElement(code);
        p.classList.add('piece-small');
        redGraveyard.appendChild(p);
      });
    }

    if (blackGraveyard) {
      blackGraveyard.innerHTML = '';
      blackList.forEach(code => {
        const p = this.createPieceElement(code);
        p.classList.add('piece-small');
        blackGraveyard.appendChild(p);
      });
    }
  }

  showCheckBanner(side) {
    const banner = document.getElementById('check-banner');
    if (!banner) return;

    const sideName = side === RED ? '红方' : '黑方';
    banner.textContent = `⚡ 将军！${sideName}被照将！`;
    banner.classList.add('active');

    // Trigger board vibration
    if (this.boardElement) {
      this.boardElement.classList.add('vibrate');
      setTimeout(() => this.boardElement.classList.remove('vibrate'), 500);
    }

    setTimeout(() => {
      banner.classList.remove('active');
    }, 2000);
  }

  updateEvaluationBar(redPct, blackPct) {
    const evalFillRed = document.getElementById('eval-fill-red');
    const evalFillBlack = document.getElementById('eval-fill-black');
    const evalTextRed = document.getElementById('eval-text-red');
    const evalTextBlack = document.getElementById('eval-text-black');

    if (evalFillRed && evalFillBlack) {
      evalFillRed.style.width = `${redPct}%`;
      evalFillBlack.style.width = `${blackPct}%`;
    }

    if (evalTextRed && evalTextBlack) {
      evalTextRed.textContent = `红 ${redPct}%`;
      evalTextBlack.textContent = `黑 ${blackPct}%`;
    }
  }

  applyTheme(themeKey) {
    const theme = GAME_THEMES[themeKey] || GAME_THEMES.wood;
    const container = document.body;

    // Remove existing themes
    Object.values(GAME_THEMES).forEach(t => container.classList.remove(t.class));
    // Apply selected theme
    container.classList.add(theme.class);

    try {
      localStorage.setItem('xiangqi_theme', themeKey);
    } catch (e) {}

    const selectElem = document.getElementById('select-theme');
    if (selectElem && selectElem.value !== themeKey) {
      selectElem.value = themeKey;
    }
  }

  showGeminiCommentary(text) {
    const card = document.getElementById('gemini-commentary-card');
    const box = document.getElementById('gemini-commentary-box');

    if (card) card.style.display = 'block';
    if (box) {
      box.textContent = text;
    }
  }

  initApiModal(llmAi) {
    this.llmAi = llmAi;
    const btnOpen = document.getElementById('btn-api-config');
    const overlay = document.getElementById('api-modal-overlay');
    const btnClose = document.getElementById('btn-close-api-modal');
    const btnSave = document.getElementById('btn-save-api');
    const btnClear = document.getElementById('btn-clear-api');
    const btnToggleVis = document.getElementById('btn-toggle-key-visibility');

    const inputKey = document.getElementById('api-key-input');
    const inputBaseUrl = document.getElementById('api-base-url-input');
    const inputModel = document.getElementById('api-model-input');
    const statusMsg = document.getElementById('api-status-msg');

    const updateFields = () => {
      if (inputKey) inputKey.value = this.llmAi.loadApiKey();
      if (inputBaseUrl) inputBaseUrl.value = this.llmAi.loadBaseUrl();
      if (inputModel) inputModel.value = this.llmAi.loadModelName();
      if (statusMsg) statusMsg.textContent = '';
    };

    if (btnOpen && overlay) {
      btnOpen.addEventListener('click', () => {
        updateFields();
        overlay.classList.add('active');
      });
    }

    if (btnClose && overlay) {
      btnClose.addEventListener('click', () => overlay.classList.remove('active'));
    }

    if (btnToggleVis && inputKey) {
      btnToggleVis.addEventListener('click', () => {
        if (inputKey.type === 'password') {
          inputKey.type = 'text';
          btnToggleVis.textContent = '🙈';
        } else {
          inputKey.type = 'password';
          btnToggleVis.textContent = '👁️';
        }
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const key = inputKey ? inputKey.value.trim() : '';
        const url = inputBaseUrl ? inputBaseUrl.value.trim() : '';
        const model = inputModel ? inputModel.value.trim() : '';

        try {
          if (key) localStorage.setItem('xiangqi_llm_api_key', key);
          else localStorage.removeItem('xiangqi_llm_api_key');

          if (url) localStorage.setItem('xiangqi_llm_base_url', url);
          else localStorage.removeItem('xiangqi_llm_base_url');

          if (model) localStorage.setItem('xiangqi_llm_model', model);
          else localStorage.removeItem('xiangqi_llm_model');

          this.llmAi.refreshConfig();

          if (statusMsg) {
            statusMsg.style.color = '#2ecc71';
            statusMsg.textContent = '✅ 配置已成功保存至浏览器本地！';
          }
        } catch (e) {
          if (statusMsg) {
            statusMsg.style.color = '#e74c3c';
            statusMsg.textContent = '❌ 本地存储写入失败: ' + e.message;
          }
        }
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        try {
          localStorage.removeItem('xiangqi_llm_api_key');
          localStorage.removeItem('xiangqi_llm_base_url');
          localStorage.removeItem('xiangqi_llm_model');
          this.llmAi.refreshConfig();
          updateFields();
          if (statusMsg) {
            statusMsg.style.color = '#e67e22';
            statusMsg.textContent = '🗑️ 已成功清除本地 Key 及相关设置！';
          }
        } catch (e) {}
      });
    }
  }

  showApiConfigModal() {
    const overlay = document.getElementById('api-modal-overlay');
    const inputKey = document.getElementById('api-key-input');
    const inputBaseUrl = document.getElementById('api-base-url-input');
    const inputModel = document.getElementById('api-model-input');
    const statusMsg = document.getElementById('api-status-msg');

    if (this.llmAi) {
      if (inputKey) inputKey.value = this.llmAi.loadApiKey();
      if (inputBaseUrl) inputBaseUrl.value = this.llmAi.loadBaseUrl();
      if (inputModel) inputModel.value = this.llmAi.loadModelName();
    }
    if (statusMsg) {
      statusMsg.style.color = '#f1c40f';
      statusMsg.textContent = '⚠️ 当前未检测到 API Key，请在此填入后保存。';
    }
    if (overlay) overlay.classList.add('active');
  }
}

