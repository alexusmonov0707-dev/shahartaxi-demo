// index.js (to'liq, professional, HTML: final variant bilan mos)
// Import Firebase (ES modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// --- Firebase config (o'zingizniki bilan almashtiring agar kerak bo'lsa) ---
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

// --- Regions object (regions.js orqali globalga qo'yilgan) ---
const REGIONS = window.regionsData || window.regions || {};

// ----------------- Helper functions -----------------
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Normalize type values to canonical "Haydovchi" / "Yo‘lovchi"
function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase();
  t = t.replace(/[‘’`ʼ']/g, "'"); // unify apostrophes
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "driver" || t === "haydovchi") return "Haydovchi";
  if (t === "passenger" || t === "passenger" || t === "yolovchi") return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Datetime formatting: robust to various input formats
function datetimeOptions() {
  return { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
}
function formatTime(raw) {
  if (!raw) return "—";

  // If epoch number in ms
  if (typeof raw === "number") {
    const d = new Date(raw);
    if (!isNaN(d)) return d.toLocaleString("uz-UZ", datetimeOptions());
    return String(raw);
  }

  let s = String(raw).trim();

  // handle "2025 M11 17 14:36" style -> convert Mxx to -xx-
  s = s.replace(/\bM(\d{1,2})\b/g, "-$1-");
  // collapse multiple spaces
  s = s.replace(/\s+/g, " ");

  // try direct parse
  let d = new Date(s);
  if (!isNaN(d)) return d.toLocaleString("uz-UZ", datetimeOptions());

  // try replace last space before time with 'T'
  d = new Date(s.replace(/(\d{4}[-\d]*)\s+(\d{2}:\d{2})/, "$1T$2"));
  if (!isNaN(d)) return d.toLocaleString("uz-UZ", datetimeOptions());

  // fallback: return original trimmed string
  return s;
}

// Fetch single user (phone, avatar, name, car) safely
async function fetchUser(userId) {
  if (!userId) return { phone: "", avatar: "", fullName: "", carModel: "", carNumber: "" };
  try {
    const snap = await get(ref(db, `users/${userId}`));
    if (!snap.exists()) return { phone: "", avatar: "", fullName: "", carModel: "", carNumber: "" };
    const v = snap.val();
    return {
      phone: v.phone || "",
      avatar: v.avatar || "",
      fullName: v.fullName || "",
      carModel: v.carModel || "",
      carNumber: v.carNumber || "",
      seatCount: v.seatCount || ""
    };
  } catch (e) {
    console.error("fetchUser error", e);
    return { phone: "", avatar: "", fullName: "", carModel: "", carNumber: "" };
  }
}

// Batch fetch users (reduce DB calls)
async function fetchUsersBatch(userIds) {
  const map = {};
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  await Promise.all(unique.map(async uid => {
    map[uid] = await fetchUser(uid);
  }));
  return map;
}

// ----------------- UI helpers -----------------
function el(id) { return document.getElementById(id); }

// Render regions into filter select
function loadRegionsFilter() {
  const filterRegion = el("filterRegion");
  if (!filterRegion) return;
  filterRegion.innerHTML = '<option value="">Viloyat (filter)</option>';
  Object.keys(REGIONS).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    filterRegion.appendChild(opt);
  });
}

// Create ad card DOM (compact)
function createAdCard(ad, userInfo) {
  const div = document.createElement("div");
  div.className = "ad-card";

  const avatarSrc = userInfo?.avatar || ad.avatar || "https://i.ibb.co/2W0z7Lx/user.png";
  const name = userInfo?.fullName || ad.userName || "";
  const car = userInfo?.carModel || ad.carModel || "";
  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;
  const priceText = ad.price ? `${ad.price} so‘m` : "Narx ko‘rsatilmagan";
  const seatText = ad.seatCount ? `${ad.seatCount} joy` : (ad.passengerCount ? `${ad.passengerCount} o‘rindiq` : "");
  const timeText = formatTime(ad.departureTime || ad.startTime || ad.startAt || ad.createdAt);

  // card inner HTML
  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(avatarSrc)}" alt="avatar" onerror="this.src='https://i.ibb.co/2W0z7Lx/user.png'"/>
    <div class="ad-main">
      <div class="ad-route">${escapeHtml(route)}</div>
      <div class="ad-car">${escapeHtml(car)}</div>
      <div class="ad-meta">
        <div class="ad-chip"><span class="icon">⏰</span> ${escapeHtml(timeText)}</div>
        ${seatText ? `<div class="ad-chip"><span class="icon">👥</span> ${escapeHtml(seatText)}</div>` : ""}
        ${name ? `<div style="color:var(--muted)"><span class="icon">👤</span> ${escapeHtml(name)}</div>` : ""}
      </div>
    </div>
    <div class="ad-price">${escapeHtml(priceText)}</div>
    <div class="ad-created">${escapeHtml(formatTime(ad.createdAt || ad.created || ""))}</div>
  `;

  // click -> full modal
  div.addEventListener("click", () => openAdModal(ad, userInfo));
  return div;
}

// Full modal (detailed)
function openAdModal(ad, userInfo) {
  let modal = el("adFullModal");
  if (!modal) return;

  // build modal content
  const avatarSrc = userInfo?.avatar || ad.avatar || "https://i.ibb.co/2W0z7Lx/user.png";
  const name = userInfo?.fullName || ad.userName || "-";
  const carModel = userInfo?.carModel || ad.carModel || "-";
  const carNumber = userInfo?.carNumber || ad.carNumber || "-";
  const seats = ad.seatCount || ad.passengerCount || userInfo?.seatCount || "-";
  const contact = userInfo?.phone || ad.ownerPhone || ad.phone || "-";
  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ', ' + ad.fromDistrict : ''} → ${ad.toRegion || ""}${ad.toDistrict ? ', ' + ad.toDistrict : ''}`;
  const departure = formatTime(ad.departureTime || ad.startTime || ad.startAt || "");
  const created = formatTime(ad.createdAt || ad.created || "");

  modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true">
      <div class="modal-header">
        <img class="modal-avatar" src="${escapeHtml(avatarSrc)}" onerror="this.src='https://i.ibb.co/2W0z7Lx/user.png'"/>
        <div>
          <div class="modal-name">${escapeHtml(name)}</div>
          <div class="modal-car">${escapeHtml(carModel)} ${carNumber ? ' • ' + escapeHtml(carNumber) : ''}</div>
        </div>
      </div>

      <div style="margin-top:6px;">
        <div class="label">Yo'nalish</div>
        <div class="value">${escapeHtml(route)}</div>

        <div class="modal-row">
          <div class="modal-col">
            <div class="label">Jo'nash vaqti</div>
            <div class="value">${escapeHtml(departure)}</div>
          </div>
          <div class="modal-col">
            <div class="label">Narx</div>
            <div class="value">${escapeHtml(ad.price ? ad.price + " so‘m" : "-")}</div>
          </div>
        </div>

        <div style="margin-top:10px;">
          <div class="label">Qo'shimcha</div>
          <div class="value">${escapeHtml(ad.comment || "-")}</div>
        </div>

        <div class="modal-row" style="margin-top:10px">
          <div class="modal-col">
            <div class="label">Kontakt</div>
            <div class="value">${escapeHtml(contact)}</div>
          </div>
          <div class="modal-col">
            <div class="label">O'rindiqlar</div>
            <div class="value">${escapeHtml(seats || "-")}</div>
          </div>
        </div>

        <div style="margin-top:10px;color:var(--muted);font-size:13px">
          Joylashtirilgan: ${escapeHtml(created)}
        </div>

        <div class="modal-actions">
          <button id="closeAdBtn" class="btn-ghost">Yopish</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  const closeBtn = el("closeAdBtn");
  if (closeBtn) closeBtn.onclick = () => { modal.style.display = "none"; };
  // clicking outside closes
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
}

// ----------------- Main: load ads & render -----------------
async function loadAllAds() {
  try {
    const snap = await get(ref(db, "ads"));
    const list = el("adsList");
    if (!list) return;
    list.innerHTML = "";

    if (!snap.exists()) {
      list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
      return;
    }

    // collect ads and userIds to batch fetch
    const ads = [];
    const userIds = [];
    snap.forEach(child => {
      const v = child.val() || {};
      const id = child.key;
      const typeNorm = normalizeType(v.type || v.userType || v.role || "");
      const a = { id, ...v, typeNormalized: typeNorm };
      ads.push(a);
      if (a.userId) userIds.push(a.userId);
    });

    // batch fetch users
    const usersMap = await fetchUsersBatch(userIds);

    // wire up filter events
    const searchEl = el("search");
    const roleEl = el("filterRole");
    const regionEl = el("filterRegion");
    if (searchEl) searchEl.oninput = () => renderAds(ads, usersMap);
    if (roleEl) roleEl.onchange = () => renderAds(ads, usersMap);
    if (regionEl) regionEl.onchange = () => renderAds(ads, usersMap);

    // initial render
    renderAds(ads, usersMap);

  } catch (err) {
    console.error("loadAllAds error", err);
    const list = el("adsList");
    if (list) list.innerHTML = "<p>Xatolik yuz berdi. Konsolni tekshiring.</p>";
  }
}

// render with filters
function renderAds(ads, usersMap = {}) {
  const list = el("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (el("search")?.value || "").toLowerCase().trim();
  const roleFilterRaw = el("filterRole")?.value || "";
  const regionFilter = el("filterRegion")?.value || "";
  const roleFilter = normalizeType(roleFilterRaw);

  const filtered = ads.filter(a => {
    if (roleFilter && a.typeNormalized !== roleFilter) return false;
    if (regionFilter) {
      if (a.fromRegion !== regionFilter && a.toRegion !== regionFilter) return false;
    }
    if (q) {
      const hay = [
        a.fromRegion, a.fromDistrict, a.toRegion, a.toDistrict,
        a.comment, a.price, a.type, a.typeNormalized, usersMap[a.userId]?.fullName
      ].map(x => (x || "").toString().toLowerCase()).join(" ");
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // show all (no pagination) — user wanted full listing
  filtered.forEach(ad => {
    const userInfo = usersMap[ad.userId] || {};
    const card = createAdCard(ad, userInfo);
    list.appendChild(card);
  });
}

// ----------------- Auth state and init -----------------
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  // init UI
  loadRegionsFilter();
  loadAllAds();
});

// logout binding (used in HTML topbar)
window.logout = () => signOut(auth).catch(e => console.error("logout err", e));

// Export openAdModal to global scope for other scripts (if needed)
window.openAdModal = openAdModal;
window.closeAdModal = () => { const m = el("adFullModal"); if (m) m.style.display = "none"; };
