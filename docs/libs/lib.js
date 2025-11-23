// ======================================================
//   SHAHARTAXI — UNIVERSAL FIREBASE BACKEND (MODULAR)
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  remove,
  child,
  query,
  orderByChild,
  orderByKey,
  orderByValue,
  limitToFirst,
  limitToLast,
  startAt,
  endAt,
  equalTo,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// persistence for auth (keep user logged in)
await setPersistence(auth, browserLocalPersistence);

function createRecaptcha(containerId = "recaptcha-container") {
  return new RecaptchaVerifier(auth, containerId, { size: "invisible" });
}

export function $(id) {
  return document.getElementById(id);
}

export {
  auth,
  db,
  ref,
  child,
  get,
  set,
  update,
  push,
  remove,
  query,
  orderByChild,
  orderByKey,
  orderByValue,
  limitToFirst,
  limitToLast,
  startAt,
  endAt,
  equalTo,
  onValue,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createRecaptcha
};
