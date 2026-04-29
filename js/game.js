/* game.js — Core game logic */

const LETTER_COLORS = {
  A: '#3b82f6',
  B: '#ef4444',
  C: '#f59e0b',
  D: '#10b981',
  E: '#8b5cf6',
  F: '#ec4899'
};

// ── State ──────────────────────────────────────────────────────────────────
let grid           = [];
let solution       = [];
let letters        = [];
let rules          = [];
let size           = 3;
let selectedLetter = null;
let timerInterval  = null;
let seconds        = 0;
let hintsUsed      = 0;
let hintTimeout    = null;
let difficulty     = 'easy';
let engine         = null;
let gameWon        = false;

// ── Helpers ────────────────────────────────────────────────────────────────
function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function loadRecords() {
  try { return JSON.parse(localStorage.getItem('logitrix_records') || '{}'); }
  catch { return {}; }
}

function saveRecord(diff, secs) {
  const records = loadRecords();
  if (records[diff] == null || secs < records[diff]) {
    records[diff] = secs;
    localStorage.setItem('logitrix_records', JSON.stringify(records));
    return true;
  }
  return false;
}

// ── Timer ──────────────────────────────────────────────────────────────────
function startTimer() {
  seconds = 0;
  document.getElementById('timer').textContent = '00:00';
  timerInterval = setInterval(() => {
    seconds++;
    document.getElementById('timer').textContent = formatTime(seconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ── Grid rendering ─────────────────────────────────────────────────────────
function renderGrid() {
  const gridEl = document.getElementById('grid');
  gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  gridEl.innerHTML = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', () => handleCellClick(r, c));
      gridEl.appendChild(cell);
    }
  }
}

function updateCell(r, c) {
  const cell   = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
  const letter = grid[r][c];
  cell.textContent = letter || '';
  cell.style.color = letter ? LETTER_COLORS[letter] : '';
  cell.classList.toggle('occupied', !!letter);
  cell.classList.remove('hint-highlight');
}

function refreshAllCells() {
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      updateCell(r, c);
}

// ── Letter buttons ─────────────────────────────────────────────────────────
function renderLetters() {
  const container = document.getElementById('letters-container');
  container.innerHTML = '';
  letters.forEach((l, idx) => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.dataset.letter = l;
    btn.textContent = l;
    btn.style.setProperty('--lc', LETTER_COLORS[l]);
    btn.title = `Select ${l} (key ${idx + 1})`;
    btn.addEventListener('click', () => selectLetter(l));
    container.appendChild(btn);
  });
}

function selectLetter(l) {
  if (selectedLetter === l) {
    selectedLetter = null;
  } else {
    selectedLetter = l;
  }
  document.querySelectorAll('.letter-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.letter === selectedLetter);
  });
}

function deselectLetter() {
  selectedLetter = null;
  document.querySelectorAll('.letter-btn').forEach(btn => btn.classList.remove('selected'));
}

// ── Cell interaction ───────────────────────────────────────────────────────
function handleCellClick(r, c) {
  if (gameWon) return;
  if (!selectedLetter) return;

  if (grid[r][c] === selectedLetter) {
    grid[r][c] = null; // toggle off same letter
  } else {
    grid[r][c] = selectedLetter;
  }
  updateCell(r, c);
  checkRules();
}

// ── Rules display ──────────────────────────────────────────────────────────
function renderRules() {
  const list = document.getElementById('rules-list');
  list.innerHTML = '';
  rules.forEach((rule, i) => {
    const item = document.createElement('div');
    item.className = 'rule-item';
    item.dataset.index = i;
    item.innerHTML = `<span class="rule-icon">•</span><span class="rule-text">${rule.description}</span>`;
    list.appendChild(item);
  });
  document.getElementById('rules-counter').textContent = `[0/${rules.length}]`;
}

function checkRules() {
  const results   = engine.validateAll(grid);
  const satisfied = results.filter(r => r.satisfied).length;

  document.getElementById('rules-counter').textContent = `[${satisfied}/${rules.length}]`;

  document.querySelectorAll('.rule-item').forEach((item, i) => {
    const ok = results[i].satisfied;
    item.classList.toggle('satisfied', ok);
    item.querySelector('.rule-icon').textContent = ok ? '✓' : '•';
  });

  const allFilled = grid.every(row => row.every(c => c !== null));
  if (allFilled && satisfied === rules.length) {
    showWin();
  }
}

// ── Hint ───────────────────────────────────────────────────────────────────
function showHint() {
  if (hintTimeout || gameWon) return;

  const wrongCells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== solution[r][c]) {
        wrongCells.push({ r, c });
      }
    }
  }
  if (wrongCells.length === 0) return;

  const pick = wrongCells[Math.floor(Math.random() * wrongCells.length)];
  const cell = document.querySelector(`[data-row="${pick.r}"][data-col="${pick.c}"]`);
  cell.classList.add('hint-highlight');
  hintsUsed++;

  hintTimeout = setTimeout(() => {
    cell.classList.remove('hint-highlight');
    hintTimeout = null;
  }, 3000);
}

// ── Particles ──────────────────────────────────────────────────────────────
function createParticles() {
  const overlay  = document.getElementById('win-overlay');
  // accent colors + all letter colors from the single source of truth
  const colors   = ['#00d4ff', '#7c3aed', ...Object.values(LETTER_COLORS)];
  const count    = 120;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const startX = Math.random() * 100;
    const endX   = startX + (Math.random() - 0.5) * 40;
    const dur    = 1.5 + Math.random() * 2;
    const delay  = Math.random() * 1.2;
    const size   = 6 + Math.random() * 8;
    const shape  = Math.random() > 0.5 ? '50%' : '2px';

    p.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${shape};
      left: ${startX}%;
      top: -10px;
      animation: fall ${dur}s ${delay}s ease-in forwards;
      --endX: ${endX}%;
    `;
    overlay.appendChild(p);
    setTimeout(() => p.remove(), (dur + delay + 0.5) * 1000);
  }
}

// ── Win screen ─────────────────────────────────────────────────────────────
function showWin() {
  if (gameWon) return;
  gameWon = true;
  stopTimer();

  const isNew = saveRecord(difficulty, seconds);

  document.getElementById('win-time').textContent    = formatTime(seconds);
  document.getElementById('win-hints').textContent   = hintsUsed;
  document.getElementById('win-diff').textContent    = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  document.getElementById('win-record').textContent  = isNew ? '🏆 New Record!' : '';

  const overlay = document.getElementById('win-overlay');
  overlay.classList.add('visible');

  createParticles();
}

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
  const params = new URLSearchParams(location.search);
  difficulty   = params.get('difficulty') || 'easy';

  const diffLabel = document.getElementById('difficulty-label');
  if (diffLabel) diffLabel.textContent = difficulty.toUpperCase();

  const generator = new PuzzleGenerator(difficulty);
  const puzzle    = generator.generate();
  solution        = puzzle.solution;
  size            = puzzle.size;
  letters         = puzzle.letters;

  engine = new RulesEngine(solution, letters);
  rules  = engine.generateRules();

  grid = Array.from({ length: size }, () => Array(size).fill(null));

  renderGrid();
  renderLetters();
  renderRules();
  startTimer();

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    if (confirm('Leave the game? Your progress will be lost.')) {
      window.location.href = 'index.html';
    }
  });

  // Hint button
  document.getElementById('hint-btn').addEventListener('click', showHint);

  // Win overlay buttons
  document.getElementById('play-again-btn').addEventListener('click', () => location.reload());
  document.getElementById('menu-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= letters.length) {
      selectLetter(letters[num - 1]);
      return;
    }
    if (e.key === 'Escape') {
      deselectLetter();
    }
    if (e.key === 'h' || e.key === 'H') {
      showHint();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
