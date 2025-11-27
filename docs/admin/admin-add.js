import { db, ref, set, get } from "./firebase.js";

export async function addAdmin() {
  const fullName = document.getElementById("fullName").value.trim();
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  if (!fullName || !username || !email || !password) {
    alert("Barcha maydonlarni to‘ldiring!");
    return;
  }

  const adminRef = ref(db, "admins/" + username);

  const exists = await get(adminRef);
  if (exists.exists()) {
    alert("Bu username allaqachon mavjud!");
    return;
  }

  await set(adminRef, {
    fullName,
    username,
    email,
    password,
    role
  });

  alert("Admin muvaffaqiyatli qo‘shildi!");
  location.href = "admins.html";
}
