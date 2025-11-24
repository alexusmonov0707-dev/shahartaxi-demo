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
