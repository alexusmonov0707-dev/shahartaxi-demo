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
//  REGIONS DATA
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
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  let s = String(val).trim();
  s = s.replace(/\bM(\d{1,2})\b/, "-$1-");

  const d = new Date(s);
  if (!isNaN(d)) {
    return d.toLocaleString("uz-UZ", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  return val;
}


// ===============================
// USER INFO FETCHING
// ===============================
async function getUserInfo(userId) {
  if (!userId) return { phone: "", avatar: "" };

  const snap = await get(ref(db, "users/" + userId));
  if (!snap.exists()) return { phone: "", avatar: "" };

  const v = snap.val();
  return {
    phone: v.phone || "",
    avatar: v.avatar || ""
  };
}


// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
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
  snap.forEach(child => {
    const v = child.val();
    ads.push({
      id: child.key,
      ...v,
      typeNormalized: normalizeType(v.type)
    });
  });

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);

  renderAds(ads);
}


// ===============================
// RENDER ADS
// ===============================
function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const q = document.getElementById("search").value.toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole").value);
  const regionFilter = document.getElementById("filterRegion").value;

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

  filtered.forEach(a => list.appendChild(createAdCard(a)));
}


// ===============================
// CREATE AD CARD
// ===============================
function createAdCard(ad) {
  const div = document.createElement("div");
  div.className = "ad-card";

  const route = `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const time = formatTime(ad.departureTime || ad.startTime);

  div.innerHTML = `
    <div class="ad-header">
      <div class="ad-type">${escapeHtml(ad.typeNormalized)}</div>
      <div class="ad-chip">${escapeHtml(ad.price ? ad.price + " so‘m" : "-")}</div>
    </div>

    <div class="ad-route">${escapeHtml(route)}</div>

    <div class="ad-info">
      <div><span class="icon">⏰</span>${escapeHtml(time)}</div>
      ${ad.seatCount ? `<div><span class="icon">👥</span>${ad.seatCount} joy</div>` : ""}
    </div>
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
    modal.style = `
      position:fixed; inset:0;
      background:rgba(0,0,0,0.6);
      display:flex; justify-content:center; align-items:center;
      z-index:9999;
    `;
    document.body.appendChild(modal);
  }

  const userInfo = await getUserInfo(ad.userId);
  const route = `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const time = formatTime(ad.departureTime || ad.startTime);
  const created = formatTime(ad.createdAt);

  modal.innerHTML = `
    <div style="background:white;padding:20px;border-radius:14px;max-width:520px;width:92%">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">
        <img src="${userInfo.avatar || "https://i.ibb.co/2W0z7Lx/user.png"}"
             style="width:60px;height:60px;border-radius:10px;object-fit:cover;">
        <h3 style="margin:0;color:#0069d9">${escapeHtml(ad.typeNormalized)}</h3>
      </div>

      <p><b>Yo‘nalish:</b><br>${escapeHtml(route)}</p>
      <p><b>Jo‘nash vaqti:</b><br>${escapeHtml(time)}</p>
      <p><b>Narx:</b> ${escapeHtml(ad.price ? ad.price + " so‘m" : "-")}</p>
      <p><b>Qo‘shimcha:</b><br>${escapeHtml(ad.comment || "-")}</p>
      <p><b>Kontakt:</b> ${escapeHtml(userInfo.phone || "-")}</p>
      <p style="color:#777;font-size:13px"><small>Joylashtirilgan: ${escapeHtml(created)}</small></p>

      <button onclick="closeAdModal()" 
              style="width:100%;margin-top:14px;padding:10px;background:#444;color:#fff;border:none;border-radius:8px">
        Yopish
      </button>
    </div>
  `;

  modal.style.display = "flex";
}

window.closeAdModal = function () {
  const modal = document.getElementById("adFullModal");
  if (modal) modal.style.display = "none";
};


// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);


// ===============================
// HTML ESCAPE
// ===============================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
