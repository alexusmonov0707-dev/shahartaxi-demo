// ==========================================================
//   SHAHARTAXI — UNIVERSAL FIREBASE BACKEND (MODULAR)
// ==========================================================

// APP
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// AUTH
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// DATABASE
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyApuW4G0Yc9cSM9L0LXwLCyRiNheEWc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874471205671",
  appId: "1:874471205671:web:beb1ee3adf8fbb5f4fb5c5"
};

// INIT
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// EXPORT ALL
export {
  auth,
  db,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  ref,
  get,
  set,
  update,
  push
};
