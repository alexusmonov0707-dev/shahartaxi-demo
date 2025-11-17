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
//  REGIONS
// ===============================
const REGIONS = window.regionsData || window.regions || {};


// ===============================
//  HELPERS
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
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return String(val); }
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

  try {
    const snap = await get(ref(db, "users/" + userId));

    if (!snap.exists()) {
      return {
        phone: "", avatar: "", fullName: "", role: "",
        carModel: "", carColor: "", carNumber: "", seatCount: 0
      };
    }

    const u = snap.val();

    return {
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || "",
      fullName:
        u.fullName ||
        ((u.firstname || u.lastname)
          ? `${u.firstname || ""} ${u.lastname || ""}`.trim()
          : "") ||
        u.name ||
        "",
      role: (u.role || u.userRole || "").toString(),
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: Number(u.seatCount || u.seats || 0)
    };

  } catch (err) {
    console.error("getUserInfo error", err);
    return {
      phone: "", avatar: "", fullName: "", role: "",
      carModel: "", carColor: "", carNumber: "", seatCount: 0
    };
  }
}


// ===============================
// GLOBAL
// ===============================
let ALL_ADS = [];
let CURRENT_USER = null;


// ===============================
// AUTH
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  CURRENT_USER = await getUserInfo(user.uid);

  loadRouteFilters();
  await loadAllAds();
});


// ===============================
// ROUTE FILTERS (REGION + DISTRICT)
// ===============================
function loadRouteFilters() {
  const fromRegion = document.getElementById("fromRegion");
  const toRegion = document.getElementById("toRegion");

  fromRegion.innerHTML = '<option value="">Viloyat</option>';
  toRegion.innerHTML = '<option value="">Viloyat</option>';

  Object.keys(REGIONS).forEach(region => {
    fromRegion.insertAdjacentHTML("beforeend", `<option value="${region}">${region}</option>`);
    toRegion.insertAdjacentHTML("beforeend", `<option value="${region}">${region}</option>`);
  });

  fromRegion.onchange = () => {
    fillFromDistricts();
    scheduleRenderAds();
  };

  toRegion.onchange = () => {
    fillToDistricts();
    scheduleRenderAds();
  };

  fillFromDistricts();
  fillToDistricts();
}

function fillFromDistricts() {
  const region = document.getElementById("fromRegion").value;
  const box = document.getElementById("fromDistrictBox");
  box.innerHTML = "";

  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="fromDistrict" value="${d}">
        ${d}
      </label>`;
  });

  box.querySelectorAll("input").forEach(ch =>
    ch.onchange = () => scheduleRenderAds()
  );
}

function fillToDistricts() {
  const region = document.getElementById("toRegion").value;
  const box = document.getElementById("toDistrictBox");
  box.innerHTML = "";

  if (!region || !REGIONS[region]) return;

  REGIONS[region].forEach(d => {
    box.innerHTML += `
      <label class="district-item">
        <input type="checkbox" class="toDistrict" value="${d}">
        ${d}
      </label>`;
  });

  box.querySelectorAll("input").forEach(ch =>
    ch.onchange = () => scheduleRenderAds()
  );
}


// ===============================
// LOAD ALL ADS
// ===============================
async function loadAllAds() {
  const list = document.getElementById("adsList");

  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    list.innerHTML = "E’lon yo‘q.";
    ALL_ADS = [];
    return;
  }

  const arr = [];

  snap.forEach(c => {
    const v = c.val();
    arr.push({
      id: c.key,
      ...v,
      typeNormalized: normalizeType(v.type)
    });
  });

  ALL_ADS = arr;

  document.getElementById("search").oninput = () => renderAds(ALL_ADS);
  document.getElementById("filterRole").onchange = () => renderAds(ALL_ADS);
  document.getElementById("sortBy").onchange = () => renderAds(ALL_ADS);
  document.getElementById("filterDate").onchange = () => renderAds(ALL_ADS);
  document.getElementById("priceMin").oninput = () => renderAds(ALL_ADS);
  document.getElementById("priceMax").oninput = () => renderAds(ALL_ADS);

  renderAds(ALL_ADS);
}


// ===============================
// RENDER ADS (FINAL + ESki e’lonlarni yashirish)
// ===============================
async function renderAds(ads) {
  const list = document.getElementById("adsList");
  list.innerHTML = "";

  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const roleFilter = normalizeType(document.getElementById("filterRole")?.value || "");
  const sortBy = document.getElementById("sortBy")?.value || "newest";
  const filterDate = document.getElementById("filterDate")?.value || "";
  const priceMin = Number(document.getElementById("priceMin")?.value || 0);
  const priceMax = Number(document.getElementById("priceMax")?.value || 0);

  const fromRegion = document.getElementById("fromRegion").value || "";
  const toRegion = document.getElementById("toRegion").value || "";
  const fromDistricts = Array.from(document.querySelectorAll(".fromDistrict:checked")).map(x => x.value);
  const toDistricts = Array.from(document.querySelectorAll(".toDistrict:checked")).map(x => x.value);

  const currentUserId = auth.currentUser?.uid || null;

  let filtered = ads.filter(a => {
    if (!a) return false;

    // AUTO opposite type filter
    const roleRaw = (CURRENT_USER?.role || "").toLowerCase();
    if (roleRaw.includes("haydov")) {
      if (!a.typeNormalized.toLowerCase().includes("yo")) return false;
    } else if (roleRaw.includes("yo")) {
      if (!a.typeNormalized.toLowerCase().includes("haydov")) return false;
    }

    // manual role
    if (roleFilter && a.typeNormalized !== roleFilter) return false;

    // hide own
    if (currentUserId && a.userId === currentUserId) return false;

    // region-from-to
    if (fromRegion && a.fromRegion !== fromRegion) return false;
    if (fromDistricts.length && !fromDistricts.includes(a.fromDistrict)) return false;

    if (toRegion && a.toRegion !== toRegion) return false;
    if (toDistricts.length && !toDistricts.includes(a.toDistrict)) return false;

    // price
    const adPrice = a.price ? Number(a.price) : NaN;
    if (priceMin && !isNaN(adPrice) && adPrice < priceMin) return false;
    if (priceMax && !isNaN(adPrice) && adPrice > priceMax) return false;

    // DATE FILTER (bugun, ertaga, 3 kun)
    if (filterDate) {
      const raw = a.departureTime || a.startTime || a.time || a.date || null;

      let adTime = null;
      if (typeof raw === "number") adTime = new Date(raw);
      else if (typeof raw === "string") {
        const fix = raw.replace(" ", "T");
        adTime = !isNaN(Date.parse(raw))
          ? new Date(raw)
          : (!isNaN(Date.parse(fix)) ? new Date(fix) : null);
      }

      if (!adTime) return false;

      const now = new Date();

      if (filterDate === "today") {
        if (
          adTime.getFullYear() !== now.getFullYear() ||
          adTime.getMonth() !== now.getMonth() ||
          adTime.getDate() !== now.getDate()
        ) return false;

      } else if (filterDate === "tomorrow") {
        const t = new Date(now);
        t.setDate(now.getDate() + 1);
        if (
          adTime.getFullYear() !== t.getFullYear() ||
          adTime.getMonth() !== t.getMonth() ||
          adTime.getDate() !== t.getDate()
        ) return false;

      } else if (filterDate === "3days") {
        const diff = adTime - now;
        if (diff < 0 || diff > 86400000 * 3) return false;
      }
    }


    // ❗ B VARIANT — Eski e’lonlarni yashirish
    const rawT = a.departureTime || a.startTime || a.time || a.date || null;
    let dt = null;

    if (typeof rawT === "number") dt = new Date(rawT);
    else if (typeof rawT === "string") {
      const fix = rawT.replace(" ", "T");
      dt = !isNaN(Date.parse(rawT))
        ? new Date(rawT)
        : (!isNaN(Date.parse(fix)) ? new Date(fix) : null);
    }

    if (!dt) return false;

    if (dt.getTime() < Date.now()) return false;


    // search
    const hay = [
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type
    ].join(" ").toLowerCase();

    if (!hay.includes(q)) return false;

    return true;
  });

  // sort
  if (sortBy === "newest") {
    filtered.sort((a, b) =>
      new Date(b.createdAt || b.created || b.postedAt || 0) -
      new Date(a.createdAt || a.created || a.postedAt || 0)
    );
  } else {
    filtered.sort((a, b) =>
      new Date(a.createdAt || a.created || a.postedAt || 0) -
      new Date(b.createdAt || b.created || b.postedAt || 0)
    );
  }

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(c => list.appendChild(c));
}


// ===============================
// CREATE AD CARD
// ===============================
async function createAdCard(ad) {
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const timeRaw = ad.departureTime || ad.startTime || ad.time || ad.date || "";
  const depTime = formatTime(timeRaw);

  const createdRaw = ad.createdAt || ad.created || ad.postedAt || "";
  const created = formatTime(createdRaw);

  // ❗ Yangi badge (24 soat)
  let isNew = false;
  if (createdRaw) {
    const ct = new Date(createdRaw).getTime();
    if (Date.now() - ct <= 86400000) isNew = true;
  }

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = totalSeatsRaw !== null ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = totalSeats !== null ? Math.max(totalSeats - booked, 0) : null;

  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = requestedRaw !== null ? Number(requestedRaw) : null;

  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" />

    <div class="ad-main">
      <div class="ad-route">
        ${escapeHtml(route)}
        ${isNew ? '<span class="ad-badge-new">Yangi</span>' : ''}
      </div>

      <div class="ad-car" style="color:#6b7280;font-size:13px;margin-top:6px;">
        ${escapeHtml(u.carModel || "")}
      </div>

      <div class="ad-meta" style="margin-top:8px">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>

        ${
          totalSeats !== null
            ? `<div class="ad-chip">👥 ${escapeHtml(String(available))}/${escapeHtml(String(totalSeats))} bo‘sh</div>`
            : (requested !== null
                ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>`
                : "")
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
// MODAL
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
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || ad.date || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  const fullname = u.fullName || "Foydalanuvchi";

  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = totalSeatsRaw !== null ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = totalSeats !== null ? Math.max(totalSeats - booked, 0) : null;

  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = requestedRaw !== null ? Number(requestedRaw) : null;

  modal.innerHTML = `
    <div class="ad-modal-box">
      <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
        <img class="modal-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" />
        <div>
          <div class="modal-name">${escapeHtml(fullname)}</div>
          <div class="modal-car" style="color:#6b7280">${escapeHtml(carFull)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Yo‘nalish</div>
          <div class="value">${escapeHtml(route)}</div>
        </div>

        <div class="modal-col" style="text-align:right">
          <div class="label">Jo‘nash vaqti</div>
          <div class="value">${escapeHtml(depTime)}</div>
        </div>
      </div>

      <div class="modal-row">
        <div class="modal-col">
          <div class="label">Joylar</div>
          <div class="value">${
            totalSeats !== null
              ? `${totalSeats} ta (Bo‘sh: ${available})`
              : requested !== null
                ? `Talab: ${requested} odam`
                : "-"
          }</div>
        </div>

        <div class="modal-col" style="text-align:right">
          <div class="label">Narx</div>
          <div class="value">${escapeHtml(ad.price || "-")} so‘m</div>
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

      <div style="margin-top:12px;color:#88919a;font-size:13px;">
        Joylashtirilgan: ${escapeHtml(created)}
      </div>

      <div class="modal-actions" style="margin-top:14px">
        <button class="btn-primary" id="modalCloseBtn">Yopish</button>
        <button class="btn-ghost" id="modalCallBtn">Qo'ng'iroq</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";

  document.getElementById("modalCloseBtn").onclick = closeAdModal;
  document.getElementById("modalCallBtn").onclick = () => onContact(u.phone || "");
  modal.onclick = e => { if (e.target === modal) closeAdModal(); };
}

function closeAdModal() {
  const modal = document.getElementById("adFullModal");
  if (modal) {
    modal.style.display = "none";
    modal.innerHTML = "";
  }
}

function onContact(phone) {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
}

window.openAdModal = openAdModal;
window.closeAdModal = closeAdModal;
window.onContact = onContact;


// ===============================
// Debounce render (no blinking)
// ===============================
let __render_timeout = null;
function scheduleRenderAds() {
  if (__render_timeout) clearTimeout(__render_timeout);
  __render_timeout = setTimeout(() => {
    renderAds(ALL_ADS);
    __render_timeout = null;
  }, 140);
}

document.addEventListener("change", (e) => {
  if (e.target && (e.target.classList.contains("fromDistrict") || e.target.classList.contains("toDistrict"))) {
    scheduleRenderAds();
  }
});
