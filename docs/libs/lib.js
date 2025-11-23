import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyApUUG40YCgc59M0LzWlcYG9iRheiVCw",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "87421470521",
  appId: "1:87421470521:web:xxxxx"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, push, set, get, update };
