// ===============================
// FIREBASE INIT
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

const REGIONS = window.regionsData || window.regions || {};


// ===============================
// TYPE NORMALIZE (HAYDOVCHI ↔ YO‘LOVCHI)
// ===============================
function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase();
  t = t.replace(/[‘’`ʼ']/g, "'");

  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";

  if (t === "driver") return "Haydovchi";
  if (t === "passenger") return "Yo‘lovchi";
  if (t === "yo'lovchi" || t === "yolovchi") return "Yo‘lovchi";

  return t.charAt(0).toUpperCase() + t.slice(1);
}


// ===============================
// TIME FORMAT
// ===============================
function formatTime(raw) {
  if (!raw) return "—";

  if (typeof raw === "number") {
    const d = new Date(raw);
    return !isNaN(d) ? d.toLocaleString("uz-UZ") : "—";
  }

  let s = String(raw).trim();
  s = s.replace(/\bM(\d{1,2})\b/, "-$1-").replace(/\s+/g, " ");
  let d = new Date(s);
  if (!isNaN(d)) return d.toLocaleString("uz-UZ");

  d = new Date(s.replace(" ", "T"));
  if (!isNaN(d)) return d.toLocaleString("uz-UZ");

  return s;
}


// ===============================
// AUTH CHECK
// ===============================
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  loadRegionsFilter();
  loadAllAds();
});


// ===============================
// VILOYAT FILTER YUKLASH
// ===============================
function loadRegionsFilter() {
  const filterRegion = document.getElementById("filterRegion");
  filterRegion.innerHTML = '<option value="">Viloyat (filter)</option>';
  Object.keys(REGIONS).forEach(r => {
    filterRegion.innerHTML += `<option value="${r}">${r}</option>`;
  });
}


// ===============================
// BARCHA E’LONLARNI FIREBASE DAN YUKLASH
// ===============================
async function loadAllAds() {
  const adsRef = ref(db, "ads");
  const snap = await get(adsRef);

  const list = document.getElementById("adsList");
  list.innerHTML = "";

  if (!snap.exists()) {
    list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  const ads = [];

  snap.forEach(child => {
    const val = child.val();

    const normType = normalizeType(
      val.type ||
      val.userType ||
      val.role ||
      ""
    );

    ads.push({
      id: child.key,
      ...val,
      typeNormalized: normType
    });
  });

  document.getElementById("search").oninput = () => renderAds(ads);
  document.getElementById("filterRole").onchange = () => renderAds(ads);
  document.getElementById("filterRegion").onchange = () => renderAds(ads);

  renderAds(ads);
}


// ===============================
// FILTER + CHIZISH
// ===============================
function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const q = (document.getElementById("search").value || "").toLowerCase();
  const role = normalizeType(document.getElementById("filterRole").value);
  const region = document.getElementById("filterRegion").value;

  const filtered = ads.filter(ad => {
    if (role && ad.typeNormalized !== role) return false;

    if (region) {
      if (ad.fromRegion !== region && ad.toRegion !== region) return false;
    }

    if (q) {
      const text = `
        ${ad.fromRegion} ${ad.fromDistrict}
        ${ad.toRegion} ${ad.toDistrict}
        ${ad.comment} ${ad.price}
      `.toLowerCase();

      if (!text.includes(q)) return false;
    }
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  filtered.forEach(ad => list.appendChild(createAdCard(ad)));
}


// ===============================
// MINI CARD YARATISH (Variant B)
// ===============================
function createAdCard(ad) {
  const div = document.createElement("div");
  div.className = "ad-card";

  const avatar =
    ad.avatar ||
    ad.userAvatar ||
    "https://raw.githubusercontent.com/rahmadiana/default-images/main/user-default.png";

  const route = `${ad.fromRegion}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → 
                 ${ad.toRegion}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const time = formatTime(ad.departureTime || ad.startTime);

  const price = ad.price ? `${ad.price} so‘m` : "Narx yo‘q";

  const seats =
    ad.seatCount
      ? `${ad.seatCount} joy`
      : ad.passengerCount
        ? `${ad.passengerCount} o‘rindiq`
        : "";

  div.innerHTML = `
    <div class="ad-left">
      <img src="${avatar}">
    </div>

    <div class="ad-right">

      <div class="ad-header">
        <div class="ad-type">${ad.typeNormalized}</div>
        <div class="ad-chip">${price}</div>
      </div>

      <div class="ad-route">${route}</div>

      <div class="ad-info">
        <div><span class="icon">⏰</span> ${time}</div>
        ${seats ? `<div><span class="icon">👥</span> ${seats}</div>` : ""}
      </div>
    </div>
  `;

  div.onclick = () => openAdModal(ad);

  return div;
}


// ===============================
// FULL MODAL
// ===============================
function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    modal.style = `
      position:fixed; inset:0; background:rgba(0,0,0,0.6);
      display:flex; justify-content:center; align-items:center; z-index:9999;
    `;
    document.body.appendChild(modal);
  }

  const time = formatTime(ad.departureTime || ad.startTime);
  const phone = ad.ownerPhone || ad.phone || ad.userPhone || "—";

  modal.innerHTML = `
    <div style="background:white;padding:20px;border-radius:12px;
                max-width:520px;width:94%;box-shadow:0 8px 28px rgba(0,0,0,.15)">
      
      <h3 style="margin-top:0;color:#0069d9">${ad.typeNormalized}</h3>

      <p><strong>Yo'nalish:</strong><br>
      ${ad.fromRegion}, ${ad.fromDistrict || ""} → 
      ${ad.toRegion}, ${ad.toDistrict || ""}</p>

      <p><strong>Jo'nash vaqti:</strong><br>${time}</p>

      <p><strong>Narx:</strong> ${ad.price ? ad.price+" so‘m" : "-"}</p>

      <p><strong>Izoh:</strong><br>${ad.comment || "-"}</p>

      <p><strong>Kontakt:</strong> ${phone}</p>

      <button onclick="closeAdModal()" 
      style="width:100%;padding:10px;border:none;border-radius:8px;
      background:#444;color:#fff;margin-top:12px">Yopish</button>
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
// HELPER
// ===============================
function escape(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
