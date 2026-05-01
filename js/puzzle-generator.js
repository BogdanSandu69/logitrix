/* puzzle-generator.js — Generates a solved grid and derives rules from it */

// Full pool of available letters (excludes easily-confused pairs like I/l, O/0)
const LETTER_POOL = [
  'A','B','C','D','E','F','G','H','J','K',
  'M','N','P','Q','R','S','T','V','W','X','Y','Z'
];

function pickRandomLetters(count) {
  const pool = LETTER_POOL.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

class PuzzleGenerator {
  constructor(difficulty) {
    this.difficulty = difficulty;
    const configs = {
      easy:      { size: 3, count: 3 },
      medium:    { size: 4, count: 4 },
      hard:      { size: 5, count: 5 },
      insane:    { size: 6, count: 6 },
      legendary: { size: 7, count: 7 }
    };
    const cfg    = configs[difficulty] || configs.easy;
    this.size    = cfg.size;
    this.letters = pickRandomLetters(cfg.count);
  }

  generate() {
    const solution = this._generateSolution();
    return { solution, size: this.size, letters: this.letters };
  }

  _generateSolution() {
    const { size, letters } = this;

    // Build a pool where each letter appears exactly `size` times
    const pool = letters.flatMap(l => Array(size).fill(l));

    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Fill grid row-by-row
    const grid = [];
    for (let r = 0; r < size; r++) {
      grid.push(pool.slice(r * size, (r + 1) * size));
    }
    return grid;
  }
}
