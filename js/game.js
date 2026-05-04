/* game.js — Core game logic */

const LETTER_COLORS = {
  A: '#3b82f6', B: '#ef4444', C: '#f59e0b', D: '#10b981',
  E: '#8b5cf6', F: '#ec4899', G: '#14b8a6', H: '#f97316',
  J: '#a78bfa', K: '#34d399', M: '#fb923c', N: '#60a5fa',
  P: '#f43f5e', Q: '#22d3ee', R: '#a3e635', S: '#e879f9',
  T: '#fbbf24', V: '#4ade80', W: '#38bdf8', X: '#c084fc',
  Y: '#fb7185', Z: '#86efac'
};

// ── State ──────────────────────────────────────────────────────────────────
let grid           = [];
let solution       = [];
let hintCells      = [];   // tracks cells locked by hints
let letters        = [];
let rules          = [];
let size           = 3;
let selectedLetter  = null;
let timerInterval   = null;
let seconds        = 0;
let hintsUsed      = 0;
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
  if (secs > 0 && (records[diff] == null || secs < records[diff])) {
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
      cell.addEventListener('click',       () => handleCellClick(r, c));
      cell.addEventListener('pointerdown', (e) => _startGridDrag(e, r, c));
      gridEl.appendChild(cell);
    }
  }
}

function updateCell(r, c) {
  const cell   = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
  const letter = grid[r][c];
  const locked = hintCells[r] && hintCells[r][c];
  cell.textContent = letter || '';
  cell.style.color = letter ? LETTER_COLORS[letter] : '';
  cell.classList.toggle('occupied', !!letter);
  cell.classList.toggle('hint-locked', !!locked);
}

function refreshAllCells() {
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      updateCell(r, c);
}

// ── Grid cell drag-to-swap (pointer events) ────────────────────────────────
const _DRAG_THRESHOLD = 6; // px movement before committing to a drag
let _gridDrag = null;
let _gridDragJustHappened = false;

function _startGridDrag(e, r, c) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (!grid[r][c]) return;                      // only drag occupied cells
  if (hintCells[r] && hintCells[r][c]) return;  // hint-locked cells are immovable
  const cell = e.currentTarget;
  cell.setPointerCapture(e.pointerId);
  _gridDrag = {
    srcR: r, srcC: c,
    cell,
    startX:  e.clientX,
    startY:  e.clientY,
    offsetX: 0,
    offsetY: 0,
    clone:   null,
    active:  false,
  };
  document.addEventListener('pointermove',   _onGridDragMove);
  document.addEventListener('pointerup',     _onGridDragEnd);
  document.addEventListener('pointercancel', _onGridDragEnd);
}

function _onGridDragMove(e) {
  if (!_gridDrag) return;
  const dx = e.clientX - _gridDrag.startX;
  const dy = e.clientY - _gridDrag.startY;

  if (!_gridDrag.active) {
    if (Math.hypot(dx, dy) < _DRAG_THRESHOLD) return;
    _gridDrag.active = true;
    const rect = _gridDrag.cell.getBoundingClientRect();
    _gridDrag.offsetX = _gridDrag.startX - rect.left;
    _gridDrag.offsetY = _gridDrag.startY - rect.top;
    const clone = _gridDrag.cell.cloneNode(true);
    Object.assign(clone.style, {
      position:      'fixed',
      width:         rect.width  + 'px',
      height:        rect.height + 'px',
      left:          rect.left   + 'px',
      top:           rect.top    + 'px',
      opacity:       '0.9',
      pointerEvents: 'none',
      zIndex:        '9999',
      transition:    'none',
      margin:        '0',
      transform:     'scale(1.08)',
    });
    document.body.appendChild(clone);
    _gridDrag.clone = clone;
    _gridDrag.cell.classList.add('dragging');
  }

  _gridDrag.clone.style.left = (e.clientX - _gridDrag.offsetX) + 'px';
  _gridDrag.clone.style.top  = (e.clientY - _gridDrag.offsetY) + 'px';

  // Highlight valid drop target (any cell except the source and hint-locked ones)
  document.querySelectorAll('.grid-cell').forEach(cell => {
    const cr = parseInt(cell.dataset.row);
    const cc = parseInt(cell.dataset.col);
    if (cr === _gridDrag.srcR && cc === _gridDrag.srcC) return;
    if (hintCells[cr] && hintCells[cr][cc]) return;
    const bbox = cell.getBoundingClientRect();
    const hit  = e.clientX >= bbox.left && e.clientX <= bbox.right &&
                 e.clientY >= bbox.top  && e.clientY <= bbox.bottom;
    cell.classList.toggle('drag-over', hit);
  });
}

function _onGridDragEnd(e) {
  document.removeEventListener('pointermove',   _onGridDragMove);
  document.removeEventListener('pointerup',     _onGridDragEnd);
  document.removeEventListener('pointercancel', _onGridDragEnd);
  if (!_gridDrag) return;

  if (!_gridDrag.active) { _gridDrag = null; return; }  // was just a tap — let click fire

  if (_gridDrag.clone) _gridDrag.clone.remove();

  let targetR = null, targetC = null;
  document.querySelectorAll('.grid-cell').forEach(cell => {
    if (cell.classList.contains('drag-over')) {
      targetR = parseInt(cell.dataset.row);
      targetC = parseInt(cell.dataset.col);
    }
    cell.classList.remove('dragging', 'drag-over');
  });

  const { srcR, srcC } = _gridDrag;
  _gridDrag = null;

  if (targetR !== null) {
    _gridDragJustHappened = true;
    [grid[srcR][srcC], grid[targetR][targetC]] = [grid[targetR][targetC], grid[srcR][srcC]];
    updateCell(srcR, srcC);
    updateCell(targetR, targetC);
    checkRules();
  }
}

// ── Letter tile drag-to-swap (pointer events) ──────────────────────────────
let _drag = null;  // active drag state

function _startDrag(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const btn = e.currentTarget;
  btn.setPointerCapture(e.pointerId);
  _drag = {
    srcIdx:  parseInt(btn.dataset.index),
    btn,
    startX:  e.clientX,
    startY:  e.clientY,
    offsetX: 0,
    offsetY: 0,
    clone:   null,
    active:  false,
  };
  document.addEventListener('pointermove',   _onDragMove);
  document.addEventListener('pointerup',     _onDragEnd);
  document.addEventListener('pointercancel', _onDragEnd);
}

function _onDragMove(e) {
  if (!_drag) return;
  const dx = e.clientX - _drag.startX;
  const dy = e.clientY - _drag.startY;

  if (!_drag.active) {
    if (Math.hypot(dx, dy) < _DRAG_THRESHOLD) return;
    // Commit: create floating clone and dim source
    _drag.active = true;
    const rect = _drag.btn.getBoundingClientRect();
    _drag.offsetX = _drag.startX - rect.left;
    _drag.offsetY = _drag.startY - rect.top;
    const clone = _drag.btn.cloneNode(true);
    Object.assign(clone.style, {
      position:      'fixed',
      width:         rect.width  + 'px',
      height:        rect.height + 'px',
      left:          rect.left   + 'px',
      top:           rect.top    + 'px',
      opacity:       '0.9',
      pointerEvents: 'none',
      zIndex:        '9999',
      transition:    'none',
      margin:        '0',
      transform:     'scale(1.12) translateY(-3px)',
    });
    document.body.appendChild(clone);
    _drag.clone = clone;
    _drag.btn.classList.add('dragging');
  }

  // Move clone with the pointer
  _drag.clone.style.left = (e.clientX - _drag.offsetX) + 'px';
  _drag.clone.style.top  = (e.clientY - _drag.offsetY) + 'px';

  // Highlight whichever button the pointer is over (excluding source)
  document.querySelectorAll('.letter-btn').forEach(b => {
    if (parseInt(b.dataset.index) === _drag.srcIdx) return;
    const r   = b.getBoundingClientRect();
    const hit = e.clientX >= r.left && e.clientX <= r.right &&
                e.clientY >= r.top  && e.clientY <= r.bottom;
    b.classList.toggle('drag-over', hit);
  });
}

function _onDragEnd(e) {
  document.removeEventListener('pointermove',   _onDragMove);
  document.removeEventListener('pointerup',     _onDragEnd);
  document.removeEventListener('pointercancel', _onDragEnd);
  if (!_drag) return;

  if (!_drag.active) { _drag = null; return; }   // was just a tap — let click fire

  // Cleanup
  if (_drag.clone) { _drag.clone.remove(); }
  let targetIdx = null;
  document.querySelectorAll('.letter-btn').forEach(b => {
    if (b.classList.contains('drag-over')) targetIdx = parseInt(b.dataset.index);
    b.classList.remove('dragging', 'drag-over');
  });

  const srcIdx = _drag.srcIdx;
  _drag = null;

  if (targetIdx !== null && targetIdx !== srcIdx) {
    [letters[srcIdx], letters[targetIdx]] = [letters[targetIdx], letters[srcIdx]];
    renderLetters();
  }
}

// ── Letter buttons ─────────────────────────────────────────────────────────
function renderLetters() {
  const container = document.getElementById('letters-container');
  container.innerHTML = '';
  letters.forEach((l, idx) => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.dataset.letter = l;
    btn.dataset.index  = String(idx);
    btn.textContent = l;
    btn.style.setProperty('--lc', LETTER_COLORS[l]);
    btn.title = `Select ${l} (key ${idx + 1})`;

    btn.addEventListener('click',       () => selectLetter(l));
    btn.addEventListener('pointerdown', _startDrag);

    if (l === selectedLetter) btn.classList.add('selected');
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
  if (_gridDragJustHappened) { _gridDragJustHappened = false; return; }
  if (gameWon) return;
  if (!selectedLetter) return;
  if (hintCells[r] && hintCells[r][c]) return;  // locked by hint — cannot change

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
  if (gameWon) return;

  // Find cells that are not yet correct and not already locked by a hint
  const candidateCells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!hintCells[r][c] && grid[r][c] !== solution[r][c]) {
        candidateCells.push({ r, c });
      }
    }
  }
  if (candidateCells.length === 0) return;

  // Pick one at random, place the correct letter, and lock it
  const pick = candidateCells[Math.floor(Math.random() * candidateCells.length)];
  grid[pick.r][pick.c]     = solution[pick.r][pick.c];
  hintCells[pick.r][pick.c] = true;
  hintsUsed++;

  // Add 30-second penalty to the timer
  seconds += 30;
  document.getElementById('timer').textContent = formatTime(seconds);

  updateCell(pick.r, pick.c);
  checkRules();
}

// ── Share ──────────────────────────────────────────────────────────────────
function getShareText() {
  const diff  = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const time  = formatTime(seconds);
  const hints = hintsUsed;
  return `I just solved a ${diff} Logitrix puzzle in ${time}${hints > 0 ? ` using ${hints} hint${hints > 1 ? 's' : ''}` : ' with no hints'}! 🧩 Can you beat me? #Logitrix`;
}

function showToast(msg) {
  let toast = document.getElementById('share-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'share-toast';
    toast.style.cssText = `
      position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);
      background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);
      color:#e8eaf6;font-family:'Exo 2',sans-serif;font-size:0.85rem;
      padding:0.6rem 1.4rem;border-radius:8px;z-index:999;
      backdrop-filter:blur(8px);transition:opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

function shareResult(platform) {
  const text    = getShareText();
  const pageUrl = encodeURIComponent(window.location.origin + window.location.pathname.replace('game.html', ''));
  const encoded = encodeURIComponent(text);

  const urls = {
    x:         `https://twitter.com/intent/tweet?text=${encoded}`,
    facebook:  `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}&quote=${encoded}`,
    whatsapp:  `https://wa.me/?text=${encoded}`,
    telegram:  `https://t.me/share/url?url=${pageUrl}&text=${encoded}`,
    instagram: null,
    copy:      null
  };

  if (platform === 'instagram' || platform === 'copy') {
    navigator.clipboard.writeText(text).then(() => {
      showToast(platform === 'instagram' ? '📸 Copied! Paste it on Instagram.' : '📋 Copied to clipboard!');
    }).catch(() => {
      showToast('Could not copy — try manually.');
    });
    return;
  }

  const url = urls[platform];
  if (url) window.open(url, '_blank', 'noopener,noreferrer,width=600,height=480');
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

  // ── Cloud save ────────────────────────────────────────────────────────────
  if (window.cloudSave && window.auth && window.auth.currentUser) {
    const user = window.auth.currentUser;
    (async () => {
      try {
        const cloudNew = await window.cloudSave.saveCloudRecord(user.uid, difficulty, seconds);
        await window.cloudSave.saveLeaderboardEntry(user, difficulty, seconds);
        if (cloudNew) {
          showToast('☁️ New cloud record saved!');
        }
      } catch (e) {
        console.warn('[game] Cloud save failed:', e);
      }
    })();
  }
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

  grid      = Array.from({ length: size }, () => Array(size).fill(null));
  hintCells = Array.from({ length: size }, () => Array(size).fill(false));

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
    // Letter key shortcut: pressing the actual letter selects it
    const keyUpper = e.key.toUpperCase();
    if (/^[A-Z]$/.test(keyUpper) && letters.includes(keyUpper)) {
      selectLetter(keyUpper);
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

// ── Premium gate ───────────────────────────────────────────────────────────
const PREMIUM_DIFFICULTIES = ['insane', 'legendary'];

/**
 * Returns a Promise that resolves to true if the player may access the given
 * difficulty, false if it is premium-locked and the player does not have
 * premium.  Waits for Firebase auth to restore the persisted session before
 * deciding, so that a logged-in premium user is never incorrectly blocked.
 */
function checkPremiumGate(diff) {
  if (!PREMIUM_DIFFICULTIES.includes(diff)) return Promise.resolve(true);

  return new Promise(resolve => {
    if (!window.auth) {
      // Firebase not configured — fall back to anonymous localStorage key
      resolve(localStorage.getItem('logitrix_premium') === 'true');
      return;
    }

    const ready = window.authReady || Promise.resolve();
    ready.then(() => {
      // onAuthStateChanged fires immediately with the restored session
      const unsubscribe = window.auth.onAuthStateChanged(user => {
        const key = user ? `logitrix_premium_${user.uid}` : 'logitrix_premium';
        resolve(localStorage.getItem(key) === 'true');
        unsubscribe();
      });
    });
  });
}

/** Shows a brief premium-required overlay, then redirects to the main menu. */
function showPremiumBlocker() {
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'display:flex', 'align-items:center',
    'justify-content:center', 'flex-direction:column', 'gap:1rem',
    'background:rgba(13,13,43,0.92)', 'z-index:9999',
    "font-family:'Exo 2',sans-serif", 'color:#e8eaf6',
    'text-align:center', 'padding:1rem'
  ].join(';');
  overlay.innerHTML = `
    <div style="font-size:2rem">🔒</div>
    <div style="font-size:1.1rem;font-weight:700;">Premium Difficulty</div>
    <div style="font-size:0.85rem;color:rgba(255,255,255,0.5);">
      Insane &amp; Legendary require a premium unlock.<br>Redirecting to menu…
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => { window.location.href = 'index.html'; }, 1800);
}

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  const diff   = params.get('difficulty') || 'easy';

  const allowed = await checkPremiumGate(diff);
  if (!allowed) {
    showPremiumBlocker();
    return;
  }

  init();
});
