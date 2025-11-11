// ====================
// Profil sahifa JS (offline demo)
// ====================

// HTML elementlarini olish
const profileName = document.getElementById("profileName");
const profilePhone = document.getElementById("profilePhone");
const profileEmail = document.getElementById("profileEmail");
const avgRating = document.getElementById("avgRating");
const starContainer = document.getElementById("starContainer");

const editProfileBtn = document.getElementById("editProfileBtn");
const addAdBtn = document.getElementById("addAdBtn");
const logoutBtn = document.getElementById("logoutBtn");

const editForm = document.getElementById("editForm");
const addForm = document.getElementById("addForm");
const adsContainer = document.getElementById("adsContainer");

const regionSelect = document.getElementById("regionSelect");
const citySelect = document.getElementById("citySelect");

// ====================
// Dastlabki ma’lumotlar (viloyat va shaharlar)
// ====================
const locationData = {
  "Toshkent viloyati": ["Toshkent shahri", "Olmaliq", "Angren", "Chirchiq"],
  "Andijon viloyati": ["Andijon", "Asaka", "Xonobod"],
  "Farg‘ona viloyati": ["Farg‘ona", "Qo‘qon", "Marg‘ilon"],
  "Namangan viloyati": ["Namangan", "Chortoq", "Uchqo‘rg‘on"],
};

// ====================
// LocalStorage bilan ishlovchi yordamchi funksiyalar
// ====================
function getUser() {
  return JSON.parse(localStorage.getItem("user")) || {
    name: "Foydalanuvchi",
    phone: "+998",
    email: "user@example.com",
  };
}

function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

function getAds() {
  return JSON.parse(localStorage.getItem("ads")) || [];
}

function saveAds(ads) {
  localStorage.setItem("ads", JSON.stringify(ads));
}

// ====================
// Profilni ko‘rsatish
// ====================
function loadProfile() {
  const user = getUser();
  profileName.textContent = user.name;
  profilePhone.textContent = "Telefon: " + user.phone;
  profileEmail.textContent = "Email: " + user.email;

  // Reyting (demo uchun random)
  const rating = parseFloat(localStorage.getItem("rating")) || 4.2;
  avgRating.textContent = `(${rating.toFixed(1)})`;
  starContainer.innerHTML = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
}

// ====================
// Viloyat va shahar selectlarini to‘ldirish
// ====================
function populateRegions() {
  regionSelect.innerHTML = '<option value="">Viloyatni tanlang</option>';
  Object.keys(locationData).forEach(region => {
    const opt = document.createElement("option");
    opt.value = region;
    opt.textContent = region;
    regionSelect.appendChild(opt);
  });
}

regionSelect.addEventListener("change", () => {
  const region = regionSelect.value;
  citySelect.innerHTML = '<option value="">Shaharni tanlang</option>';
  if (region && locationData[region]) {
    locationData[region].forEach(city => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      citySelect.appendChild(opt);
    });
  }
});

// ====================
// E’lonlarni ko‘rsatish
// ====================
function renderAds() {
  const ads = getAds();
  adsContainer.innerHTML = "";

  if (ads.length === 0) {
    adsContainer.innerHTML = "<p>Hozircha e’lonlar mavjud emas.</p>";
    return;
  }

  ads.forEach((ad, index) => {
    const card = document.createElement("div");
    card.className = "ad-card";

    // Statusga qarab rang
    let statusClass = "status-pending";
    if (ad.status === "Tasdiqlangan") statusClass = "status-approved";
    else if (ad.status === "Rad etilgan") statusClass = "status-rejected";

    card.innerHTML = `
      <div class="ad-header">
        <h4>${ad.region} — ${ad.city}</h4>
        <span class="ad-status ${statusClass}">${ad.status}</span>
      </div>
      <div class="ad-body">
        <p><strong>Narx:</strong> ${ad.price} so‘m</p>
        <p>${ad.desc || ""}</p>
      </div>
      <div class="ad-actions">
        <button class="edit-btn" onclick="editAd(${index})">Tahrirlash</button>
        <button class="delete-btn" onclick="deleteAd(${index})">O‘chirish</button>
      </div>
    `;
    adsContainer.appendChild(card);
  });
}

// ====================
// Profilni tahrirlash
// ====================
editProfileBtn.addEventListener("click", () => {
  const user = getUser();
  editForm.style.display = editForm.style.display === "block" ? "none" : "block";
  addForm.style.display = "none";
  document.getElementById("editName").value = user.name;
  document.getElementById("editPhone").value = user.phone;
  document.getElementById("editEmail").value = user.email;
});

editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const updatedUser = {
    name: document.getElementById("editName").value.trim(),
    phone: document.getElementById("editPhone").value.trim(),
    email: document.getElementById("editEmail").value.trim(),
  };
  saveUser(updatedUser);
  editForm.style.display = "none";
  loadProfile();
});

// ====================
// Yangi e’lon joylash
// ====================
addAdBtn.addEventListener("click", () => {
  addForm.style.display = addForm.style.display === "block" ? "none" : "block";
  editForm.style.display = "none";
});

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const region = regionSelect.value;
  const city = citySelect.value;
  const price = document.getElementById("price").value.trim();
  const desc = document.getElementById("desc").value.trim();

  if (!region || !city || !price) {
    alert("Iltimos, barcha majburiy maydonlarni to‘ldiring!");
    return;
  }

  const newAd = {
    region,
    city,
    price,
    desc,
    status: "Kutilmoqda",
  };

  const ads = getAds();
  ads.push(newAd);
  saveAds(ads);

  addForm.reset();
  addForm.style.display = "none";
  renderAds();
});

// ====================
// E’lonni tahrirlash
// ====================
window.editAd = function (index) {
  const ads = getAds();
  const ad = ads[index];
  const newPrice = prompt("Yangi narxni kiriting:", ad.price);
  if (newPrice === null) return;
  ads[index].price = newPrice.trim() || ad.price;
  saveAds(ads);
  renderAds();
};

// ====================
// E’lonni o‘chirish
// ====================
window.deleteAd = function (index) {
  if (!confirm("Haqiqatan ham o‘chirmoqchimisiz?")) return;
  const ads = getAds();
  ads.splice(index, 1);
  saveAds(ads);
  renderAds();
};

// ====================
// Chiqish
// ====================
logoutBtn.addEventListener("click", () => {
  if (confirm("Chiqmoqchimisiz?")) {
    localStorage.clear();
    location.reload();
  }
});

// ====================
// Boshlang‘ich yuklash
// ====================
function init() {
  loadProfile();
  populateRegions();
  renderAds();
}

document.addEventListener("DOMContentLoaded", init);
