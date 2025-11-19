import { db, ref, get } from "./firebase.js";

window.loginAdmin = async function () {
  const login = document.getElementById("login").value.trim();
  const pass = document.getElementById("pass").value.trim();
  const error = document.getElementById("error");

  error.textContent = "";

  try {
    // firebase database → /admins/admin001
    const adminRef = ref(db, "admins/" + login);
    const snapshot = await get(adminRef);

    if (!snapshot.exists()) {
      error.textContent = "Login yoki parol noto‘g‘ri!";
      return;
    }

    const admin = snapshot.val();

    if (admin.password !== pass) {
      error.textContent = "Login yoki parol noto‘g‘ri!";
      return;
    }

    localStorage.setItem("admin", login);
    window.location.href = "./dashboard.html";

  } catch (err) {
    console.error(err);
    error.textContent = "Server xatosi!";
  }
};
