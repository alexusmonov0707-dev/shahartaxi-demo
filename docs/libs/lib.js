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
  set,
  get,
  push,
  update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// --- SENING TO‘G‘RI FIREBASE CONFIG’ING ---
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9M0LXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// --- App’ni ishga tushirish ---
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export {
    ref, set, get, push, update,
    RecaptchaVerifier, signInWithPhoneNumber,
    onAuthStateChanged, setPersistence, browserLocalPersistence
};
