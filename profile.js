// profile.js – ShaharTaxi to‘liq profil sahifasi funksiyalari
// ================================================

// 1️⃣ DOM elementlarni olish
const profileName = document.getElementById("profileName");
const profilePhone = document.getElementById("profilePhone");
const profileEmail = document.getElementById("profileEmail");
const starContainer = document.getElementById("starContainer");
const avgRating = document.getElementById("avgRating");

const editProfileBtn = document.getElementById("editProfileBtn");
const addAdBtn = document.getElementById("addAdBtn");
const logoutBtn = document.getElementById("logoutBtn");

const editForm = document.getElementById("editForm");
const addForm = document.getElementById("addForm");

const editName = document.getElementById("editName");
const editPhone = document.getElementById("editPhone");
const editEmail = document.getElementById("editEmail");

const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const priceInput = document.getElementById("price");
const descInput = document.getElementById("desc");
const adsContainer = document.getElementById("adsContainer");


// 2️⃣ LocalStorage bilan ishlash
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || {
  name: "Foydalanuvchi",
  phone: "",
  email: ""
};

let ads = JSON.parse(localStorage.getItem("ads")) || [];


// 3️⃣ Profilni render qilish
function renderProfile() {
  profileName.textContent = currentUser.name;
  profilePhone.textContent = `Telefon: ${currentUser.phone || "—"}`;
  profileEmail.textContent = `Email: ${currentUser.email || "—"}`;

  renderRating();
}

// 4️⃣ Reytingni hisoblash
function renderRating() {
  const userAds = ads.filter(ad => ad.user === currentUser.email);
  let allRatings = [];

  userAds.forEach(ad => {
    if (Array.isArray(ad.ratings)) allRatings.push(...ad.ratings);
  });

  const avg = allRatings.length
    ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
    : "0.0";

  avgRating.textContent = `(${avg})`;

  starContainer.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.textContent = i <= Math.round(avg) ? "★" : "☆";
    starContainer.appendChild(star);
  }
}


// 5️⃣ Profilni tahrirlash faqat bir marta
let profileEdited = localStorage.getItem("profileEdited") === "true";

editProfileBtn.addEventListener("click", () => {
  if (profileEdited) {
    alert("Profilni faqat bir marta tahrirlash mumkin!");
    return;
  }

  addForm.style.display = "none";
  editForm.style.display =
    editForm.style.display === "block" ? "none" : "block";

  editName.value = currentUser.name;
  editPhone.value = currentUser.phone;
  editEmail.value = currentUser.email;
});

editForm.addEventListener("submit", e => {
  e.preventDefault();

  const phoneRegex = /^[+]?[0-9]{9,15}$/;
  if (!phoneRegex.test(editPhone.value.trim())) {
    alert("Iltimos, faqat telefon raqamini to‘g‘ri formatda kiriting!");
    return;
  }

  currentUser.name = editName.value.trim();
  currentUser.phone = editPhone.value.trim();
  currentUser.email = editEmail.value.trim();

  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  localStorage.setItem("profileEdited", "true");

  profileEdited = true;
  editForm.style.display = "none";
  renderProfile();
});


// 6️⃣ Logout tugmasi
logoutBtn.addEventListener("click", () => {
  if (confirm("Chiqmoqchimisiz?")) {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
  }
});


// 7️⃣ E’lon joylash
addAdBtn.addEventListener("click", () => {
  editForm.style.display = "none";
  addForm.style.display =
    addForm.style.display === "block" ? "none" : "block";
});

addForm.addEventListener("submit", e => {
  e.preventDefault();

  const newAd = {
    id: Date.now(),
    user: currentUser.email,
    from: fromInput.value.trim(),
    to: toInput.value.trim(),
    price: priceInput.value.trim(),
    desc: descInput.value.trim(),
    status: "pending",
    ratings: [],
    comments: []
  };

  ads.push(newAd);
  localStorage.setItem("ads", JSON.stringify(ads));

  addForm.reset();
  addForm.style.display = "none";
  renderUserAds();
});


// 8️⃣ E’lonlarni chiqarish
function renderUserAds() {
  adsContainer.innerHTML = "";

  const userAds = ads.filter(ad => ad.user === currentUser.email);

  if (userAds.length === 0) {
    adsContainer.innerHTML = "<p>Hozircha e’lonlar yo‘q.</p>";
    return;
  }

  userAds.forEach(ad => {
    const adCard = document.createElement("div");
    adCard.className = "ad-card";

    const statusClass =
      ad.status === "approved"
        ? "status-approved"
        : ad.status === "rejected"
        ? "status-rejected"
        : "status-pending";

    const statusText =
      ad.status === "approved"
        ? "Tasdiqlangan"
        : ad.status === "rejected"
        ? "Rad etilgan"
        : "Kutilmoqda";

    adCard.innerHTML = `
      <div class="ad-header">
        <h4>${ad.from} → ${ad.to}</h4>
        <span class="ad-status ${statusClass}">${statusText}</span>
      </div>

      <div class="ad-body">
        <p><b>Narx:</b> ${ad.price} so‘m</p>
        <p>${ad.desc || ""}</p>
      </div>

      <div class="ad-actions">
        <button class="edit-btn" ${
          ad.status === "approved" ? "disabled" : ""
        }>Tahrirlash</button>
        <button class="delete-btn">O‘chirish</button>
      </div>

      <div class="rating-section">
        <span data-rate="1">★</span>
        <span data-rate="2">★</span>
        <span data-rate="3">★</span>
        <span data-rate="4">★</span>
        <span data-rate="5">★</span>
      </div>

      <div class="comment-box">
        <textarea placeholder="Sharh yozing..."></textarea>
        <button>Yuborish</button>
      </div>
    `;

    // 🟢 e’lonni tahrirlash
    const editBtn = adCard.querySelector(".edit-btn");
    const deleteBtn = adCard.querySelector(".delete-btn");
    const stars = adCard.querySelectorAll(".rating-section span");
    const commentBox = adCard.querySelector(".comment-box textarea");
    const commentBtn = adCard.querySelector(".comment-box button");

    editBtn.addEventListener("click", () => {
      if (ad.status === "approved") {
        alert("Tasdiqlangan e’lonni tahrirlash mumkin emas!");
        return;
      }

      const newFrom = prompt("Yangi 'Qayerdan' manzil:", ad.from);
      const newTo = prompt("Yangi 'Qayerga' manzil:", ad.to);
      const newPrice = prompt("Yangi narx:", ad.price);

      if (newFrom && newTo && newPrice) {
        ad.from = newFrom;
        ad.to = newTo;
        ad.price = newPrice;
        ad.status = "pending";
        localStorage.setItem("ads", JSON.stringify(ads));
        renderUserAds();
      }
    });

    // 🔴 e’lonni o‘chirish
    deleteBtn.addEventListener("click", () => {
      if (confirm("E’loni o‘chirmoqchimisiz?")) {
        ads = ads.filter(a => a.id !== ad.id);
        localStorage.setItem("ads", JSON.stringify(ads));
        renderUserAds();
      }
    });

    // ⭐ Reyting qo‘yish
    stars.forEach(star => {
      star.addEventListener("click", () => {
        const rate = Number(star.dataset.rate);
        ad.ratings.push(rate);
        localStorage.setItem("ads", JSON.stringify(ads));
        renderRating();
      });
    });

    // 💬 Sharh yozish
    commentBtn.addEventListener("click", () => {
      const text = commentBox.value.trim();
      if (!text) return alert("Sharh yozing!");
      ad.comments.push(text);
      localStorage.setItem("ads", JSON.stringify(ads));
      commentBox.value = "";
      alert("Sharh qo‘shildi!");
    });

    adsContainer.appendChild(adCard);
  });
}


// 🔟 Admin tomonidan tasdiqlash (test uchun)
function autoApproveAds() {
  ads.forEach(ad => {
    if (ad.status === "pending") {
      const rand = Math.random();
      if (rand > 0.6) ad.status = "approved";
      else if (rand < 0.2) ad.status = "rejected";
    }
  });
  localStorage.setItem("ads", JSON.stringify(ads));
}


// 🔁 Boshlang‘ich chaqiruvlar
renderProfile();
autoApproveAds();
renderUserAds();
