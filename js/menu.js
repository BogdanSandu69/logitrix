/* menu.js — Main menu logic */

const DIFFICULTIES = ['easy', 'medium', 'hard', 'insane', 'legendary'];

const DIFF_META = {
  easy:      { label: 'Easy',      grid: '3×3', letters: 'A B C',            color: 'grey',   locked: false },
  medium:    { label: 'Medium',    grid: '4×4', letters: 'A B C D',          color: 'green',  locked: false },
  hard:      { label: 'Hard',      grid: '5×5', letters: 'A B C D E',        color: 'red',    locked: false },
  insane:    { label: 'Insane',    grid: '6×6', letters: 'A B C D E F',      color: 'purple', locked: true  },
  legendary: { label: 'Legendary', grid: '7×7', letters: 'A B C D E F G',   color: 'gold',   locked: true  }
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
      await window.db.collection('users').doc(user.uid).set({ isPremium: true }, { merge: true });
    } catch (e) {
      console.warn('Could not save premium to Firestore:', e);
    }
  }
}

async function syncPremiumFromFirestore(uid) {
  if (!window.db) return;
  try {
    const doc = await window.db.collection('users').doc(uid).get();
    if (doc.exists && doc.data().isPremium === true) {
      localStorage.setItem(`logitrix_premium_${uid}`, 'true');
    }
  } catch (e) {
    console.warn('Could not fetch premium status from Firestore:', e);
  }
}

async function initializeUserDocument(uid) {
  if (!window.db) return;
  try {
    const docRef = window.db.collection('users').doc(uid);
    const doc = await docRef.get();
    if (!doc.exists) {
      await docRef.set({
        isPremium: false,
        easy: null,
        medium: null,
        hard: null,
        insane: null,
        legendary: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('[sync] User document initialized with null times');
    }
  } catch (e) {
    console.warn('Could not initialize user document:', e);
  }
}

async function syncOnSignIn(user) {
  if (!user) return;
  await initializeUserDocument(user.uid);
  await syncPremiumFromFirestore(user.uid);
  // Save / update the user's profile and merge cloud records with local
  if (window.cloudSave) {
    await window.cloudSave.saveUserProfile(user);
    await window.cloudSave.mergeAndSyncRecords(user.uid);
    // Refresh the menu immediately after cloud records are merged into
    // localStorage so the newly-synced best times are visible at once.
    renderMenu();
    selectDifficulty(selectedDifficulty);
  } else {
    // If cloudSave.js isn't loaded, manually sync records
    await syncRecordsToFirestore(user.uid);
  }
}

async function syncRecordsToFirestore(uid) {
  if (!window.db) return;
  try {
    const records = JSON.parse(localStorage.getItem('logitrix_records') || '{}');
    const firestoreData = {};

    // Only include times that exist and are valid (not null/undefined/0)
    if (records.easy != null && records.easy > 0) firestoreData.easy = records.easy;
    if (records.medium != null && records.medium > 0) firestoreData.medium = records.medium;
    if (records.hard != null && records.hard > 0) firestoreData.hard = records.hard;
    if (records.insane != null && records.insane > 0) firestoreData.insane = records.insane;
    if (records.legendary != null && records.legendary > 0) firestoreData.legendary = records.legendary;

    if (Object.keys(firestoreData).length > 0) {
      await window.db.collection('users').doc(uid).set(firestoreData, { merge: true });
      console.log('[sync] Best times saved to Firestore:', firestoreData);
    }
  } catch (e) {
    console.warn('Could not sync records to Firestore:', e);
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

  // Row 1: Easy, Medium, Hard — Row 2: Insane, Legendary
  const row1Diffs = ['easy', 'medium', 'hard'];
  const row2Diffs = ['insane', 'legendary'];

  function buildRow(diffs, rowClass) {
    const row = document.createElement('div');
    row.className = rowClass;
    for (const diff of diffs) {
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
      row.appendChild(btn);
    }
    container.appendChild(row);
  }

  buildRow(row1Diffs, 'diff-row');
  buildRow(row2Diffs, 'diff-row diff-row-2');
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
  const user = window.auth && window.auth.currentUser;
  if (!user) {
    showPlayPromptModal();
  } else {
    navigateToGame();
  }
}

// ── Play Prompt Modal ──────────────────────────────────────────────────────
function showPlayPromptModal() {
  document.getElementById('play-prompt-modal').classList.remove('hidden');
  document.getElementById('play-prompt-auth-error').classList.add('hidden');
}

function hidePlayPromptModal() {
  document.getElementById('play-prompt-modal').classList.add('hidden');
}

function navigateToGame() {
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
  console.log('[auth] Initiating sign-in with:', providerLabel);
  if (!window.auth || typeof firebase === 'undefined') {
    showAuthError('Firebase is not configured. See js/firebase-config.js for setup instructions.');
    return;
  }
  try {
    console.log('[auth] Opening sign-in popup...');
    const provider = providerFactory();

    // Use popup instead of redirect for better reliability
    const result = await window.auth.signInWithPopup(provider);

    console.log('[auth] ✅ Sign-in successful via popup');
    console.log('[auth] User:', result.user.email, result.user.displayName);

    // Close the login modal immediately
    hideLoginModal();

    // The onAuthStateChanged listener will handle UI updates and sync
  } catch (err) {
    console.error('[auth] ❌ Popup sign-in failed:', err);
    console.error('[auth] Error code:', err.code);
    console.error('[auth] Error message:', err.message);

    if (err.code === 'auth/popup-closed-by-user') {
      showAuthError('Sign-in cancelled. Please try again.');
    } else if (err.code === 'auth/popup-blocked') {
      showAuthError('Pop-up blocked by browser. Please allow pop-ups for this site and try again.');
    } else if (err.code === 'auth/account-exists-with-different-credential') {
      showAuthError('An account already exists with the same email but different sign-in method.');
    } else if (err.code === 'auth/cancelled-popup-request') {
      // Multiple popups opened, ignore this error
      console.log('[auth] Previous popup cancelled, new one opened');
    } else {
      showAuthError(`${providerLabel} sign-in failed: ${err.message}`);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  selectDifficulty('easy');

  // Firebase auth state observer: fires on load and on every sign-in/out.
  // Wait for persistence to be configured before attaching the observer so
  // that a stale session from a previous tab is not incorrectly restored.
  if (window.auth) {
    const ready = window.authReady || Promise.resolve();
    ready.then(() => {
      console.log('[auth] Attaching auth state observer');

      window.auth.onAuthStateChanged(async user => {
        console.log('[auth-debug] onAuthStateChanged fired');
        console.log('[auth-debug] User object:', user);
        if (user) {
          console.log('[auth] ✅ User state:', user.email, user.displayName, user.uid);
        } else {
          console.log('[auth] ⚠️ No user in auth state');
        }

        // Update the UI immediately so the user sees their logged-in state
        // without waiting for the Firestore sync to complete.
        renderAuthState();
        renderMenu();
        selectDifficulty(selectedDifficulty);

        if (user) {
          console.log('[auth] Starting sync for user:', user.uid);
          await syncOnSignIn(user);
          // Re-render after sync so records and premium status are up-to-date.
          renderMenu();
          selectDifficulty(selectedDifficulty);
          console.log('[auth] Sync complete');
        }
      });
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
  document.getElementById('unlock-btn').addEventListener('click', () => {
    // Payment coming soon — button is disabled, this handler is a no-op
  });

  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', startGame);
  }

  // Play-prompt modal
  document.getElementById('close-play-prompt').addEventListener('click', hidePlayPromptModal);
  document.getElementById('play-prompt-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) hidePlayPromptModal();
  });
  document.getElementById('play-prompt-skip').addEventListener('click', () => {
    hidePlayPromptModal();
    navigateToGame();
  });
  document.getElementById('play-prompt-google').addEventListener('click', async () => {
    const errEl = document.getElementById('play-prompt-auth-error');
    errEl.classList.add('hidden');
    if (!window.auth || typeof firebase === 'undefined') {
      errEl.textContent = 'Firebase is not configured. See js/firebase-config.js for setup instructions.';
      errEl.classList.remove('hidden');
      return;
    }
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await window.auth.signInWithPopup(provider);
      hidePlayPromptModal();
      navigateToGame();
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // user closed popup — stay on modal
      } else if (err.code === 'auth/popup-blocked') {
        errEl.textContent = 'Pop-up blocked by browser. Please allow pop-ups for this site and try again.';
        errEl.classList.remove('hidden');
      } else {
        errEl.textContent = `Sign-in failed: ${err.message}`;
        errEl.classList.remove('hidden');
      }
    }
  });

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
      selectDifficulty('medium');
    } else if (e.key === '3') {
      selectDifficulty('hard');
    } else if (e.key === '4') {
      if (isPremiumUnlocked()) { selectDifficulty('insane'); } else { showPremiumModal(); }
    } else if (e.key === '5') {
      if (isPremiumUnlocked()) { selectDifficulty('legendary'); } else { showPremiumModal(); }
    }
  });
});
