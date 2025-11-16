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
// GET USER INFO (IMPORTANT FIX)
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "", firstname: "", lastname: "",
    name: "", carModel: "", carColor: "", carNumber: "", bookedSeats: 0
  };

  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return {
    phone: "", avatar: "", firstname: "", lastname: "",
    name: "", carModel: "", carColor: "", carNumber: "", bookedSeats: 0
  };

  const u = snap.val();

  return {
    phone: u.phone || "",
    avatar: u.avatar || "",
    firstname: u.firstname || "",
    lastname: u.lastname || "",
    name: `${u.firstname || ""} ${u.lastname || ""}`.trim(),   // ✅ FIXED
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
  if (!user) return (window.location.href = "login.html");

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
    list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  const ads = [];
  snap.forEach(c => ads.push({ id: c.key, ...c.val(), typeNormalized: normalizeType(c.val().type) }));

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);

  renderAds(ads);
}

// ===============================
// RENDER ADS
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;

  list.innerHTML = "";

  const q = document.getElementById("search").value.toLowerCase();
  const role = normalizeType(document.getElementById("filterRole").value);
  const region = document.getElementById("filterRegion").value;

  const filtered = ads.filter(a => {
    if (role && a.typeNormalized !== role) return false;
    if (region && a.fromRegion !== region && a.toRegion !== region) return false;

    const hay = `${a.fromRegion} ${a.fromDistrict} ${a.toRegion} ${a.toDistrict} ${a.comment} ${a.price}`.toLowerCase();
    return hay.includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

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

  const route = `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const dep = formatTime(ad.departureTime);

  const totalRaw = ad.totalSeats || ad.seatCount || ad.seats;
  const totalSeats = totalRaw ? Number(totalRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = totalSeats ? Math.max(totalSeats - booked, 0) : null;

  const reqSeats = ad.passengerCount || ad.requestedSeats || ad.peopleCount || null;

  const created = formatTime(ad.createdAt);

  div.innerHTML = `
    <img class="ad-avatar" src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}">

    <div class="ad-main">
      <div class="ad-route">${escapeHtml(route)}</div>
      <div class="ad-car">${escapeHtml(u.carModel || "")}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${escapeHtml(dep)}</div>

        ${
          totalSeats !== null
          ? `<div class="ad-chip">👥 ${available}/${totalSeats} bo‘sh</div>`
          : `<div class="ad-chip">👥 ${reqSeats} odam</div>`
        }
      </div>
    </div>

    <div class="ad-price">💰 ${escapeHtml(ad.price)} so‘m</div>
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

  const route = `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const dep = formatTime(ad.departureTime);
  const created = formatTime(ad.createdAt);

  const fullname = u.name || "Foydalanuvchi";   // ✅ FIXED
  const carFull = `${u.carModel}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  const totalRaw = ad.totalSeats || ad.seatCount || ad.seats;
  const totalSeats = totalRaw ? Number(totalRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = totalSeats ? Math.max(totalSeats - booked, 0) : null;

  const reqSeats = ad.passengerCount || ad.requestedSeats || ad.peopleCount || null;

  modal.innerHTML = `
    <div style="background:white;padding:25px;border-radius:14px;max-width:600px;width:95%">

      <div style="display:flex;gap:14px;align-items:center;margin-bottom:15px;">
        <img src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}" style="width:70px;height:70px;border-radius:12px">

        <div>
          <div style="font-size:20px;font-weight:600">${escapeHtml(fullname)}</div>
          <div style="color:#666">${escapeHtml(carFull)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Yo‘nalish</div>
          <div class="value">${escapeHtml(route)}</div>
        </div>
        <div class="modal-col">
          <div class="label">Jo‘nash vaqti</div>
          <div class="value">${escapeHtml(dep)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Joylar</div>
          <div class="value">
            ${
              totalSeats !== null
              ? `${totalSeats} ta (Bo‘sh: ${available})`
              : `Talab: ${reqSeats} odam`
            }
          </div>
        </div>
        <div class="modal-col">
          <div class="label">Narx</div>
          <div class="value">${escapeHtml(ad.price)} so‘m</div>
        </div>
      </div>

      <div class="label" style="margin-top:10px">Izoh</div>
      <div class="value">${escapeHtml(ad.comment || "-")}</div>

      <div class="label" style="margin-top:10px">Kontakt</div>
      <div class="value">${escapeHtml(u.phone)}</div>

      <div style="margin-top:12px;color:#777;font-size:13px">Joylashtirilgan: ${escapeHtml(created)}</div>

      <div class="modal-actions">
        <button class="btn-primary" onclick="closeAdModal()">Yopish</button>
        <button class="btn-ghost" onclick="onContact('${escapeHtml(u.phone)}')">Qo‘ng‘iroq</button>
      </div>

    </div>
  `;

  modal.style.display = "flex";
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
// ESCAPE HTML
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
