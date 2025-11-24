// login.js
import { auth, signInWithEmailAndPassword, db, ref, get } from "/shahartaxi-demo/docs/libs/lib.js";

const phoneEl = document.getElementById("phone");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

function normalizePhone(input) {
  if (!input) return "";
  input = input.trim().replace(/[\s\-()]/g, "");
  if (input.startsWith("+")) input = input.slice(1);
  if (input.length === 9 && input.startsWith("9")) input = "998" + input;
  if (input.length === 12 && input.startsWith("998")) return "+" + input;
  if (input.length === 13 && input.startsWith("998")) return "+" + input; // already +998...
  return "+" + input; // fallback
}

loginBtn.addEventListener("click", async () => {
  const phoneRaw = (phoneEl.value || "").trim();
  const password = (passwordEl.value || "").trim();

  if (!phoneRaw || !password) {
    alert("Iltimos telefon va parol kiriting.");
    return;
  }

  const phone = normalizePhone(phoneRaw);
  const phoneDigits = phone.replace(/\+/g, "");
  const emailFake = phoneDigits + "@phone.shahartaxi.uz";

  try {
    const userCred = await signInWithEmailAndPassword(auth, emailFake, password);
    const uid = userCred.user.uid;

    // fetch user record from DB
    const snap = await get(ref(db, "users/" + uid));
    if (!snap.exists()) {
      // DB record missing — cleanup and inform
      alert("Profil ma'lumotlari topilmadi. Iltimos administrator bilan bog'laning.");
      try { await auth.signOut(); } catch (_) {}
      return;
    }

    const u = snap.val();

    // role based redirection
    if (u.role === "admin") {
      window.location.href = "/shahartaxi-demo/docs/app/admin/dashboard.html";
      return;
    }

    // if driver not verified — allow login but restrict posting (handled in create-ad)
    window.location.href = "/shahartaxi-demo/docs/app/taxi/index.html";

  } catch (err) {
    console.error("Login error:", err);
    alert("Telefon yoki parol noto'g'ri.");
  }
});
