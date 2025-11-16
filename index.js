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
const REGIONS = window.regionsData || {};


// ===============================
// DATE FORMATTER — chiroyli ko‘rinish
// ===============================
function formatTime(val) {
  if (!val) return "—";

  const d = new Date(val);
  if (isNaN(d)) return val;

  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


// ===============================
// USER INFO (name, phone, avatar, car info)
// ===============================
async function getUserInfo(userId) {
  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return {
    phone: "",
    avatar: "",
    name: "",
    carModel: "",
    carColor: "",
    carNumber: ""
  };

  const u = snap.val();
  return {
    phone: u.phone || "",
    avatar: u.avatar || "",
    name: (u.firstname || "") + " " + (u.lastname || ""),
    carModel: u.carModel || "",
    carColor: u.carColor || "",
    carNumber: u.carNumber || ""
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
// FILTER REGION GENERATOR
// ===============================
function loadRegionsFilter() {
  const el = document.getElementById("filterRegion");
  el.innerHTML = '<option value="">Viloyat (filter)</option>';

  Object.keys(REGIONS).forEach(region => {
    el.innerHTML += `<option value="${region}">${region}</option>`;
  });
}


// ===============================
// LOAD ALL ADS — BUG FIXED (full list now)
// ===============================
async function loadAllAds() {
  const snap = await get(ref(db, "ads"));
  const list = document.getElementById("adsList");

  if (!snap.exists()) {
    list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  const ads = [];
  snap.forEach(c => ads.push({ id: c.key, ...c.val() }));

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);

  renderAds(ads);
}


// ===============================
// MAIN RENDER
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const q = document.getElementById("search").value.toLowerCase();
  const region = document.getElementById("filterRegion").value;

  const filtered = ads.filter(a => {
    if (region && a.fromRegion !== region && a.toRegion !== region) return false;
    const hay = `${a.fromRegion} ${a.fromDistrict} ${a.toRegion} ${a.toDistrict} ${a.comment} ${a.price}`.toLowerCase();
    return hay.includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  for (const ad of filtered) list.appendChild(await createAdCard(ad));
}


// ===============================
// CARD — avatar + full info qo‘shildi
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);
  const div = document.createElement("div");
  div.className = "ad-card";

  const route =
    `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ` +
    `${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const time = formatTime(ad.departureTime);

  div.innerHTML = `
    <div class="ad-left">
      <img src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}" />
    </div>

    <div class="ad-right">
      
      <div class="ad-header">
        <div class="ad-type">${escapeHtml(u.name || "Foydalanuvchi")}</div>
        <div class="ad-time">${escapeHtml(time)}</div>
      </div>

      <div class="ad-route">${escapeHtml(route)}</div>

      <div class="ad-info">
        <div class="ad-chip"><span class="icon">💰</span>${ad.price} so‘m</div>
        ${ad.seatCount ? `<div class="ad-chip"><span class="icon">👥</span>${ad.seatCount} joy</div>` : ""}
        ${u.carModel ? `<div class="ad-chip"><span class="icon">🚗</span>${u.carModel}</div>` : ""}
      </div>

    </div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}


// ===============================
// MODAL (FULL DETAILS)
// ===============================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    modal.style = `
      position:fixed; inset:0; background:rgba(0,0,0,0.6);
      display:flex;justify-content:center;align-items:center;z-index:9999;
    `;
    document.body.appendChild(modal);
  }

  const u = await getUserInfo(ad.userId);

  const created = formatTime(ad.createdAt);
  const time = formatTime(ad.departureTime);

  const route =
    `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ` +
    `${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  modal.innerHTML = `
    <div style="background:white;padding:20px;border-radius:14px;max-width:520px;width:92%">
    
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px">
        <img src="${u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}"
             style="width:70px;height:70px;border-radius:12px;object-fit:cover;">
        <div>
          <div style="font-size:18px;font-weight:bold">${escapeHtml(u.name)}</div>
          <div style="color:#666;font-size:14px">
            ${u.carModel ? u.carModel + " • " : ""} 
            ${u.carColor ? u.carColor + " • " : ""}
            ${u.carNumber || ""}
          </div>
        </div>
      </div>

      <p><b>Yo‘nalish:</b><br>${escapeHtml(route)}</p>
      <p><b>Jo‘nash vaqti:</b><br>${escapeHtml(time)}</p>
      <p><b>Joy soni:</b> ${ad.seatCount || "-"}</p>
      <p><b>Narx:</b> ${ad.price || "-"} so‘m</p>
      <p><b>Izoh:</b><br>${escapeHtml(ad.comment || "-")}</p>
      <p><b>Aloqa:</b> ${escapeHtml(u.phone || "-")}</p>
      <p style="color:#777;font-size:13px"><small>Joylangan: ${escapeHtml(created)}</small></p>

      <button onclick="closeAdModal()"
        style="width:100%;padding:12px;background:#444;color:white;border:none;border-radius:10px;margin-top:12px">
        Yopish
      </button>
    </div>
  `;

  modal.style.display = "flex";
}

window.closeAdModal = () => {
  const m = document.getElementById("adFullModal");
  if (m) m.style.display = "none";
};


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);


// ===============================
// HTML ESCAPE
// ===============================
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
