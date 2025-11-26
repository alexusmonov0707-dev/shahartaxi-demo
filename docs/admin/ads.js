// ads.js — admin ads manager
// expects ../libs/lib.js to export: db, ref, get, remove (Firebase helper wrapper)
import { db, ref, get, remove } from "../libs/lib.js";

let adsCache = [];    // flattened list: { userId, adId, ...adFields }
let usersMap = {};    // users data from /users

// --- HELPERS ---
function formatDate(ts) {
  if (!ts) return "-";
  // some createdAt may be string or number (ms)
  const n = Number(ts);
  if (!isNaN(n)) return new Date(n).toLocaleString();
  // fallback
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function safe(val, fallback = "-") {
  if (val === undefined || val === null || val === "") return fallback;
  return val;
}

// --- RENDER ---
function renderAds(list) {
  const tbody = document.getElementById("adsTable");
  tbody.innerHTML = "";

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:18px;color:#666">E'lonlar mavjud emas</td></tr>`;
    return;
  }

  list.forEach(ad => {
    const user = usersMap[ad.userId] ?? {};
    const route = `${safe(ad.fromRegion, "-")} / ${safe(ad.fromDistrict, "-")} → ${safe(ad.toRegion, "-")} / ${safe(ad.toDistrict, "-")}`;

    const priceText = ad.price ? `${ad.price} so‘m` : "-";

    tbody.innerHTML += `
      <tr>
        <td>${safe(user.fullName, "Noma'lum")}<br><small style="color:#666">${safe(user.phone, "")}</small></td>
        <td>${route}</td>
        <td>${priceText}</td>
        <td>${formatDate(ad.createdAt)}</td>
        <td>
          <button class="btn view" onclick="openModal('${ad.userId}','${ad.adId}')">Ko'rish</button>
          <button class="btn delete" onclick="deleteAd('${ad.userId}','${ad.adId}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

// --- LOAD ---
async function loadAds() {
  const tbody = document.getElementById("adsTable");
  tbody.innerHTML = "<tr><td colspan='5' style='padding:18px;color:#666'>Yuklanmoqda...</td></tr>";

  const adsSnap = await get(ref(db, "ads"));
  const usersSnap = await get(ref(db, "users"));

  usersMap = usersSnap.exists() ? usersSnap.val() : {};

  if (!adsSnap.exists()) {
    renderAds([]);
    return;
  }

  adsCache = [];

  const adsRoot = adsSnap.val();

  // DATABASE LAYOUT: ads/{userId}/{adId}/{fields...}
  // Flatten them to array
  for (const userId in adsRoot) {
    const userAds = adsRoot[userId];
    if (!userAds) continue;
    for (const adId in userAds) {
      const ad = userAds[adId];
      if (!ad) continue;
      adsCache.push({
        userId,
        adId,
        ...ad
      });
    }
  }

  renderAds(adsCache);
}

// --- SEARCH ---
window.searchAds = function () {
  const q = (document.getElementById("search").value || "").toLowerCase().trim();

  if (!q) {
    renderAds(adsCache);
    return;
  }

  const filtered = adsCache.filter(ad => {
    const user = usersMap[ad.userId] ?? {};
    return (
      (user.fullName || "").toLowerCase().includes(q) ||
      (user.phone || "").toLowerCase().includes(q) ||
      (ad.fromRegion || "").toLowerCase().includes(q) ||
      (ad.fromDistrict || "").toLowerCase().includes(q) ||
      (ad.toRegion || "").toLowerCase().includes(q) ||
      (ad.toDistrict || "").toLowerCase().includes(q) ||
      (ad.comment || "").toLowerCase().includes(q) ||
      (String(ad.price || "")).toLowerCase().includes(q)
    );
  });

  renderAds(filtered);
};

// --- MODAL HANDLERS ---
window.openModal = function (userId, adId) {
  const ad = adsCache.find(a => a.userId === userId && a.adId === adId);
  const user = usersMap[userId] ?? {};

  if (!ad) return alert("E'lon topilmadi!");

  // fill modal fields
  const route = `${safe(ad.fromRegion, "-")} / ${safe(ad.fromDistrict, "-")} → ${safe(ad.toRegion, "-")} / ${safe(ad.toDistrict, "-")}`;
  document.getElementById("m_route").innerText = route;
  document.getElementById("m_depart").innerText = ad.departureTime ? formatDate(ad.departureTime) : "-";
  document.getElementById("m_price").innerText = ad.price ? `${ad.price} so‘m` : "-";
  document.getElementById("m_seats").innerText = safe(ad.seats, "-");
  document.getElementById("m_dseats").innerText = safe(ad.driverSeats, "-");
  document.getElementById("m_comment").innerText = safe(ad.comment, "-");
  document.getElementById("m_created").innerText = formatDate(ad.createdAt);

  document.getElementById("m_userName").innerText = safe(user.fullName, "Noma'lum");
  document.getElementById("m_userPhone").innerText = safe(user.phone, "-");
  document.getElementById("m_userRole").innerText = safe(user.role, "-");

  // avatar
  const avatarEl = document.getElementById("m_avatar");
  avatarEl.src = user.avatar || "/assets/default.png";
  avatarEl.alt = user.fullName || "avatar";

  // bind delete
  const deleteBtn = document.getElementById("deleteBtn");
  deleteBtn.onclick = () => deleteAd(userId, adId);

  // show modal
  const modal = document.getElementById("modal");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
};

// close
document.getElementById("closeBtn").addEventListener("click", () => {
  const modal = document.getElementById("modal");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
});

// allow click outside to close
document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") {
    document.getElementById("modal").style.display = "none";
    document.getElementById("modal").setAttribute("aria-hidden", "true");
  }
});

// --- DELETE ---
window.deleteAd = async function (userId, adId) {
  if (!confirm("E'lonni o'chirishni tasdiqlaysizmi?")) return;

  await remove(ref(db, `ads/${userId}/${adId}`));

  // refresh list
  await loadAds();

  // hide modal if open
  const modal = document.getElementById("modal");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

// init
loadAds();
