// index.js  — to'liq fayl
// ===============================
//  FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* --- o'zingizning firebase config --- */
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
// expected: { "Toshkent shahri": ["Chilonzor", "Mirzo Ulug'bek", ...], "Namangan": [...], ... }
// ===============================
const REGIONS = window.regionsData || window.regions || {};

// ===============================
// HELPERS: normalize type, format date/time, escape html
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

function formatTime(val, opts = {}) {
  if (!val) return "—";
  const shortYear = !!opts.shortYear;
  // number timestamp
  if (typeof val === "number") {
    return new Date(val).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  // string attempts
  if (typeof val === "string") {
    // try ISO or parseable
    let d = Date.parse(val);
    if (isNaN(d)) {
      // try replace space with T for "YYYY-MM-DD HH:MM"
      const fixed = val.replace(" ", "T");
      d = Date.parse(fixed);
      if (!isNaN(d)) return new Date(d).toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } else {
      return new Date(d).toLocaleString("uz-UZ", {
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

// ===============================
// GET USER INFO (robust — many DB key variants supported)
// returns object including role/fullName/phone/avatar/carModel/carColor/carNumber/seatCount
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "",
    fullName: "", firstname: "", lastname: "", name: "",
    role: "", oq: "", car: "",
    carModel: "", carColor: "", carNumber: "",
    seatCount: 0
  };

  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists()) {
      return {
        phone: "", avatar: "",
        fullName: "", firstname: "", lastname: "", name: "",
        role: "", oq: "", car: "",
        carModel: "", carColor: "", carNumber: "",
        seatCount: 0
      };
    }
    const u = snap.val() || {};

    // try to derive fullName: prefer fullName field, else firstname+lastname, else name, else fullname-like keys
    const fullName = u.fullName || `${u.firstname || ""} ${u.lastname || ""}`.trim() || u.name || u.displayName || u.fullname || "";

    return {
      phone: u.phone || u.tel || u.phoneNumber || "",
      avatar: u.avatar || u.photoURL || "",
      fullName,
      firstname: u.firstname || "",
      lastname: u.lastname || "",
      name: u.name || "",
      role: u.role || u.type || "", // expected "driver"/"passenger" or "Haydovchi"/"Yo‘lovchi"
      oq: u.oq || "", // legacy
      car: u.car || "",
      carModel: u.carModel || u.model || "",
      carColor: u.carColor || u.color || "",
      carNumber: u.carNumber || u.number || u.plate || "",
      seatCount: u.seatCount || u.seats || u.seatCount || 0
    };
  } catch (err) {
    console.error("getUserInfo error:", err);
    return {
      phone: "", avatar: "",
      fullName: "", firstname: "", lastname: "", name: "",
      role: "", oq: "", car: "",
      carModel: "", carColor: "", carNumber: "",
      seatCount: 0
    };
  }
}

// ===============================
// AUTH CHECK — on load
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  // populate region filters & route selectors
  loadRegionsFilter();
  loadRouteFilters();
  // load ads
  await loadAllAds();
});

// ===============================
// LOAD REGION FILTER (for simple single-select filter)
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
// LOAD ROUTE FILTERS (fromRegion / toRegion selects + district boxes)
// call on init
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

  // clear
  fromRegion.innerHTML = `<option value="">Viloyat</option>`;
  toRegion.innerHTML = `<option value="">Viloyat</option>`;

  Object.keys(REGIONS).forEach(region => {
    const o1 = document.createElement("option");
    o1.value = region; o1.textContent = region; fromRegion.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = region; o2.textContent = region; toRegion.appendChild(o2);
  });

  fromRegion.onchange = fillFromDistricts;
  toRegion.onchange = fillToDistricts;

  // attach global handlers for filter triggering too
  const searchEl = document.getElementById("search");
  const roleEl = document.getElementById("filterRole");
  const regionEl = document.getElementById("filterRegion");

  if (searchEl) searchEl.oninput = () => triggerRender();
  if (roleEl) roleEl.onchange = () => triggerRender();
  if (regionEl) regionEl.onchange = () => triggerRender();
}

// small debounce to avoid many renders while selecting checkboxes
let renderTimeout = null;
function triggerRender() {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    // if we have cached ads, re-render; otherwise loadAllAds will call render after fetch
    if (window.__ADS_CACHE__) renderAds(window.__ADS_CACHE__);
  }, 120);
}

// ===============================
// fill district boxes
// ===============================
function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    const id = `from-${region}-${d}`.replace(/\s+/g, "-");
    const label = document.createElement("label");
    label.className = "district-item";
    label.innerHTML = `<input type="checkbox" value="${escapeHtml(d)}" class="fromDistrict"> ${escapeHtml(d)}`;
    box.appendChild(label);
  });

  // attach click listeners to all checkboxes to re-render
  box.querySelectorAll(".fromDistrict").forEach(cb => cb.onchange = triggerRender);
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");
  if (!box) return;
  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    const label = document.createElement("label");
    label.className = "district-item";
    label.innerHTML = `<input type="checkbox" value="${escapeHtml(d)}" class="toDistrict"> ${escapeHtml(d)}`;
    box.appendChild(label);
  });

  box.querySelectorAll(".toDistrict").forEach(cb => cb.onchange = triggerRender);
}

// ===============================
// LOAD ALL ADS (read once and cache) — then render
// ===============================
async function loadAllAds() {
  try {
    const snap = await get(ref(db, "ads"));
    const list = document.getElementById("adsList");

    if (!list) return;

    if (!snap.exists()) {
      list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
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

    // cache global for triggerRender usage
    window.__ADS_CACHE__ = ads;

    // initial attachment for route selects (if not already)
    // ensure from/to selects are populated
    if (!document.getElementById("fromRegion").children.length) loadRouteFilters();

    // attach basic inputs if not attached
    const searchEl = document.getElementById("search");
    const roleEl = document.getElementById("filterRole");
    const regionEl = document.getElementById("filterRegion");
    const fromRegion = document.getElementById("fromRegion");
    const toRegion = document.getElementById("toRegion");

    if (searchEl && !searchEl._attached) { searchEl.addEventListener("input", triggerRender); searchEl._attached = true; }
    if (roleEl && !roleEl._attached) { roleEl.addEventListener("change", triggerRender); roleEl._attached = true; }
    if (regionEl && !regionEl._attached) { regionEl.addEventListener("change", triggerRender); regionEl._attached = true; }
    if (fromRegion && !fromRegion._attached) { fromRegion.addEventListener("change", () => { fillFromDistricts(); triggerRender(); }); fromRegion._attached = true; }
    if (toRegion && !toRegion._attached) { toRegion.addEventListener("change", () => { fillToDistricts(); triggerRender(); }); toRegion._attached = true; }

    // final render
    renderAds(ads);
  } catch (err) {
    console.error("loadAllAds error:", err);
    const list = document.getElementById("adsList");
    if (list) list.innerHTML = "<p>Xatolik yuz berdi.</p>";
  }
}

// ===============================
// RENDER ADS (applies all filters: role, region, route, districts, search)
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";

  // current user info (for role-based filtering & hiding own ads)
  const currentUserId = auth.currentUser?.uid || null;
  const currentUser = currentUserId ? await getUserInfo(currentUserId) : null;
  // normalize role string to english-like tokens to compare
  let currentRole = (currentUser?.role || "").toString().toLowerCase();
  // map possible variants
  if (currentRole === "haydovchi" || currentRole === "driver") currentRole = "driver";
  else if (currentRole.includes("yo") || currentRole.includes("pass") || currentRole === "yo‘lovchi") currentRole = "passenger";
  else currentRole = ""; // unknown

  // route filters
  const fromRegion = (document.getElementById("fromRegion")?.value || "").trim();
  const toRegion = (document.getElementById("toRegion")?.value || "").trim();
  const fromDistricts = Array.from(document.querySelectorAll(".fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll(".toDistrict:checked")).map(x => x.value);

  // Filter function
  const filtered = ads.filter(a => {
    // hide own ad
    if (a.userId === currentUserId) return false;

    // role filter (current user sees only opposite-type ads)
    // If we have explicit currentRole, apply: driver sees Yo‘lovchi ads, passenger sees Haydovchi ads
    if (currentRole === "driver") {
      if ((a.type || "").toString().toLowerCase().indexOf("yo") === -1) return false; // not passenger
    } else if (currentRole === "passenger") {
      if ((a.type || "").toString().toLowerCase().indexOf("haydov") === -1) return false; // not driver
    }

    // UI role filter (manual dropdown) — if user selected a role in filter, respect that too
    if (roleFilter) {
      if (a.typeNormalized !== roleFilter) return false;
    }

    // simple region filter (single select on top)
    if (regionFilter && a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;

    // route filters (fromRegion/toRegion)
    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (toRegion && a.toRegion !== toRegion) return false;

    // district multi-selects (OR: ad's district must be included in selected list if any selected)
    if (fromDistricts.length > 0 && !fromDistricts.includes(a.fromDistrict)) return false;
    if (toDistricts.length > 0 && !toDistricts.includes(a.toDistrict)) return false;

    // search matching
    const hay = [
      a.fromRegion, a.fromDistrict, a.toRegion, a.toDistrict,
      a.comment, a.price, a.type, a.car, a.userId
    ].join(" ").toLowerCase();

    return hay.includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // Create cards (in parallel)
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(card => list.appendChild(card));
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
  // created short (omit year)
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "", { shortYear: true });

  // seats logic
  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;

  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  const carModel = u.carModel || u.car || "";

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

  // click opens modal
  div.onclick = () => openAdModal(ad);
  return div;
}

// ===============================
// OPEN FULL MODAL (full ad info)
// ensure modal div exists in HTML: <div id="adFullModal"></div>
// ===============================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  // fetch user info
  const u = await getUserInfo(ad.userId);

  // route + dep time + created
  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "", { shortYear: false });

  const fullname = u.fullName || `${u.firstname || ""} ${u.lastname || ""}`.trim() || u.name || "Foydalanuvchi";
  const carFull =
    `${u.carModel || u.car || ""}` +
    `${u.carColor ? " • " + u.carColor : ""}` +
    `${u.carNumber ? " • " + u.carNumber : ""}`;

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  // modal content — keep image sized and layout tidy
  modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true" style="max-width:760px;">
      <div class="modal-header">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar" style="width:72px;height:72px;">
        <div style="flex:1;">
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

      <div class="modal-actions" style="margin-top:18px;">
        <button class="btn-primary" id="modal-close-btn">Yopish</button>
        <button class="btn-ghost" id="modal-contact-btn">Qo'ng'iroq</button>
      </div>
    </div>
  `;

  // show modal
  modal.style.display = "flex";
  // click outside to close
  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };

  // attach buttons
  const closeBtn = modal.querySelector("#modal-close-btn");
  const contactBtn = modal.querySelector("#modal-contact-btn");
  if (closeBtn) closeBtn.onclick = closeAdModal;
  if (contactBtn) contactBtn.onclick = () => onContact(u.phone || "");
}

// make accessible from inline HTML if needed
window.closeAdModal = function () {
  const modal = document.getElementById("adFullModal");
  if (modal) modal.style.display = "none";
};

// ===============================
// onContact
// ===============================
window.onContact = (phone) => {
  if (!phone) return alert("Telefon raqami mavjud emas");
  // try to open tel:
  window.location.href = `tel:${phone}`;
};

// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);

// ===============================
// end of file
// ===============================
