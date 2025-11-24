// admin-verification.js
import { auth, db, ref, get, update, remove, onValue } from "/shahartaxi-demo/docs/libs/lib.js";

// DOM
const verificationList = document.getElementById("verificationList");

// Utility: render single driver card
function renderDriverCard(uid, user) {
  const card = document.createElement("div");
  card.className = "driver-card";
  card.style = "border:1px solid #ddd;padding:12px;margin-bottom:8px;border-radius:6px;display:flex;gap:12px;align-items:flex-start;";

  const img = document.createElement("img");
  img.src = user.avatar || "../../assets/img/avatar-default.png";
  img.width = 80;
  img.height = 80;
  img.style = "object-fit:cover;border-radius:8px;";

  const info = document.createElement("div");
  info.style = "flex:1";

  const name = document.createElement("div");
  name.innerHTML = `<strong>${user.fullName || "Noma'lum"}</strong> <span style="color:#666">(${user.phone})</span>`;
  const car = document.createElement("div");
  const d = user.driverInfo || {};
  car.innerHTML = `Mashina: ${d.carModel || "-"} | Raqam: ${d.carNumber || "-"} | Rang: ${d.carColor || "-"}`;

  const passport = document.createElement("div");
  passport.innerHTML = `Tex pasport: ${d.techPassportUrl ? `<a href="${d.techPassportUrl}" target="_blank">Ko'rish</a>` : "yo'q"}`;

  const created = document.createElement("div");
  created.style = "font-size:12px;color:#888;margin-top:6px;";
  created.textContent = "Ro‘yxatdan: " + (new Date(user.createdAt || Date.now())).toLocaleString();

  // buttons
  const actions = document.createElement("div");
  actions.style = "display:flex;gap:8px;margin-top:8px";

  const approveBtn = document.createElement("button");
  approveBtn.textContent = "Tasdiqlash";
  approveBtn.className = "btn btn-success";
  approveBtn.onclick = async () => {
    approveBtn.disabled = true;
    try {
      await update(ref(db, `users/${uid}`), { verified: true });
      card.style.opacity = 0.6;
      approveBtn.textContent = "Tasdiqlangan";
      rejectBtn.disabled = true;
    } catch (e) {
      console.error(e);
      alert("Tasdiqlashda xato. Console-ni tekshiring.");
      approveBtn.disabled = false;
    }
  };

  const rejectBtn = document.createElement("button");
  rejectBtn.textContent = "Rad etish";
  rejectBtn.className = "btn btn-danger";
  rejectBtn.onclick = async () => {
    if (!confirm("Bu haydovchini rad etmoqchimisiz? Profil va uning e'lonlari o'chiriladi.")) return;
    rejectBtn.disabled = true;
    try {
      // o'chirish: users/uid ni o'chiramiz va kerak bo'lsa uning e'lonlarini ham o'chirish
      await remove(ref(db, `users/${uid}`));
      // opcional: ads ni ham o'chirish
      // await remove(ref(db, `ads_by_user/${uid}`)); // Agar shunday tuzilma bo'lsa
      card.remove();
    } catch (e) {
      console.error(e);
      alert("O'chirishda xato.");
      rejectBtn.disabled = false;
    }
  };

  const blockBtn = document.createElement("button");
  blockBtn.textContent = user.blocked ? "Blokdan chiqar" : "Bloklash";
  blockBtn.className = "btn btn-warning";
  blockBtn.onclick = async () => {
    blockBtn.disabled = true;
    try {
      await update(ref(db, `users/${uid}`), { blocked: !user.blocked });
      blockBtn.textContent = !user.blocked ? "Blokdan chiqar" : "Bloklash";
      user.blocked = !user.blocked;
      blockBtn.disabled = false;
    } catch (e) {
      console.error(e);
      alert("Xato.");
      blockBtn.disabled = false;
    }
  };

  actions.appendChild(approveBtn);
  actions.appendChild(rejectBtn);
  actions.appendChild(blockBtn);

  info.appendChild(name);
  info.appendChild(car);
  info.appendChild(passport);
  info.appendChild(created);
  info.appendChild(actions);

  card.appendChild(img);
  card.appendChild(info);
  return card;
}

// Load unverified drivers
async function loadPendingDrivers() {
  verificationList.innerHTML = "<p>Yuklanmoqda…</p>";
  try {
    // Yechim: biz users node ichidan role==='driver' && verified!==true bo‘lganlarni olamiz
    // RealtimeDB-da filtr qiyin bo‘lsa, olamiz hammasini va filtr qilamiz
    const snap = await get(ref(db, "users"));
    verificationList.innerHTML = "";
    if (!snap.exists()) {
      verificationList.innerHTML = "<p>Hech qanday foydalanuvchi yo‘q.</p>";
      return;
    }
    const users = snap.val();
    let found = false;
    Object.entries(users).forEach(([uid, user]) => {
      if (user.role === "driver" && user.verified !== true) {
        const card = renderDriverCard(uid, user);
        verificationList.appendChild(card);
        found = true;
      }
    });
    if (!found) verificationList.innerHTML = "<p>Tasdiqlanmas haydovchi topilmadi.</p>";
  } catch (e) {
    console.error(e);
    verificationList.innerHTML = "<p>Xatolik yuz berdi. Console-ni tekshiring.</p>";
  }
}

// init: require admin auth
import { onAuthStateChanged } from "/shahartaxi-demo/docs/libs/lib.js";
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/shahartaxi-demo/app/auth/login.html";
    return;
  }
  // check role in DB
  const s = await get(ref(db, `users/${user.uid}`));
  if (!s.exists()) {
    alert("Siz admin emassiz yoki profilingiz topilmadi.");
    await auth.signOut();
    location.href = "/shahartaxi-demo/app/auth/login.html";
    return;
  }
  const me = s.val();
  if (me.role !== "admin") {
    alert("Siz admin emassiz.");
    await auth.signOut();
    location.href = "/shahartaxi-demo/app/auth/login.html";
    return;
  }

  // load pending drivers
  loadPendingDrivers();

  // optional: subscribe to users changes to auto-refresh
  onValue(ref(db, "users"), (snap) => {
    loadPendingDrivers();
  });
});
