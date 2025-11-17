// index.js (full, module)
// ===============================
// FIREBASE INIT
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
// Make sure regions.js sets window.regionsData = { "Viloyat": ["tuman1","tuman2", ...], ... }
const REGIONS = window.regionsData || window.regions || {};

// ===============================
// UTIL: normalize type/value helpers
// ===============================
function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim();
  // normalise quotes
  t = t.replace(/[‘’`ʼ']/g, "'");
  t = t.toLowerCase();
  if (t.includes("haydov") || t.includes("haydovchi")) return "Haydovchi";
  if ((t.includes("yo") && t.includes("lov")) || t.includes("yo'lovchi") || t.includes("yo‘lovchi")) return "Yo‘lovchi";
  // fallback capitalise first
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function normalizeRole(r) {
  if (!r) return "";
  r = String(r).toLowerCase();
  if (r.includes("driver") || r.includes("haydov")) return "driver";
  if (r.includes("pass") || (r.includes("yo") && r.includes("lov"))) return "passenger";
  return r;
}

// ===============================
// DATE formatting utilities
// ===============================
function formatTime(val) {
  if (!val && val !== 0) return "—";
  // numeric timestamp (ms)
  if (typeof val === "number") {
    return new Date(val).toLocaleString("uz-UZ", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  }
  // string try parse ISO or with space -> replace with T
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
  return val;
}
function formatReal(date, short = false) {
  const datePart = date.toLocaleDateString("uz-UZ", {
    day: "2-digit", month: "long", year: short ? undefined : "numeric"
  });
  const timePart = date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit", minute: "2-digit"
  });
  if (short) {
    const parts = datePart.split(" ");
    if (parts.length && /\d{4}/.test(parts[parts.length - 1])) parts.pop();
    return `${parts.join(" ")} , ${timePart}`.replace(/\s+,/, ",");
  }
  return `${datePart}, ${timePart}`;
}

// ===============================
// GET USER INFO (returns role as well)
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "",
    fullName: "", role: "",
    carModel: "", carColor: "", carNumber: "",
    seatCount: 0
  };

  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return {
    phone: "", avatar: "",
    fullName: "", role: "",
    carModel: "", carColor: "", carNumber: "",
    seatCount: 0
  };

  const u = snap.val();
  return {
    phone: u.phone || "",
    avatar: u.avatar || "",
    fullName: u.fullName || u.fullName || (u.firstname || u.lastname ? `${u.firstname||""} ${u.lastname||""}`.trim() : "") || "",
    role: normalizeRole(u.role || u.userRole || u.roleName || ""),
    carModel: u.carModel || u.car || "",
    carColor: u.carColor || "",
    carNumber: u.carNumber || u.carNumber || u.license || "",
    seatCount: u.seatCount || u.seats || 0
  };
}

// ===============================
// AUTH CHECK -> start
// ===============================
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  // populate filters & load ads
  loadRegionsFilter();
  // route selects (from/to + district boxes)
  try { loadRouteFilters(); } catch(e){ /* ignore if elements missing */ }
  loadAllAds();
});

// ===============================
// LOAD REGION FILTER (select #filterRegion)
// ===============================
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

// ===============================
// ROUTE FILTERS: fill fromRegion / toRegion and district boxes
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

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

  fromRegion.onchange = fillFromDistricts;
  toRegion.onchange = fillToDistricts;
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
    lbl.innerHTML = `<input type="checkbox" value="${escapeHtml(d)}" class="fromDistrict"> ${escapeHtml(d)}`;
    box.appendChild(lbl);
  });
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
    lbl.innerHTML = `<input type="checkbox" value="${escapeHtml(d)}" class="toDistrict"> ${escapeHtml(d)}`;
    box.appendChild(lbl);
  });
}

// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  const snap = await get(ref(db, "ads"));
  const list = document.getElementById("adsList");

  if (!snap.exists()) {
    if (list) list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
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

  // attach handlers safely
  const searchEl = document.getElementById("search");
  const roleEl = document.getElementById("filterRole");
  const regionEl = document.getElementById("filterRegion");
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");

  if (searchEl) searchEl.oninput = () => renderAds(ads);
  if (roleEl) roleEl.onchange = () => renderAds(ads); // keep manual filter if user wants to override
  if (regionEl) regionEl.onchange = () => renderAds(ads);
  if (fromRegion) fromRegion.onchange = () => renderAds(ads);
  if (toRegion) toRegion.onchange = () => renderAds(ads);

  // also delegate checkbox changes (district boxes) — use event delegation
  document.addEventListener("change", (e) => {
    if (e.target && (e.target.classList.contains("fromDistrict") || e.target.classList.contains("toDistrict"))) {
      renderAds(ads);
    }
  });

  // initial render
  renderAds(ads);
}

// ===============================
// RENDER ADS (main filter logic, role-aware + route/districts)
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  // qidiruv
  const q = (document.getElementById("search")?.value || "").toLowerCase();

  // manual role filter (select) - optional, but we will also use automatic role detection below
  const manualRoleFilter = normalizeType(document.getElementById("filterRole")?.value || "");

  // region filter (general)
  const regionFilter = document.getElementById("filterRegion")?.value || "";

  // route selects & districts
  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";
  const fromDistricts = Array.from(document.querySelectorAll(".fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll(".toDistrict:checked")).map(x => x.value);

  // current user & role (automatic)
  const currentUserId = auth.currentUser?.uid || null;
  const currentUser = currentUserId ? await getUserInfo(currentUserId) : null;
  const currentRole = (currentUser?.role) ? currentUser.role : "";

  // for debugging you can uncomment:
  // console.log("renderAds: currentRole=", currentRole, "manualRoleFilter=", manualRoleFilter);

  const filtered = ads.filter(a => {
    // safety: ensure a exists
    if (!a) return false;

    // -------------------------
    // ROLE FILTER (automatic by signed-in user)
    // -------------------------
    if (currentRole === "driver") {
      // drivers should only see passenger ads (Yo‘lovchi)
      if (normalizeType(a.type) !== "Yo‘lovchi") return false;
    } else if (currentRole === "passenger") {
      // passengers should only see driver ads
      if (normalizeType(a.type) !== "Haydovchi") return false;
    }
    // If manual role select used, apply (this is optional/extra)
    if (manualRoleFilter) {
      if (a.typeNormalized !== manualRoleFilter) return false;
    }

    // hide own ads
    if (a.userId && currentUserId && a.userId === currentUserId) return false;

    // -------------------------
    // ROUTE FILTERS: fromRegion/fromDistricts/toRegion/toDistricts
    // -------------------------
    // FROM REGION
    if (fromRegion && a.fromRegion !== fromRegion) return false;

    // FROM DISTRICT (multi OR)
    if (fromDistricts.length > 0 && !fromDistricts.includes(a.fromDistrict)) return false;

    // TO REGION
    if (toRegion && a.toRegion !== toRegion) return false;

    // TO DISTRICT (multi OR)
    if (toDistricts.length > 0 && !toDistricts.includes(a.toDistrict)) return false;

    // -------------------------
    // GENERAL REGION FILTER (single filter select) - intersects with both from/to
    // -------------------------
    if (regionFilter && a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;

    // -------------------------
    // TEXT SEARCH
    // -------------------------
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type
    ].join(" ").toLowerCase();

    if (!hay.includes(q)) return false;

    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // create cards (in parallel)
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(card => list.appendChild(card));
}

// ===============================
// MINI CARD (ad) - uses getUserInfo for avatar/car
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = (() => {
    const v = ad.createdAt || ad.created || ad.postedAt || "";
    if (v) {
      if (typeof v === "number") return formatTime(v);
      try { return formatTime(v); } catch(e) { return String(v); }
    }
    return "-";
  })();

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
// FULL MODAL
// ===============================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  const u = await getUserInfo(ad.userId);

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "" , { shortYear: false });

  const fullname = u.fullName || "Foydalanuvchi";

  const carFull =
    `${u.carModel || ""}` +
    `${u.carColor ? " • " + u.carColor : ""}` +
    `${u.carNumber ? " • " + u.carNumber : ""}`;

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

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
            ${
              totalSeats !== null
                ? `${escapeHtml(String(totalSeats))} ta (Bo‘sh: ${escapeHtml(String(available))})`
                : requested !== null
                  ? `Talab: ${escapeHtml(String(requested))} odam`
                  : "-"
            }
          </div>
        </div>
        <div class="modal-col">
          <div class="label">Narx</div>
          <div class="value">${escapeHtml(ad.price ? ad.price + " so‘m" : "-")}</div>
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

      <div style="margin-top:12px;color:#88919a;font-size:13px;">
        Joylashtirilgan: ${escapeHtml(created)}
      </div>

      <div class="modal-actions">
        <button class="btn-primary" onclick="closeAdModal()">Yopish</button>
        <button class="btn-ghost" onclick="onContact('${escapeHtml(u.phone || "")}')">Qo'ng'iroq</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

window.closeAdModal = function () {
  const modal = document.getElementById("adFullModal");
  if (modal) modal.style.display = "none";
};

// ===============================
// CONTACT + LOGOUT + ESCAPE
// ===============================
window.onContact = (phone) => {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
};

window.logout = () => signOut(auth);

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
