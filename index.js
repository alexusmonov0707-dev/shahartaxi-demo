// index.js (to'liq — joylashtirib almashtiring)
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
// ===============================
const REGIONS = window.regionsData || window.regions || {};

// ===============================
// TYPE NORMALIZATION
// ===============================
function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase();
  t = t.replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "yo'lovchi") return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ===============================
// UNIVERSAL DATE PARSER & FORMATTER
// ===============================
function formatTime(val) {
  if (!val) return "—";

  if (typeof val === "number") {
    return new Date(val).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

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

  return val;
}

function formatReal(date, short = false) {
  const datePart = date.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "long",
    year: short ? undefined : "numeric"
  });

  const timePart = date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (short) {
    const parts = datePart.split(" ");
    if (parts.length && /\d{4}/.test(parts[parts.length - 1])) parts.pop();
    return `${parts.join(" ")} , ${timePart}`.replace(/\s+,/, ",");
  }

  return `${datePart}, ${timePart}`;
}

// ===============================
// GET USER INFO
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "", fullName: "", role: "",
    carModel: "", carColor: "", carNumber: "", seatCount: 0
  };

  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return {
    phone: "", avatar: "", fullName: "", role: "",
    carModel: "", carColor: "", carNumber: "", seatCount: 0
  };

  const u = snap.val();
  return {
    phone: u.phone || "",
    avatar: u.avatar || "",
    fullName: u.fullName || u.fullName || "",
    role: u.role || "", // IMPORTANT: role field from DB ("driver" or "passenger")
    carModel: u.carModel || u.car || "",
    carColor: u.carColor || "",
    carNumber: u.carNumber || "",
    seatCount: u.seatCount || 0
  };
}

// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  loadRegionsFilter();
  loadRouteFilters();   // <-- route selects + district boxes
  loadAllAds();
});

// ===============================
// LOAD REGION FILTER (top filter)
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
// LOAD ROUTE FILTERS (from/to + district checkboxes)
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

  // populate regions
  const opt0 = '<option value="">Viloyat</option>';
  fromRegion.innerHTML = opt0;
  toRegion.innerHTML = opt0;
  Object.keys(REGIONS).forEach(region => {
    fromRegion.innerHTML += `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`;
    toRegion.innerHTML += `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`;
  });

  // when region changes — fill districts
  fromRegion.onchange = () => {
    fillDistrictBox("fromRegion", "fromDistrictBox");
    renderAdsCache(); // re-render
  };
  toRegion.onchange = () => {
    fillDistrictBox("toRegion", "toDistrictBox");
    renderAdsCache();
  };

  // initial empty boxes
  fillDistrictBox("fromRegion", "fromDistrictBox");
  fillDistrictBox("toRegion", "toDistrictBox");
}

// helper: fill district box for given select id -> box id
function fillDistrictBox(regionSelectId, boxId) {
  const region = document.getElementById(regionSelectId)?.value;
  const box = document.getElementById(boxId);
  if (!box) return;
  box.innerHTML = "";

  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    const label = document.createElement("label");
    label.className = "district-item";
    label.innerHTML = `<input type="checkbox" value="${escapeHtml(d)}" class="${regionSelectId}District"> ${escapeHtml(d)}`;
    const checkbox = label.querySelector("input");
    checkbox.onchange = () => renderAdsCache();
    box.appendChild(label);
  });
}

// We'll keep last loaded ads in memory so route select handlers can re-render easily.
let _ADS_CACHE = [];

// renderAds wrapper to avoid repeated getUser calls when handlers fire
function renderAdsCache() {
  if (!_ADS_CACHE) return;
  renderAds(_ADS_CACHE).catch(err => console.error(err));
}

// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  const snap = await get(ref(db, "ads"));
  const list = document.getElementById("adsList");

  if (!snap.exists()) {
    if (list) list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    _ADS_CACHE = [];
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

  _ADS_CACHE = ads; // cache

  // attach handlers (safely)
  const searchEl = document.getElementById("search");
  const roleEl = document.getElementById("filterRole");
  const regionEl = document.getElementById("filterRegion");

  if (searchEl) searchEl.oninput = () => renderAdsCache();
  if (roleEl) roleEl.onchange = () => renderAdsCache();
  if (regionEl) regionEl.onchange = () => renderAdsCache();

  renderAds(ads);
}

// ===============================
// RENDER ADS (main filtering occurs here)
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";

  // current user info (to determine role and hide own ads)
  const currentUserId = auth.currentUser?.uid || null;
  const currentUser = currentUserId ? await getUserInfo(currentUserId) : null;
  const currentRole = (currentUser && currentUser.role) ? currentUser.role.toLowerCase() : ""; // expecting "driver" or "passenger" in DB

  // route filters
  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";
  const fromDistricts = Array.from(document.querySelectorAll(".fromRegionDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll(".toRegionDistrict:checked")).map(x => x.value);

  // filter
  const filtered = ads.filter(a => {
    // 1) role filter: user sees opposite-type ads (driver sees Yo'lovchi, passenger sees Haydovchi)
    if (currentRole) {
      if (currentRole === "driver") {
        if ((a.type || "").toLowerCase().indexOf("yo") === -1) return false; // require Yo'lovchi
      } else if (currentRole === "passenger") {
        if ((a.type || "").toLowerCase().indexOf("haydov") === -1) return false; // require Haydovchi
      }
    }

    // also apply top roleFilter select if user used it
    if (roleFilter && a.typeNormalized !== roleFilter) return false;

    // hide own ads
    if (a.userId === currentUserId) return false;

    // 2) region filter (simple single viloyat filter)
    if (regionFilter && a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;

    // 3) route: FROM region/districts
    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (fromDistricts.length > 0 && !fromDistricts.includes(a.fromDistrict || "")) return false;

    // TO region/districts
    if (toRegion && a.toRegion !== toRegion) return false;
    if (toDistricts.length > 0 && !toDistricts.includes(a.toDistrict || "")) return false;

    // 4) qidiruv
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type
    ].join(" ").toLowerCase();

    return hay.includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // create cards
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(card => list.appendChild(card));
}

// ===============================
// MINI CARD (NO NAME)
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "", { shortYear: true });

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
// FULL MODAL (correct fullName + constrained avatar size)
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
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "", { shortYear: false });

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

  // Modal HTML — set explicit inline size for modal-avatar to avoid huge image
  modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true">
      <div class="modal-header">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar" style="width:110px;height:110px;object-fit:cover;border-radius:10px;">
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

window.onContact = (phone) => {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
};

// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);

// ===============================
// HTML ESCAPE
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
