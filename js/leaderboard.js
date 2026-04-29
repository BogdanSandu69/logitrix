/* leaderboard.js — Leaderboard queries, real-time updates, and UI logic */

const LB_DIFFICULTIES = ['easy', 'hard', 'insane', 'legendary'];
const LB_LABELS       = { easy: 'Easy', hard: 'Hard', insane: 'Insane', legendary: 'Legendary' };
const LB_COLORS       = { easy: '#10b981', hard: '#ef4444', insane: '#8b5cf6', legendary: '#ffd700' };
const LB_TOP_N        = 100;

let lbCurrentDiff     = 'easy';
let lbUnsubscribe     = null; // Firestore real-time listener teardown function

// ── Formatting ───────────────────────────────────────────────────────────────

function lbFormatTime(secs) {
  if (secs == null) return '--:--';
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ── Load / subscribe ──────────────────────────────────────────────────────────

/**
 * Subscribe to real-time leaderboard updates for a given difficulty.
 * Renders entries into the leaderboard list whenever data changes.
 */
function subscribeLeaderboard(difficulty) {
  // Tear down any existing listener
  if (lbUnsubscribe) {
    lbUnsubscribe();
    lbUnsubscribe = null;
  }

  lbCurrentDiff = difficulty;
  renderLeaderboardLoading();

  if (!window.db) {
    renderLeaderboardError('Firebase is not configured. See js/firebase-config.js for setup instructions.');
    return;
  }

  const query = window.db
    .collection('leaderboards')
    .doc(difficulty)
    .collection('entries')
    .orderBy('time', 'asc')
    .limit(LB_TOP_N);

  lbUnsubscribe = query.onSnapshot(snapshot => {
    const entries = [];
    snapshot.forEach(doc => entries.push(doc.data()));
    renderLeaderboardEntries(entries, difficulty);
    renderUserRank(entries, difficulty);
  }, err => {
    console.warn('[leaderboard] Snapshot error:', err);
    renderLeaderboardError('Could not load leaderboard. Please try again later.');
  });
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderLeaderboardLoading() {
  const list = document.getElementById('lb-list');
  if (!list) return;
  list.innerHTML = `
    <div class="lb-loading">
      <div class="lb-spinner"></div>
      <span>Loading leaderboard…</span>
    </div>`;
  const rankInfo = document.getElementById('lb-rank-info');
  if (rankInfo) rankInfo.innerHTML = '';
}

function renderLeaderboardError(msg) {
  const list = document.getElementById('lb-list');
  if (!list) return;
  list.innerHTML = `<div class="lb-empty">${msg}</div>`;
}

function renderLeaderboardEntries(entries, difficulty) {
  const list = document.getElementById('lb-list');
  if (!list) return;

  if (entries.length === 0) {
    list.innerHTML = `
      <div class="lb-empty">
        No scores yet for <strong>${LB_LABELS[difficulty]}</strong>.<br>
        Be the first to complete it!
      </div>`;
    return;
  }

  list.innerHTML = '';
  const color  = LB_COLORS[difficulty];
  const userId = window.auth && window.auth.currentUser && window.auth.currentUser.uid;

  entries.forEach((entry, idx) => {
    const rank      = idx + 1;
    const isMe      = entry.userId === userId;
    const rankClass = rank <= 3 ? `lb-rank-top lb-rank-${rank}` : 'lb-rank-normal';
    const rowClass  = isMe ? 'lb-row lb-row-me' : 'lb-row';

    const avatarHtml = entry.photoURL
      ? `<img src="${entry.photoURL}" class="lb-avatar" alt="" loading="lazy">`
      : `<div class="lb-avatar lb-avatar-default">👤</div>`;

    const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

    list.insertAdjacentHTML('beforeend', `
      <div class="${rowClass}" data-userid="${entry.userId}">
        <span class="lb-rank ${rankClass}">${rankBadge}</span>
        ${avatarHtml}
        <span class="lb-name">${escapeHtml(entry.displayName || 'Anonymous')}${isMe ? ' <span class="lb-you-badge">YOU</span>' : ''}</span>
        <span class="lb-time" style="color:${color}">${lbFormatTime(entry.time)}</span>
      </div>`);
  });
}

function renderUserRank(entries, difficulty) {
  const rankInfo = document.getElementById('lb-rank-info');
  if (!rankInfo) return;

  const user = window.auth && window.auth.currentUser;
  if (!user) { rankInfo.innerHTML = ''; return; }

  const idx = entries.findIndex(e => e.userId === user.uid);
  if (idx >= 0) {
    rankInfo.innerHTML = `<span>Your rank: <strong>#${idx + 1}</strong> of ${entries.length}</span>`;
  } else {
    // User outside top 100 — show their personal best from localStorage
    const records = (() => {
      try { return JSON.parse(localStorage.getItem('logitrix_records') || '{}'); } catch { return {}; }
    })();
    const pb = records[difficulty];
    rankInfo.innerHTML = pb != null
      ? `<span>You are outside the top ${LB_TOP_N}. Your best: <strong>${lbFormatTime(pb)}</strong></span>`
      : `<span>You haven't completed <strong>${LB_LABELS[difficulty]}</strong> yet.</span>`;
  }
}

// ── HTML escaping helper ──────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Tab switching ─────────────────────────────────────────────────────────────

function initLeaderboardTabs() {
  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      subscribeLeaderboard(tab.dataset.difficulty);
    });
  });
}

// ── Page init ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initLeaderboardTabs();

  // Activate the first tab by default
  const firstTab = document.querySelector('.lb-tab');
  if (firstTab) {
    firstTab.classList.add('active');
    subscribeLeaderboard(firstTab.dataset.difficulty);
  }

  // Back button
  const backBtn = document.getElementById('lb-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // Clean up listener when leaving page
  window.addEventListener('beforeunload', () => {
    if (lbUnsubscribe) lbUnsubscribe();
  });
});
