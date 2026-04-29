/* firebase-config.js — Firebase project initialization
 *
 * SETUP INSTRUCTIONS:
 *  1. Go to https://console.firebase.google.com/ and create a project.
 *  2. Add a Web app and copy the config values below.
 *  3. In Firebase Console → Authentication → Sign-in method, enable:
 *       • Google
 *       • Facebook (requires a Facebook App ID + secret)
 *       • Twitter  (requires a Twitter/X API key + secret)
 *  4. In Firebase Console → Firestore Database → Create database
 *     (start in test mode, then set proper security rules).
 *  5. Add your domain to Authentication → Settings → Authorized domains.
 */

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

try {
  firebase.initializeApp(firebaseConfig);
  window.auth = firebase.auth();
  window.db   = firebase.firestore();
} catch (e) {
  console.error('Firebase init failed:', e);
  window.auth = null;
  window.db   = null;
}
