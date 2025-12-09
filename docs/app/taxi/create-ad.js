// ===============================
//     SHAHARTAXI — CREATE AD (FINAL)
// ===============================

// ===============================
// DOM ELEMENTS
// ===============================
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

const priceInput = document.getElementById("price");
const timeInput = document.getElementById("departureTime");
const seatsInput = document.getElementById("seats");
const commentInput = document.getElementById("adComment");

// ===============================
// FIREBASE IMPORT
// ===============================
import {
  auth,
  db,
  ref,
  get,
  push,
  set,
  onAuthStateChanged,
  signOut
} from "/shahartaxi-demo/docs/libs/lib.js";

// ===============================
// GLOBALS
// ===============================
let CURRENT_ROLE = "passenger";

// ===============================
// REGION INIT (CORRECT VERSION)
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
// CLEAR FORM
// ===============================
clearBtn.addEventListener("click", (e) => {
  e.preventDefault();

  fromRegion.selectedIndex = 0;
  toRegion.selectedIndex = 0;

  fromDistrict.innerHTML = `<option value="">Tuman</option>`;
  toDistrict.innerHTML = `<option value="">Tuman</option>`;

  priceInput.value = "";
  timeInput.value = "";
  seatsInput.value = "";
  commentInput.value = "";
});

// ===============================
// AUTH CHECK & ROLE LOAD
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/shahartaxi-demo/app/auth/login.html";
    return;
  }

  const snap = await get(ref(db, `users/${user.uid}`));
  const u = snap.exists() ? snap.val() : null;

  if (!u) {
    alert("Profil ma'lumotlari topilmadi.");
    await signOut(auth);
    location.href = "/shahartaxi-demo/app/auth/login.html";
    return;
  }

  CURRENT_ROLE = u.role || "passenger";

  // ✅ Haydovchi tasdiqlanmagan bo‘lsa bloklanadi
  if (u.role === "driver" && u.verified !== true) {
    submitBtn.disabled = true;
    submitBtn.title = "Profilingiz tasdiqlanmagan";

    const note = document.getElementById("verificationNotice");
    if (note) {
      note.textContent = "Profil tasdiqlanmaguncha e'lon joylay olmaysiz.";
    }
  }
});

// ===============================
// SUBMIT — FIREBASE (FINAL FIX)
// ===============================
submitBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  if (!auth.currentUser) {
    alert("Kirish talab qilinadi!");
    return;
  }

  // ✅ Jo‘nash vaqtini millisekundga aylantiramiz
  const rawTime = timeInput.value;
  const departureMs = rawTime ? new Date(rawTime).getTime() : null;

  const seatsValue = seatsInput.value;

  // ✅ ASOSIY PAYLOAD
  const payload = {
    fromRegion: fromRegion.value,
    fromDistrict: fromDistrict.value,
    toRegion: toRegion.value,
    toDistrict: toDistrict.value,
    price: priceInput.value,
    departureTime: departureMs,     // ✅ ms ko‘rinishda
    comment: commentInput.value,
    createdAt: Date.now(),          // ✅ INDEX SORT UCHUN MUHIM
    type: CURRENT_ROLE,             // ✅ driver | passenger
    userId: auth.currentUser.uid
  };

  // ✅ ENG MUHIM JOY (SENING MUAMMO SHU YERDA EDI)
  // ❗ ENDI HECH QACHON seats VA passengerCount IKKALASI BIRGA YOZILMAYDI
  if (CURRENT_ROLE === "driver") {
    payload.seats = seatsValue;
    delete payload.passengerCount;
  } else {
    payload.passengerCount = seatsValue;
    delete payload.seats;
  }

  try {
    const adsRef = ref(db, "ads/" + auth.currentUser.uid);
    const newRef = push(adsRef);

    await set(newRef, payload);

    alert("E'lon muvaffaqiyatli joylandi!");
    window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";

  } catch (err) {
    console.error("CREATE AD ERROR:", err);
    alert("E'lon joylashda xatolik yuz berdi!");
  }
});

// ===============================
// INIT
// ===============================
initRegions();

console.log("CREATE AD JS FULLY LOADED ✅");
