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
// REGIONS DATA
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
// DATE FORMATTER
// ===============================
function formatTime(val) {
  if (!val) return "—";

  if (typeof val === "number") {
    return new Date(val).toLocaleString("uz-UZ", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  }

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

// ===============================
// GET USER INFO
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "",
    fullName: "",
    carModel: "", carColor: "", carNumber: "",
    seatCount: 0,
    role: ""
  };

  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return {
    phone: "", avatar: "",
    fullName: "",
    carModel: "", carColor: "", carNumber: "",
    seatCount: 0,
    role: ""
  };

  const u = snap.val();
  return {
    phone: u.phone || "",
    avatar: u.avatar || "",
    fullName: u.fullName || "",
    carModel: u.carModel || "",
    carColor: u.carColor || "",
    carNumber: u.carNumber || "",
    seatCount: u.seatCount || 0,
    role: u.role || ""       // <<< MUHIM!
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
    el.innerHTML += `<option value="${region}">${region}</option>`;
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

  // Asl eventlar
  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);

  // === YANGI FILTR EVENTLARI ===
  document.getElementById("sortBy").onchange = () => renderAds(ads);
  document.getElementById("filterDate").onchange = () => renderAds(ads);
  document.getElementById("priceMin").oninput = () => renderAds(ads);
  document.getElementById("priceMax").oninput = () => renderAds(ads);

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

  const currentUserId = auth.currentUser?.uid;
  const currentUser = currentUserId ? await getUserInfo(currentUserId) : null;
  const currentRole = currentUser?.role || ""; // haydovchi / yolovchi

  const filtered = ads.filter(a => {

    // ============================
    // ROLE GA KO‘RA FILTR
    // ============================
    if (currentRole === "driver") {
      if (a.type?.toLowerCase() !== "yo‘lovchi") return false;
    }
    else if (currentRole === "passenger") {
      if (a.type?.toLowerCase() !== "haydovchi") return false;
    }

    if (a.userId === currentUserId) return false;

    // ============================
    // REGION
    // ============================
    if (
      regionFilter &&
      a.fromRegion !== regionFilter &&
      a.toRegion !== regionFilter
    ) return false;

    // ============================
    // QIDIRUV
    // ============================
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type
    ].join(" ").toLowerCase();

    if (!hay.includes(q)) return false;

    // ============================
    // YANGI FILTR 1 — NARX
    // ============================
    const minPrice = Number(document.getElementById("priceMin").value || 0);
    const maxPrice = Number(document.getElementById("priceMax").value || 999999999);

    if (a.price) {
      const p = Number(a.price);
      if (p < minPrice || p > maxPrice) return false;
    }

    // ============================
    // YANGI FILTR 2 — SANAGA KO‘RA
    // ============================
    const dateFilter = document.getElementById("filterDate").value;

    if (dateFilter) {
      const now = new Date();
      const adDate = new Date(a.departureTime);

      if (dateFilter === "today") {
        if (adDate.toDateString() !== now.toDateString()) return false;
      }

      if (dateFilter === "tomorrow") {
        const t = new Date(now); t.setDate(now.getDate() + 1);
        if (adDate.toDateString() !== t.toDateString()) return false;
      }

      if (dateFilter === "3days") {
        const limit = new Date(now); limit.setDate(now.getDate() + 3);
        if (adDate < now || adDate > limit) return false;
      }
    }

    return true;
  });

  // ============================
  // YANGI FILTR 3 — SARALASH
  // ============================
  const sortBy = document.getElementById("sortBy").value;

  filtered.sort((a, b) => {
    const da = new Date(a.createdAt || a.postedAt || 0).getTime();
    const db = new Date(b.createdAt || b.postedAt || 0).getTime();
    return sortBy === "newest" ? db - da : da - db;
  });

  // ============================
  // RENDER
  // ============================
  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(card => list.appendChild(card));
}

// ===============================
// MINI CARD
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  const route =
    `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ` +
    `${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "", { shortYear: true });

  const totalSeats = Number(ad.totalSeats || ad.seatCount || ad.seats || 0);
  const booked = Number(ad.bookedSeats || 0);
  const available = totalSeats ? Math.max(totalSeats - booked, 0) : null;

  const requested = Number(ad.passengerCount || ad.requestedSeats || ad.peopleCount || 0);

  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" />

    <div class="ad-main">
      <div class="ad-route">${escapeHtml(route)}</div>
      <div class="ad-car">${escapeHtml(u.carModel || "")}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
        ${
          totalSeats ?
            `<div class="ad-chip">👥 ${available}/${totalSeats} bo‘sh</div>`
            :
            (requested ? `<div class="ad-chip">👥 ${requested} odam</div>` : "")
        }
      </div>
    </div>

    <div class="ad-price">💰 ${escapeHtml(ad.price || "-")} so‘m</div>

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
  const fullname = u.fullName || "Foydalanuvchi";

  const route =
    `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ` +
    `${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");

  const totalSeats = Number(ad.totalSeats || ad.seatCount || ad.seats || 0);
  const booked = Number(ad.bookedSeats || 0);
  const available = totalSeats ? Math.max(totalSeats - booked, 0) : null;

  const requested = Number(ad.passengerCount || ad.requestedSeats || ad.peopleCount || 0);

  modal.innerHTML = `
    <div class="ad-modal-box">
      <div class="modal-header">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}">
        <div>
          <div class="modal-name">${escapeHtml(fullname)}</div>
          <div class="modal-car">
            ${escapeHtml(u.carModel || "")}
            ${u.carColor ? " • " + escapeHtml(u.carColor) : ""}
            ${u.carNumber ? " • " + escapeHtml(u.carNumber) : ""}
          </div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Yo‘nalish</div>
          <div class="value">${escapeHtml(route)}</div>
        </div>
        <div class="modal-col">
          <div class="label">Jo‘nash</div>
          <div class="value">${escapeHtml(depTime)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Joylar</div>
          <div class="value">
            ${
              totalSeats
                ? `${available}/${totalSeats} bo‘sh`
                : (requested ? `${requested} odam` : "-")
            }
          </div>
        </div>

        <div class="modal-col">
          <div class="label">Narx</div>
          <div class="value">${escapeHtml(ad.price || "-")} so‘m</div>
        </div>
      </div>

      <div style="margin-top:12px">
        <div class="label">Izoh</div>
        <div class="value">${escapeHtml(ad.comment || "-")}</div>
      </div>

      <div style="margin-top:12px">
        <div class="label">Aloqa</div>
        <div class="value">${escapeHtml(u.phone || "-")}</div>
      </div>

      <div style="margin-top:12px; font-size:13px; color:#777;">
        Joylashtirilgan: ${escapeHtml(created)}
      </div>

      <div class="modal-actions">
        <button class="btn-primary" onclick="closeAdModal()">Yopish</button>
        <button class="btn-ghost" onclick="onContact('${escapeHtml(u.phone || "")}')">Qo‘ng‘iroq</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

// ===============================
// CLOSE MODAL
// ===============================
window.closeAdModal = () => {
  const modal = document.getElementById("adFullModal");
  if (modal) modal.style.display = "none";
};

// ===============================
// CONTACT
// ===============================
window.onContact = (phone) => {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
};

// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);

// ===============================
// ESCAPE HTML
// ===============================
function escapeHtml(str) {
  if (str === 0) return "0";
  if (!str && str !== 0) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
