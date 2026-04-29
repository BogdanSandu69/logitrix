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
  apiKey:            "AIzaSyCfFiQcfa0KmtmoFIaw_x3GY2UwfloWLqY",
  authDomain:        "logitrix-b2f85.firebaseapp.com",
  projectId:         "logitrix-b2f85",
  storageBucket:     "logitrix-b2f85.firebasestorage.app",
  messagingSenderId: "135436680081",
  appId:             "1:135436680081:web:96b464bae182932d4bb830",
  measurementId:     "G-SV79JWZ9KD"
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
