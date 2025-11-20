// ==========================================================
//  app/user/js/lib.js
//  GLOBAL FIREBASE + DB HELPERS + DOM HELPERS (ES MODULE)
// ==========================================================

// -----------------------------
// Firebase CDN modullari
// -----------------------------
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref as dbRef,
  get as dbGet,
  set as dbSet,
  update as dbUpdate,
  push as dbPush,
  remove as dbRemove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


// ==========================================================
//  FIREBASE CONFIG
// ==========================================================
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};


// Init — bir marta ishga tushirish uchun tekshiruv
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const auth = getAuth();
const db = getDatabase();


// ==========================================================
//  GLOBAL HELPER FUNCTIONS
// ==========================================================

/** DOM qisqa getter */
export const $ = id => document.getElementById(id);

/** Yozuv qo‘yish (null safe) */
export function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

/** Input qiymatini olish */
export function val(id) {
  const el = $(id);
  return el ? el.value.trim() : "";
}

/** Input qiymatini o‘rnatish */
export function setVal(id, v) {
  const el = $(id);
  if (el) el.value = v;
}

/** Datetime formatlash */
export function formatDatetime(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (isNaN(d)) return dt;

  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/** Random ID generator (ads uchun kerak bo‘lishi mumkin) */
export function uuid() {
  return "xxxxxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

/** Role tekshirish */
export function checkRole(userData, allowedRoles = []) {
  if (!userData || !userData.role) return false;
  return allowedRoles.includes(userData.role);
}


// ==========================================================
//  DATABASE SHORTCUT EXPORTS
// ==========================================================
export const ref = dbRef;
export const get = dbGet;
export const set = dbSet;
export const push = dbPush;
export const update = dbUpdate;
export const remove = dbRemove;

// ==========================================================
//  AUTH EXPORTS
// ==========================================================
export const onAuthStateChanged = fbOnAuthStateChanged;
export const signOut = fbSignOut;

export { auth, db };


// ==========================================================
//  LOG
// ==========================================================
console.log("LIB MODULE LOADED ✔️");
