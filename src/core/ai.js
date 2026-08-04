/**
 * Xiangqi AI Engine - Minimax with Alpha-Beta Pruning & PST
 */
import {
  RED, BLACK, PAWN, HORSE, CHARIOT, CANNON,
  BOARD_ROWS, BOARD_COLS, PIECE_VALUES,
  PST_PAWN, PST_HORSE, PST_CHARIOT, PST_CANNON
} from './constants.js';
import { Rules } from './rules.js';

export class XiangqiAI {
  constructor(difficulty = 'medium') {
    this.setDifficulty(difficulty);
  }

  setDifficulty(level) {
    this.difficulty = level;
    switch (level) {
      case 'easy':
        this.maxDepth = 1;
        break;
      case 'medium':
        this.maxDepth = 2;
        break;
      case 'hard':
        this.maxDepth = 3;
        break;
      default:
        this.maxDepth = 2;
    }
  }

  evaluate(board) {
    let score = 0;

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
        } else if (type === HORSE) {
          pstVal = PST_HORSE[pstRow][c];
        } else if (type === CHARIOT) {
          pstVal = PST_CHARIOT[pstRow][c];
        } else if (type === CANNON) {
          pstVal = PST_CANNON[pstRow][c];
        }

        score += sign * (val + pstVal);
      }
    }

    return score;
  }

  getEvaluationScore(board) {
    const rawScore = this.evaluate(board);
    const clampedScore = Math.max(-3000, Math.min(3000, rawScore));
    const winPercentage = Math.round(100 / (1 + Math.pow(10, -clampedScore / 1000)));
    return {
      rawScore,
      redPct: winPercentage,
      blackPct: 100 - winPercentage
    };
  }

  orderMoves(board, moves) {
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (a.captured) {
        const victimType = Rules.getType(a.captured);
        const attackerType = Rules.getType(board[a.fromR][a.fromC]);
        scoreA = 1000 + PIECE_VALUES[victimType] - PIECE_VALUES[attackerType];
      }
      if (b.captured) {
        const victimType = Rules.getType(b.captured);
        const attackerType = Rules.getType(board[b.fromR][b.fromC]);
        scoreB = 1000 + PIECE_VALUES[victimType] - PIECE_VALUES[attackerType];
      }

      return scoreB - scoreA;
    });
  }

  minimax(board, depth, alpha, beta, isMaximizing) {
    const currentSide = isMaximizing ? RED : BLACK;

    if (Rules.isKingInCheck(board, currentSide)) {
      if (Rules.isCheckmate(board, currentSide)) {
        return isMaximizing ? -100000 - depth : 100000 + depth;
      }
    } else if (Rules.isStalemate(board, currentSide)) {
      return 0;
    }

    if (depth === 0) {
      return this.evaluate(board);
    }

    let legalMoves = Rules.getAllLegalMoves(board, currentSide);
    if (legalMoves.length === 0) {
      return isMaximizing ? -100000 : 100000;
    }

    legalMoves = this.orderMoves(board, legalMoves);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of legalMoves) {
        const nextBoard = Rules.makeMove(board, move);
        const evalVal = this.minimax(nextBoard, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalVal);
        alpha = Math.max(alpha, evalVal);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of legalMoves) {
        const nextBoard = Rules.makeMove(board, move);
        const evalVal = this.minimax(nextBoard, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalVal);
        beta = Math.min(beta, evalVal);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  async getBestMove(board, side) {
    return new Promise(resolve => {
      setTimeout(() => {
        const isMaximizing = (side === RED);
        let legalMoves = Rules.getAllLegalMoves(board, side);

        if (legalMoves.length === 0) {
          resolve(null);
          return;
        }

        legalMoves = this.orderMoves(board, legalMoves);

        if (this.difficulty === 'easy' && Math.random() < 0.3) {
          const randomIndex = Math.floor(Math.random() * legalMoves.length);
          resolve(legalMoves[randomIndex]);
          return;
        }

        let bestMove = legalMoves[0];
        let bestEval = isMaximizing ? -Infinity : Infinity;

        let alpha = -Infinity;
        let beta = Infinity;

        for (const move of legalMoves) {
          const nextBoard = Rules.makeMove(board, move);
          const evalVal = this.minimax(nextBoard, this.maxDepth - 1, alpha, beta, !isMaximizing);

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

        resolve(bestMove);
      }, 50);
    });
  }
}
