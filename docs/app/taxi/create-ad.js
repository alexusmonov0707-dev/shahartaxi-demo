// ===============================
//     SHAHARTAXI — CREATE AD (FIXED)
// ===============================

// === DOM ELEMENTS ===
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

// ===============================
//    REGION INIT (CORRECT VERSION)
// ===============================
function initRegions() {
  window.fillRegions("fromRegion");
  window.fillRegions("toRegion");

  fromRegion.addEventListener("change", () => {
    window.updateDistricts("from");
  });

  toRegion.addEventListener("change", () => {
    window.updateDistricts("to");
  });
}

// ===============================
//         CLEAR FORM
// ===============================
clearBtn.addEventListener("click", (e) => {
  e.preventDefault();

  fromRegion.selectedIndex = 0;
  toRegion.selectedIndex = 0;

  fromDistrict.innerHTML = `<option value="">Tuman</option>`;
  toDistrict.innerHTML = `<option value="">Tuman</option>`;

  document.getElementById("price").value = "";
  document.getElementById("departureTime").value = "";
  document.getElementById("seats").value = "";
  document.getElementById("adComment").value = "";
});

// ===============================
// AUTH CHECK
// ===============================
import { auth, db, ref, get, onAuthStateChanged } from "/shahartaxi-demo/docs/libs/lib.js";

let CURRENT_ROLE = "passenger";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/shahartaxi-demo/app/auth/login.html";
    return;
  }

  const snap = await get(ref(db, `users/${user.uid}`));
  const u = snap.exists() ? snap.val() : null;

  if (!u) {
    alert("Profil ma'lumotlari topilmadi.");
    await auth.signOut();
    location.href = "/shahartaxi-demo/app/auth/login.html";
    return;
  }

  CURRENT_ROLE = u.role || "passenger";

  if (u.role === "driver" && u.verified !== true) {
    submitBtn.disabled = true;
    submitBtn.title = "Profilingiz tasdiqlanmagan";

    const note = document.getElementById("verificationNotice");
    if (note) note.textContent = "Profil tasdiqlanmaguncha e'lon joylay olmaysiz.";
  }
});

// ===============================
//       SUBMIT — FIREBASE (FIXED)
// ===============================
submitBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  if (!auth.currentUser) {
    alert("Kirish talab qilinadi!");
    return;
  }

  const rawTime = document.getElementById("departureTime").value;
  const departureMs = rawTime ? new Date(rawTime).getTime() : null;

  const basePayload = {
    fromRegion: fromRegion.value,
    fromDistrict: fromDistrict.value,
    toRegion: toRegion.value,
    toDistrict: toDistrict.value,
    price: document.getElementById("price").value,
    departureTime: departureMs, // ✅ endi millisekund
    comment: document.getElementById("adComment").value,
    createdAt: Date.now(),
    type: CURRENT_ROLE,
    userId: auth.currentUser.uid
  };

  // ✅ ROLE bo‘yicha to‘g‘ri saqlash
  if (CURRENT_ROLE === "driver") {
    basePayload.seats = document.getElementById("seats").value;
  } else {
    basePayload.passengerCount = document.getElementById("seats").value;
  }

  try {
    const adsRef = ref(db, "ads/" + auth.currentUser.uid);
    const { push, set } = await import("/shahartaxi-demo/docs/libs/lib.js");

    const newRef = push(adsRef);
    await set(newRef, basePayload);

    alert("E'lon muvaffaqiyatli joylandi!");
    window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";

  } catch (err) {
    console.error("CREATE AD ERROR:", err);
    alert("E'lon joylashda xatolik!");
  }
});

// ===============================
//            INIT
// ===============================
initRegions();
