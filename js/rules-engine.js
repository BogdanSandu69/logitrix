/* rules-engine.js — Generates rules from a solved grid and validates player grids */

class RulesEngine {
  constructor(solution, letters) {
    this.solution = solution;
    this.letters  = letters;
    this.size     = solution.length;
    this.rules    = [];
  }

  generateRules() {
    this.rules = [];
    this._addRowColumnCounts();
    this._addCornerRules();
    this._addAdjacencyRules();
    this._addSandwichRules();
    this._addPositionRules();
    return this.rules;
  }

  _addRowColumnCounts() {
    const { solution, letters, size } = this;
    for (let r = 0; r < size; r++) {
      for (const letter of letters) {
        const count = solution[r].filter(c => c === letter).length;
        if (count > 0) {
          this.rules.push({
            type: 'row_count',
            row: r,
            letter,
            count,
            description: `Row ${r + 1} has exactly ${count} ${letter}${count > 1 ? 's' : ''}`
          });
        }
      }
    }
    for (let c = 0; c < size; c++) {
      for (const letter of letters) {
        const count = solution.filter(row => row[c] === letter).length;
        if (count > 0) {
          this.rules.push({
            type: 'col_count',
            col: c,
            letter,
            count,
            description: `Column ${c + 1} has exactly ${count} ${letter}${count > 1 ? 's' : ''}`
          });
        }
      }
    }
  }

  _addAdjacencyRules() {
    const { solution, letters, size } = this;
    for (let i = 0; i < letters.length; i++) {
      for (let j = i + 1; j < letters.length; j++) {
        const a = letters[i], b = letters[j];
        let adjacent = false;
        outer: for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (solution[r][c] === a) {
              const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
              for (const [nr, nc] of neighbors) {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && solution[nr][nc] === b) {
                  adjacent = true;
                  break outer;
                }
              }
            }
          }
        }
        if (adjacent) {
          this.rules.push({
            type: 'adjacent',
            letter1: a,
            letter2: b,
            description: `${a} is adjacent to ${b} somewhere in the grid`
          });
        }
      }
    }
  }

  _addCornerRules() {
    const { solution, size } = this;
    const corners = [
      [0, 0,          'top-left'],
      [0, size - 1,   'top-right'],
      [size - 1, 0,   'bottom-left'],
      [size - 1, size - 1, 'bottom-right']
    ];
    for (const [r, c, pos] of corners) {
      const letter = solution[r][c];
      this.rules.push({
        type: 'corner',
        row: r,
        col: c,
        letter,
        description: `The ${pos} corner is ${letter}`
      });
    }
  }

  _addSandwichRules() {
    const { solution, size } = this;
    for (let r = 0; r < size; r++) {
      for (let c = 1; c < size - 1; c++) {
        const mid   = solution[r][c];
        const left  = solution[r][c - 1];
        const right = solution[r][c + 1];
        if (left !== mid && right !== mid && left === right) {
          this.rules.push({
            type: 'sandwich',
            letter:  mid,
            between: left,
            row: r,
            col: c,
            description: `In row ${r + 1}, ${mid} is sandwiched between two ${left}s`
          });
        }
      }
    }
  }

  _addPositionRules() {
    const { solution, size } = this;
    for (let r = 0; r < size; r++) {
      this.rules.push({
        type: 'first_in_row',
        row: r,
        letter: solution[r][0],
        description: `Row ${r + 1} starts with ${solution[r][0]}`
      });
      this.rules.push({
        type: 'last_in_row',
        row: r,
        letter: solution[r][size - 1],
        description: `Row ${r + 1} ends with ${solution[r][size - 1]}`
      });
    }
  }

  validate(grid, rule) {
    const size = grid.length;
    switch (rule.type) {
      case 'row_count': {
        const count = grid[rule.row].filter(c => c === rule.letter).length;
        return count === rule.count;
      }
      case 'col_count': {
        const count = grid.map(row => row[rule.col]).filter(c => c === rule.letter).length;
        return count === rule.count;
      }
      case 'adjacent': {
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (grid[r][c] === rule.letter1) {
              const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
              for (const [nr, nc] of neighbors) {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === rule.letter2) {
                  return true;
                }
              }
            }
          }
        }
        return false;
      }
      case 'corner':
        return grid[rule.row][rule.col] === rule.letter;
      case 'sandwich': {
        const row = grid[rule.row];
        if (!row[rule.col - 1] || !row[rule.col + 1] || !row[rule.col]) return false;
        return row[rule.col] === rule.letter &&
               row[rule.col - 1] === rule.between &&
               row[rule.col + 1] === rule.between;
      }
      case 'first_in_row':
        return grid[rule.row][0] === rule.letter;
      case 'last_in_row':
        return grid[rule.row][size - 1] === rule.letter;
      default:
        return false;
    }
  }

  validateAll(grid) {
    return this.rules.map(rule => ({
      ...rule,
      satisfied: this.validate(grid, rule)
    }));
  }
}
