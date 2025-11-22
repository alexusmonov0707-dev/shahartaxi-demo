// =============================
// FIREBASE UNIVERSAL BACKEND
// =============================

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
  push,
  set,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

await setPersistence(auth, browserLocalPersistence);

function $(id) {
    return document.getElementById(id);
}

export {
  auth,
  db,
  ref,
  push,
  set,
  get,
  update,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  $
};
