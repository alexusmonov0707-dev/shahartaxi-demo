// ===============================
//     SHAHARTAXI — CREATE AD
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
    // Viloyatlarni to‘ldirish
    window.fillRegions("fromRegion");
    window.fillRegions("toRegion");

    // Tumanlarni avtomatik yangilash
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
// at top: import onAuthStateChanged, get, ref...
import { auth, db, ref, get, onAuthStateChanged } from "/shahartaxi-demo/docs/libs/lib.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // not logged in — redirect
    location.href = "/shahartaxi-demo/app/auth/login.html";
    return;
  }
  const snap = await get(ref(db, `users/${user.uid}`));
  const u = snap.exists() ? snap.val() : null;
  if (!u) {
    alert("Profil ma'lumotlari topilmadi. Admin bilan bog'laning.");
    await auth.signOut();
    location.href = "/shahartaxi-demo/app/auth/login.html";
    return;
  }
  // block driver if not verified
  if (u.role === "driver" && u.verified !== true) {
    // disable form submit button
    const submitBtn = document.getElementById("postAdBtn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.title = "Profilingiz admin tomonidan tasdiqlanishini kuting";
    }
    // optionally show banner
    const note = document.getElementById("verificationNotice");
    if (note) note.textContent = "Profilingiz hali tasdiqlanmagan. E'lon joylay olmaysiz.";
  }
});


// ===============================
//       SUBMIT — FIREBASE
// ===============================
submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const payload = {
        fromRegion: fromRegion.value,
        fromDistrict: fromDistrict.value,
        toRegion: toRegion.value,
        toDistrict: toDistrict.value,
        price: document.getElementById("price").value,
        departureTime: document.getElementById("departureTime").value,
        seats: document.getElementById("seats").value,
        comment: document.getElementById("adComment").value,
        createdAt: Date.now()
    };

    try {
        const lib = await import("/shahartaxi-demo/docs/libs/lib.js");
        const { db, ref, push, set, auth } = lib;

        if (!auth.currentUser) {
            alert("Kirish talab qilinadi!");
            return;
        }

        const adsRef = ref(db, "ads/" + auth.currentUser.uid);
        const newRef = push(adsRef);
        await set(newRef, payload);

        alert("E'lon muvaffaqiyatli joylandi!");
        window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";

    } catch (err) {
        console.error(err);
        alert("E'lon joylashda xatolik yuz berdi!");
    }
});

// ===============================
//            INIT
// ===============================
initRegions();
