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
// Returns string like: "20 noyabr 2025, 18:48"
function formatTime(val) {
  if (!val) return "—";

  // If number (timestamp)
  if (typeof val === "number") return formatReal(new Date(val));

  // If Firebase RTDB stores JS timestamp as string number
  if (typeof val === "string" && /^\d+$/.test(val)) {
    return formatReal(new Date(Number(val)));
  }

  // Pattern: "2025 M11 20 18:48" or "2025 M11 20"
  if (typeof val === "string" && val.includes("M")) {
    const m = val.match(/(\d{4})\s*M(\d{1,2})\s*(\d{1,2})\s*([0-2]\d:[0-5]\d)?/);
    if (m) {
      const year = m[1], month = m[2], day = m[3], time = m[4] || "00:00";
      return formatReal(new Date(`${year}-${month}-${day}T${time}`));
    }
  }

  // ISO / normal JS-date parse
  const d = new Date(val);
  if (!isNaN(d)) return formatReal(d);

  // fallback: return as-is
  return String(val);
}

function formatReal(date) {
  const datePart = date.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const timePart = date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${datePart}, ${timePart}`;
}

// ===============================
// GET USER INFO (name, phone, avatar, car info)
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "", firstname: "", lastname: "",
    carModel: "", carColor: "", carNumber: ""
  };

  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return {
    phone: "", avatar: "", firstname: "", lastname: "",
    carModel: "", carColor: "", carNumber: ""
  };

  const u = snap.val();
  return {
    phone: u.phone || "",
    avatar: u.avatar || "",
    firstname: u.firstname || "",
    lastname: u.lastname || "",
    carModel: u.carModel || "",
    carColor: u.carColor || "",
    carNumber: u.carNumber || ""
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
// RENDER ADS (fixed to render all cards parallel)
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
// Includes: avatar, carModel, route, departureTime, seats, price (right), createdAt bottom-right
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time);
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  // car model only (no name in mini)
  const carModel = u.carModel || "";

  div.innerHTML = `
    <img class="ad-avatar" src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}" alt="avatar">

    <div class="ad-main">
      <div class="ad-car">${escapeHtml(carModel)}</div>
      <div class="ad-route">${escapeHtml(route)}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
        ${ad.seatCount ? `<div class="ad-chip">👥 ${escapeHtml(String(ad.seatCount))} joy</div>` : ""}
      </div>
    </div>

    <div class="ad-price">💰 ${escapeHtml(ad.price ? String(ad.price) : "-")} so‘m</div>

    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}

// ===============================
// MODAL (full) — contains name and full car info
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
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time);
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");
  const fullname = `${u.firstname || ""} ${u.lastname || ""}`.trim() || "Foydalanuvchi";
  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true">
      <div class="modal-header">
        <img class="modal-avatar" src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}" alt="avatar">
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
          <div class="label">Joy soni</div>
          <div class="value">${escapeHtml(ad.seatCount || "-")}</div>
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
  // on mobile this will attempt to call
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
  if (!str && str !== 0) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
