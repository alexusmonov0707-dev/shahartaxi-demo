// ======================================================
//   SHAHARTAXI — UNIVERSAL FIREBASE BACKEND (MODULAR)
// ======================================================

// -------- Imports --------
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
  remove   // ← ★★★ Faqat shu qo‘shildi!
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


// -------- Firebase config --------
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
//    AUTH PERSISTENCE (MUHIM! Login loopingni tuzatadi)
// ======================================================
await setPersistence(auth, browserLocalPersistence);


// ======================================================
//    RECAPTCHA
// ======================================================
function createRecaptcha(containerId = "recaptcha-container") {
  return new RecaptchaVerifier(
    auth,
    containerId,
    { size: "invisible" }
  );
}


// ======================================================
//   EKSPORT QILINAYOTGAN MODULLAR
// ======================================================
export {
  auth,
  db,
  ref,
  get,
  set,
  update,
  remove,  // ← ★★★ BU HAM MAJBURIY!
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createRecaptcha
};
