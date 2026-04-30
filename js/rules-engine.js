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
    this._addShapeRules();
    this._addDiagonalCountRules();
    return this.rules;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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
    const corners = this._shuffle([
      [0, 0,          'top-left'],
      [0, size - 1,   'top-right'],
      [size - 1, 0,   'bottom-left'],
      [size - 1, size - 1, 'bottom-right']
    ]);
    // Keep only 1 or 2 corner rules
    const keep = Math.random() < 0.5 ? 1 : 2;
    for (const [r, c, pos] of corners.slice(0, keep)) {
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
    const candidates = [];
    for (let r = 0; r < size; r++) {
      candidates.push({
        type: 'first_in_row',
        row: r,
        letter: solution[r][0],
        description: `Row ${r + 1} starts with ${solution[r][0]}`
      });
      candidates.push({
        type: 'last_in_row',
        row: r,
        letter: solution[r][size - 1],
        description: `Row ${r + 1} ends with ${solution[r][size - 1]}`
      });
    }
    // Keep only 2 or 3 rules total
    this._shuffle(candidates);
    const keep = 2 + Math.floor(Math.random() * 2); // 2 or 3
    for (const rule of candidates.slice(0, keep)) {
      this.rules.push(rule);
    }
  }

  _xShapePositions(cr, cc) {
    return [[cr-1,cc-1],[cr-1,cc+1],[cr,cc],[cr+1,cc-1],[cr+1,cc+1]];
  }

  _plusShapePositions(cr, cc) {
    return [[cr-1,cc],[cr+1,cc],[cr,cc],[cr,cc-1],[cr,cc+1]];
  }

  _matchesShape(positions, shape) {
    if (positions.length !== shape.length) return false;
    const posSet = new Set(positions.map(([r, c]) => `${r},${c}`));
    return shape.every(([r, c]) => posSet.has(`${r},${c}`));
  }

  _addShapeRules() {
    const { solution, letters, size } = this;
    for (const letter of letters) {
      const positions = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (solution[r][c] === letter) positions.push([r, c]);

      // X shape and + shape require exactly 5 cells; since each letter appears
      // exactly `size` times, this condition holds only when size === 5.
      if (positions.length === 5) {
        let found = false;
        for (const [cr, cc] of positions) {
          if (found) break;
          if (this._matchesShape(positions, this._xShapePositions(cr, cc))) {
            this.rules.push({
              type: 'shape_x',
              letter,
              center: [cr, cc],
              description: `Letter ${letter} forms an X shape`
            });
            found = true;
          } else if (this._matchesShape(positions, this._plusShapePositions(cr, cc))) {
            this.rules.push({
              type: 'shape_plus',
              letter,
              center: [cr, cc],
              description: `Letter ${letter} forms a + shape`
            });
            found = true;
          }
        }
      }

      // Diagonal shape works for any grid size
      const onMain = positions.every(([r, c]) => r === c);
      const onAnti = positions.every(([r, c]) => r + c === size - 1);
      if (onMain) {
        this.rules.push({
          type: 'shape_diagonal',
          letter,
          direction: 'main',
          description: `Letter ${letter} forms a diagonal (↘)`
        });
      } else if (onAnti) {
        this.rules.push({
          type: 'shape_diagonal',
          letter,
          direction: 'anti',
          description: `Letter ${letter} forms a diagonal (↙)`
        });
      }
    }
  }

  _addDiagonalCountRules() {
    const { solution, letters, size } = this;
    for (const letter of letters) {
      const count = solution.filter((row, r) => row[r] === letter).length;
      // Only add rule when the count is surprising: absent or appears 2+ times
      if (count === 0 || count >= 2) {
        const desc = count === 0
          ? `Letter ${letter} never appears on the main diagonal`
          : `Letter ${letter} appears exactly ${count} times on the main diagonal`;
        this.rules.push({
          type: 'diagonal_count',
          letter,
          count,
          description: desc
        });
      }
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
        for (let c = 1; c < size - 1; c++) {
          if (row[c] === rule.letter && row[c - 1] === rule.between && row[c + 1] === rule.between) {
            return true;
          }
        }
        return false;
      }
      case 'first_in_row':
        return grid[rule.row][0] === rule.letter;
      case 'last_in_row':
        return grid[rule.row][size - 1] === rule.letter;
      case 'shape_x': {
        const [cr, cc] = rule.center;
        return this._xShapePositions(cr, cc)
          .every(([r, c]) => r >= 0 && r < size && c >= 0 && c < size && grid[r][c] === rule.letter);
      }
      case 'shape_plus': {
        const [cr, cc] = rule.center;
        return this._plusShapePositions(cr, cc)
          .every(([r, c]) => r >= 0 && r < size && c >= 0 && c < size && grid[r][c] === rule.letter);
      }
      case 'shape_diagonal': {
        if (rule.direction === 'main') {
          return grid.every((row, r) => row[r] === rule.letter);
        } else {
          return grid.every((row, r) => row[size - 1 - r] === rule.letter);
        }
      }
      case 'diagonal_count': {
        const count = grid.filter((row, r) => row[r] === rule.letter).length;
        return count === rule.count;
      }
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
