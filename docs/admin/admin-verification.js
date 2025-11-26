// admin-verification.js (super-app version)
import { auth, db, ref, get, update, remove, onValue } from "../libs/lib.js";

// DOM
const verificationList = document.getElementById("verificationList");

// --- CARD RENDER ---
function renderDriverCard(uid, user) {
  const card = document.createElement("div");
  card.className = "driver-card";
  card.style = `
    border:1px solid #ddd;
    padding:12px;
    margin-bottom:8px;
    border-radius:6px;
    display:flex;
    gap:12px;
    align-items:flex-start;
  `;

  const img = document.createElement("img");
  img.src = user.avatar || "/assets/default-avatar.png";
  img.width = 80;
  img.height = 80;
  img.style = "object-fit:cover;border-radius:8px;";

  const info = document.createElement("div");
  info.style = "flex:1";

  const name = document.createElement("div");
  name.innerHTML = `<strong>${user.fullName || "Noma'lum"}</strong>
    <span style="color:#666">(${user.phone})</span>`;

  const car = document.createElement("div");
  car.innerHTML = `
    Mashina: ${user.carModel || "-"}
    | Raqam: ${user.carNumber || "-"}
    | Rang: ${user.carColor || "-"}
  `;

  const passport = document.createElement("div");
  passport.innerHTML = `
    Tex pasport:
    ${
      user.techPassportUrl
        ? `<a href="${user.techPassportUrl}" target="_blank">Ko'rish</a>`
        : "yo'q"
    }
  `;

  const license = document.createElement("div");
  license.innerHTML = `
    Haydovchilik guvohnomasi:
    ${
      user.license
        ? `<a href="${user.license}" target="_blank">Ko'rish</a>`
        : "yo'q"
    }
  `;

  const created = document.createElement("div");
  created.style = "font-size:12px;color:#888;margin-top:6px;";
  created.textContent =
    "Ro‘yxatdan o'tgan sanasi: " +
    new Date(user.createdAt || Date.now()).toLocaleString();

  // BUTTONS
  const actions = document.createElement("div");
  actions.style = "display:flex;gap:8px;margin-top:10px;";

  // TASDIQLASH
  const approveBtn = document.createElement("button");
  approveBtn.textContent = "Tasdiqlash";
  approveBtn.style = "padding:6px 12px;background:#4caf50;color:#fff;border:none;border-radius:4px;";
  approveBtn.onclick = async () => {
    approveBtn.disabled = true;
    await update(ref(db, `users/${uid}`), { verified: true });
    card.style.opacity = 0.6;
    approveBtn.textContent = "Tasdiqlandi";
    rejectBtn.disabled = true;
    blockBtn.disabled = true;
  };

  // RAD ETISH
  const rejectBtn = document.createElement("button");
  rejectBtn.textContent = "Rad etish";
  rejectBtn.style = "padding:6px 12px;background:#f44336;color:#fff;border:none;border-radius:4px;";
  rejectBtn.onclick = async () => {
    if (!confirm("Haydovchini rad qilmoqchimisiz?")) return;
    rejectBtn.disabled = true;
    await update(ref(db, `users/${uid}`), { verified: "rejected" });
    card.remove();
  };

  // BLOKLASH
  const blockBtn = document.createElement("button");
  blockBtn.textContent = user.blocked ? "Blokdan chiqarish" : "Bloklash";
  blockBtn.style = "padding:6px 12px;background:#ff9800;color:#fff;border:none;border-radius:4px;";
  blockBtn.onclick = async () => {
    await update(ref(db, `users/${uid}`), { blocked: !user.blocked });
    blockBtn.textContent = user.blocked ? "Bloklash" : "Blokdan chiqarish";
    user.blocked = !user.blocked;
  };

  actions.appendChild(approveBtn);
  actions.appendChild(rejectBtn);
  actions.appendChild(blockBtn);

  info.appendChild(name);
  info.appendChild(car);
  info.appendChild(passport);
  info.appendChild(license);
  info.appendChild(created);
  info.appendChild(actions);

  card.appendChild(img);
  card.appendChild(info);
  return card;
}

// --- LOAD DRIVERS ---
async function loadPendingDrivers() {
  verificationList.innerHTML = "<p>Yuklanmoqda…</p>";

  try {
    const snap = await get(ref(db, "users"));
    verificationList.innerHTML = "";

    if (!snap.exists()) {
      verificationList.innerHTML = "<p>Hech qanday foydalanuvchi yo‘q</p>";
      return;
    }

    const users = snap.val();
    let counter = 0;

    Object.entries(users).forEach(([uid, user]) => {
      if (user.role === "driver" && user.verified !== true) {
        verificationList.appendChild(renderDriverCard(uid, user));
        counter++;
      }
    });

    if (counter === 0) {
      verificationList.innerHTML = "<p>Tasdiqlanmagan haydovchi topilmadi.</p>";
    }
  } catch (err) {
    console.error(err);
    verificationList.innerHTML = "<p>Xato yuz berdi. Console-ni tekshiring.</p>";
  }
}

// --- AUTH CHECK (sizning hozirgi admin tizimingizga mos) ---
import { onAuthStateChanged } from "../libs/lib.js";

onAuthStateChanged(auth, async (u) => {
  if (!u) {
    location.href = "./login.html";
    return;
  }

  const snap = await get(ref(db, `admins/${u.uid}`));
  if (!snap.exists()) {
    alert("Siz admin emassiz!");
    auth.signOut();
    location.href = "./login.html";
    return;
  }

  loadPendingDrivers();

  // LIVE UPDATE
  onValue(ref(db, "users"), () => loadPendingDrivers());
});
