// firebase.js — browser ESM (Firebase v10)
// joylashuv: docs/admin/firebase.js (yoki hozirgi fayling joyi bilan almashtir)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getDatabase,
  ref as dbRef,
  get as dbGet,
  set as dbSet,
  update as dbUpdate,
  remove as dbRemove,
  push as dbPush,
  onValue as dbOnValue
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

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
const db = getDatabase(app);

// Wrapper exports — nomlarni hozirgi fayllaringga mos qilyapman
export {
  db,
  dbRef as ref,
  dbGet as get,
  dbSet as set,
  dbUpdate as update,
  dbRemove as remove,
  dbPush as push,
  dbOnValue as onValue
};

// ==========================
// ADMIN LOG ACTION – qo‘shildi
// ==========================

/*
   Har safar admin biror amal qilganda chaqirasan:
   logAction("delete-user", "user:O34dLs3");
   logAction("block", "user:72x1AA12");
   logAction("delete-ad", "ad:-OfA72....");
*/

export async function logAction(action, target) {
  try {
    await dbPush(dbRef(db, "admin_logs"), {
      action,
      target,
      admin: sessionStorage.getItem("admin") || "unknown",
      timestamp: Date.now()
    });
  } catch (err) {
    console.error("LOG ERROR:", err);
  }
}
