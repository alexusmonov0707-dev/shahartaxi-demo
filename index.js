alert("Yangi JS yuklandi!");

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
const REGIONS = window.regionsData || window.regions || {};
// ===============================

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
// formatTime(val, { shortYear: false|true })
// - shortYear=true -> omit year in date part (used for createdAt mini)
function formatTime(val, opts = {}) {
  if (!val) return "—";
  const short = !!opts.shortYear;

  // If number (timestamp)
  if (typeof val === "number") return formatReal(new Date(val), short);

  // If numeric string timestamp
  if (typeof val === "string" && /^\d+$/.test(val)) {
    return formatReal(new Date(Number(val)), short);
  }

  // Pattern: "2025 M11 20 18:48" or "2025 M11 20, 18:48" or "2025-11-15T09:24"
  if (typeof val === "string") {
    // handle "2025 M11 20 18:48" and with comma
    if (/M\d{1,2}/.test(val)) {
      const m = String(val).match(/(\d{4})\s*M(\d{1,2})\s*(\d{1,2})\s*([0-2]?\d:[0-5]\d)?/);
      if (m) {
        const year = m[1], month = m[2].padStart(2, "0"), day = m[3].padStart(2, "0"), time = m[4] || "00:00";
        const d = new Date(`${year}-${month}-${day}T${time}`);
        if (!isNaN(d)) return formatReal(d, short);
      }
    }

    // handle ISO-like and "YYYY-MM-DDTHH:MM" and "YYYY-MM-DD HH:MM"
    const iso = new Date(val);
    if (!isNaN(iso)) return formatReal(iso, short);

    // fallback parse formats like "2025 11 20 18:48" or "2025-11-20 18:48"
    const m2 = String(val).match(/(\d{4})[^\d]{1,3}(\d{1,2})[^\d]{1,3}(\d{1,2})\s*([0-2]?\d:[0-5]\d)?/);
    if (m2) {
      const year = m2[1], month = m2[2].padStart(2, "0"), day = m2[3].padStart(2, "0"), time = m2[4] || "00:00";
      const d2 = new Date(`${year}-${month}-${day}T${time}`);
      if (!isNaN(d2)) return formatReal(d2, short);
    }
  }

  // last resort
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
    // remove year if present
    const parts = datePart.split(" ");
    if (parts.length && /\d{4}/.test(parts[parts.length - 1])) parts.pop();
    return `${parts.join(" ")} , ${timePart}`.replace(/\s+,/, ",");
  }

  return `${datePart}, ${timePart}`;
}

// ===============================
// GET USER INFO (name, phone, avatar, car info)
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "", firstname: "", lastname: "",
    carModel: "", carColor: "", carNumber: "", bookedSeats: 0
  };

  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return {
    phone: "", avatar: "", firstname: "", lastname: "",
    carModel: "", carColor: "", carNumber: "", bookedSeats: 0
  };

  const u = snap.val();
  return {
    phone: u.phone || "",
    avatar: u.avatar || "",
    firstname: u.firstname || "",
    lastname: u.lastname || "",
    carModel: u.carModel || "",
    carColor: u.carColor || "",
    carNumber: u.carNumber || "",
    bookedSeats: u.bookedSeats || 0
  };
}

// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  loadRegionsFilter();
  loadAllAds();
});

// ===============================
// LOAD REGION FILTER
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

  // attach handlers
  const searchEl = document.getElementById("search");
  const roleEl = document.getElementById("filterRole");
  const regionEl = document.getElementById("filterRegion");

  if (searchEl) searchEl.oninput = () => renderAds(ads);
  if (roleEl) roleEl.onchange = () => renderAds(ads);
  if (regionEl) regionEl.onchange = () => renderAds(ads);

  renderAds(ads);
}

// ===============================
// RENDER ADS
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const regionFilter = document.getElementById("filterRegion")?.value || "";

  const filtered = ads.filter(a => {
    if (roleFilter && a.typeNormalized !== roleFilter) return false;
    if (regionFilter && a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;

    const hay = [
      a.fromRegion, a.fromDistrict, a.toRegion, a.toDistrict,
      a.comment, a.price, a.type
    ].join(" ").toLowerCase();

    return hay.includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // create cards in parallel (fix for only-one-card bug)
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(card => list.appendChild(card));
}

// ===============================
// CREATE AD CARD (mini) — ISM BO‘LMAYDI
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  // createdAt short (omit year) as user chose variant B
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "", { shortYear: true });

  // seats logic:
  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;

  // passenger requested seats:
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
        ${ totalSeats !== null ? `<div class="ad-chip">👥 ${escapeHtml(String(available))}/${escapeHtml(String(totalSeats))} bo‘sh</div>` :
          (requested !== null ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>` : "") }
      </div>
    </div>

    <div class="ad-price">💰 ${escapeHtml(ad.price ? String(ad.price) : "-")} so‘m</div>

    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}

// ===============================
// MODAL (full) — contains name and full car info, seats details
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
  const fullname = `${u.firstname || ""} ${u.lastname || ""}`.trim() || "Foydalanuvchi";
  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  // seats details
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
            ${ totalSeats !== null ? `${escapeHtml(String(totalSeats))} ta (Bo‘sh: ${escapeHtml(String(available))})` :
               (requested !== null ? `Talab: ${escapeHtml(String(requested))} odam` : "-") }
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

      <div style="margin-top:12px; color:#88919a; font-size:13px;">
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

// simple contact action
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
