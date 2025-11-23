// UNIVERSAL FIREBASE BACKEND
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
  push
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyApU...YOUR_KEY...",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874247109561",
  appId: "1:874247109561:web:b2f12a9bfaa97f..."
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// EXPORT
export {
  auth,
  db,
  ref,
  set,
  get,
  push,
  update,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged
};
