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
    document.getElementById('logout-btn').addEventListener('click', () => {
      setAuthUser(null);
      renderAuthState();
    });
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
  { id: 'google',    label: 'Google',    avatar: '🔵', icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>` },
  { id: 'facebook',  label: 'Facebook',  avatar: '💙', icon: `<svg viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>` },
  { id: 'steam',     label: 'Steam',     avatar: '🎮', icon: `<svg viewBox="0 0 24 24" fill="#1b2838" xmlns="http://www.w3.org/2000/svg"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" fill="#c7d5e0"/></svg>` },
  { id: 'instagram', label: 'Instagram', avatar: '📸', icon: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f09433"/><stop offset="25%" stop-color="#e6683c"/><stop offset="50%" stop-color="#dc2743"/><stop offset="75%" stop-color="#cc2366"/><stop offset="100%" stop-color="#bc1888"/></linearGradient></defs><path fill="url(#ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>` },
  { id: 'x',         label: 'X',         avatar: '🐦', icon: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>` }
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
    if (e.key === 'Enter') startGame();
    if (e.key === '1') selectDifficulty('easy');
    if (e.key === '2') selectDifficulty('hard');
    if (e.key === '3') { if (isPremiumUnlocked()) selectDifficulty('insane'); else showPremiumModal(); }
    if (e.key === '4') { if (isPremiumUnlocked()) selectDifficulty('legendary'); else showPremiumModal(); }
  });
});
