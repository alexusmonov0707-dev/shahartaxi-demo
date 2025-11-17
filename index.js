// index.js (to'liq, filterRegion removed from init)
// ===============================
//  FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ===============================
// REGIONS DATA (from regions.js)
// regions.js must set window.regionsData or window.regions
// Example structure:
// { "Toshkent shahri": ["Bektemir","Chilonzor", ...], "Namangan": ["Chust","Namangan sh.", ...] }
// ===============================
const REGIONS = window.regionsData || window.regions || {};

// ===============================
// HELPERS
// ===============================
function escapeHtml(str) {
  if (str === 0) return "0";
  if (!str && str !== 0) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// normalize ad/type strings into consistent labels
function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase();
  t = t.replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "yo'lovchi") return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// universal time formatter
function formatTime(val) {
  if (!val) return "—";

  // numeric timestamp
  if (typeof val === "number") {
    try {
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) { return String(val); }
  }

  // string -> try parse
  if (typeof val === "string") {
    if (!isNaN(Date.parse(val))) {
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    const fix = val.replace(" ", "T");
    if (!isNaN(Date.parse(fix))) {
      return new Date(fix).toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  }

  return String(val);
}

// ===============================
// GET USER INFO
// returns object with role, phone, avatar, fullName, carModel, carColor, carNumber, etc.
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "", fullName: "", role: "",
    carModel: "", carColor: "", carNumber: "", seatCount: 0
  };

  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists()) {
      return {
        phone: "", avatar: "", fullName: "", role: "",
        carModel: "", carColor: "", carNumber: "", seatCount: 0
      };
    }
    const u = snap.val();
    return {
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || "",
      fullName: u.fullName || ((u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim() : "") || u.name || "",
      role: (u.role || u.userRole || "").toString(),
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: u.seatCount || u.seats || 0
    };
  } catch (err) {
    console.error("getUserInfo error:", err);
    return {
      phone: "", avatar: "", fullName: "", role: "",
      carModel: "", carColor: "", carNumber: "", seatCount: 0
    };
  }
}

// ===============================
// GLOBALS
// ===============================
let ALL_ADS = []; // all ads loaded from DB (cached)
let CURRENT_USER = null; // cached current user info (from users/uid)

// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // load current user info
  CURRENT_USER = await getUserInfo(user.uid || user?.userId);
  // load UI filters & ads
  // NOTE: filterRegion removed — HTML no longer contains it
  loadRouteFilters();
  await loadAllAds();
});

// ===============================
// LOAD Route Filters (from/to region + district checkboxes)
// - fills #fromRegion, #toRegion
// - fills #fromDistrictBox and #toDistrictBox on change
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

  // clear first option keep "Viloyat"
  fromRegion.innerHTML = '<option value="">Viloyat</option>';
  toRegion.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(REGIONS).forEach(region => {
    const o1 = document.createElement("option");
    o1.value = region; o1.textContent = region;
    fromRegion.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = region; o2.textContent = region;
    toRegion.appendChild(o2);
  });

  fromRegion.onchange = () => {
    fillFromDistricts();
    // rerender after change
    renderAds(ALL_ADS);
  };
  toRegion.onchange = () => {
    fillToDistricts();
    renderAds(ALL_ADS);
  };

  // initialize boxes (empty)
  fillFromDistricts();
  fillToDistricts();
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;
  REGIONS[region].forEach(d => {
    const id = "fromDist_" + slugify(region) + "_" + slugify(d);
    const label = document.createElement("label");
    label.className = "district-item";
    label.innerHTML = `<input type="checkbox" id="${id}" value="${escapeHtml(d)}" class="fromDistrict"> ${escapeHtml(d)}`;
    box.appendChild(label);
  });
  // attach change handlers to checkboxes
  box.querySelectorAll("input[type=checkbox]").forEach(ch => ch.onchange = () => renderAds(ALL_ADS));
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;
  REGIONS[region].forEach(d => {
    const id = "toDist_" + slugify(region) + "_" + slugify(d);
    const label = document.createElement("label");
    label.className = "district-item";
    label.innerHTML = `<input type="checkbox" id="${id}" value="${escapeHtml(d)}" class="toDistrict"> ${escapeHtml(d)}`;
    box.appendChild(label);
  });
  box.querySelectorAll("input[type=checkbox]").forEach(ch => ch.onchange = () => renderAds(ALL_ADS));
}

function slugify(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
}

// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  try {
    const snap = await get(ref(db, "ads"));
    const list = document.getElementById("adsList");
    if (!list) return;

    if (!snap.exists()) {
      list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
      ALL_ADS = [];
      return;
    }

    const ads = [];
    snap.forEach(child => {
      const v = child.val();
      ads.push({
        id: child.key,
        ...v,
        typeNormalized: normalizeType(v.type)
      });
    });

    ALL_ADS = ads;

    // attach controls
    const searchEl = document.getElementById("search");
    const roleEl = document.getElementById("filterRole");
    const fromRegionEl = document.getElementById("fromRegion");
    const toRegionEl = document.getElementById("toRegion");

    if (searchEl) searchEl.oninput = () => renderAds(ALL_ADS);
    if (roleEl) roleEl.onchange = () => renderAds(ALL_ADS);
    if (fromRegionEl) fromRegionEl.onchange = () => { fillFromDistricts(); renderAds(ALL_ADS); };
    if (toRegionEl) toRegionEl.onchange = () => { fillToDistricts(); renderAds(ALL_ADS); };

    // initial render
    renderAds(ALL_ADS);
  } catch (err) {
    console.error("loadAllAds error:", err);
  }
}

// ===============================
// RENDER ADS with all filters applied
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  // regionFilter removed

  // current signed-in user ID & info
  const currentUserId = auth.currentUser?.uid || null;
  if (currentUserId && (!CURRENT_USER || CURRENT_USER._uid !== currentUserId)) {
    // refresh CURRENT_USER if needed (non-blocking)
    getUserInfo(currentUserId).then(u => { CURRENT_USER = u; renderAds(ALL_ADS); }).catch(()=>{});
  }
  const currentRoleRaw = (CURRENT_USER?.role || "").toString().toLowerCase();
  // Normalize: driver -> haydovchi, passenger -> yo'lovchi
  let currentRole = ""; // "driver" or "passenger" or ""
  if (currentRoleRaw.includes("driver") || currentRoleRaw.includes("haydov")) currentRole = "driver";
  else if (currentRoleRaw.includes("pass") || currentRoleRaw.includes("yo")) currentRole = "passenger";

  // route filters
  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";
  const fromDistricts = Array.from(document.querySelectorAll("#fromDistrictBox input.fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll("#toDistrictBox input.toDistrict:checked")).map(x => x.value);

  // filter
  const filtered = ads.filter(a => {
    // a is ad object
    // 1) role filter (automatic by signed-in user's role)
    if (currentRole === "driver") {
      // driver should see only Yo'lovchi ads
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("yo")) return false;
    } else if (currentRole === "passenger") {
      // passenger should see only Haydovchi ads
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    // 2) explicit role dropdown filter (if user selected)
    if (roleFilter) {
      if (a.typeNormalized !== roleFilter) return false;
    }

    // 3) do not show own ads (show only others' ads)
    if (currentUserId && a.userId === currentUserId) return false;

    // 5) fromRegion/fromDistricts filter
    if (fromRegion) {
      if (a.fromRegion !== fromRegion) return false;
    }
    if (fromDistricts.length > 0) {
      if (!fromDistricts.includes(a.fromDistrict)) return false;
    }

    // 6) toRegion/toDistricts filter
    if (toRegion) {
      if (a.toRegion !== toRegion) return false;
    }
    if (toDistricts.length > 0) {
      if (!toDistricts.includes(a.toDistrict)) return false;
    }

    // 7) search Q (manzil, izoh, narx)
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type, a.carModel
    ].join(" ").toLowerCase();

    if (!hay.includes(q)) return false;

    // passed all filters
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // create cards async and append
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(c => list.appendChild(c));
}

// ===============================
// CREATE AD CARD (mini)
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;

  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  const carModel = u.carModel || "";

  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">

    <div class="ad-main">
      <div class="ad-route">${escapeHtml(route)}</div>
      <div class="ad-car">${escapeHtml(carModel)}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
        ${
          totalSeats !== null
            ? `<div class="ad-chip">👥 ${escapeHtml(String(available))}/${escapeHtml(String(totalSeats))} bo‘sh</div>`
            : requested !== null
              ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>`
              : ""
        }
      </div>
    </div>

    <div class="ad-price">💰 ${escapeHtml(ad.price ? String(ad.price) : "-")} so‘m</div>

    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}

// ===============================
// OPEN FULL MODAL (with tidy layout)
// ===============================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  // fetch user object
  const u = await getUserInfo(ad.userId);

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");
  const fullname = u.fullName || "Foydalanuvchi";
  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  // modal markup - ensure avatar is constrained by CSS .modal-avatar
  modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true">
      <div style="display:flex; gap:12px; align-items:center; margin-bottom:6px;">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">
        <div>
          <div class="modal-name">${escapeHtml(fullname)}</div>
          <div class="modal-car">${escapeHtml(carFull)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div style="flex:1">
          <div class="label">Yo‘nalish</div>
          <div class="value">${escapeHtml(route)}</div>
        </div>
        <div style="flex:1; text-align:right">
          <div class="label">Jo‘nash vaqti</div>
          <div class="value">${escapeHtml(depTime)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div style="flex:1">
          <div class="label">Joylar</div>
          <div class="value">
            ${
              totalSeats !== null
                ? `${escapeHtml(String(totalSeats))} ta (Bo‘sh: ${escapeHtml(String(available))})`
                : requested !== null
                  ? `Talab: ${escapeHtml(String(requested))} odam`
                  : "-"`
  }
          </div>
        </div>
        <div style="flex:1; text-align:right">
          <div class="label">Narx</div>
          <div class="value">${escapeHtml(ad.price ? ad.price + " so‘m" : "-")}</div>
        </div>
      </div>

      <div style="margin-top:12px;">
        <div class="label">Izoh</div>
        <div class="value">${escapeHtml(ad.comment || "-")}</div>
      </div>

      <div style="margin-top:12px;">
        <div class="label">Kontakt</div>
        <div class="value">${escapeHtml(u.phone || "-")}</div>
      </div>

      <div style="margin-top:12px; color:#88919a; font-size:13px;">
        Joylashtirilgan: ${escapeHtml(created)}
      </div>

      <div class="modal-actions">
        <button class="btn-primary" id="modalCloseBtn">Yopish</button>
        <button class="btn-ghost" id="modalCallBtn">Qo'ng'iroq</button>
      </div>
    </div>
  `;

  // show modal
  modal.style.display = "flex";

  // button handlers
  document.getElementById("modalCloseBtn").onclick = closeAdModal;
  document.getElementById("modalCallBtn").onclick = () => onContact(u.phone || "");

  // clicking outside modal closes
  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

function closeAdModal() {
  const modal = document.getElementById("adFullModal");
  if (modal) {
    modal.style.display = "none";
    modal.innerHTML = "";
  }
}

// simple contact action
function onContact(phone) {
  if (!phone) return alert("Telefon raqami mavjud emas");
  // normal tel link
  window.location.href = `tel:${phone}`;
}

// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);

// expose open/close globally (used by onclick in cards earlier)
window.openAdModal = openAdModal;
window.closeAdModal = closeAdModal;
window.onContact = onContact;

// ===============================
// export nothing - this is application entry
// ===============================
