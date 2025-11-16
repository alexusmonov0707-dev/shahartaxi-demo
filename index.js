// ===============================
// index.js (to'liq, qisqartirilmagan)
// ===============================

// FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// FIREBASE CONFIG (sizniki shu)
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

// REGIONS (regions.js orqali window.regionsData yoki window.regions bo'lishi kerak)
const REGIONS = window.regionsData || window.regions || {};

// -------------------------------
// TYPE NORMALIZATION
// -------------------------------
function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase();
  t = t.replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  if (t === "yo'lovchi") return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// -------------------------------
// DATE PARSER & FORMATTER
// robust: accepts numeric timestamp, ISO strings, "YYYY-MM-DD HH:MM", and "2025 M11 20 18:48" patterns
// -------------------------------
function formatTime(val, opts = {}) {
  if (!val) return "—";
  const short = !!opts.shortYear;

  // If already Date
  if (val instanceof Date && !isNaN(val)) {
    return formatReal(val, short);
  }

  // numbers (milliseconds)
  if (typeof val === "number") return formatReal(new Date(val), short);

  // strings
  if (typeof val === "string") {
    const s = val.trim();

    // If looks like numeric timestamp string
    if (/^\d{10,}$/.test(s)) {
      // could be seconds or milliseconds
      const n = Number(s);
      const d = s.length === 10 ? new Date(n * 1000) : new Date(n);
      if (!isNaN(d)) return formatReal(d, short);
    }

    // Try Date.parse on common patterns (ISO works)
    const iso = Date.parse(s);
    if (!isNaN(iso)) return formatReal(new Date(iso), short);

    // Replace space between date and time to 'T' and try again
    const tfix = s.replace(" ", "T");
    if (!isNaN(Date.parse(tfix))) return formatReal(new Date(Date.parse(tfix)), short);

    // Fallback: try pattern like "2025 M11 20 18:48" or "2025 11 20 18:48"
    // convert "M11" or "11" to numeric month
    const m = String(s).match(/(\d{4})\D+M?(\d{1,2})\D+(\d{1,2})\D+(\d{1,2}):?(\d{2})/);
    if (m) {
      const year = m[1].padStart(4, "0");
      const month = m[2].padStart(2, "0");
      const day = m[3].padStart(2, "0");
      const hour = m[4].padStart(2, "0");
      const min = m[5].padStart(2, "0");
      const d = new Date(`${year}-${month}-${day}T${hour}:${min}:00`);
      if (!isNaN(d)) return formatReal(d, short);
    }

    // Last resort: return raw string
    return s;
  }

  return String(val);
}

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

// -------------------------------
// GET USER INFO (robust for your DB structure)
// returns object with fullName, phone, avatar, carModel, carColor, carNumber, seatCount and raw
// -------------------------------
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

    // Prefer fullName if present (your DB uses fullName)
    const fullName = u.fullName || u.name || u.displayName || u.firstname || ((u.firstname || u.lastname) ? `${u.firstname || ""} ${u.lastname || ""}`.trim() : "") || "";

    const out = {
      phone: u.phone || u.phoneNumber || u.mobile || "",
      avatar: u.avatar || u.photoURL || u.image || "",
      fullName: fullName,
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || "",
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

// -------------------------------
// AUTH CHECK
// -------------------------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  loadRegionsFilter();
  loadAllAds();
});

// -------------------------------
// LOAD REGION SELECT
// -------------------------------
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

// -------------------------------
// LOAD ALL ADS
// -------------------------------
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

    renderAds(ads);
  } catch (err) {
    console.error("loadAllAds error:", err);
    const list = document.getElementById("adsList");
    if (list) list.innerHTML = "<p>E'lonlarni yuklashda xatolik yuz berdi.</p>";
  }
}

// -------------------------------
// RENDER ADS
// -------------------------------
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
      a.fromRegion, a.fromDistrict,
      a.toRegion, a.toDistrict,
      a.comment, a.price, a.type
    ].join(" ").toLowerCase();

    return hay.includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = "<p>Natija topilmadi.</p>";
    return;
  }

  // Build cards in parallel to avoid race conditions
  const cards = await Promise.all(filtered.map(a => createAdCard(a)));
  cards.forEach(card => list.appendChild(card));
}

// -------------------------------
// CREATE AD CARD (mini) — shows avatar, route, carModel, time, seats, price, createdAt
// -------------------------------
async function createAdCard(ad) {
  // Get user info (non-blocking but we await so avatar & carModel available)
  const u = await getUserInfo(ad.userId);

  const div = document.createElement("div");
  div.className = "ad-card";

  // route
  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  // departure time parsing
  const depTimeRaw = ad.departureTime || ad.startTime || ad.time || "";
  const depTime = formatTime(depTimeRaw);

  // created (short)
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "", { shortYear: true });

  // seats logic
  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;

  // requested (for passengers)
  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  // car model info
  const carModel = u.carModel || "";

  // avatar
  const avatarUrl = u.avatar || "https://i.ibb.co/2W0z7Lx/user.png";

  // price
  const price = ad.price ? String(ad.price) : "-";

  // Build inner HTML (keep structure simple, but flexible)
  div.innerHTML = `
    <div style="display:flex; gap:12px; align-items:center;">
      <div style="flex-shrink:0;">
        <img src="${escapeHtml(avatarUrl)}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;">
      </div>

      <div style="flex:1;">
        <div style="font-weight:600; font-size:15px; margin-bottom:6px;">${escapeHtml(route)}</div>
        <div style="color:#666; font-size:13px; margin-bottom:8px;">${escapeHtml(carModel)}</div>

        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <div class="ad-chip">⏰ ${escapeHtml(depTime)}</div>
          ${
            totalSeats !== null
              ? `<div class="ad-chip">👥 ${escapeHtml(String(available))}/${escapeHtml(String(totalSeats))} bo‘sh</div>`
              : requested !== null
                ? `<div class="ad-chip">👥 ${escapeHtml(String(requested))} odam</div>`
                : ``
          }
        </div>
      </div>

      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
        <div style="background:#eef6ff;padding:8px 12px;border-radius:8px;font-weight:700;">💰 ${escapeHtml(price)} so‘m</div>
        <div style="font-size:12px;color:#9aa6b2">${escapeHtml(created)}</div>
      </div>
    </div>
  `;

  // click opens modal
  div.onclick = () => openAdModal(ad);
  return div;
}

// -------------------------------
// OPEN AD MODAL (full details) — uses fullName from DB (preferred)
// -------------------------------
async function openAdModal(ad) {
  // Create modal container if needed
  let modal = document.getElementById("adFullModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adFullModal";
    document.body.appendChild(modal);
  }

  // Debug: show ad & userId
  console.log("openAdModal: ad:", ad);
  console.log("openAdModal: ad.userId =", ad.userId);

  const u = await getUserInfo(ad.userId);
  console.log("openAdModal: user (getUserInfo returned) ->", u);
  if (u && u._raw) console.log("openAdModal: raw DB user object:", u._raw);

  const route = `${ad.fromRegion || ""}${ad.fromDistrict ? ", " + ad.fromDistrict : ""} → ${ad.toRegion || ""}${ad.toDistrict ? ", " + ad.toDistrict : ""}`;

  const depTime = formatTime(ad.departureTime || ad.startTime || ad.time || "");
  const created = formatTime(ad.createdAt || ad.created || ad.postedAt || "", { shortYear: false });

  // Fullname: prefer DB fullName; fallback to combined firstname/lastname or name/displayName or carNumber or phone
  const fullname = u.fullName || u.name || u.displayName || ((u._raw && (u._raw.firstname || u._raw.lastname)) ? `${u._raw.firstname || ""} ${u._raw.lastname || ""}`.trim() : "") || u.carNumber || u.phone || "Foydalanuvchi";

  const carFull = `${u.carModel || ""}${u.carColor ? " • " + u.carColor : ""}${u.carNumber ? " • " + u.carNumber : ""}`;

  // seats details
  const totalSeatsRaw = ad.totalSeats || ad.seatCount || ad.seats || null;
  const totalSeats = (totalSeatsRaw !== null && totalSeatsRaw !== undefined) ? Number(totalSeatsRaw) : null;
  const booked = Number(ad.bookedSeats || 0);
  const available = (typeof totalSeats === "number" && !isNaN(totalSeats)) ? Math.max(totalSeats - booked, 0) : null;

  const requestedRaw = ad.passengerCount || ad.requestedSeats || ad.requestSeats || ad.peopleCount || null;
  const requested = (requestedRaw !== null && requestedRaw !== undefined) ? Number(requestedRaw) : null;

  const avatar = u.avatar || "https://i.ibb.co/2W0z7Lx/user.png";

  // Build modal HTML
  modal.innerHTML = `
    <div style="
      position:fixed; inset:0; display:flex; justify-content:center; align-items:center;
      background: rgba(0,0,0,0.55);
      z-index:9999;
    ">
      <div style="background:#fff; width:min(920px,94%); border-radius:12px; padding:20px; box-shadow:0 10px 30px rgba(2,6,23,0.25);">
        <div style="display:flex; gap:14px; align-items:center; margin-bottom:10px;">
          <img src="${escapeHtml(avatar)}" style="width:72px;height:72px;border-radius:12px;object-fit:cover;">
          <div>
            <div style="font-size:20px; font-weight:700; color:#0b63c7;">${escapeHtml(fullname)}</div>
            <div style="color:#667085; font-size:13px; margin-top:6px;">${escapeHtml(u.carModel || "")} ${u.carModel && u.carNumber ? "•" : ""} ${escapeHtml(u.carNumber || "")}</div>
          </div>
        </div>

        <div style="display:flex; gap:20px; flex-wrap:wrap;">
          <div style="flex:1; min-width:240px;">
            <div style="font-weight:600">Yo‘nalish</div>
            <div style="margin-bottom:12px;">${escapeHtml(route)}</div>

            <div style="font-weight:600">Joylar</div>
            <div style="margin-bottom:12px;">
              ${
                totalSeats !== null
                  ? `${escapeHtml(String(totalSeats))} ta (Bo‘sh: ${escapeHtml(String(available))})`
                  : requested !== null
                    ? `Talab: ${escapeHtml(String(requested))} odam`
                    : "-"
              }
            </div>

            <div style="font-weight:600">Izoh</div>
            <div style="margin-bottom:12px;">${escapeHtml(ad.comment || "-")}</div>

            <div style="font-weight:600">Kontakt</div>
            <div style="margin-bottom:6px;">${escapeHtml(u.phone || "-")}</div>

          </div>

          <div style="width:260px; min-width:220px;">
            <div style="font-weight:600">Jo‘nash vaqti</div>
            <div style="margin-bottom:12px;">${escapeHtml(depTime)}</div>

            <div style="font-weight:600">Narx</div>
            <div style="margin-bottom:12px;">${escapeHtml(ad.price ? ad.price + " so‘m" : "-")}</div>

            <div style="font-weight:600; color:#88919a; font-size:13px; margin-top:12px;">Joylashtirilgan: ${escapeHtml(created)}</div>
          </div>
        </div>

        <div style="display:flex; gap:12px; margin-top:18px;">
          <button class="btn-primary" style="flex:0 0 220px; background:#0b63c7; color:#fff; padding:12px; border-radius:10px; border:none; font-weight:700;" onclick="closeAdModal()">Yopish</button>
          <button class="btn-ghost" style="flex:1; padding:12px; border-radius:10px; border:1px solid #e6eef9; background:#fff;" onclick="onContact('${escapeHtml(u.phone || "")}')">Qo'ng'iroq</button>
        </div>
      </div>
    </div>
  `;

  // clicking outside modal closes
  modal.style.display = "flex";
  modal.onclick = (e) => {
    // if clicked on overlay (modal itself)
    if (e.target === modal) closeAdModal();
  };
}

// Close modal
window.closeAdModal = function() {
  const modal = document.getElementById("adFullModal");
  if (modal) modal.style.display = "none";
};

// Contact handler
window.onContact = (phone) => {
  if (!phone) return alert("Telefon raqami mavjud emas");
  // open phone dialer
  window.location.href = `tel:${phone}`;
};

// LOGOUT
window.logout = () => signOut(auth);

// HTML escape helper
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

// Expose for debug
window._shahartaxi_debug = {
  formatTime, formatReal, getUserInfo
};

