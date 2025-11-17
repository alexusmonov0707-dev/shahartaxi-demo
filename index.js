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

// universal date formatter (BUZMAYMAN)
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
    phone: "", avatar: "", fullName: "",
    role: "", carModel: "", carColor: "",
    carNumber: "", seatCount: 0
  };

  try {
    const snap = await get(ref(db, "users/" + userId));

    if (!snap.exists()) {
      return {
        phone: "", avatar: "", fullName: "",
        role: "", carModel: "", carColor: "",
        carNumber: "", seatCount: 0
      };
    }

    const u = snap.val();

    return {
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || "",
      fullName:
        u.fullName ||
        ((u.firstname || u.lastname)
          ? `${u.firstname || ""} ${u.lastname || ""}`.trim()
          : "") ||
        u.name ||
        "",
      role: (u.role || u.userRole || "").toString(),
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: Number(u.seatCount || u.seats || 0)
    };

  } catch (err) {
    console.error("getUserInfo error", err);
    return {
      phone: "", avatar: "", fullName: "",
      role: "", carModel: "", carColor: "",
      carNumber: "", seatCount: 0
    };
  }
}


// ===============================
// GLOBALS
// ===============================
let ALL_ADS = [];
let CURRENT_USER = null;


// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  CURRENT_USER = await getUserInfo(user.uid);

  loadRouteFilters();
  await loadAllAds();
});


// ===============================
// LOAD ROUTE FILTERS
// ===============================
function loadRouteFilters() {
  const fromR = document.getElementById("fromRegion");
  const toR = document.getElementById("toRegion");

  if (!fromR || !toR) return;

  fromR.innerHTML = `<option value="">Viloyat</option>`;
  toR.innerHTML = `<option value="">Viloyat</option>`;

  Object.keys(REGIONS).forEach(r => {
    fromR.innerHTML += `<option value="${r}">${r}</option>`;
    toR.innerHTML += `<option value="${r}">${r}</option>`;
  });

  fromR.onchange = () => { fillFromDistricts(); renderAds(ALL_ADS); };
  toR.onchange = () => { fillToDistricts(); renderAds(ALL_ADS); };

  fillFromDistricts();
  fillToDistricts();
}


// Qayerdan → tumanlar
function fillFromDistricts() {
  const r = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");

  box.innerHTML = "";
  if (!r || !REGIONS[r]) return;

  REGIONS[r].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="fromDistrict" value="${d}">
        ${d}
      </label>
    `;
  });

  box.querySelectorAll("input").forEach(ch => {
    ch.onchange = () => renderAds(ALL_ADS);
  });
}


// Qayerga → tumanlar
function fillToDistricts() {
  const r = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");

  box.innerHTML = "";
  if (!r || !REGIONS[r]) return;

  REGIONS[r].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="toDistrict" value="${d}">
        ${d}
      </label>
    `;
  });

  box.querySelectorAll("input").forEach(ch => {
    ch.onchange = () => renderAds(ALL_ADS);
  });
}


// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  const list = document.getElementById("adsList");

  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    list.innerHTML = "E’lon yo‘q.";
    ALL_ADS = [];
    return;
  }

  const arr = [];

  snap.forEach(c => {
    const v = c.val();
    arr.push({
      id: c.key,
      ...v,
      typeNormalized: normalizeType(v.type)
    });
  });

  ALL_ADS = arr;

  document.getElementById("search").oninput = () => renderAds(ALL_ADS);
  document.getElementById("filterRole").onchange = () => renderAds(ALL_ADS);
  document.getElementById("sortBy").onchange = () => renderAds(ALL_ADS);
  document.getElementById("filterDate").onchange = () => renderAds(ALL_ADS);
  document.getElementById("priceMin").oninput = () => renderAds(ALL_ADS);
  document.getElementById("priceMax").oninput = () => renderAds(ALL_ADS);

  renderAds(ALL_ADS);
}
// ===============================
// QISM 2 — FILTER ENGINE, CARDS, MODAL
// (1-qism bilan birlashtirish uchun)
// ===============================

function slugify(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
}

// RENDER ADS with all filters applied (komplekt)
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  // basic controls
  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";

  // sort / price / date controls
  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const filterDate = document.getElementById("filterDate")?.value || "";
  const priceMin = Number(document.getElementById("priceMin")?.value || 0);
  const priceMax = Number(document.getElementById("priceMax")?.value || 0);

  // current user id & cached info
  const currentUserId = auth.currentUser?.uid || null;

  // Ensure CURRENT_USER is fresh-ish
  if (currentUserId && (!CURRENT_USER || (CURRENT_USER._uid && CURRENT_USER._uid !== currentUserId))) {
    // non-blocking refresh
    getUserInfo(currentUserId).then(u => { CURRENT_USER = u; /* don't re-enter infinite loop here */ }).catch(()=>{});
  }

  // determine current role normalized: "driver" or "passenger" or ""
  const currentRoleRaw = (CURRENT_USER?.role || "").toString().toLowerCase();
  let currentRole = "";
  if (currentRoleRaw.includes("driver") || currentRoleRaw.includes("haydov")) currentRole = "driver";
  else if (currentRoleRaw.includes("pass") || currentRoleRaw.includes("yo")) currentRole = "passenger";

  // route filters (from/to)
  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";
  const fromDistricts = Array.from(document.querySelectorAll("#fromDistrictBox input.fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll("#toDistrictBox input.toDistrict:checked")).map(x => x.value);

  // Filter pipeline
  let filtered = ads.filter(a => {
    // safety: ensure object
    if (!a) return false;

    // 1) automatic role filter: show opposite-type ads (driver sees passenger ads, and vice versa)
    if (currentRole === "driver") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("yo")) return false;
    } else if (currentRole === "passenger") {
      if (!a.typeNormalized || !a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    // 2) explicit role dropdown filter (if selected)
    if (roleFilter) {
      if (a.typeNormalized !== roleFilter) return false;
    }

    // 3) hide own ads
    if (currentUserId && a.userId === currentUserId) return false;

    // 4) top region filter (either from or to)
    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    // 5) from region/districts
    if (fromRegion) {
      if (a.fromRegion !== fromRegion) return false;
    }
    if (fromDistricts.length > 0) {
      if (!fromDistricts.includes(a.fromDistrict)) return false;
    }

    // 6) to region/districts
    if (toRegion) {
      if (a.toRegion !== toRegion) return false;
    }
    if (toDistricts.length > 0) {
      if (!toDistricts.includes(a.toDistrict)) return false;
    }

    // 7) PRICE FILTER (yangi) — only if price present or filter set
    const adPrice = a.price ? Number(a.price) : NaN;
    if (priceMin && !isNaN(adPrice) && adPrice < priceMin) return false;
    if (priceMax && !isNaN(adPrice) && adPrice > priceMax) return false;

    // 8) DATE FILTER (yangi)
    if (filterDate) {
      const raw = a.departureTime || a.startTime || a.time || a.date || a.departure || null;
      // parse robustly: if number — treat as timestamp; if string — try parse; fallback huge negative date
      let adTime = null;
      if (typeof raw === "number") adTime = new Date(raw);
      else if (typeof raw === "string" && raw.trim() !== "") {
        const tryFix = raw.replace(" ", "T");
        adTime = !isNaN(Date.parse(raw)) ? new Date(raw) : (!isNaN(Date.parse(tryFix)) ? new Date(tryFix) : null);
      }
      // if adTime invalid and filterDate is used -> exclude (we cannot confirm)
      if (!adTime) return false;

      const now = new Date();
      // normalize times to local midnight for day comparisons
      if (filterDate === "today") {
        if (adTime.getFullYear() !== now.getFullYear() ||
            adTime.getMonth() !== now.getMonth() ||
            adTime.getDate() !== now.getDate()) return false;
      } else if (filterDate === "tomorrow") {
        const t = new Date(now);
        t.setDate(now.getDate() + 1);
        if (adTime.getFullYear() !== t.getFullYear() ||
            adTime.getMonth() !== t.getMonth() ||
            adTime.getDate() !== t.getDate()) return false;
      } else if (filterDate === "3days") {
        const diff = adTime.getTime() - now.getTime();
        if (diff < 0 || diff > 1000 * 60 * 60 * 24 * 3) return false;
      }
    }

    // 9) SEARCH (last) — compare concatenated fields
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type, a.carModel, a.userId
    ].join(" ").toLowerCase();

    if (!hay.includes(q)) return false;

    return true;
  });

  // if none matched
  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // SORT — newest/oldest by createdAt fallback
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

  // create cards (async map so user info fetched in parallel)
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  // append
  cards.forEach(c => list.appendChild(c));
}


// CREATE AD CARD (mini) — barcha ma'lumotlar bilan
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";
  div.setAttribute("data-ad-id", ad.id || "");

  // compose route
  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  // times
  const depTimeRaw = ad.departureTime || ad.startTime || ad.time || ad.date || "";
  const depTime = formatTime(depTimeRaw);

  // created short display (day month, time) - keep full for modal
  const createdRaw = ad.createdAt || ad.created || ad.postedAt || "";
  const created = formatTime(createdRaw);

  // seats logic
  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;

  // passenger requested seats
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  const carModel = u.carModel || (ad.car || "");

  // build innerHTML
  div.innerHTML = `
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

  // click opens modal
  div.onclick = () => openAdModal(ad);

  return div;
}


// OPEN FULL MODAL (detailed)
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  // get user
  const u = await getUserInfo(ad.userId);

  // route/time
  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || ad.date || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  // name fallback
  const fullname = u.fullName || ((u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim() : "") || "Foydalanuvchi";

  // car full
  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  // seats
  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  // modal markup
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

  // show modal
  modal.style.display = "flex";

  // attach handlers
  const closeBtn = document.getElementById("modalCloseBtn");
  const callBtn = document.getElementById("modalCallBtn");
  if (closeBtn) closeBtn.onclick = closeAdModal;
  if (callBtn) callBtn.onclick = () => onContact(u.phone || "");

  // clicking outside closes
  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}


// CLOSE modal
function closeAdModal() {
  const modal = document.getElementById("adFullModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.innerHTML = "";
}

// contact
function onContact(phone) {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
}

// expose global helpers (if used elsewhere)
window.openAdModal = openAdModal;
window.closeAdModal = closeAdModal;
window.onContact = onContact;

// tidy: prevent card flicker — simple debounce of render calls (if render called too often)
let __render_timeout = null;
function scheduleRenderAds() {
  if (__render_timeout) clearTimeout(__render_timeout);
  __render_timeout = setTimeout(() => {
    renderAds(ALL_ADS);
    __render_timeout = null;
  }, 120);
}

// attach small optimization: when checkboxes change we use scheduleRenderAds
document.addEventListener("change", (e) => {
  if (e.target && (e.target.classList.contains("fromDistrict") || e.target.classList.contains("toDistrict"))) {
    scheduleRenderAds();
  }
});
