import {
  auth,
  db,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  ref,
  get
} from "./firebase.js";


// === LOGIN
window.loginAdmin = async function () {
  const email = email.value.trim();
  const password = password.value.trim();
  const err = document.getElementById("error");
  err.style.display = "none";

  if (!email || !password) {
    err.innerText = "Maydonlarni to‘ldiring!";
    err.style.display = "block";
    return;
  }

  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    const uid = res.user.uid;

    // admin roli tekshirish
    const snap = await get(ref(db, "admins/" + uid));
    if (!snap.exists()) {
      err.innerText = "Siz admin emassiz!";
      err.style.display = "block";
      return;
    }

    // ADMIN ICHI
    window.location.href = "dashboard.html";

  } catch (e) {
    err.innerText = "Email yoki parol noto‘g‘ri!";
    err.style.display = "block";
  }
};


// === AGAR ADMIN EMAS BO'LSA — KIRITA OLMAYDI
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const uid = user.uid;
  const snap = await get(ref(db, "admins/" + uid));

  if (!snap.exists()) {
    return;
  }

  // admin bo'lsa dashboardga o'tkazamiz
  if (location.pathname.includes("login.html")) {
    window.location.href = "dashboard.html";
  }
});

