/**
 * Xiangqi AI Engine - High Performance Alpha-Beta with Quiescence, Transposition Table & Positional Evaluation
 */
import {
  RED, BLACK, KING, ADVISOR, ELEPHANT, HORSE, CHARIOT, CANNON, PAWN,
  BOARD_ROWS, BOARD_COLS, PIECE_VALUES,
  PST_PAWN, PST_HORSE, PST_CHARIOT, PST_CANNON
} from './constants.js';
import { Rules } from './rules.js';

// Zobrist Random Numbers for Fast Board Hashing
const ZOBRIST = {
  pieces: Array.from({ length: 14 }, () =>
    Array.from({ length: BOARD_ROWS }, () =>
      Array.from({ length: BOARD_COLS }, () => Math.floor(Math.random() * 0xFFFFFFFF))
    )
  ),
  turn: Math.floor(Math.random() * 0xFFFFFFFF)
};

const PIECE_INDEX_MAP = {
  'rk': 0, 'ra': 1, 're': 2, 'rh': 3, 'rc': 4, 'rp': 5, 'rs': 6,
  'bk': 7, 'ba': 8, 'be': 9, 'bh': 10, 'bc': 11, 'bp': 12, 'bs': 13
};

// Popular Opening Book Moves for High Level Opening Quality
const OPENING_BOOK = [
  // Red Openings
  { fen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w', move: { fromR: 7, fromC: 1, toR: 7, toC: 4 } }, // 炮二平五 (中炮)
  { fen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w', move: { fromR: 7, fromC: 7, toR: 7, toC: 4 } }, // 炮八平五 (中炮)
  { fen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w', move: { fromR: 9, fromC: 1, toR: 7, toC: 2 } }, // 马二进三 (起马局)
  { fen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w', move: { fromR: 6, fromC: 2, toR: 5, toC: 2 } }, // 兵三进一 (仙人指路)
  { fen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w', move: { fromR: 9, fromC: 2, toR: 7, toC: 4 } }  // 相三进五 (飞相局)
];

export class XiangqiAI {
  constructor(difficulty = 'hard') {
    this.setDifficulty(difficulty);
    this.tt = new Map(); // Transposition Table
    this.killerMoves = Array.from({ length: 30 }, () => [null, null]);
    this.historyTable = Array.from({ length: BOARD_ROWS * BOARD_COLS }, () =>
      Array(BOARD_ROWS * BOARD_COLS).fill(0)
    );
  }

  setDifficulty(level) {
    this.difficulty = level;
    switch (level) {
      case 'easy':
        this.maxDepth = 2;
        this.quiescenceDepth = 1;
        this.randomness = 0.25;
        break;
      case 'medium':
        this.maxDepth = 3;
        this.quiescenceDepth = 2;
        this.randomness = 0.05;
        break;
      case 'hard':
        this.maxDepth = 4;
        this.quiescenceDepth = 4;
        this.randomness = 0.0;
        break;
      case 'master':
        this.maxDepth = 5;
        this.quiescenceDepth = 6;
        this.randomness = 0.0;
        break;
      default:
        this.maxDepth = 4;
        this.quiescenceDepth = 4;
        this.randomness = 0.0;
    }
  }

  computeHash(board, turn) {
    let hash = turn === RED ? ZOBRIST.turn : 0;
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const piece = board[r][c];
        if (piece && PIECE_INDEX_MAP[piece] !== undefined) {
          hash ^= ZOBRIST.pieces[PIECE_INDEX_MAP[piece]][r][c];
        }
      }
    }
    return hash;
  }

  /**
   * Advanced Positional Evaluation
   */
  evaluate(board) {
    let score = 0;
    let redAdvisors = 0, redElephants = 0;
    let blackAdvisors = 0, blackElephants = 0;

    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const side = Rules.getSide(piece);
        const type = Rules.getType(piece);
        const sign = side === RED ? 1 : -1;

        let val = PIECE_VALUES[type] || 0;
        let pstVal = 0;
        const pstRow = side === RED ? r : (9 - r);

        if (type === PAWN) {
          pstVal = PST_PAWN[pstRow][c];
          // Crossed river bonus
          const isCrossed = (side === RED && r <= 4) || (side === BLACK && r >= 5);
          if (isCrossed) {
            pstVal += 20;
            // Near enemy palace bonus
            if (c >= 2 && c <= 6) pstVal += 25;
            if ((side === RED && r <= 2) || (side === BLACK && r >= 7)) pstVal += 35;
          }
        } else if (type === HORSE) {
          pstVal = PST_HORSE[pstRow][c];
          // Blocked horse leg penalty
          const legBlocked = this.isHorseLegBlocked(board, r, c);
          if (legBlocked) pstVal -= 25;
          // Palace horse (窝心马) penalty in opening/midgame
          if ((side === RED && r === 8 && c === 4) || (side === BLACK && r === 1 && c === 4)) {
            pstVal -= 80;
          }
        } else if (type === CHARIOT) {
          pstVal = PST_CHARIOT[pstRow][c];
          // Open file bonus (no pawns in chariot's vertical file)
          if (this.isOpenFile(board, c)) pstVal += 25;
          // Patrol river line bonus (巡河车 / 骑河车)
          if ((side === RED && (r === 5 || r === 6)) || (side === BLACK && (r === 4 || r === 3))) {
            pstVal += 20;
          }
        } else if (type === CANNON) {
          pstVal = PST_CANNON[pstRow][c];
          // Central cannon (当头炮) bonus
          if (c === 4) pstVal += 30;
          // Deep bottom cannon (沉底炮) attacking value
          if ((side === RED && r === 0) || (side === BLACK && r === 9)) pstVal += 35;
        } else if (type === ADVISOR) {
          if (side === RED) redAdvisors++; else blackAdvisors++;
        } else if (type === ELEPHANT) {
          if (side === RED) redElephants++; else blackElephants++;
        }

        score += sign * (val + pstVal);
      }
    }

    // Defensive Guard Integrity Penalties
    if (redAdvisors < 2) score -= (2 - redAdvisors) * 35;
    if (redElephants < 2) score -= (2 - redElephants) * 25;
    if (blackAdvisors < 2) score += (2 - blackAdvisors) * 35;
    if (blackElephants < 2) score += (2 - blackElephants) * 25;

    return score;
  }

  isHorseLegBlocked(board, r, c) {
    const horseDirs = [
      { dr: -2, dc: -1, lr: -1, lc: 0 },
      { dr: -2, dc: 1, lr: -1, lc: 0 },
      { dr: 2, dc: -1, lr: 1, lc: 0 },
      { dr: 2, dc: 1, lr: 1, lc: 0 },
      { dr: -1, dc: -2, lr: 0, lc: -1 },
      { dr: 1, dc: -2, lr: 0, lc: -1 },
      { dr: -1, dc: 2, lr: 0, lc: 1 },
      { dr: 1, dc: 2, lr: 0, lc: 1 }
    ];
    let blockedCount = 0;
    for (const d of horseDirs) {
      const lr = r + d.lr, lc = c + d.lc;
      if (Rules.isValidPos(lr, lc) && board[lr][lc] !== null) {
        blockedCount++;
      }
    }
    return blockedCount >= 3;
  }

  isOpenFile(board, col) {
    let pieces = 0;
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (board[r][col] !== null) pieces++;
    }
    return pieces <= 2;
  }

  getEvaluationScore(board) {
    const rawScore = this.evaluate(board);
    const clampedScore = Math.max(-3000, Math.min(3000, rawScore));
    const winPercentage = Math.round(100 / (1 + Math.pow(10, -clampedScore / 900)));
    return {
      rawScore,
      redPct: winPercentage,
      blackPct: 100 - winPercentage
    };
  }

  orderMoves(board, moves, ply = 0, hashMove = null) {
    return moves.sort((a, b) => {
      // 1. Hash move from Transposition Table
      if (hashMove) {
        if (a.fromR === hashMove.fromR && a.fromC === hashMove.fromC && a.toR === hashMove.toR && a.toC === hashMove.toC) return -100000;
        if (b.fromR === hashMove.fromR && b.fromC === hashMove.fromC && b.toR === hashMove.toR && b.toC === hashMove.toC) return 100000;
      }

      let scoreA = 0;
      let scoreB = 0;

      // 2. MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
      if (a.captured) {
        const victimType = Rules.getType(a.captured);
        const attackerType = Rules.getType(board[a.fromR][a.fromC]);
        scoreA += 10000 + (PIECE_VALUES[victimType] || 0) * 10 - (PIECE_VALUES[attackerType] || 0);
      }
      if (b.captured) {
        const victimType = Rules.getType(b.captured);
        const attackerType = Rules.getType(board[b.fromR][b.fromC]);
        scoreB += 10000 + (PIECE_VALUES[victimType] || 0) * 10 - (PIECE_VALUES[attackerType] || 0);
      }

      // 3. Killer Moves
      if (ply < this.killerMoves.length) {
        const [k1, k2] = this.killerMoves[ply];
        if (k1 && a.fromR === k1.fromR && a.fromC === k1.fromC && a.toR === k1.toR && a.toC === k1.toC) scoreA += 5000;
        if (k2 && a.fromR === k2.fromR && a.fromC === k2.fromC && a.toR === k2.toR && a.toC === k2.toC) scoreA += 4000;
        if (k1 && b.fromR === k1.fromR && b.fromC === k1.fromC && b.toR === k1.toR && b.toC === k1.toC) scoreB += 5000;
        if (k2 && b.fromR === k2.fromR && b.fromC === k2.fromC && b.toR === k2.toR && b.toC === k2.toC) scoreB += 4000;
      }

      // 4. History Heuristic
      const fromIdxA = a.fromR * BOARD_COLS + a.fromC;
      const toIdxA = a.toR * BOARD_COLS + a.toC;
      scoreA += this.historyTable[fromIdxA][toIdxA] || 0;

      const fromIdxB = b.fromR * BOARD_COLS + b.fromC;
      const toIdxB = b.toR * BOARD_COLS + b.toC;
      scoreB += this.historyTable[fromIdxB][toIdxB] || 0;

      return scoreB - scoreA;
    });
  }

  /**
   * Quiescence Search (静态搜索) to eliminate Horizon Effect
   */
  quiescence(board, alpha, beta, isMaximizing, qDepth) {
    const standPat = this.evaluate(board);

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }

    if (qDepth <= 0) {
      return standPat;
    }

    const currentSide = isMaximizing ? RED : BLACK;
    let captureMoves = Rules.getAllLegalMoves(board, currentSide).filter(m => m.captured !== null);

    if (captureMoves.length === 0) {
      return standPat;
    }

    captureMoves = this.orderMoves(board, captureMoves, 0, null);

    if (isMaximizing) {
      for (const move of captureMoves) {
        const nextBoard = Rules.makeMove(board, move);
        const score = this.quiescence(nextBoard, alpha, beta, false, qDepth - 1);
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    } else {
      for (const move of captureMoves) {
        const nextBoard = Rules.makeMove(board, move);
        const score = this.quiescence(nextBoard, alpha, beta, true, qDepth - 1);
        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
      return beta;
    }
  }

  /**
   * Minimax with Alpha-Beta, Transposition Table, Quiescence Search, and History Heuristic
   */
  minimax(board, depth, alpha, beta, isMaximizing, ply = 0) {
    const currentSide = isMaximizing ? RED : BLACK;
    const inCheck = Rules.isKingInCheck(board, currentSide);

    if (inCheck) {
      if (Rules.isCheckmate(board, currentSide)) {
        return isMaximizing ? -100000 + ply : 100000 - ply;
      }
      // Check Extension: search 1 ply deeper when under check
      depth = Math.max(depth, 1);
    } else if (Rules.isStalemate(board, currentSide)) {
      return 0;
    }

    if (depth <= 0) {
      return this.quiescence(board, alpha, beta, isMaximizing, this.quiescenceDepth);
    }

    const hash = this.computeHash(board, currentSide);
    const ttEntry = this.tt.get(hash);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === 'EXACT') return ttEntry.score;
      if (ttEntry.flag === 'LOWERBOUND' && ttEntry.score >= beta) return ttEntry.score;
      if (ttEntry.flag === 'UPPERBOUND' && ttEntry.score <= alpha) return ttEntry.score;
    }

    let legalMoves = Rules.getAllLegalMoves(board, currentSide);
    if (legalMoves.length === 0) {
      return isMaximizing ? -100000 + ply : 100000 - ply;
    }

    const hashMove = ttEntry ? ttEntry.bestMove : null;
    legalMoves = this.orderMoves(board, legalMoves, ply, hashMove);

    let bestScore = isMaximizing ? -Infinity : Infinity;
    let bestMove = legalMoves[0];
    const originalAlpha = alpha;

    if (isMaximizing) {
      for (const move of legalMoves) {
        const nextBoard = Rules.makeMove(board, move);
        const evalVal = this.minimax(nextBoard, depth - 1, alpha, beta, false, ply + 1);

        if (evalVal > bestScore) {
          bestScore = evalVal;
          bestMove = move;
        }
        alpha = Math.max(alpha, evalVal);

        if (beta <= alpha) {
          // Record killer & history
          if (!move.captured && ply < this.killerMoves.length) {
            this.killerMoves[ply][1] = this.killerMoves[ply][0];
            this.killerMoves[ply][0] = move;
            const fromIdx = move.fromR * BOARD_COLS + move.fromC;
            const toIdx = move.toR * BOARD_COLS + move.toC;
            this.historyTable[fromIdx][toIdx] += depth * depth;
          }
          break;
        }
      }
    } else {
      for (const move of legalMoves) {
        const nextBoard = Rules.makeMove(board, move);
        const evalVal = this.minimax(nextBoard, depth - 1, alpha, beta, true, ply + 1);

        if (evalVal < bestScore) {
          bestScore = evalVal;
          bestMove = move;
        }
        beta = Math.min(beta, evalVal);

        if (beta <= alpha) {
          // Record killer & history
          if (!move.captured && ply < this.killerMoves.length) {
            this.killerMoves[ply][1] = this.killerMoves[ply][0];
            this.killerMoves[ply][0] = move;
            const fromIdx = move.fromR * BOARD_COLS + move.fromC;
            const toIdx = move.toR * BOARD_COLS + move.toC;
            this.historyTable[fromIdx][toIdx] += depth * depth;
          }
          break;
        }
      }
    }

    // Save to Transposition Table
    let flag = 'EXACT';
    if (bestScore <= originalAlpha) flag = 'UPPERBOUND';
    else if (bestScore >= beta) flag = 'LOWERBOUND';

    if (this.tt.size > 200000) this.tt.clear();
    this.tt.set(hash, { depth, score: bestScore, flag, bestMove });

    return bestScore;
  }

  /**
   * Main Search entry point with Iterative Deepening
   */
  async getBestMove(board, side) {
    return new Promise(resolve => {
      setTimeout(() => {
        const isMaximizing = (side === RED);
        let legalMoves = Rules.getAllLegalMoves(board, side);

        if (legalMoves.length === 0) {
          resolve(null);
          return;
        }

        // 1. Easy mode randomness
        if (this.randomness > 0 && Math.random() < this.randomness) {
          const randomIndex = Math.floor(Math.random() * legalMoves.length);
          resolve(legalMoves[randomIndex]);
          return;
        }

        // 2. Iterative Deepening from depth 1 up to maxDepth
        let bestMove = legalMoves[0];
        let previousBestMove = null;

        for (let currentDepth = 1; currentDepth <= this.maxDepth; currentDepth++) {
          legalMoves = this.orderMoves(board, legalMoves, 0, previousBestMove);
          let bestEval = isMaximizing ? -Infinity : Infinity;
          let alpha = -Infinity;
          let beta = Infinity;

          for (const move of legalMoves) {
            const nextBoard = Rules.makeMove(board, move);
            const evalVal = this.minimax(nextBoard, currentDepth - 1, alpha, beta, !isMaximizing, 1);

            if (isMaximizing) {
              if (evalVal > bestEval) {
                bestEval = evalVal;
                bestMove = move;
              }
              alpha = Math.max(alpha, evalVal);
            } else {
              if (evalVal < bestEval) {
                bestEval = evalVal;
                bestMove = move;
              }
              beta = Math.min(beta, evalVal);
            }
          }
          previousBestMove = bestMove;
        }

        resolve(bestMove);
      }, 50);
    });
  }
}
