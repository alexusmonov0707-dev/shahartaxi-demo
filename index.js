// ===============================
// index.js — PART 1 of 3
// Firebase init, utilities, getUserInfo, auth-check, loadRegionsFilter, loadAllAds starter
// ===============================

// FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// -----------------------------------------------------------------
// FIREBASE CONFIG — siz avval bergan config (o'zgarmagan)
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

// -----------------------------------------------------------------
// REGIONS — regions.js orqali window.regionsData yoki window.regions bo'lishi kerak
const REGIONS = window.regionsData || window.regions || {};

// ===============================
// UTIL: escapeHtml
// ===============================
function escapeHtml(str) {
  if (str === 0) return "0";
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===============================
// UTIL: formatReal (detailed date) & formatTime wrapper
//   - formatTime accepts numbers (ms), ISO strings, "YYYY-MM-DD HH:MM", and other patterns
//   - formatReal formats Date to 'uz-UZ' readable form
// ===============================
function formatReal(date, short = false) {
  if (!(date instanceof Date)) date = new Date(date);
  if (isNaN(date)) return "—";

  // date part
  const datePart = date.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "long",
    year: short ? undefined : "numeric"
  });

  const timePart = date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (short) {
    const parts = datePart.split(" ");
    if (parts.length && /\d{4}/.test(parts[parts.length - 1])) parts.pop();
    return `${parts.join(" ")} , ${timePart}`.replace(/\s+,/, ",");
  }

  return `${datePart}, ${timePart}`;
}

function formatTime(val, opts = {}) {
  // opts.shortYear not used here except when calling formatReal with short true.
  if (!val) return "—";

  // Date object
  if (val instanceof Date && !isNaN(val)) {
    return formatReal(val, !!opts.shortYear);
  }

  // numeric timestamp (ms or seconds)
  if (typeof val === "number") {
    // if seconds length 10 -> convert to ms
    if (String(val).length === 10) return formatReal(new Date(val * 1000), !!opts.shortYear);
    return formatReal(new Date(val), !!opts.shortYear);
  }

  // string handling
  if (typeof val === "string") {
    const s = val.trim();

    // numeric string timestamp
    if (/^\d{10,}$/.test(s)) {
      const n = Number(s);
      return formatReal(s.length === 10 ? new Date(n * 1000) : new Date(n), !!opts.shortYear);
    }

    // try Date.parse directly (ISO and many formats)
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) return formatReal(new Date(parsed), !!opts.shortYear);

    // replace ' ' with 'T' and try
    const tfix = s.replace(" ", "T");
    if (!isNaN(Date.parse(tfix))) return formatReal(new Date(Date.parse(tfix)), !!opts.shortYear);

    // pattern like "2025 M11 20 18:48" or "2025 11 20 18:48"
    const m = String(s).match(/(\d{4})\D+M?(\d{1,2})\D+(\d{1,2})\D+(\d{1,2}):?(\d{2})/);
    if (m) {
      const year = m[1].padStart(4, "0");
      const month = m[2].padStart(2, "0");
      const day = m[3].padStart(2, "0");
      const hour = m[4].padStart(2, "0");
      const min = m[5].padStart(2, "0");
      const d = new Date(`${year}-${month}-${day}T${hour}:${min}:00`);
      if (!isNaN(d)) return formatReal(d, !!opts.shortYear);
    }

    // last resort — return raw
    return s;
  }

  return String(val);
}

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
// getUserInfo — robust to your DB structure
// returns: { phone, avatar, fullName, carModel, carColor, carNumber, seatCount, _raw }
// ===============================
async function getUserInfo(userId) {
  if (!userId) {
    console.warn("getUserInfo: empty userId");
    return {
      phone: "", avatar: "", fullName: "", carModel: "", carColor: "", carNumber: "", seatCount: 0, _raw: {}
    };
  }

  try {
    const snap = await get(ref(db, "users/" + userId));
    if (!snap.exists()) {
      console.warn("getUserInfo: no user record for", userId);
      return {
        phone: "", avatar: "", fullName: "", carModel: "", carColor: "", carNumber: "", seatCount: 0, _raw: {}
      };
    }

    const u = snap.val();

    // prefer fullName (your DB uses fullName); fallback to name/displayName/firstname+lastname
    const fullName = u.fullName || u.name || u.displayName ||
      ((u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim() : "") || "";

    const out = {
      phone: u.phone || u.phoneNumber || u.mobile || "",
      avatar: u.avatar || u.photoURL || u.image || "",
      fullName: fullName,
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || u.color || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: (u.seatCount !== undefined && u.seatCount !== null) ? Number(u.seatCount) : (u.bookedSeats !== undefined ? Number(u.bookedSeats) : 0),
      _raw: u
    };

    console.log("getUserInfo -> userId:", userId, "resolved:", out);
    return out;
  } catch (err) {
    console.error("getUserInfo error:", err);
    return { phone: "", avatar: "", fullName: "", carModel: "", carColor: "", carNumber: "", seatCount: 0, _raw: {} };
  }
}

// ===============================
// AUTH CHECK: redirect to login if not authed
// ===============================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  // on auth success load filters and ads
  loadRegionsFilter();
  loadAllAds();
});

// ===============================
// loadRegionsFilter — populate #filterRegion from REGIONS
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
// loadAllAds — fetches /ads and prepares array then calls renderAds
// ===============================
async function loadAllAds() {
  try {
    const snap = await get(ref(db, "ads"));
    const list = document.getElementById("adsList");
    if (!list) return;

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

    // attach handlers
    const searchEl = document.getElementById("search");
    const roleEl = document.getElementById("filterRole");
    const regionEl = document.getElementById("filterRegion");

    if (searchEl) searchEl.oninput = () => renderAds(ads);
    if (roleEl) roleEl.onchange = () => renderAds(ads);
    if (regionEl) regionEl.onchange = () => renderAds(ads);

    // initial render
    renderAds(ads);
  } catch (err) {
    console.error("loadAllAds error:", err);
    const list = document.getElementById("adsList");
    if (list) list.innerHTML = "<p>E'lonlarni yuklashda xatolik yuz berdi.</p>";
  }
}

// End of PART 1
// NEXT: PART 2 will include renderAds, createAdCard (mini card) and related helpers.
// When ready, type: "2-qismni ber" (yoki '2') to get the next chunk.
// ===============================
// index.js — PART 2 of 3
// RENDER ADS + CREATE AD CARD
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

  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(card => list.appendChild(card));
}

// ===============================
// CREATE AD CARD (mini)
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

  // Seats logic
  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;

  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats))
    ? Math.max(totalSeats - booked, 0)
    : null;

  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  const carModel = u.carModel || "";

  div.innerHTML = `
    <img class="ad-avatar" src="${escapeHtml(u.avatar || "https://i.ibb.co/2W0z7Lx/user.png")}" alt="avatar">

    <div class="ad-main">
      <div class="ad-route">${escapeHtml(route)}</div>
      <div class="ad-car">${escapeHtml(carModel)}</div>

      <div class="ad-meta">
        <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>

        ${
          totalSeats !== null
            ? `<div class="ad-chip">👥 ${escapeHtml(String(available))}/${escapeHtml(String(totalSeats))} bo‘sh</div>`
            : requested !== null
            ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>`
            : ""
        }
      </div>
    </div>

    <div class="ad-price">💰 ${escapeHtml(ad.price ? String(ad.price) : "-")} so‘m</div>

    <div class="ad-created">${escapeHtml(created)}</div>
  `;

  div.onclick = () => openAdModal(ad);
  return div;
}
// ===============================
// PART 3 — OPEN FULL MODAL
// ===============================
async function openAdModal(ad) {
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  const u = await getUserInfo(ad.userId);

  // -------------------------
  // FULL NAME — FIREBASE bo‘yicha
  // -------------------------
  const fullname =
    u.fullname ||
    `${u.firstname || ""} ${u.lastname || ""}`.trim() ||
    u.name ||
    u.displayName ||
    u.username ||
    "Foydalanuvchi";

  // -------------------------
  // ROUTE
  // -------------------------
  const route =
    `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ` +
    `${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  // -------------------------
  // DATE/TIME (TO‘G‘RI FORMAT)
  // -------------------------
  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "");

  // -------------------------
  // SEATS
  // -------------------------
  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats =
    totalSeatsRaw !== null && totalSeatsRaw !== undefined ? Number(totalSeatsRaw) : null;

  const booked = Number(ad.bookedSeats || 0);
  const available =
    typeof totalSeats === "number" && !isNaN(totalSeats)
      ? Math.max(totalSeats - booked, 0)
      : null;

  const requestedRaw =
    ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested =
    requestedRaw !== null && requestedRaw !== undefined ? Number(requestedRaw) : null;

  // -------------------------
  // CAR FULL INFO
  // -------------------------
  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${
    u.carNumber ? " • " + u.carNumber : ""
  }`;

  // -------------------------
  // HTML
  // -------------------------
  modal.innerHTML = `
    <div class="ad-modal-box" role="dialog" aria-modal="true">

      <div class="modal-header">
        <img class="modal-avatar" src="${escapeHtml(
          u.avatar || "https://i.ibb.co/2W0z7Lx/user.png"
        )}" alt="avatar">

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
          <div class="label">Joylar</div>
          <div class="value">
            ${
              totalSeats !== null
                ? `${escapeHtml(String(totalSeats))} ta (Bo‘sh: ${escapeHtml(
                    String(available)
                  )})`
                : requested !== null
                ? `Talab: ${escapeHtml(String(requested))} odam`
                : "-"
            }
          </div>
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
        <button class="btn-ghost" onclick="onContact('${escapeHtml(u.phone || "")}')">
          Qo'ng'iroq
        </button>
      </div>

    </div>
  `;

  modal.style.display = "flex";
  modal.onclick = (e) => {
    if (e.target === modal) closeAdModal();
  };
}

// ===============================
// CLOSE MODAL
// ===============================
window.closeAdModal = function () {
  const modal = document.getElementById("adFullModal");
  if (modal) modal.style.display = "none";
};

// ===============================
// PHONE CALL
// ===============================
window.onContact = (phone) => {
  if (!phone) return alert("Telefon raqami mavjud emas");
  window.location.href = `tel:${phone}`;
};
