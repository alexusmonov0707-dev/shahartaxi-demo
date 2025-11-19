// ---- Firebase Core ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// ---- Auth (kerak emas, lekin qolaversin) ----
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ---- Database ----
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ---- YOUR CONFIG ----
const firebaseConfig = {
  apiKey: "AIzaSyAplUAG4vqCsE9MOLXwLCyRiEhREwvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com/",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// ---- INIT ----
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, get, set, update, remove };
