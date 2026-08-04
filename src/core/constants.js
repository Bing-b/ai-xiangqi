/**
 * Xiangqi (Chinese Chess) - Constants & PST Evaluations
 */

export const RED = 'r';
export const BLACK = 'b';

// Piece Types
export const KING = 'k';     // 帥 / 將
export const ADVISOR = 'a';  // 仕 / 士
export const ELEPHANT = 'e'; // 相 / 象
export const HORSE = 'h';    // 馬 / 马
export const CHARIOT = 'c';  // 車 / 车
export const CANNON = 'p';   // 炮 / 砲
export const PAWN = 's';     // 兵 / 卒

// Chinese Names for Display
export const PIECE_NAMES = {
  'rk': '帥', 'ra': '仕', 're': '相', 'rh': '馬', 'rc': '車', 'rp': '炮', 'rs': '兵',
  'bk': '將', 'ba': '士', 'be': '象', 'bh': '馬', 'bc': '車', 'bp': '砲', 'bs': '卒'
};

// Base Piece Values for AI
export const PIECE_VALUES = {
  [KING]: 10000,
  [CHARIOT]: 900,
  [CANNON]: 450,
  [HORSE]: 400,
  [ELEPHANT]: 200,
  [ADVISOR]: 200,
  [PAWN]: 100
};

// Board Dimensions
export const BOARD_COLS = 9;
export const BOARD_ROWS = 10;

// Initial 9x10 Board Setup
export const INITIAL_BOARD = [
  ['bc', 'bh', 'be', 'ba', 'bk', 'ba', 'be', 'bh', 'bc'], // Row 0 (Black back rank)
  [null, null, null, null, null, null, null, null, null], // Row 1
  [null, 'bp', null, null, null, null, null, 'bp', null], // Row 2
  ['bs', null, 'bs', null, 'bs', null, 'bs', null, 'bs'], // Row 3
  [null, null, null, null, null, null, null, null, null], // Row 4 (River north)
  [null, null, null, null, null, null, null, null, null], // Row 5 (River south)
  ['rs', null, 'rs', null, 'rs', null, 'rs', null, 'rs'], // Row 6
  [null, 'rp', null, null, null, null, null, 'rp', null], // Row 7
  [null, null, null, null, null, null, null, null, null], // Row 8
  ['rc', 'rh', 're', 'ra', 'rk', 'ra', 're', 'rh', 'rc']  // Row 9 (Red back rank)
];

// Piece-Square Tables (PST) for AI Evaluation (from Red's perspective)
export const PST_PAWN = [
  [ 0,  3,  6,  9, 12,  9,  6,  3,  0],
  [18, 36, 54, 72, 72, 54, 36, 18, 18],
  [14, 26, 42, 60, 60, 42, 26, 14, 14],
  [10, 20, 30, 50, 50, 30, 20, 10, 10],
  [ 6, 12, 18, 30, 30, 18, 12,  6,  6], // River line
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0]
];

export const PST_HORSE = [
  [ 4,  8, 16, 12,  4, 12, 16,  8,  4],
  [ 4, 10, 28, 16,  8, 16, 28, 10,  4],
  [12, 14, 16, 20, 18, 20, 16, 14, 12],
  [ 8, 16, 20, 24, 24, 20, 16,  8,  8],
  [ 6, 12, 16, 18, 18, 16, 12,  6,  6],
  [ 4,  8, 12, 14, 14, 12,  8,  4,  4],
  [ 2,  6,  8, 10, 10,  8,  6,  2,  2],
  [ 4,  2,  8,  8,  4,  8,  8,  2,  4],
  [ 0,  2,  4,  4, -2,  4,  4,  2,  0],
  [ 0, -4,  0,  0,  0,  0,  0, -4,  0]
];

export const PST_CHARIOT = [
  [14, 14, 12, 18, 16, 18, 12, 14, 14],
  [16, 20, 18, 24, 26, 24, 18, 20, 16],
  [12, 18, 16, 20, 18, 20, 16, 18, 12],
  [12, 18, 16, 20, 22, 20, 16, 18, 12],
  [12, 14, 12, 18, 18, 18, 12, 14, 12],
  [12, 16, 14, 18, 20, 18, 14, 16, 12],
  [ 6, 10,  8, 14, 12, 14,  8, 10,  6],
  [ 4,  8,  6, 10, 12, 10,  6,  8,  4],
  [ 8,  4,  8, 10,  8, 10,  8,  4,  8],
  [-2, 10,  6, 14, 12, 14,  6, 10, -2]
];

export const PST_CANNON = [
  [ 6,  4,  0, -10, -12, -10,  0,  4,  6],
  [ 2,  2,  0,  -4,  -4,  -4,  0,  2,  2],
  [ 4,  0,  8,   4,  10,   4,  8,  0,  4],
  [ 0,  0,  0,   2,   4,   2,  0,  0,  0],
  [-2,  0,  4,   2,   6,   2,  4,  0, -2],
  [ 0,  0,  0,   2,   4,   2,  0,  0,  0],
  [ 0,  0,  0,   0,   2,   0,  0,  0,  0],
  [ 2,  0,  4,   0,   8,   0,  4,  0,  2],
  [ 0,  2,  0,   0,   0,   0,  0,  2,  0],
  [ 0,  0,  0,   4,  10,   4,  0,  0,  0]
];

// FEN Mapping Dictionary
export const FEN_CHAR_TO_PIECE = {
  'K': 'rk', 'A': 'ra', 'B': 're', 'E': 're', 'N': 'rh', 'H': 'rh', 'R': 'rc', 'C': 'rp', 'P': 'rs',
  'k': 'bk', 'a': 'ba', 'b': 'be', 'e': 'be', 'n': 'bh', 'h': 'bh', 'r': 'bc', 'c': 'bp', 'p': 'bs'
};

export const PIECE_TO_FEN_CHAR = {
  'rk': 'K', 'ra': 'A', 're': 'B', 'rh': 'N', 'rc': 'R', 'rp': 'C', 'rs': 'P',
  'bk': 'k', 'ba': 'a', 'be': 'b', 'bh': 'n', 'bc': 'r', 'bp': 'c', 'bs': 'p'
};

export function fenToGrid(fenStr) {
  const parts = fenStr.trim().split(/\s+/);
  const rows = parts[0].split('/');
  const grid = Array.from({ length: 10 }, () => Array(9).fill(null));

  for (let r = 0; r < 10; r++) {
    if (!rows[r]) continue;
    let c = 0;
    for (let char of rows[r]) {
      if (char >= '1' && char <= '9') {
        c += parseInt(char, 10);
      } else if (FEN_CHAR_TO_PIECE[char]) {
        grid[r][c] = FEN_CHAR_TO_PIECE[char];
        c++;
      }
    }
  }

  let turn = RED;
  if (parts.length > 1) {
    turn = (parts[1].toLowerCase() === 'b' || parts[1].toLowerCase() === 'black') ? BLACK : RED;
  }

  return { grid, turn };
}

export function gridToFen(grid, turn = RED) {
  let fenRows = [];
  for (let r = 0; r < 10; r++) {
    let rowStr = '';
    let emptyCount = 0;
    for (let c = 0; c < 9; c++) {
      const piece = grid[r][c];
      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rowStr += emptyCount;
          emptyCount = 0;
        }
        rowStr += PIECE_TO_FEN_CHAR[piece] || '?';
      }
    }
    if (emptyCount > 0) rowStr += emptyCount;
    fenRows.push(rowStr);
  }

  return `${fenRows.join('/')} ${turn === RED ? 'w' : 'b'}`;
}

// Available UI Themes
export const GAME_THEMES = {
  wood: { name: '🪵 经典木纹', class: 'theme-wood' },
  ink: { name: '🖌️ 典雅水墨', class: 'theme-ink' },
  dark: { name: '🌌 赛博暗黑', class: 'theme-dark' }
};
