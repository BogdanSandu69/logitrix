/* cloud-save.js — Firestore record sync and user profile management */

// ── User profile ────────────────────────────────────────────────────────────

/**
 * Save or update user profile in Firestore.
 * Called on every sign-in.
 */
async function saveUserProfile(user) {
  if (!window.db || !user) return;
  try {
    await window.db.collection('users').doc(user.uid).set({
      displayName: user.displayName || '',
      email:       user.email || '',
      photoURL:    user.photoURL || '',
      lastPlayed:  firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn('[cloud-save] Could not save user profile:', e);
  }
}

// ── Records ─────────────────────────────────────────────────────────────────

/**
 * Load user's best records from Firestore.
 * Returns an object like { easy: 45, hard: 120, ... } or {}.
 */
async function loadCloudRecords(uid) {
  if (!window.db || !uid) return {};
  try {
    const doc = await window.db.collection('users').doc(uid).get();
    if (doc.exists) {
      return doc.data().records || {};
    }
  } catch (e) {
    console.warn('[cloud-save] Could not load cloud records:', e);
  }
  return {};
}

/**
 * Save a new best time for a difficulty to Firestore.
 * Only writes if the time is better than the existing cloud record.
 */
async function saveCloudRecord(uid, difficulty, secs) {
  if (!window.db || !uid) return false;
  try {
    const userRef = window.db.collection('users').doc(uid);
    const doc     = await userRef.get();
    const records = (doc.exists && doc.data().records) || {};

    if (records[difficulty] != null && secs >= records[difficulty]) {
      return false; // not a new cloud record
    }

    await userRef.set({
      [`records.${difficulty}`]:   secs,
      totalGamesPlayed:            firebase.firestore.FieldValue.increment(1),
      lastPlayed:                  firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`[cloud-save] New cloud record saved — ${difficulty}: ${secs}s`);
    return true;
  } catch (e) {
    console.warn('[cloud-save] Could not save cloud record:', e);
    return false;
  }
}

/**
 * Merge cloud records with local localStorage records, keeping the best
 * (lowest) time for each difficulty.  Updates localStorage to reflect the
 * merged result and, if the cloud is missing any local records, pushes them
 * to Firestore.
 *
 * Returns the merged records object.
 */
async function mergeAndSyncRecords(uid) {
  const localKey    = 'logitrix_records';
  let   local       = {};
  try { local = JSON.parse(localStorage.getItem(localKey) || '{}'); } catch {}

  const cloud   = await loadCloudRecords(uid);
  const merged  = {};
  const diffs   = ['easy', 'hard', 'insane', 'legendary'];

  for (const d of diffs) {
    const l = local[d];
    const c = cloud[d];
    if (l != null && c != null) merged[d] = Math.min(l, c);
    else if (l != null)          merged[d] = l;
    else if (c != null)          merged[d] = c;
  }

  // Persist merged to localStorage
  localStorage.setItem(localKey, JSON.stringify(merged));

  // Push any locally-better times back to Firestore
  if (window.db && uid) {
    const updates = {};
    for (const d of diffs) {
      if (merged[d] != null && (cloud[d] == null || merged[d] < cloud[d])) {
        updates[`records.${d}`] = merged[d];
      }
    }
    if (Object.keys(updates).length > 0) {
      try {
        await window.db.collection('users').doc(uid).set(updates, { merge: true });
      } catch (e) {
        console.warn('[cloud-save] Could not push merged records to Firestore:', e);
      }
    }
  }

  return merged;
}

// ── Leaderboard entries ─────────────────────────────────────────────────────

/**
 * Save a leaderboard entry for the signed-in user.
 * Only writes if it is a new best time for that difficulty.
 */
async function saveLeaderboardEntry(user, difficulty, secs) {
  if (!window.db || !user) return;
  try {
    const entryRef = window.db
      .collection('leaderboards')
      .doc(difficulty)
      .collection('entries')
      .doc(user.uid);

    const doc = await entryRef.get();
    if (doc.exists && doc.data().time <= secs) {
      return; // existing leaderboard entry is already better or equal
    }

    await entryRef.set({
      userId:      user.uid,
      displayName: user.displayName || 'Anonymous',
      photoURL:    user.photoURL || '',
      time:        secs,
      completedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[cloud-save] Leaderboard entry updated — ${difficulty}: ${secs}s`);
  } catch (e) {
    console.warn('[cloud-save] Could not save leaderboard entry:', e);
  }
}

// Expose on window so other scripts can call without ES module imports
window.cloudSave = {
  saveUserProfile,
  loadCloudRecords,
  saveCloudRecord,
  mergeAndSyncRecords,
  saveLeaderboardEntry
};
