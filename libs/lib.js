// ======================================================
//   SHAHARTAXI — UNIVERSAL FIREBASE BACKEND (MODULAR)
//   (full-featured, exports all helpers used across app files)
// ======================================================

// -------- Imports (Firebase modular SDK) --------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  child,
  get,
  set,
  update,
  remove,
  push
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// -------- Firebase config (your project's config) --------
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// -------- Initialize Firebase --------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ======================================================
//    AUTH PERSISTENCE (prevents login looping)
// ======================================================
try {
  // top-level await is allowed in ES modules; wrap in try for safety
  await setPersistence(auth, browserLocalPersistence);
} catch (e) {
  // If persistence fails (e.g. in some environments), we log but continue.
  console.warn("setPersistence failed:", e && e.message ? e.message : e);
}

// ======================================================
//    RECAPTCHA helper (creates invisible verifier by default)
// ======================================================
function createRecaptcha(containerId = "recaptcha-container") {
  return new RecaptchaVerifier(auth, containerId, { size: "invisible" });
}

// ======================================================
//    Small DOM helper (keeps legacy code working: $('id'))
// ======================================================
function $(id) { return document.getElementById(id); }

// ======================================================
//    Convenience wrapper: safe get value snapshot
// ======================================================
async function getValue(pathRef) {
  const s = await get(pathRef);
  return s.exists() ? s.val() : null;
}

// ======================================================
//    Shorthand for pushing new child and returning key
// ======================================================
async function pushChild(pathRef, value = null) {
  const newRef = push(pathRef);
  if (value !== null) await set(newRef, value);
  return newRef.key;
}

// ======================================================
//   Exports (everything app uses across files)
// ======================================================
export {
  // firebase app instances
  app,
  auth,
  db,

  // auth functions
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  createRecaptcha,
  signOut,

  // persistence (if needed elsewhere)
  setPersistence,
  browserLocalPersistence,

  // realtime database functions
  getDatabase,
  ref,
  child,
  get,
  set,
  update,
  remove,
  push,
  pushChild,
  getValue,

  // utility DOM helper (legacy)
  $
};
