// ===============================
// FIREBASE IMPORTS
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  get,
  update,
  push,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// ===============================
// FIREBASE CONFIG
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyApWUG4QYuC9aC5E9MOLXwlCv9RihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// ===============================
// INIT
// ===============================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ===============================
// HELPER $ FUNCTION
// ===============================
export const $ = id => document.getElementById(id);

// ===============================
// EXPORTS (firebase + utils)
// ===============================
export {
  auth,
  db,
  ref,
  set,
  get,
  update,
  push,
  remove,
  onValue,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber
};
