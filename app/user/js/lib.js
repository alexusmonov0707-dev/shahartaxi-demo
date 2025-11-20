// app/user/js/lib.js
// Shared Firebase init + helpers

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, remove } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

function $(id) { return document.getElementById(id); }

function formatDatetime(dt) {
  if (!dt) return "—";
  if (typeof dt === "number") dt = new Date(dt).toISOString();
  const d = new Date(dt);
  if (isNaN(d)) return dt;
  return d.toLocaleString("uz-UZ", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export { app, auth, db, $, ref, get, set, update, push, remove, onAuthStateChanged, signOut, formatDatetime };
