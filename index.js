// index.js (to'liq, yangi badge + eski e'lon filtri qo'shilgan)
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
//  REGIONS DATA (from regions.js)
// ===============================
const REGIONS = window.regionsData || window.regions || {};

// ===============================
//  Insert badge CSS into page (so you don't have to edit HTML CSS manually)
// ===============================
(function injectBadgeCSS() {
  const css = `
  .new-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: #ff4444;
    padding: 4px 8px;
    font-size: 11px;
    color: #fff;
    font-weight: 700;
    border-radius: 8px;
    z-index: 5;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  `;
  try {
    const s = document.createElement("style");
    s.type = "text/css";
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  } catch (e) {
    console.warn("Could not inject badge CSS", e);
  }
})();

// ===============================
//  HELPERS
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

function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase();
  t = t.replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "yo'lovchi") return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// universal date formatter
function formatTime(val) {
  if (!val) return "—";

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
//  GET USER INFO
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
      seatCount: Number(u.seatCount || u.seats || 0)
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
let ALL_ADS = [];
let CURRENT_USER = null;

// how many days to hide (older than this will be excluded). change if needed.
const DAYS_TO_HIDE = 30; // <-- change to 15 or 0 if you want different behavior

// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  CURRENT_USER = await getUserInfo(user.uid || user?.userId);

  loadRegionsFilter && loadRegionsFilter(); // if present
  loadRouteFilters();
  await loadAllAds();
});

// ===============================
// LOAD REGION FILTER (top bar)
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
// LOAD Route Filters
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

  fromRegion.innerHTML = '<option value="">Viloyat</option>';
  toRegion.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(REGIONS).forEach(region => {
    fromRegion.insertAdjacentHTML("beforeend", `<option value="${region}">${region}</option>`);
    toRegion.insertAdjacentHTML("beforeend", `<option value="${region}">${region}</option>`);
  });

  fromRegion.onchange = () => { fillFromDistricts(); scheduleRenderAds(); };
  toRegion.onchange = () => { fillToDistricts(); scheduleRenderAds(); };

  fillFromDistricts();
  fillToDistricts();
}

function slugify(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;
  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="fromDistrict" value="${escapeHtml(d)}">
        ${escapeHtml(d)}
      </label>
    `;
  });
  box.querySelectorAll("input").forEach(ch => ch.onchange = () => scheduleRenderAds());
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;
  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="toDistrict" value="${escapeHtml(d)}">
        ${escapeHtml(d)}
      </label>
    `;
  });
  box.querySelectorAll("input").forEach(ch => ch.onchange = () => scheduleRenderAds());
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

    // attach controls (if present)
    const searchEl = document.getElementById("search");
    const roleEl = document.getElementById("filterRole");
    const regionEl = document.getElementById("filterRegion");
    const sortEl = document.getElementById("sortBy");
    const dateEl = document.getElementById("filterDate");
    const pmin = document.getElementById("priceMin");
    const pmax = document.getElementById("priceMax");

    if (searchEl) searchEl.oninput = () => renderAds(ALL_ADS);
    if (roleEl) roleEl.onchange = () => renderAds(ALL_ADS);
    if (regionEl) regionEl.onchange = () => renderAds(ALL_ADS);
    if (sortEl) sortEl.onchange = () => renderAds(ALL_ADS);
    if (dateEl) dateEl.onchange = () => renderAds(ALL_ADS);
    if (pmin) pmin.oninput = () => renderAds(ALL_ADS);
    if (pmax) pmax.oninput = () => renderAds(ALL_ADS);

    renderAds(ALL_ADS);
  } catch (err) {
    console.error("loadAllAds error:", err);
  }
}

// ===============================
// scheduleRenderAds debounce (used to prevent flicker when checking many boxes)
// ===============================
let __render_timeout = null;
function scheduleRenderAds() {
  if (__render_timeout) clearTimeout(__render_timeout);
  __render_timeout = setTimeout(() => {
    renderAds(ALL_ADS);
    __render_timeout = null;
  }, 120);
}

// listen generic checkbox changes (fallback)
document.addEventListener("change", (e) => {
  if (e.target && (e.target.classList.contains("fromDistrict") || e.target.classList.contains("toDistrict"))) {
    scheduleRenderAds();
  }
});

// ===============================
// RENDER ADS with all filters applied
// (includes: price filter, date filter, role logic, old-ads hiding, badge logic inside createAdCard)
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";

  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const filterDate = document.getElementById("filterDate")?.value || "";
  const priceMin = Number(document.getElementById("priceMin")?.value || 0);
  const priceMax = Number(document.getElementById("priceMax")?.value || 0);

  const currentUserId = auth.currentUser?.uid || null;

  // refresh CURRENT_USER non-blocking if necessary
  if (currentUserId && (!CURRENT_USER || (CURRENT_USER._uid && CURRENT_USER._uid !== currentUserId))) {
    getUserInfo(currentUserId).then(u => { CURRENT_USER = u; }).catch(()=>{});
  }

  const currentRoleRaw = (CURRENT_USER?.role || "").toString().toLowerCase();
  let currentRole = "";
  if (currentRoleRaw.includes("driver") || currentRoleRaw.includes("haydov")) currentRole = "driver";
  else if (currentRoleRaw.includes("pass") || currentRoleRaw.includes("yo")) currentRole = "passenger";

  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";
  const fromDistricts = Array.from(document.querySelectorAll("#fromDistrictBox input.fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll("#toDistrictBox input.toDistrict:checked")).map(x => x.value);

  // pipeline
  let filtered = ads.filter(a => {
    if (!a) return false;

    // hide very old ads (ESKI E'LONLAR) — exclude ads older than DAYS_TO_HIDE days
    const createdStamp = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
    if (createdStamp && DAYS_TO_HIDE > 0) {
      if ((Date.now() - createdStamp) > (DAYS_TO_HIDE * 24 * 60 * 60 * 1000)) return false;
    }

    // 1) automatic role filter (driver sees 'Yo‘lovchi' ads only, passenger sees 'Haydovchi' ads only)
    if (currentRole === "driver") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("yo")) return false;
    } else if (currentRole === "passenger") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    // 2) explicit role dropdown
    if (roleFilter) {
      if (a.typeNormalized !== roleFilter) return false;
    }

    // 3) hide own ads
    if (currentUserId && a.userId === currentUserId) return false;

    // 4) top region filter (either from or to)
    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    // 5) from region & districts
    if (fromRegion) {
      if (a.fromRegion !== fromRegion) return false;
    }
    if (fromDistricts.length > 0) {
      if (!fromDistricts.includes(a.fromDistrict)) return false;
    }

    // 6) to region & districts
    if (toRegion) {
      if (a.toRegion !== toRegion) return false;
    }
    if (toDistricts.length > 0) {
      if (!toDistricts.includes(a.toDistrict)) return false;
    }

    // 7) price filters
    const adPrice = a.price ? Number(a.price) : NaN;
    if (priceMin && !isNaN(adPrice) && adPrice < priceMin) return false;
    if (priceMax && !isNaN(adPrice) && adPrice > priceMax) return false;

    // 8) date filter (today / tomorrow / 3 days)
    if (filterDate) {
      const raw = a.departureTime || a.startTime || a.time || a.date || a.departure || null;
      let adTime = null;
      if (typeof raw === "number") adTime = new Date(raw);
      else if (typeof raw === "string" && raw.trim() !== "") {
        const tryFix = raw.replace(" ", "T");
        adTime = !isNaN(Date.parse(raw)) ? new Date(raw) : (!isNaN(Date.parse(tryFix)) ? new Date(tryFix) : null);
      }
      if (!adTime) return false;
      const now = new Date();
      if (filterDate === "today") {
        if (adTime.getFullYear() !== now.getFullYear() ||
            adTime.getMonth() !== now.getMonth() ||
            adTime.getDate() !== now.getDate()) return false;
      } else if (filterDate === "tomorrow") {
        const t = new Date(now); t.setDate(now.getDate() + 1);
        if (adTime.getFullYear() !== t.getFullYear() ||
            adTime.getMonth() !== t.getMonth() ||
            adTime.getDate() !== t.getDate()) return false;
      } else if (filterDate === "3days") {
        const diff = adTime.getTime() - now.getTime();
        if (diff < 0 || diff > 1000 * 60 * 60 * 24 * 3) return false;
      }
    }

    // 9) search full-text
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type, a.carModel, a.userId
    ].join(" ").toLowerCase();

    if (!hay.includes(q)) return false;

    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // sorting newest/oldest (by createdAt/postAt fallback)
  if (sortBy === "newest") {
    filtered.sort((a, b) => {
      const ta = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
      const tb = new Date(b.createdAt || b.created || b.postedAt || 0).getTime();
      return tb - ta;
    });
  } else if (sortBy === "oldest") {
    filtered.sort((a, b) => {
      const ta = new Date(a.createdAt || a.created || a.postedAt || 0).getTime();
      const tb = new Date(b.createdAt || b.created || b.postedAt || 0).getTime();
      return ta - tb;
    });
  }

  // create card elements (parallel)
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(c => list.appendChild(c));
}

// ===============================
// CREATE AD CARD (mini) — with New badge
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  // compute isNew (last 24 hours)
  const createdTsRaw = ad.createdAt || ad.created || ad.postedAt || 0;
  const createdTs = (typeof createdTsRaw === "number") ? createdTsRaw : (new Date(String(createdTsRaw)).getTime() || 0);
  const isNew = (createdTs && (Date.now() - createdTs) < (24 * 60 * 60 * 1000));

  const div = document.createElement("div");
  div.className = "ad-card";
  div.setAttribute("data-ad-id", ad.id || "");

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTimeRaw = ad.departureTime || ad.startTime || ad.time || ad.date || "";
  const depTime = formatTime(depTimeRaw);
  const created = formatTime(createdTsRaw);

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;

  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  const carModel = u.carModel || (ad.car || "");

  // badge markup is inserted before avatar so it visually overlays top-left
  div.innerHTML = `
    ${isNew ? `<div class="new-badge">Yangi</div>` : ""}
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">
    <div class="ad-main">
      <div class="ad-route">${escapeHtml(route)}</div>
      <div class="ad-car" style="color:#6b7280;font-size:13px;margin-top:6px">${escapeHtml(carModel)}</div>

      <div class="ad-meta" style="margin-top:8px">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
        ${
          totalSeats !== null
            ? `<div class="ad-chip">👥 ${escapeHtml(String(available))}/${escapeHtml(String(totalSeats))} bo‘sh</div>`
            : (requested !== null
                ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>`
                : `<div class="ad-chip">👥 -</div>`)
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
// OPEN FULL MODAL (detailed)
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
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || ad.date || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");
  const fullname = u.fullName || ((u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim() : "") || "Foydalanuvchi";
  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true">
      <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">
        <div>
          <div class="modal-name">${escapeHtml(fullname)}</div>
          <div class="modal-car" style="color:#6b7280">${escapeHtml(carFull)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Yo‘nalish</div>
          <div class="value">${escapeHtml(route)}</div>
        </div>
        <div class="modal-col" style="text-align:right">
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
        <div class="modal-col" style="text-align:right">
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

      <div class="modal-actions" style="margin-top:14px">
        <button class="btn-primary" id="modalCloseBtn">Yopish</button>
        <button class="btn-ghost" id="modalCallBtn">Qo'ng'iroq</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  const closeBtn = document.getElementById("modalCloseBtn");
  const callBtn = document.getElementById("modalCallBtn");
  if (closeBtn) closeBtn.onclick = closeAdModal;
  if (callBtn) callBtn.onclick = () => onContact(u.phone || "");
  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

// ===============================
// CLOSE modal
// ===============================
function closeAdModal() {
  const modal = document.getElementById("adFullModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.innerHTML = "";
}

// ===============================
// contact
// ===============================
function onContact(phone) {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
}

// expose globals
window.openAdModal = openAdModal;
window.closeAdModal = closeAdModal;
window.onContact = onContact;

// ===============================
// done
// ===============================
export {}; // module shape (no exports required)
