import { db, ref, get } from "./firebase.js";

window.loginAdmin = async function () {
  const loginInput = document.getElementById("login").value.trim();
  const passInput = document.getElementById("pass").value.trim();
  const error = document.getElementById("error");

  error.textContent = "";

  try {
    // /admins/admin001
    const adminRef = ref(db, "admins/" + loginInput);
    const snapshot = await get(adminRef);

    if (!snapshot.exists()) {
      error.textContent = "Login yoki parol noto‘g‘ri!";
      return;
    }

    const admin = snapshot.val();

    if (admin.password !== passInput) {
      error.textContent = "Login yoki parol noto‘g‘ri!";
      return;
    }

    // Login OK
    localStorage.setItem("admin", loginInput);
    window.location.href = "./dashboard.html";

  } catch (err) {
    console.error(err);
    error.textContent = "Server xatosi!";
  }
};
