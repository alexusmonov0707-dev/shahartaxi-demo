import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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
const db = getDatabase(app);

window.loginUser = async function () {
    const phone = document.getElementById("phone").value.trim();
    if (!phone) return alert("Telefon raqamni kiriting!");

    const snap = await get(ref(db, "users"));
    let foundUser = null;

    snap.forEach(user => {
        const u = user.val();
        if (u.phone === phone) foundUser = u;
    });

    if (!foundUser) return alert("Bunday foydalanuvchi topilmadi!");

    localStorage.setItem("uid", foundUser.uid);

    if (!foundUser.mainRole) {
        window.location.href = "/app/user/role-selection.html";
    } else {
        window.location.href = "/app/user/index.html";
    }
};
