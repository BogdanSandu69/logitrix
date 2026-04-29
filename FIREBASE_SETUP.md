# Firebase Setup Guide for Logitrix

This guide walks you through creating a Firebase project so that Google Sign-In,
cloud saves, and global leaderboards all work in your deployment of Logitrix.

---

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**.
3. Enter a project name (e.g. `logitrix`).
4. (Optional) Disable Google Analytics if you don't need it.
5. Click **Create project** and wait for it to be ready.

---

## 2. Register a Web App

1. In the Firebase Console, click the **Web** icon (`</>`) to add a web app.
2. Give it a nickname (e.g. `Logitrix Web`).
3. Click **Register app**.
4. Firebase will show you a config object — **copy it**; you'll need it in Step 6.

---

## 3. Enable Google Authentication

1. In the Firebase Console, open **Authentication** → **Sign-in method**.
2. Click **Google**, enable it, and set a support email.
3. Click **Save**.

> Optionally enable **Facebook**, **Twitter/X**, or other providers shown in the
> login modal. Each provider requires you to create an app on the respective
> developer platform and paste its App ID / Secret into the Firebase Console.

---

## 4. Add Authorized Domains

1. Still in **Authentication** → **Settings** → **Authorized domains**.
2. Add all domains from which the game will be served, for example:
   - `localhost` (for local development)
   - `your-github-username.github.io` (for GitHub Pages)
   - Your custom domain if applicable.

---

## 5. Create a Firestore Database

1. In the Firebase Console, open **Firestore Database**.
2. Click **Create database**.
3. Choose **Start in production mode** (you will set security rules below).
4. Select a location closest to your players and click **Enable**.

---

## 6. Paste Your Firebase Config

Open `js/firebase-config.js` and replace the placeholder values with the ones
you copied in Step 2:

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-project-id.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abcdef1234567890"
};
```

> **Never commit real credentials to a public repository.**
> Consider using a CI/CD secret or an environment-variable injection step to
> populate `firebase-config.js` before deploying.

---

## 7. Deploy Firestore Security Rules

In the Firebase Console, open **Firestore Database** → **Rules** and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User records — only the owner can write their own document
    match /users/{userId} {
      allow read:  if true;
      allow write: if request.auth != null
                   && request.auth.uid == userId;
    }

    // Leaderboards — authenticated users can write only their own entry;
    // time must be a positive number
    match /leaderboards/{difficulty}/entries/{userId} {
      allow read:  if true;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.data.time is number
                   && request.resource.data.time > 0;
    }
  }
}
```

Click **Publish** to deploy the rules.

---

## 8. (Optional) Deploy Firestore Indexes

The leaderboard query orders entries by `time` ascending.  Firestore will
auto-create a single-field index for this; no manual index setup is required
for the default query.

If you add compound queries in the future (e.g. filtering by week *and* ordering
by time), Firestore will prompt you with a link to create the required index.

---

## 9. Local Development

You can run the game locally with any static file server:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code Live Server extension — just open index.html
```

Then open `http://localhost:8080` in your browser.

---

## 10. Deploying to GitHub Pages

1. Push your code (with the filled-in `firebase-config.js`) to GitHub.
2. In your repository settings, enable **GitHub Pages** from the `main` branch.
3. Add `https://your-username.github.io` (or the full page URL) to the
   Firebase **Authorized domains** list (Step 4).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Firebase is not configured" error | Make sure `js/firebase-config.js` contains real values |
| Google sign-in popup blocked | Add your domain to Firebase Authorized domains |
| Leaderboard shows "Could not load" | Check Firestore security rules and that the database exists |
| Records not syncing | Ensure the user is signed in and Firestore rules allow writes |
