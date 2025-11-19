import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

window.loginAdmin = async function () {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("pass").value.trim();
  const err = document.getElementById("error");

  err.textContent = "";

  if (!email || !pass) {
    err.textContent = "Email va parol kiriting!";
    return;
  }

  try {
    // Firebase Authentication orqali login
    const userCred = await signInWithEmailAndPassword(auth, email, pass);
    const uid = userCred.user.uid;

    // Realtime Database orqali role ni tekshiramiz
    const snap = await get(ref(db, "users/" + uid));

    if (!snap.exists()) {
      err.textContent = "Bu foydalanuvchi topilmadi!";
      return;
    }

    const info = snap.val();

    if (info.role !== "admin") {
      err.textContent = "Siz admin emassiz!";
      return;
    }

    // Admin panelga yuborish
    window.location.href = "dashboard.html";

  } catch (e) {
    err.textContent = "Login yoki parol noto‘g‘ri!";
  }
};
