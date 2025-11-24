import { auth, signInWithEmailAndPassword, db, ref, get } 
from "/shahartaxi-demo/docs/libs/lib.js";

const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

loginBtn.onclick = async () => {
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;

  if (!phone || !password) {
    alert("Telefon va parol kiriting.");
    return;
  }

  const emailFake = phone + "@shahartaxi.uz";

  try {
    const userCred = await signInWithEmailAndPassword(auth, emailFake, password);
    const uid = userCred.user.uid;

    // get user record
    const snap = await get(ref(db, "users/" + uid));
    const u = snap.exists() ? snap.val() : null;

    if (u && u.role === "driver" && u.verified !== true) {
      // allow login, but inform user
      alert("Sizning profilingiz hali admin tomonidan tasdiqlanmagan. E'lon joylash huquqi cheklangan.");
    }

    // redirect to unified dashboard
    window.location.href = "/shahartaxi-demo/app/user/index.html";

  } catch (err) {
    console.error(err);
    alert("Telefon yoki parol noto‘g‘ri.");
  }
};
