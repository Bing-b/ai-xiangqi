/**
 * Xiangqi Endgame Challenge Levels Library & Level Manager
 */

export const ENDGAME_LEVELS = [
  {
    id: 'level_1',
    name: '第一关：双马饮泉',
    difficulty: '入门',
    desc: '红方双马协同发威，配合帅位封堵黑将退路，实现精彩连杀。',
    fen: '3a1k3/4a4/9/9/9/9/9/4N3N/4K4/9 w',
    targetSteps: 4,
    playerSide: 'r'
  },
  {
    id: 'level_2',
    name: '第二关：单车巧胜双士',
    difficulty: '初级',
    desc: '单车切断九宫出路，控制中线巧取黑方双士胜出。',
    fen: '3k5/4a4/4a4/9/9/9/9/9/4K4/2R6 w',
    targetSteps: 6,
    playerSide: 'r'
  },
  {
    id: 'level_3',
    name: '第三关：千里独行',
    difficulty: '中级',
    desc: '经典单车残局，利用占领中门与底线对黑方马士进行绝杀。',
    fen: '3ak4/4a4/4h4/9/9/9/9/9/4K4/2R6 w',
    targetSteps: 8,
    playerSide: 'r'
  },
  {
    id: 'level_4',
    name: '第四关：炮马争雄',
    difficulty: '高级',
    desc: '红方炮马双子联动，借黑方士象阻挡形成抽将绝杀。',
    fen: '3ak4/4a4/4b4/9/4N4/9/9/4C4/4K4/9 w',
    targetSteps: 8,
    playerSide: 'r'
  },
  {
    id: 'level_5',
    name: '第五关：野马操田 (精选局)',
    difficulty: '大师',
    desc: '传统江湖残局名局，红方借马奔前线与车炮连环杀入九宫。',
    fen: '3a1k3/4a4/9/2p1p4/9/9/4P4/4C4/4K4/2R6 w',
    targetSteps: 10,
    playerSide: 'r'
  }
];

export class EndgameManager {
  constructor() {
    this.currentLevelIndex = 0;
    this.completedLevels = this.loadCompletedLevels();
  }

  loadCompletedLevels() {
    try {
      const saved = localStorage.getItem('xiangqi_endgame_completed');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveCompletedLevel(levelId) {
    this.completedLevels[levelId] = true;
    try {
      localStorage.setItem('xiangqi_endgame_completed', JSON.stringify(this.completedLevels));
    } catch (e) {
      console.warn('Unable to save endgame progress to localStorage');
    }
  }

  isLevelCompleted(levelId) {
    return !!this.completedLevels[levelId];
  }

  getLevel(index) {
    if (index >= 0 && index < ENDGAME_LEVELS.length) {
      this.currentLevelIndex = index;
      return ENDGAME_LEVELS[index];
    }
    return null;
  }

  getNextLevel() {
    if (this.currentLevelIndex + 1 < ENDGAME_LEVELS.length) {
      this.currentLevelIndex++;
      return ENDGAME_LEVELS[this.currentLevelIndex];
    }
    return null;
  }

  getAllLevels() {
    return ENDGAME_LEVELS;
  }
}
