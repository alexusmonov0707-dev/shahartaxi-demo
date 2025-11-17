// index.js (FULL, complete — do not shorten)
// ======================================================
// FIREBASE INIT
// ======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// --- your firebase config (keeps from your prior messages)
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

// ======================================================
// REGIONS DATA (regions.js should set window.regionsData)
// ======================================================
const REGIONS = window.regionsData || window.regions || {};

// ======================================================
// UTIL: normalize type (driver / passenger) — robust
// ======================================================
function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase();
  t = t.replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov") || t.includes("haydovchi")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "yo'lovchi") return "Yo‘lovchi";
  // fallback cap
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ======================================================
// UTIL: safe date formatters
// formatTime() returns compact date+time for card
// formatReal() returns long localized form
// ======================================================
function formatTime(val) {
  if (!val && val !== 0) return "—";

  // If number (timestamp)
  if (typeof val === "number") {
    return new Date(val).toLocaleString("uz-UZ", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  }

  // If string - try parse directly, then replace space with T
  if (typeof val === "string") {
    if (!isNaN(Date.parse(val))) {
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });
    }
    const fix = val.replace(" ", "T");
    if (!isNaN(Date.parse(fix))) {
      return new Date(fix).toLocaleString("uz-UZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });
    }
  }

  return String(val);
}

function formatReal(date, short = false) {
  if (!(date instanceof Date)) date = new Date(date);
  if (isNaN(date)) return String(date);

  const datePart = date.toLocaleDateString("uz-UZ", {
    day: "2-digit", month: "long", year: short ? undefined : "numeric"
  });
  const timePart = date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

  if (short) {
    const parts = datePart.split(" ");
    if (parts.length && /\d{4}/.test(parts[parts.length - 1])) parts.pop();
    return `${parts.join(" ")} , ${timePart}`.replace(/\s+,/, ",");
  }
  return `${datePart}, ${timePart}`;
}

// ======================================================
// GET USER INFO (robust fallback fields)
// returns raw DB object (so you can access fullName, firstname, name, etc)
// ======================================================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "", fullName: "", firstname: "", lastname: "", name: "",
    oq: "", car: "", carModel: "", carColor: "", carNumber: "", seatCount: 0, role: ""
  };

  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) {
    return {
      phone: "", avatar: "", fullName: "", firstname: "", lastname: "", name: "",
      oq: "", car: "", carModel: "", carColor: "", carNumber: "", seatCount: 0, role: ""
    };
  }

  const u = snap.val() || {};
  // return the object itself (we may use many fields). ensure defaults
  return {
    phone: u.phone || u.phoneNumber || u.telephone || "",
    avatar: u.avatar || u.photoURL || "",
    fullName: u.fullName || (u.firstname || u.lastname ? ((u.firstname||"") + " " + (u.lastname||"")).trim() : "") || u.name || "",
    firstname: u.firstname || "",
    lastname: u.lastname || "",
    name: u.name || "",
    oq: u.oq || "",
    car: u.car || "",
    carModel: u.carModel || u.model || "",
    carColor: u.carColor || u.color || "",
    carNumber: u.carNumber || u.license || "",
    seatCount: u.seatCount || u.seats || u.seatCount || 0,
    role: u.role || (u.type ? normalizeType(u.type) : "") || ""
  };
}

// ======================================================
// AUTH CHECK: when auth changes, load filters + ads
// ======================================================
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  // initialize UI filters
  loadRegionsFilter();
  loadRouteFilters();
  // load ads
  loadAllAds().catch(err => {
    console.error("loadAllAds error:", err);
    const list = document.getElementById("adsList");
    if (list) list.innerHTML = "<p>E'lonlarni yuklashda xatolik yuz berdi.</p>";
  });
});

// ======================================================
// LOAD REGION FILTER (simple select used for quick filter)
// ======================================================
function loadRegionsFilter() {
  const el = document.getElementById("filterRegion");
  if (!el) return;
  el.innerHTML = '<option value="">Viloyat (filter)</option>';
  Object.keys(REGIONS).forEach(region => {
    const opt = document.createElement("option");
    opt.value = region;
    opt.textContent = region;
    el.appendChild(opt);
  });
}

// ======================================================
// ROUTE FILTERS (FROM / TO selects and district boxes)
// ======================================================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

  fromRegion.innerHTML = '<option value="">Viloyat</option>';
  toRegion.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(REGIONS).forEach(region => {
    fromRegion.innerHTML += `<option value="${region}">${region}</option>`;
    toRegion.innerHTML += `<option value="${region}">${region}</option>`;
  });

  fromRegion.onchange = () => {
    fillFromDistricts();
    safeRenderAds();
  };
  toRegion.onchange = () => {
    fillToDistricts();
    safeRenderAds();
  };
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");
  if (!box) return;
  box.innerHTML = "";

  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    const lbl = document.createElement("label");
    lbl.className = "district-item";
    lbl.innerHTML = `<input type="checkbox" class="fromDistrict" value="${escapeHtml(d)}"> ${escapeHtml(d)}`;
    box.appendChild(lbl);
  });

  box.querySelectorAll("input.fromDistrict").forEach(el => el.onchange = safeRenderAds);
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");
  if (!box) return;
  box.innerHTML = "";

  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    const lbl = document.createElement("label");
    lbl.className = "district-item";
    lbl.innerHTML = `<input type="checkbox" class="toDistrict" value="${escapeHtml(d)}"> ${escapeHtml(d)}`;
    box.appendChild(lbl);
  });

  box.querySelectorAll("input.toDistrict").forEach(el => el.onchange = safeRenderAds);
}

// ======================================================
// LOAD ALL ADS (read once and keep in memory for fast filtering)
// ======================================================
let ALL_ADS = [];
async function loadAllAds() {
  const snap = await get(ref(db, "ads"));
  const list = document.getElementById("adsList");
  if (!list) return;

  if (!snap.exists()) {
    list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    ALL_ADS = [];
    return;
  }

  const arr = [];
  snap.forEach(child => {
    const v = child.val();
    arr.push({
      id: child.key,
      ...v,
      typeNormalized: normalizeType(v.type)
    });
  });

  // store
  ALL_ADS = arr;

  // wire filter inputs (only once)
  const searchEl = document.getElementById("search");
  const roleEl = document.getElementById("filterRole");
  const regionEl = document.getElementById("filterRegion");
  if (searchEl) searchEl.oninput = safeRenderAds;
  if (roleEl) roleEl.onchange = safeRenderAds;
  if (regionEl) regionEl.onchange = safeRenderAds;

  // initial fill of from/to districts if selects have values
  fillFromDistricts();
  fillToDistricts();

  safeRenderAds();
}

// ======================================================
// DEBOUNCE / SAFE RENDER wrapper (fixes flicker/pirpirash)
// ======================================================
let renderTimer = null;
function safeRenderAds() {
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderAds().catch(e => console.error("renderAds error:", e));
  }, 60); // 60ms debounce (fast but prevents double re-render)
}

// ======================================================
// RENDER ADS (applies all filters in memory)
// ======================================================
async function renderAds() {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = (document.getElementById("filterRole")?.value || "").trim();
  const regionFilter = (document.getElementById("filterRegion")?.value || "").trim();

  const fromRegion = (document.getElementById("fromRegion")?.value || "").trim();
  const toRegion = (document.getElementById("toRegion")?.value || "").trim();

  const fromDistricts = Array.from(document.querySelectorAll(".fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll(".toDistrict:checked")).map(x => x.value);

  const currentUserId = auth.currentUser?.uid || null;
  const currentUser = currentUserId ? await getUserInfo(currentUserId) : {};
  const currentRole = (currentUser.role || "").toLowerCase();

  // filter
  const filtered = ALL_ADS.filter(a => {
    // Skip if user's own ad (we want others' ads)
    if (a.userId === currentUserId) return false;

    // Role filter: show opposite type to current user (driver sees passenger ads, passenger sees driver ads)
    // If user's role not known, rely on UI roleFilter if set
    if (currentRole) {
      if (currentRole === "driver" && a.typeNormalized !== "Yo‘lovchi") return false;
      if (currentRole === "passenger" && a.typeNormalized !== "Haydovchi") return false;
    } else if (roleFilter) {
      // UI role filter override (if user selected a role manually)
      if (a.typeNormalized !== roleFilter) return false;
    }

    // quick region filter
    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    // from/to region filters
    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (toRegion && a.toRegion !== toRegion) return false;

    // districts (multi OR)
    if (fromDistricts.length && !fromDistricts.includes(a.fromDistrict)) return false;
    if (toDistricts.length && !toDistricts.includes(a.toDistrict)) return false;

    // search text
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, String(a.price || ""), a.type || ""
    ].join(" ").toLowerCase();

    if (q && !hay.includes(q)) return false;

    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // create cards concurrently
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(c => list.appendChild(c));
}

// ======================================================
// CREATE AD CARD (HTML markup for mini card)
// ======================================================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  // route text
  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.time || ad.startTime || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;

  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  const carModel = u.carModel || u.car || "";

  // build innerHTML safely (escape where needed)
  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">

    <div class="ad-main">
      <div class="ad-route">${escapeHtml(route)}</div>
      <div class="ad-car">${escapeHtml(carModel)}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
        ${ totalSeats !== null ? `<div class="ad-chip">👥 ${escapeHtml(String(available))}/${escapeHtml(String(totalSeats))} bo‘sh</div>` :
          (requested !== null ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>` : "") }
      </div>
    </div>

    <div class="ad-price">💰 ${escapeHtml(String(ad.price || "-"))} so‘m</div>

    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}

// ======================================================
// FULL MODAL (detailed view) — uses more user fields
// ======================================================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  const u = await getUserInfo(ad.userId);

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatReal(ad.departureTime || ad.time || ad.startTime || new Date());
  const created = formatReal(ad.createdAt || ad.created || ad.postedAt || new Date());

  const fullname = u.fullName || (u.firstname || u.lastname ? ((u.firstname||"") + " " + (u.lastname||"")).trim() : "") || u.name || "Foydalanuvchi";
  const carFull = `${u.carModel || u.car || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  // compose modal markup (styled by your CSS in HTML head)
  modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true">
      <div class="modal-header">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">
        <div>
          <div class="modal-name">${escapeHtml(fullname)}</div>
          <div class="modal-car">${escapeHtml(carFull)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Yo‘nalish</div>
          <div class="value">${escapeHtml(route)}</div>
        </div>
        <div class="modal-col">
          <div class="label">Jo‘nash vaqti</div>
          <div class="value">${escapeHtml(depTime)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Joylar</div>
          <div class="value">
            ${ totalSeats !== null ? `${escapeHtml(String(totalSeats))} ta (Bo‘sh: ${escapeHtml(String(available))})` :
               (requested !== null ? `Talab: ${escapeHtml(String(requested))} odam` : "-") }
          </div>
        </div>
        <div class="modal-col">
          <div class="label">Narx</div>
          <div class="value">${escapeHtml(ad.price ? String(ad.price) + " so‘m" : "-")}</div>
        </div>
      </div>

      <div style="margin-top:12px">
        <div class="label">Izoh</div>
        <div class="value">${escapeHtml(ad.comment || "-")}</div>
      </div>

      <div style="margin-top:12px">
        <div class="label">Kontakt</div>
        <div class="value">${escapeHtml(u.phone || "-")}</div>
      </div>

      <div style="margin-top:12px; color:#88919a; font-size:13px;">
        Joylashtirilgan: ${escapeHtml(created)}
      </div>

      <div class="modal-actions">
        <button class="btn-primary" onclick="closeAdModal()">Yopish</button>
        <button class="btn-ghost" onclick="onContact('${escapeHtml(u.phone || "")}')">Qo'ng'iroq</button>
      </div>
    </div>
  `;

  // show modal and handle outside click to close
  modal.style.display = "flex";
  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

window.closeAdModal = function () {
  const modal = document.getElementById("adFullModal");
  if (modal) {
    modal.style.display = "none";
    modal.onclick = null;
  }
};

// quick contact action
window.onContact = (phone) => {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
};

// logout
window.logout = () => signOut(auth);

// escape helper (safe insertion)
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

// END OF FILE
