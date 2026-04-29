/* menu.js — Main menu logic */

const DIFFICULTIES = ['easy', 'hard', 'insane', 'legendary'];

const DIFF_META = {
  easy:      { label: 'Easy',      grid: '3×3', letters: 'A B C',          color: 'green'  },
  hard:      { label: 'Hard',      grid: '4×4', letters: 'A B C D',        color: 'amber'  },
  insane:    { label: 'Insane',    grid: '5×5', letters: 'A B C D E',      color: 'red'    },
  legendary: { label: 'Legendary', grid: '6×6', letters: 'A B C D E F',   color: 'purple' }
};

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem('logitrix_records') || '{}');
  } catch {
    return {};
  }
}

function renderMenu() {
  const records = loadRecords();
  const container = document.getElementById('difficulty-buttons');
  if (!container) return;

  container.innerHTML = '';

  for (const diff of DIFFICULTIES) {
    const meta    = DIFF_META[diff];
    const record  = records[diff];
    const recText = record != null ? `Best: ${formatTime(record)}` : '--:--';

    const btn = document.createElement('button');
    btn.className = `diff-btn diff-${meta.color}`;
    btn.dataset.difficulty = diff;
    btn.innerHTML = `
      <span class="diff-name">${meta.label}</span>
      <span class="diff-grid">${meta.grid} &bull; ${meta.letters}</span>
      <span class="diff-record">${recText}</span>
    `;
    btn.addEventListener('click', () => selectDifficulty(diff));
    container.appendChild(btn);
  }
}

let selectedDifficulty = 'easy';

function selectDifficulty(diff) {
  selectedDifficulty = diff;
  document.querySelectorAll('.diff-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.difficulty === diff);
  });
  const playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.dataset.difficulty = diff;
}

function startGame() {
  window.location.href = `game.html?difficulty=${selectedDifficulty}`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  selectDifficulty('easy');

  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', startGame);
  }

  // keyboard shortcut: Enter starts game
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') startGame();
    if (e.key === '1') selectDifficulty('easy');
    if (e.key === '2') selectDifficulty('hard');
    if (e.key === '3') selectDifficulty('insane');
    if (e.key === '4') selectDifficulty('legendary');
  });
});
