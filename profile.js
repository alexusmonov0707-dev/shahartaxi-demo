/* ==============================================
   SHAHARTAXI - PROFILE PAGE FULL JS (OFFLINE DEMO)
   ============================================== */

/*
  FUNKSIYALAR:
  1. Foydalanuvchi profili yuklanadi
  2. Foydalanuvchi telefon raqami avtomatik chiqadi
  3. E’lon joylash formasi validatsiya
  4. Viloyat va shahar tanlash (regions.js dan)
  5. Yangi e’lon joylash va localStorage ga saqlash
  6. “Mening e’lonlarim” bo‘limi
  7. Status ranglari: Tasdiqlangan (yashil), Kutilyapti (sariq), Rad etilgan (qizil)
  8. E’lon tahrirlash (faqat “kutilyapti” holatida)
  9. Sana va vaqt to‘g‘ri formatda ko‘rsatiladi
  10. Avtomatik yangilanish
*/

// ==== GLOBAL O'ZGARUVCHILAR ====
let currentUser = null;
let regionsData = [];
let allAds = [];

// ==== DOM ELEMENTLAR ====
const regionSelect = document.getElementById("region");
const citySelect = document.getElementById("city");
const directionField = document.getElementById("direction");
const phoneField = document.getElementById("phone");
const dateField = document.getElementById("date");
const timeField = document.getElementById("time");
const addAdForm = document.getElementById("addAdForm");
const adsContainer = document.getElementById("myAds");
const statusFilter = document.getElementById("statusFilter");

// ==== RANGLAR VA STATUS ====
const STATUS_COLORS = {
  "tasdiqlangan": "#4CAF50",
  "kutilyapti": "#FFC107",
  "rad etilgan": "#F44336"
};

// ==== REGIONS.JS DAN MA’LUMOT O‘QISH ====
async function loadRegions() {
  try {
    const res = await fetch("regions.js");
    const text = await res.text();
    const jsonMatch = text.match(/=\s*(\{[\s\S]*\});?/);
    if (jsonMatch) {
      regionsData = JSON.parse(jsonMatch[1]);
      fillRegions();
    }
  } catch (err) {
    console.error("Viloyatlar yuklanmadi:", err);
  }
}

// ==== VILOYATLARNI TO‘LDIRISH ====
function fillRegions() {
  regionSelect.innerHTML = `<option value="">Viloyatni tanlang</option>`;
  Object.keys(regionsData).forEach(region => {
    const opt = document.createElement("option");
    opt.value = region;
    opt.textContent = region;
    regionSelect.appendChild(opt);
  });
}

// ==== SHAHARLARNI TANLASH ====
regionSelect.addEventListener("change", () => {
  const region = regionSelect.value;
  citySelect.innerHTML = `<option value="">Shaharni tanlang</option>`;
  if (region && regionsData[region]) {
    regionsData[region].forEach(city => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      citySelect.appendChild(opt);
    });
  }
});

// ==== YO‘NALISHNI YARATISH ====
citySelect.addEventListener("change", () => {
  const region = regionSelect.value;
  const city = citySelect.value;
  if (region && city) {
    directionField.value = `${region} → ${city}`;
  }
});

// ==== PROFIL TELEFONINI AVTOMATIK TO‘LDIRISH ====
function loadUserProfile() {
  const userData = JSON.parse(localStorage.getItem("currentUser"));
  if (userData) {
    currentUser = userData;
    phoneField.value = userData.phone;
    phoneField.setAttribute("readonly", true);
  } else {
    phoneField.value = "";
    alert("Profil topilmadi. Iltimos, qayta kiring.");
  }
}

// ==== E’LONLARNI LOCALSTORAGE DAN O‘QISH ====
function loadAds() {
  const saved = JSON.parse(localStorage.getItem("ads")) || [];
  allAds = saved;
  showUserAds();
}

// ==== E’LONNI SAQLASH ====
function saveAd(ad) {
  allAds.push(ad);
  localStorage.setItem("ads", JSON.stringify(allAds));
  showUserAds();
}

// ==== E’LON FORMASINI YUBORISH ====
addAdForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = {
    id: Date.now(),
    region: regionSelect.value,
    city: citySelect.value,
    direction: directionField.value,
    date: dateField.value,
    time: timeField.value,
    phone: phoneField.value,
    status: "kutilyapti",
    createdAt: new Date().toISOString(),
  };

  if (!formData.region || !formData.city || !formData.date || !formData.time) {
    alert("Iltimos, barcha maydonlarni to‘ldiring!");
    return;
  }

  saveAd(formData);
  addAdForm.reset();
  phoneField.value = currentUser.phone;
  alert("E’lon muvaffaqiyatli joylandi. Tasdiqlanishni kuting!");
});

// ==== STATUSGA KO‘RA RANGLARNI BERISH ====
function getStatusColor(status) {
  return STATUS_COLORS[status.toLowerCase()] || "#ccc";
}

// ==== MENING E’LONLARIMNI KO‘RSATISH ====
function showUserAds() {
  if (!currentUser) return;

  adsContainer.innerHTML = "";

  const userAds = allAds.filter(ad => ad.phone === currentUser.phone);

  if (userAds.length === 0) {
    adsContainer.innerHTML = `<p class="empty">Hozircha sizda e’lonlar yo‘q.</p>`;
    return;
  }

  userAds.forEach(ad => {
    const adBox = document.createElement("div");
    adBox.className = "ad-card";
    adBox.style.borderLeft = `6px solid ${getStatusColor(ad.status)}`;

    const createdDate = new Date(ad.createdAt).toLocaleString("uz-UZ");

    adBox.innerHTML = `
      <div class="ad-info">
        <h3>${ad.direction}</h3>
        <p><b>Viloyat:</b> ${ad.region}</p>
        <p><b>Shahar:</b> ${ad.city}</p>
        <p><b>Sana:</b> ${ad.date} | <b>Vaqt:</b> ${ad.time}</p>
        <p><b>Status:</b> 
          <span class="status" style="color:${getStatusColor(ad.status)}">${ad.status}</span>
        </p>
        <p class="created"><i>Joylangan sana:</i> ${createdDate}</p>
      </div>
      <div class="ad-actions">
        <button class="editAd" ${ad.status === "kutilyapti" ? "" : "disabled"} data-id="${ad.id}">✏️</button>
        <button class="deleteAd" data-id="${ad.id}">🗑️</button>
      </div>
    `;

    adsContainer.appendChild(adBox);
  });

  setupAdActions();
}

// ==== E’LONNI TAXRIRLASH VA O‘CHIRISH ====
function setupAdActions() {
  document.querySelectorAll(".deleteAd").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.target.dataset.id);
      allAds = allAds.filter(a => a.id !== id);
      localStorage.setItem("ads", JSON.stringify(allAds));
      showUserAds();
    });
  });

  document.querySelectorAll(".editAd").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.target.dataset.id);
      const ad = allAds.find(a => a.id === id);
      if (!ad || ad.status !== "kutilyapti") return;

      regionSelect.value = ad.region;
      fillCitiesForEdit(ad.region, ad.city);
      directionField.value = ad.direction;
      dateField.value = ad.date;
      timeField.value = ad.time;

      allAds = allAds.filter(a => a.id !== id);
      localStorage.setItem("ads", JSON.stringify(allAds));

      alert("E’lonni tahrirlang va saqlang!");
    });
  });
}

function fillCitiesForEdit(region, selectedCity) {
  citySelect.innerHTML = `<option value="">Shaharni tanlang</option>`;
  if (region && regionsData[region]) {
    regionsData[region].forEach(city => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      if (city === selectedCity) opt.selected = true;
      citySelect.appendChild(opt);
    });
  }
}

// ==== FILTRLASH STATUS BO‘YICHA ====
statusFilter.addEventListener("change", () => {
  const statusVal = statusFilter.value.toLowerCase();
  const filtered = allAds.filter(ad =>
    ad.phone === currentUser.phone &&
    (statusVal === "barchasi" || ad.status === statusVal)
  );
  renderFilteredAds(filtered);
});

function renderFilteredAds(list) {
  adsContainer.innerHTML = "";
  list.forEach(ad => {
    const adBox = document.createElement("div");
    adBox.className = "ad-card";
    adBox.style.borderLeft = `6px solid ${getStatusColor(ad.status)}`;
    const createdDate = new Date(ad.createdAt).toLocaleString("uz-UZ");
    adBox.innerHTML = `
      <h3>${ad.direction}</h3>
      <p><b>${ad.region}</b> → <b>${ad.city}</b></p>
      <p><b>Sana:</b> ${ad.date} | <b>Vaqt:</b> ${ad.time}</p>
      <p><b>Status:</b> <span style="color:${getStatusColor(ad.status)}">${ad.status}</span></p>
      <p class="created"><i>${createdDate}</i></p>
    `;
    adsContainer.appendChild(adBox);
  });
}

// ==== SAHIFA YUKLANGANDA ====
window.addEventListener("DOMContentLoaded", () => {
  loadRegions();
  loadUserProfile();
  loadAds();
});

// ==== STIL VA LAYOUT ====
const style = document.createElement("style");
style.textContent = `
  .ad-card {
    background: #fff;
    padding: 15px;
    margin-bottom: 10px;
    border-radius: 10px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    display: flex;
    justify-content: space-between;
  }
  .ad-actions button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
  }
  .ad-actions button[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .empty {
    text-align: center;
    color: #666;
  }
`;
document.head.appendChild(style);
