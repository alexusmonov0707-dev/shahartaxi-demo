import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, update, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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

let selectedRole = null;

window.selectRole = function (role) {
    selectedRole = role;

    document.getElementById("roleDriver").classList.remove("active");
    document.getElementById("rolePassenger").classList.remove("active");

    if (role === "driver") document.getElementById("roleDriver").classList.add("active");
    else document.getElementById("rolePassenger").classList.add("active");
};

window.registerUser = async function () {
    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (!fullName || !phone) return alert("Ma'lumotlarni to‘liq kiriting!");
    if (!selectedRole) return alert("Rolingizni tanlang!");

    const uid = "user_" + Date.now(); // fake UID

    const userData = {
        uid,
        fullName,
        phone,
        roles: {
            taxi: selectedRole
        },
        mainRole: "taxi",
        createdAt: Date.now()
    };

    await set(ref(db, "users/" + uid), userData);

    localStorage.setItem("uid", uid);

    alert("Ro‘yxatdan o‘tildi!");
    window.location.href = "/app/user/index.html"; // taxi moduliga o'tish
};
