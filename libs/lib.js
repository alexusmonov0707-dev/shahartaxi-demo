// =========================================================
//   SHAHARTAXI — UNIVERSAL SUPER-APP FIREBASE BACKEND
//   (bu lib.js endi o‘zgarmaydi – barcha modullar tayyor)
// =========================================================

// ------------ Firebase Core ------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// ------------ Firebase Auth ------------
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ------------ Firebase Realtime Database ------------
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  push
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// =========================================================
//               FIREBASE CONFIG
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// =========================================================
//               INITIALIZATION
// =========================================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Auth local storage (token yo‘qolmasligi uchun)
await setPersistence(auth, browserLocalPersistence);

// =========================================================
//        UNIVERSAL DOM SHORTCUT ($)
// =========================================================
export const $ = id => document.getElementById(id);

// =========================================================
//        RECAPTCHA (telefon login uchun)
// =========================================================
function createRecaptcha(containerId = "recaptcha-container") {
  return new RecaptchaVerifier(auth, containerId, { size: "invisible" });
}

// =========================================================
//        EXPORT QILINADIGAN HAMMA MODULLAR
// =========================================================
export {
  auth,
  db,
  ref,
  get,
  set,
  update,
  remove,
  push,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createRecaptcha
};
