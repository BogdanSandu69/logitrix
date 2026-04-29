/* menu.js — Main menu logic */

const DIFFICULTIES = ['easy', 'hard', 'insane', 'legendary'];

const DIFF_META = {
  easy:      { label: 'Easy',      grid: '3×3', letters: 'A B C',        color: 'green',  locked: false },
  hard:      { label: 'Hard',      grid: '4×4', letters: 'A B C D',      color: 'red',    locked: false },
  insane:    { label: 'Insane',    grid: '5×5', letters: 'A B C D E',    color: 'purple', locked: true  },
  legendary: { label: 'Legendary', grid: '6×6', letters: 'A B C D E F', color: 'gold',   locked: true  }
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

function isPremiumUnlocked() {
  return localStorage.getItem('logitrix_premium') === 'true';
}

function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem('logitrix_user') || 'null');
  } catch {
    return null;
  }
}

function setAuthUser(user) {
  if (user) {
    localStorage.setItem('logitrix_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('logitrix_user');
  }
}

function renderAuthState() {
  const user = getAuthUser();
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  if (!loginBtn || !userInfo) return;

  if (user) {
    loginBtn.classList.add('hidden');
    userInfo.classList.remove('hidden');
    userInfo.innerHTML = `
      <span class="user-avatar">${user.avatar || '👤'}</span>
      <span class="user-name">${user.name}</span>
      <button id="logout-btn" class="logout-btn">Sign Out</button>
    `;
  } else {
    loginBtn.classList.remove('hidden');
    userInfo.classList.add('hidden');
  }
}

function renderMenu() {
  const records = loadRecords();
  const premium = isPremiumUnlocked();
  const container = document.getElementById('difficulty-buttons');
  if (!container) return;

  container.innerHTML = '';

  for (const diff of DIFFICULTIES) {
    const meta    = DIFF_META[diff];
    const record  = records[diff];
    const recText = record != null ? `Best: ${formatTime(record)}` : '--:--';
    const isLocked = meta.locked && !premium;

    const btn = document.createElement('button');
    btn.className = `diff-btn diff-${meta.color}${isLocked ? ' diff-locked' : ''}`;
    btn.dataset.difficulty = diff;
    btn.innerHTML = `
      ${isLocked ? '<span class="lock-badge">🔒 $2</span>' : ''}
      <span class="diff-name">${meta.label}</span>
      <span class="diff-grid">${meta.grid} &bull; ${meta.letters}</span>
      <span class="diff-record">${isLocked ? 'Premium Only' : recText}</span>
    `;
    btn.addEventListener('click', () => {
      if (isLocked) {
        showPremiumModal();
      } else {
        selectDifficulty(diff);
      }
    });
    container.appendChild(btn);
  }
}

let selectedDifficulty = 'easy';

function selectDifficulty(diff) {
  selectedDifficulty = diff;
  document.querySelectorAll('.diff-btn:not(.diff-locked)').forEach(b => {
    b.classList.toggle('selected', b.dataset.difficulty === diff);
  });
  const playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.dataset.difficulty = diff;
}

function startGame() {
  window.location.href = `game.html?difficulty=${selectedDifficulty}`;
}

// ── Premium Modal ──────────────────────────────────────────────────────────
function showPremiumModal() {
  document.getElementById('premium-modal').classList.remove('hidden');
}

function hidePremiumModal() {
  document.getElementById('premium-modal').classList.add('hidden');
}

// ── Login Modal ────────────────────────────────────────────────────────────
function showLoginModal() {
  document.getElementById('login-modal').classList.remove('hidden');
}

function hideLoginModal() {
  document.getElementById('login-modal').classList.add('hidden');
}

const SOCIAL_PROVIDERS = [
  { id: 'google',    label: 'Google',    avatar: '🔵' },
  { id: 'facebook',  label: 'Facebook',  avatar: '💙' },
  { id: 'steam',     label: 'Steam',     avatar: '🎮' },
  { id: 'instagram', label: 'Instagram', avatar: '📸' },
  { id: 'x',         label: 'X',         avatar: '🐦' }
];

function socialLogin(provider) {
  const user = { provider: provider.id, name: `${provider.label} User`, avatar: provider.avatar };
  setAuthUser(user);
  renderAuthState();
  hideLoginModal();
}

document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  selectDifficulty('easy');
  renderAuthState();

  // Login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) loginBtn.addEventListener('click', showLoginModal);

  // Use event delegation on user-info to handle logout (avoids duplicate listeners)
  document.getElementById('user-info').addEventListener('click', e => {
    if (e.target.id === 'logout-btn') {
      setAuthUser(null);
      renderAuthState();
    }
  });

  // Close login modal
  document.getElementById('close-login').addEventListener('click', hideLoginModal);
  document.getElementById('login-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideLoginModal();
  });

  // Social login buttons
  SOCIAL_PROVIDERS.forEach(p => {
    const btn = document.getElementById(`login-${p.id}`);
    if (btn) btn.addEventListener('click', () => socialLogin(p));
  });

  // Premium modal
  document.getElementById('close-premium').addEventListener('click', hidePremiumModal);
  document.getElementById('close-premium-cancel').addEventListener('click', hidePremiumModal);
  document.getElementById('premium-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) hidePremiumModal();
  });
  document.getElementById('unlock-btn').addEventListener('click', () => {
    // Simulate payment
    localStorage.setItem('logitrix_premium', 'true');
    hidePremiumModal();
    renderMenu();
    selectDifficulty('insane');
  });

  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', startGame);
  }

  // keyboard shortcut: Enter starts game
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      startGame();
    } else if (e.key === '1') {
      selectDifficulty('easy');
    } else if (e.key === '2') {
      selectDifficulty('hard');
    } else if (e.key === '3') {
      if (isPremiumUnlocked()) { selectDifficulty('insane'); } else { showPremiumModal(); }
    } else if (e.key === '4') {
      if (isPremiumUnlocked()) { selectDifficulty('legendary'); } else { showPremiumModal(); }
    }
  });
});
