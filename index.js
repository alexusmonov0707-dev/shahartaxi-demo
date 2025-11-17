// index.js (to'liq)
const USER_CACHE = {}; // userId → userInfo
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
// ===============================
const REGIONS = window.regionsData || window.regions || {};

// ===============================
// HELPERS
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

function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase();
  t = t.replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "yo'lovchi") return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatTime(val) {
  if (!val) return "—";

  if (typeof val === "number") {
    try {
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return String(val);
    }
  }

  if (typeof val === "string") {
    if (!isNaN(Date.parse(val))) {
      return new Date(val).toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    const fix = val.replace(" ", "T");
    if (!isNaN(Date.parse(fix))) {
      return new Date(fix).toLocaleString("uz-UZ", {
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

// ===============================
// GET USER INFO
// ===============================
async function getUserInfo(userId) {
  if (!userId) return {
    phone: "", avatar: "", fullName: "", role: "",
    carModel: "", carColor: "", carNumber: "", seatCount: 0
  };

  // CACHE BORMI?
  if (USER_CACHE[userId]) {
    return USER_CACHE[userId];
  }

  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists()) {
      USER_CACHE[userId] = {
        phone: "", avatar: "", fullName: "", role: "",
        carModel: "", carColor: "", carNumber: "", seatCount: 0
      };
      return USER_CACHE[userId];
    }

    const u = snap.val();
    const info = {
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || "",
      fullName: u.fullName ||
        ((u.firstname || u.lastname)
          ? `${u.firstname || ""} ${u.lastname || ""}`.trim()
          : "") || u.name || "",
      role: (u.role || u.userRole || "").toString(),
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: u.seatCount || u.seats || 0
    };

    USER_CACHE[userId] = info; // CACHEGA SAQLAYMIZ

    return info;

  } catch (err) {
    console.error("getUserInfo error:", err);
    return {
      phone: "", avatar: "", fullName: "", role: "",
      carModel: "", carColor: "", carNumber: "", seatCount: 0
    };
  }
}


let ALL_ADS = [];
let CURRENT_USER = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  CURRENT_USER = await getUserInfo(user.uid || user?.userId);
  loadRouteFilters();
  await loadAllAds();
});
// ===============================
// LOAD Route Filters (from/to region + districts)
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");
  if (!fromRegion || !toRegion) return;

  fromRegion.innerHTML = '<option value="">Viloyat</option>';
  toRegion.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(REGIONS).forEach(region => {
    const o1 = document.createElement("option");
    o1.value = region;
    o1.textContent = region;
    fromRegion.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = region;
    o2.textContent = region;
    toRegion.appendChild(o2);
  });

  fromRegion.onchange = () => {
    fillFromDistricts();
    renderAds(ALL_ADS);
  };

  toRegion.onchange = () => {
    fillToDistricts();
    renderAds(ALL_ADS);
  };

  fillFromDistricts();
  fillToDistricts();
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");
  if (!box) return;

  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    const id = "fromDist_" + slugify(region) + "_" + slugify(d);
    const label = document.createElement("label");
    label.className = "district-item";
    label.innerHTML = `
      <input type="checkbox" id="${id}" value="${escapeHtml(d)}" class="fromDistrict">
      ${escapeHtml(d)}
    `;
    box.appendChild(label);
  });

  box.querySelectorAll("input[type=checkbox]").forEach(ch =>
    ch.onchange = () => renderAds(ALL_ADS)
  );
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");
  if (!box) return;

  box.innerHTML = "";
  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    const id = "toDist_" + slugify(region) + "_" + slugify(d);
    const label = document.createElement("label");
    label.className = "district-item";
    label.innerHTML = `
      <input type="checkbox" id="${id}" value="${escapeHtml(d)}" class="toDistrict">
      ${escapeHtml(d)}
    `;
    box.appendChild(label);
  });

  box.querySelectorAll("input[type=checkbox]").forEach(ch =>
    ch.onchange = () => renderAds(ALL_ADS)
  );
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "");
}

// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  try {
    const snap = await get(ref(db, "ads"));
    const list = document.getElementById("adsList");
    if (!list) return;

    if (!snap.exists()) {
      list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
      ALL_ADS = [];
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

    ALL_ADS = ads;

    const searchEl = document.getElementById("search");
    const roleEl = document.getElementById("filterRole");
    const fromRegionEl = document.getElementById("fromRegion");
    const toRegionEl = document.getElementById("toRegion");

    if (searchEl) searchEl.oninput = () => renderAds(ALL_ADS);
    if (roleEl) roleEl.onchange = () => renderAds(ALL_ADS);
    if (fromRegionEl) fromRegionEl.onchange = () => {
      fillFromDistricts();
      renderAds(ALL_ADS);
    };
    if (toRegionEl) toRegionEl.onchange = () => {
      fillToDistricts();
      renderAds(ALL_ADS);
    };

    renderAds(ALL_ADS);
  } catch (err) {
    console.error("loadAllAds error:", err);
  }
}
// ===============================
// RENDER ADS with all filters applied
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  if (!list) return;
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");

  const currentUserId = auth.currentUser?.uid || null;
  if (currentUserId && (!CURRENT_USER || CURRENT_USER._uid !== currentUserId)) {
    getUserInfo(currentUserId)
      .then(u => {
        CURRENT_USER = u;
        renderAds(ALL_ADS);
      })
      .catch(() => {});
  }

  const currentRoleRaw = (CURRENT_USER?.role || "").toString().toLowerCase();
  let currentRole = "";
  if (currentRoleRaw.includes("driver") || currentRoleRaw.includes("haydov"))
    currentRole = "driver";
  else if (currentRoleRaw.includes("pass") || currentRoleRaw.includes("yo"))
    currentRole = "passenger";

  const fromRegion = document.getElementById("fromRegion")?.value || "";
  const toRegion = document.getElementById("toRegion")?.value || "";

  const fromDistricts = Array.from(
    document.querySelectorAll("#fromDistrictBox input.fromDistrict:checked")
  ).map(x => x.value);

  const toDistricts = Array.from(
    document.querySelectorAll("#toDistrictBox input.toDistrict:checked")
  ).map(x => x.value);

  const filtered = ads.filter(a => {
    // 1) auto role filter by account type
    if (currentRole === "driver") {
      if (!a.typeNormalized.toLowerCase().includes("yo")) return false;
    } else if (currentRole === "passenger") {
      if (!a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    // 2) dropdown role filter
    if (roleFilter) {
      if (a.typeNormalized !== roleFilter) return false;
    }

    // 3) hide own ads
    if (currentUserId && a.userId === currentUserId) return false;

    // 4) fromRegion / toRegion
    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (toRegion && a.toRegion !== toRegion) return false;

    // 5) district filters
    if (fromDistricts.length > 0 && !fromDistricts.includes(a.fromDistrict)) return false;
    if (toDistricts.length > 0 && !toDistricts.includes(a.toDistrict)) return false;

    // 6) search
    const hay = [
      a.fromRegion,
      a.fromDistrict,
      a.toRegion,
      a.toDistrict,
      a.comment,
      a.price,
      a.type,
      a.carModel
    ]
      .join(" ")
      .toLowerCase();

    if (!hay.includes(q)) return false;

    return true;
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(c => list.appendChild(c));
}

// ===============================
// CREATE AD CARD (mini card)
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  const route = `${ad.fromRegion || ""}${
    ad.fromDistrict ? ", " + ad.fromDistrict : ""
  } → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats =
    totalSeatsRaw !== null && totalSeatsRaw !== undefined
      ? Number(totalSeatsRaw)
      : null;

  const booked = Number(ad.bookedSeats || 0);
  const available =
    typeof totalSeats === "number" ? Math.max(totalSeats - booked, 0) : null;

  const requestedRaw =
    ad.passengerCount ||
    ad.requestedSeats ||
    ad.requestSeats ||
    ad.peopleCount ||
    null;
  const requested =
    requestedRaw !== null && requestedRaw !== undefined
      ? Number(requestedRaw)
      : null;

  const carModel = u.carModel || "";

  div.innerHTML = `
    <img class="ad-avatar"
      src="${escapeHtml(
        u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"
      )}" alt="avatar">

    <div class="ad-main">
      <div class="ad-route">${escapeHtml(route)}</div>
      <div class="ad-car">${escapeHtml(carModel)}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
        ${
          totalSeats !== null
            ? `<div class="ad-chip">👥 ${escapeHtml(
                String(available)
              )}/${escapeHtml(String(totalSeats))} bo‘sh</div>`
            : requested !== null
            ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>`
            : ""
        }
      </div>
    </div>

    <div class="ad-price">💰 ${escapeHtml(String(ad.price))} so‘m</div>
    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}
// ===============================
// OPEN FULL MODAL (with tidy layout)
// ===============================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  // fetch user object
  const u = await getUserInfo(ad.userId);

  const route =
    `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""}` +
    ` → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");
  const fullname = u.fullName || "Foydalanuvchi";
  const carFull =
    `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  // modal markup - ensure avatar constrained by CSS (.modal-avatar in your CSS)
  modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true">
      <div style="display:flex; gap:12px; align-items:center; margin-bottom:6px;">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">
        <div>
          <div class="modal-name">${escapeHtml(fullname)}</div>
          <div class="modal-car">${escapeHtml(carFull)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div style="flex:1">
          <div class="label">Yo‘nalish</div>
          <div class="value">${escapeHtml(route)}</div>
        </div>
        <div style="flex:1; text-align:right">
          <div class="label">Jo‘nash vaqti</div>
          <div class="value">${escapeHtml(depTime)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div style="flex:1">
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
        <div style="flex:1; text-align:right">
          <div class="label">Narx</div>
          <div class="value">${escapeHtml(ad.price ? ad.price + " so‘m" : "-")}</div>
        </div>
      </div>

      <div style="margin-top:12px;">
        <div class="label">Izoh</div>
        <div class="value">${escapeHtml(ad.comment || "-")}</div>
      </div>

      <div style="margin-top:12px;">
        <div class="label">Kontakt</div>
        <div class="value">${escapeHtml(u.phone || "-")}</div>
      </div>

      <div style="margin-top:12px; color:#88919a; font-size:13px;">
        Joylashtirilgan: ${escapeHtml(created)}
      </div>

      <div class="modal-actions">
        <button class="btn-primary" id="modalCloseBtn">Yopish</button>
        <button class="btn-ghost" id="modalCallBtn">Qo'ng'iroq</button>
      </div>
    </div>
  `;

  // show modal
  modal.style.display = "flex";

  // button handlers (use getElementById because IDs set above)
  const closeBtn = document.getElementById("modalCloseBtn");
  const callBtn = document.getElementById("modalCallBtn");
  if (closeBtn) closeBtn.onclick = closeAdModal;
  if (callBtn) callBtn.onclick = () => onContact(u.phone || "");

  // clicking outside modal closes
  modal.onclick = (e) => { if (e.target === modal) closeAdModal(); };
}

// ===============================
// CLOSE MODAL
// ===============================
function closeAdModal() {
  const modal = document.getElementById("adFullModal");
  if (modal) {
    modal.style.display = "none";
    modal.innerHTML = "";
  }
}

// ===============================
// CONTACT ACTION
// ===============================
function onContact(phone) {
  if (!phone) return alert("Telefon raqami mavjud emas");
  // standard tel link (mobile will open dialer)
  window.location.href = `tel:${phone}`;
}

// ===============================
// LOGOUT
// ===============================
window.logout = () => signOut(auth);

// expose open/close globally (used by onclick in cards earlier)
window.openAdModal = openAdModal;
window.closeAdModal = closeAdModal;
window.onContact = onContact;

// ===============================
// end of file - application entry (no exports)
// ===============================
