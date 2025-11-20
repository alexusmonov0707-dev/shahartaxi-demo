// app/user/js/lib.js
// ES module: umumiy Firebase init va yordamchi eksportlar
// Import: yo'riqnomalarga mos ravishda <script type="module"> ichida ishlatiladi.

// Firebase v10 (CDN) modullari
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged as fbOnAuthStateChanged,
  signOut as fbSignOut
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

// -----------------------------
// Firebase konfiguratsiyasi
// -----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

// Init — agar ilgari init qilingan bo'lsa xatolik bermasligi uchun tekshir
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// Firebase xizmatlari
const auth = getAuth();
const db = getDatabase();

// -----------------------------
// Qo'l yordamchilar / util'lar
// -----------------------------

/**
 * DOM elementni id orqali olish (teziroq)
 * @param {string} id
 * @returns {HTMLElement|null}
 */
const $ = id => {
  if (!id) return null;
  return (typeof id === "string") ? document.getElementById(id) : id;
};

/**
 * Safe textContent setter — null tekshiradi
 * @param {string|HTMLElement} el
 * @param {string} text
 */
function setText(el, text) {
  const node = $(el);
  if (!node) return;
  node.textContent = text;
}

/**
 * Simple ISO datetime -> localized string helper
 * (Ixtiyoriy, lekin foydali)
 */
function formatDatetime(dt) {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    if (isNaN(d)) return dt;
    return d.toLocaleString("uz-UZ", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch (e) {
    return dt;
  }
}

// -----------------------------
// Eksport qilinadiganlar (nomlar bilan)
// -----------------------------
export {
  // Firebase obyektlari va DB helperlari
  auth,
  db,
  dbRef as ref,
  dbGet as get,
  dbSet as set,
  dbUpdate as update,
  dbPush as push,
  dbRemove as remove,

  // Auth hodisalari
  fbOnAuthStateChanged as onAuthStateChanged,
  fbSignOut as signOut,

  // DOM / util helperlar
  $,
  setText,
  formatDatetime
};
