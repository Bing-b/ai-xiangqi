<template>
  <div class="board-area">
    <div class="check-banner" :class="{ active: checkBanner.active }">
      {{ checkBanner.text }}
    </div>

    <div class="board-wrapper" :class="{ vibrate: vibrateBoard }">
      <!-- SVG Board Vector Base -->
      <svg viewBox="0 0 900 1000" class="board-svg">
        <rect x="0" y="0" width="900" height="1000" class="board-bg-rect" rx="16" />
        <defs>
          <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--board-bg-grad-1)" />
            <stop offset="50%" stop-color="var(--board-bg-grad-2)" />
            <stop offset="100%" stop-color="var(--board-bg-grad-3)" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.3"/>
          </filter>
        </defs>

        <rect x="35" y="35" width="830" height="930" fill="none" class="board-outer-frame" stroke-width="6" />
        <rect x="45" y="45" width="810" height="910" fill="none" class="board-inner-frame" stroke-width="3" />

        <g class="board-grid-lines" stroke-width="2.5">
          <!-- Horizontal Lines -->
          <line v-for="r in 10" :key="'h-'+r" :x1="getX(0)" :y1="getY(r-1)" :x2="getX(8)" :y2="getY(r-1)" />
          <!-- Vertical Lines -->
          <template v-for="c in 9" :key="'v-'+c">
            <line v-if="c === 1 || c === 9" :x1="getX(c-1)" :y1="getY(0)" :x2="getX(c-1)" :y2="getY(9)" />
            <template v-else>
              <line :x1="getX(c-1)" :y1="getY(0)" :x2="getX(c-1)" :y2="getY(4)" />
              <line :x1="getX(c-1)" :y1="getY(5)" :x2="getX(c-1)" :y2="getY(9)" />
            </template>
          </template>

          <!-- Palace Diagonals -->
          <line :x1="getX(3)" :y1="getY(0)" :x2="getX(5)" :y2="getY(2)" />
          <line :x1="getX(5)" :y1="getY(0)" :x2="getX(3)" :y2="getY(2)" />
          <line :x1="getX(3)" :y1="getY(7)" :x2="getX(5)" :y2="getY(9)" />
          <line :x1="getX(5)" :y1="getY(7)" :x2="getX(3)" :y2="getY(9)" />
        </g>

        <!-- River Text -->
        <text :x="getX(1.8)" :y="getY(4.65)" font-family="'Ma Shan Zheng', 'Kaiti', serif" font-size="52" font-weight="bold" class="river-text">楚  河</text>
        <text :x="getX(5.8)" :y="getY(4.65)" font-family="'Ma Shan Zheng', 'Kaiti', serif" font-size="52" font-weight="bold" class="river-text">漢  界</text>

        <!-- SVG Trajectory Line for Last Move -->
        <g v-if="lastMove" class="last-move-svg-group">
          <line
            :x1="getX(lastMove.fromC)"
            :y1="getY(lastMove.fromR)"
            :x2="getX(lastMove.toC)"
            :y2="getY(lastMove.toR)"
            class="last-move-line"
          />
        </g>
      </svg>

      <!-- Interactive Cells & Piece Layer -->
      <div class="piece-layer">
        <template v-for="(row, r) in grid" :key="'row-'+r">
          <div
            v-for="(piece, c) in row"
            :key="'cell-'+r+'-'+c"
            class="board-cell"
            :class="getCellClass(r, c)"
            :style="getCellStyle(r, c)"
            @click="emitCellClick(r, c)"
          >
            <!-- Start Position Marker (Where piece moved from) -->
            <div v-if="isLastMoveFrom(r, c)" class="last-move-from-marker">
              <span class="from-crosshair"></span>
            </div>

            <!-- End Position Marker (Where piece landed) -->
            <div v-if="isLastMoveTo(r, c)" class="last-move-to-marker">
              <span class="corner top-left"></span>
              <span class="corner top-right"></span>
              <span class="corner bottom-left"></span>
              <span class="corner bottom-right"></span>
            </div>

            <div v-if="piece" class="piece" :class="piece[0] === 'r' ? 'piece-red' : 'piece-black'">
              <div class="piece-inner">{{ PIECE_NAMES[piece] }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { PIECE_NAMES } from '../core/constants.js';

const props = defineProps({
  grid: Array,
  selectedSquare: Object,
  validMoves: Array,
  lastMove: Object,
  checkBanner: Object,
  vibrateBoard: Boolean
});

const emit = defineEmits(['cell-click']);

const getX = c => 50 + c * 100;
const getY = r => 50 + r * 100;

const isLastMoveFrom = (r, c) => props.lastMove && props.lastMove.fromR === r && props.lastMove.fromC === c;
const isLastMoveTo = (r, c) => props.lastMove && props.lastMove.toR === r && props.lastMove.toC === c;

const getCellStyle = (r, c) => ({
  left: `${((50 + c * 100) / 900) * 100}%`,
  top: `${((50 + r * 100) / 1000) * 100}%`
});

const getCellClass = (r, c) => {
  const classes = [];
  if (props.selectedSquare && props.selectedSquare.r === r && props.selectedSquare.c === c) {
    classes.push('selected');
  }

  const validMove = props.validMoves.find(m => m.toR === r && m.toC === c);
  if (validMove) {
    if (validMove.captured) {
      classes.push('valid-capture');
    } else {
      classes.push('valid-move');
    }
  }

  if (isLastMoveFrom(r, c)) {
    classes.push('last-move-from');
  }
  if (isLastMoveTo(r, c)) {
    classes.push('last-move-to');
  }

  return classes.join(' ');
};

const emitCellClick = (r, c) => {
  emit('cell-click', r, c);
};
</script>
