// index.js (module)
// To'liq funksional — qo'ygan index.html bilan mos

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// --- Firebase config (sizning config) ---
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

// --- yordamchi: viloyat obyekti (regions.js turlicha nom bilan export qilishi mumkin) ---
const REGIONS = window.regionsData || window.regions || {};

// --- yordamchi: turli quote/apostrophe va kichik/katta farqlarni birlashtirish uchun ---
function normalizeType(t) {
  if (!t) return "";
  // normalizatsiya: o'zgaruvchi apostroflar va inglizcha so'zlarni bir xilligicha qaytarish
  t = String(t).trim().toLowerCase();
  // o‘zbek apostrof variantlarini almashtiramiz
  t = t.replace(/[‘’`ʼ']/g, "'"); // unify to simple apostrophe
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "driver" || t === "haydovchi") return "Haydovchi";
  if (t === "passenger" || t === "yo'lovchi" || t === "yo‘lovchi" || t === "yolovchi") return "Yo‘lovchi";
  // default: capitalize first
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// --- vaqtni formatlash: turli formatlarni qamrab oladi ---
function formatTime(raw) {
  if (!raw) return "—";

  // agar epoch number kiritilgan bo'lsa
  if (typeof raw === "number") {
    const d = new Date(raw);
    if (!isNaN(d)) return d.toLocaleString("uz-UZ", datetimeOptions());
  }

  // raw oddiy string bo'lsa: tozalash / common conversions
  let s = String(raw).trim();

  // handle case like "2025 M11 17 14:36" -> "2025-11-17 14:36"
  // replace " M11 " or " M9 " patterns:
  s = s.replace(/\bM(\d{1,2})\b/, "-$1-");
  // if there are multiple spaces, collapse
  s = s.replace(/\s+/g, " ").replace(/[-\s]+(\d{2}:\d{2})$/, " $1");

  // sometimes Firebase stores ISO like '2025-11-20T14:30' -> direct parse
  let d = new Date(s);
  if (!isNaN(d)) return d.toLocaleString("uz-UZ", datetimeOptions());

  // try replacing space between date and time with 'T'
  d = new Date(s.replace(" ", "T"));
  if (!isNaN(d)) return d.toLocaleString("uz-UZ", datetimeOptions());

  // fallback: return original string
  return s;
}
function datetimeOptions(){
  return {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  };
}

// --- AUTH state: agar user yo'q -> login.html ga qaytaradi ---
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  // yuklashlar
  loadRegionsFilter();
  loadAllAds();
});

// --- Viloyat filterni to'ldirish ---
function loadRegionsFilter() {
  const filterRegion = document.getElementById("filterRegion");
  if (!filterRegion) return;
  filterRegion.innerHTML = '<option value="">Viloyat (filter)</option>';

  Object.keys(REGIONS).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    filterRegion.appendChild(opt);
  });
}

// --- barcha e'lonlarni olish va renderlash ---
async function loadAllAds() {
  try {
    const adsRef = ref(db, "ads");
    const snap = await get(adsRef);

    const list = document.getElementById("adsList");
    if (!list) return;

    list.innerHTML = "";

    if (!snap.exists()) {
      list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
      return;
    }

    // jamlab massivga solamiz
    const ads = [];
    snap.forEach(child => {
      const val = child.val();
      // tag: ba'zi yozuvlarda type maydoni notekis bo'lishi mumkin — normalize qilamiz
      const type = normalizeType(val.type || val.userType || val.role || "");
      ads.push({ id: child.key, ...val, typeNormalized: type });
    });

    // init filter eventlar
    const searchEl = document.getElementById("search");
    const roleEl = document.getElementById("filterRole");
    const regionEl = document.getElementById("filterRegion");

    if (searchEl) searchEl.oninput = () => renderAds(ads);
    if (roleEl) roleEl.onchange = () => renderAds(ads);
    if (regionEl) regionEl.onchange = () => renderAds(ads);

    // dastlab render
    renderAds(ads);
  } catch (err) {
    console.error("loadAllAds error:", err);
    const list = document.getElementById("adsList");
    if (list) list.innerHTML = "<p>Xatolik yuz berdi. Konsolni tekshiring.</p>";
  }
}

// --- filtrlab chiqarish va DOM tayyorlash ---
function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase().trim();
  const roleFilterRaw = document.getElementById("filterRole")?.value || "";
  const regionFilter = document.getElementById("filterRegion")?.value || "";

  // normalize role filter to same canonical values we use
  const roleFilter = normalizeType(roleFilterRaw);

  const filtered = ads.filter(a => {
    // a.typeNormalized holds canonical "Haydovchi" / "Yo‘lovchi" or generic
    if (roleFilter && a.typeNormalized !== roleFilter) return false;

    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }

    if (q) {
      const hay = [
        a.fromRegion, a.fromDistrict, a.toRegion, a.toDistrict,
        a.comment, a.price, a.type, a.typeNormalized, a.userId
      ].map(x => (x || "").toString().toLowerCase()).join(" ");
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // limit: agar kerak bo'lsa, pastga limit qo'yish mumkin. Hozir hammasi ko'rsatiladi.
  filtered.forEach(ad => {
    list.appendChild(createAdCard(ad));
  });
}

// --- karta yaratish ---
function createAdCard(ad) {
  const div = document.createElement("div");
  div.className = "ad-card";

  // chiroyli yo'nalish
  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  // departureTime could be saved under different keys:
  const rawTime = ad.departureTime || ad.startTime || ad.time || ad.createdAt || "";
  const formattedTime = (rawTime === ad.createdAt && typeof rawTime === "number") ? new Date(rawTime).toLocaleString("uz-UZ", datetimeOptions()) : formatTime(rawTime);

  // small chips (narx, seats)
  const priceText = ad.price ? `${ad.price} so‘m` : "Narx ko‘rsatilmagan";
  const seatText = ad.seatCount ? `${ad.seatCount} joy` : (ad.passengerCount ? `${ad.passengerCount} o‘rindiq so‘ralgan` : "");

  div.innerHTML = `
    <div class="ad-header">
      <div class="ad-type">${escapeHtml(ad.typeNormalized || ad.type || "")}</div>
      <div class="ad-chip">${escapeHtml(priceText)}</div>
    </div>

    <div class="ad-route">${escapeHtml(route)}</div>

    <div class="ad-info">
      <div><span class="icon">⏰</span> ${escapeHtml(formattedTime)}</div>
      ${seatText ? `<div><span class="icon">👥</span> ${escapeHtml(seatText)}</div>` : ""}
      ${ad.userName ? `<div><span class="icon">👤</span> ${escapeHtml(ad.userName)}</div>` : ""}
    </div>
  `;

  // click -> open modal with full details
  div.addEventListener("click", () => openAdModal(ad));

  return div;
}

// --- modal: to'liq e'lon ---
function openAdModal(ad) {
  // remove old modal if exist
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

  const rawTime = ad.departureTime || ad.startTime || ad.time || ad.createdAt || "";
  const formattedTime = (rawTime === ad.createdAt && typeof rawTime === "number") ? new Date(rawTime).toLocaleString("uz-UZ", datetimeOptions()) : formatTime(rawTime);

  const ownerPhone = ad.ownerPhone || ad.phone || ad.userPhone || "";
  const createdAtLabel = ad.createdAt ? (typeof ad.createdAt === "number" ? new Date(ad.createdAt).toLocaleString("uz-UZ") : formatTime(ad.createdAt)) : "—";

  modal.innerHTML = `
    <div style="background:white;padding:18px;border-radius:12px;max-width:520px;width:94%;box-shadow:0 8px 28px rgba(0,0,0,0.15)">
      <h3 style="margin:0 0 8px;color:#0069d9">${escapeHtml(ad.typeNormalized || ad.type || "")}</h3>

      <p style="margin:6px 0"><strong>Yo'nalish:</strong><br>${escapeHtml(ad.fromRegion || "")} ${ad.fromDistrict ? ', '+escapeHtml(ad.fromDistrict) : ''} → ${escapeHtml(ad.toRegion || "")} ${ad.toDistrict ? ', '+escapeHtml(ad.toDistrict) : ''}</p>

      <p style="margin:6px 0"><strong>Jo'nash vaqti:</strong><br>${escapeHtml(formattedTime)}</p>

      <p style="margin:6px 0"><strong>Narx:</strong> ${escapeHtml(ad.price ? ad.price + " so‘m" : "-")}</p>

      <p style="margin:6px 0"><strong>Qo‘shimcha:</strong><br>${escapeHtml(ad.comment || "-")}</p>

      <p style="margin:6px 0;color:#666"><small>Joylashtirilgan vaqti: ${escapeHtml(createdAtLabel)}</small></p>

      <p style="margin:6px 0"><strong>Kontakt:</strong> ${escapeHtml(ownerPhone || "-")}</p>

      <div style="display:flex;gap:8px;margin-top:12px">
        <button id="closeAdBtn" style="flex:1;background:#444;color:#fff;padding:10px;border-radius:8px;border:none;cursor:pointer">Yopish</button>
      </div>
    </div>
  `;
  modal.style.display = "flex";

  document.getElementById("closeAdBtn").onclick = () => { modal.style.display = "none"; };
}

window.closeAdModal = function() {
  const modal = document.getElementById("adFullModal");
  if (modal) modal.style.display = "none";
};

// --- logout ---
window.logout = () => signOut(auth);

// --- minimal helper: escape HTML to avoid injection ---
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
