/* puzzle-generator.js — Generates a solved grid and derives rules from it */

class PuzzleGenerator {
  constructor(difficulty) {
    this.difficulty = difficulty;
    const configs = {
      easy:      { size: 3, letters: ['A', 'B', 'C'] },
      hard:      { size: 4, letters: ['A', 'B', 'C', 'D'] },
      insane:    { size: 5, letters: ['A', 'B', 'C', 'D', 'E'] },
      legendary: { size: 6, letters: ['A', 'B', 'C', 'D', 'E', 'F'] }
    };
    this.config  = configs[difficulty] || configs.easy;
    this.size    = this.config.size;
    this.letters = this.config.letters;
  }

  generate() {
    const solution = this._generateSolution();
    return { solution, size: this.size, letters: this.letters };
  }

  _generateSolution() {
    const { size, letters } = this;

    // Build a pool where each letter appears exactly `size` times
    let pool = [];
    for (const l of letters) {
      for (let i = 0; i < size; i++) pool.push(l);
    }

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
