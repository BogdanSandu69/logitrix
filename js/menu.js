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

// ── Premium helpers ────────────────────────────────────────────────────────

// Premium is cached in localStorage keyed by UID (or 'anon') for sync reads.
// The source of truth for logged-in users is Firestore.
function premiumKey() {
  const user = window.auth && window.auth.currentUser;
  return user ? `logitrix_premium_${user.uid}` : 'logitrix_premium';
}

function isPremiumUnlocked() {
  return localStorage.getItem(premiumKey()) === 'true';
}

async function unlockPremium() {
  localStorage.setItem(premiumKey(), 'true');
  const user = window.auth && window.auth.currentUser;
  if (user && window.db) {
    try {
      await window.db.collection('users').doc(user.uid).set({ premium: true }, { merge: true });
    } catch (e) {
      console.warn('Could not save premium to Firestore:', e);
    }
  }
}

async function syncPremiumFromFirestore(uid) {
  if (!window.db) return;
  try {
    const doc = await window.db.collection('users').doc(uid).get();
    if (doc.exists && doc.data().premium === true) {
      localStorage.setItem(`logitrix_premium_${uid}`, 'true');
    }
  } catch (e) {
    console.warn('Could not fetch premium status from Firestore:', e);
  }
}

async function syncOnSignIn(user) {
  if (!user) return;
  await syncPremiumFromFirestore(user.uid);
  // Save / update the user's profile and merge cloud records with local
  if (window.cloudSave) {
    await window.cloudSave.saveUserProfile(user);
    await window.cloudSave.mergeAndSyncRecords(user.uid);
  }
}

// ── Auth state rendering ───────────────────────────────────────────────────

function renderAuthState() {
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  if (!loginBtn || !userInfo) return;

  const user = window.auth && window.auth.currentUser;
  if (user) {
    loginBtn.classList.add('hidden');
    userInfo.classList.remove('hidden');
    const name = user.displayName || user.email || 'Player';
    const avatarHtml = user.photoURL
      ? `<img src="${user.photoURL}" class="user-avatar-img" alt="">`
      : `<span class="user-avatar">👤</span>`;
    userInfo.innerHTML = `
      ${avatarHtml}
      <span class="user-name">${name}</span>
      <button id="logout-btn" class="logout-btn">Sign Out</button>
    `;
  } else {
    loginBtn.classList.remove('hidden');
    userInfo.classList.add('hidden');
  }
}

// ── Menu rendering ─────────────────────────────────────────────────────────

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
  hideAuthError();
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideAuthError() {
  const el = document.getElementById('auth-error');
  if (el) el.classList.add('hidden');
}

async function handleSignIn(providerFactory, providerLabel) {
  hideAuthError();
  if (!window.auth || typeof firebase === 'undefined') {
    showAuthError('Firebase is not configured. See js/firebase-config.js for setup instructions.');
    return;
  }
  try {
    const result = await window.auth.signInWithPopup(providerFactory());
    await syncOnSignIn(result.user);
    hideLoginModal();
    renderAuthState();
    renderMenu();
    selectDifficulty(selectedDifficulty);
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
      showAuthError(`${providerLabel} sign-in failed: ${err.message}`);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  selectDifficulty('easy');

  // Firebase auth state observer: fires on load and on every sign-in/out
  if (window.auth) {
    window.auth.onAuthStateChanged(async user => {
      if (user) {
        await syncOnSignIn(user);
      }
      renderAuthState();
      renderMenu();
      selectDifficulty(selectedDifficulty);
    });
  } else {
    renderAuthState();
  }

  // Login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) loginBtn.addEventListener('click', showLoginModal);

  // Logout (event delegation on user-info)
  document.getElementById('user-info').addEventListener('click', e => {
    if (e.target.id === 'logout-btn' && window.auth) {
      window.auth.signOut().then(() => {
        renderAuthState();
        renderMenu();
        selectDifficulty('easy');
      });
    }
  });

  // Close login modal
  document.getElementById('close-login').addEventListener('click', hideLoginModal);
  document.getElementById('login-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideLoginModal();
  });

  // Social login buttons
  document.getElementById('login-google').addEventListener('click', () => {
    handleSignIn(() => new firebase.auth.GoogleAuthProvider(), 'Google');
  });

  document.getElementById('login-facebook').addEventListener('click', () => {
    handleSignIn(() => new firebase.auth.FacebookAuthProvider(), 'Facebook');
  });

  // Instagram auth goes through Facebook/Meta
  document.getElementById('login-instagram').addEventListener('click', () => {
    handleSignIn(() => new firebase.auth.FacebookAuthProvider(), 'Facebook/Instagram');
  });

  document.getElementById('login-x').addEventListener('click', () => {
    handleSignIn(() => new firebase.auth.TwitterAuthProvider(), 'X');
  });

  // Steam requires server-side OAuth and is not available in-browser
  document.getElementById('login-steam').addEventListener('click', () => {
    showAuthError('Steam login requires a server setup and is not yet supported.');
  });

  // Premium modal
  document.getElementById('close-premium').addEventListener('click', hidePremiumModal);
  document.getElementById('close-premium-cancel').addEventListener('click', hidePremiumModal);
  document.getElementById('premium-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) hidePremiumModal();
  });
  document.getElementById('unlock-btn').addEventListener('click', async () => {
    // Replace this with a real payment integration (e.g. Stripe) when ready
    await unlockPremium();
    hidePremiumModal();
    renderMenu();
    selectDifficulty('insane');
  });

  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', startGame);
  }

  const leaderboardBtn = document.getElementById('leaderboard-btn');
  if (leaderboardBtn) {
    leaderboardBtn.addEventListener('click', () => {
      window.location.href = 'leaderboards.html';
    });
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
