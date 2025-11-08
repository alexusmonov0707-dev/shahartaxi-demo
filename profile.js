// ===============================
// 📦 LOCALSTORAGE FUNKSIYALARI
// ===============================
function getUser() {
  return JSON.parse(localStorage.getItem("currentUser")) || null;
}

function saveUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function getAllAds() {
  return JSON.parse(localStorage.getItem("ads")) || [];
}

function saveAllAds(ads) {
  localStorage.setItem("ads", JSON.stringify(ads));
}

function validatePhone(phone) {
  // Faqat raqam va + belgisi bo‘lishi mumkin
  const regex = /^\+?\d{9,15}$/;
  return regex.test(phone.trim());
}

// ===============================
// 🔐 PROFILNI YUKLASH
// ===============================
const user = getUser();
const profileName = document.getElementById("profileName");
const profilePhone = document.getElementById("profilePhone");
const profileEmail = document.getElementById("profileEmail");
const editProfileBtn = document.getElementById("editProfileBtn");
const editForm = document.getElementById("editForm");
const addAdBtn = document.getElementById("addAdBtn");
const addForm = document.getElementById("addForm");
const adsContainer = document.getElementById("adsContainer");
const avgRatingEl = document.getElementById("avgRating");
const starContainer = document.getElementById("starContainer");

if (!user) {
  window.location.href = "login.html";
}

// ===============================
// 🧍 PROFIL MA’LUMOTLARINI KO‘RSATISH
// ===============================
function renderProfile() {
  const u = getUser();
  if (!u) return;

  profileName.textContent = u.name || "Foydalanuvchi";
  profilePhone.textContent = `Telefon: ${u.phone || "-"}`;
  profileEmail.textContent = `Email: ${u.email || "-"}`;
  renderRating(u);
}

// ===============================
// ⭐ FOYDALANUVCHI REYTINGI
// ===============================
function renderRating(user) {
  const stars = Math.round(user.rating || 0);
  starContainer.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.textContent = i <= stars ? "★" : "☆";
    star.style.color = i <= stars ? "gold" : "#ccc";
    starContainer.appendChild(star);
  }
  avgRatingEl.textContent = `(${user.rating?.toFixed(1) || "0.0"})`;
}

// ===============================
// ✏️ PROFIL TAHRIRLASH
// ===============================
editProfileBtn.addEventListener("click", () => {
  editForm.style.display = editForm.style.display === "block" ? "none" : "block";

  const u = getUser();
  document.getElementById("editName").value = u.name || "";
  document.getElementById("editPhone").value = u.phone || "";
  document.getElementById("editEmail").value = u.email || "";
});

editForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("editName").value.trim();
  const phone = document.getElementById("editPhone").value.trim();
  const email = document.getElementById("editEmail").value.trim();

  if (!validatePhone(phone)) {
    alert("❌ Telefon raqam noto‘g‘ri formatda kiritildi!");
    return;
  }

  const updated = { ...getUser(), name, phone, email };
  saveUser(updated);
  alert("✅ Profil ma’lumotlari yangilandi!");
  editForm.style.display = "none";
  renderProfile();
});

// ===============================
// ➕ YANGI E’LON QO‘SHISH
// ===============================
addAdBtn.addEventListener("click", () => {
  addForm.style.display = addForm.style.display === "block" ? "none" : "block";
});

addForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const from = document.getElementById("from").value.trim();
  const to = document.getElementById("to").value.trim();
  const price = document.getElementById("price").value.trim();
  const desc = document.getElementById("desc").value.trim();

  if (!from || !to || !price) {
    alert("⚠️ Barcha majburiy maydonlarni to‘ldiring!");
    return;
  }

  const ads = getAllAds();
  const newAd = {
    id: Date.now(),
    userId: user.id,
    userName: user.name,
    phone: user.phone,
    from,
    to,
    price,
    desc,
    date: new Date().toLocaleString(),
    status: "pending",
    editable: true,
    rating: 0,
    comments: [],
  };

  ads.push(newAd);
  saveAllAds(ads);
  alert("✅ E’lon joylandi! Admin tasdiqlashini kuting.");
  addForm.reset();
  addForm.style.display = "none";
  renderUserAds();
});

// ===============================
// 🧾 E’LONLARNI CHIZISH
// ===============================
function renderUserAds() {
  const allAds = getAllAds();
  const myAds = allAds.filter((a) => a.userId === user.id);
  adsContainer.innerHTML = "";

  if (myAds.length === 0) {
    adsContainer.innerHTML = "<p>Hozircha e’lonlar mavjud emas.</p>";
    return;
  }

  myAds.sort((a, b) => b.id - a.id);
  myAds.forEach((ad) => {
    const card = document.createElement("div");
    card.className = "ad-card";

    const header = document.createElement("div");
    header.className = "ad-header";

    const h4 = document.createElement("h4");
    h4.textContent = `${ad.from} → ${ad.to}`;

    const status = document.createElement("span");
    status.className = "ad-status";
    if (ad.status === "approved") status.classList.add("status-approved");
    if (ad.status === "pending") status.classList.add("status-pending");
    if (ad.status === "rejected") status.classList.add("status-rejected");
    status.textContent =
      ad.status === "approved"
        ? "✅ Tasdiqlangan"
        : ad.status === "pending"
        ? "⏳ Kutilmoqda"
        : "❌ Rad etilgan";

    header.append(h4, status);

    const body = document.createElement("div");
    body.className = "ad-body";
    body.innerHTML = `
      <p><strong>Narx:</strong> ${ad.price} so‘m</p>
      <p><strong>Qo‘shimcha:</strong> ${ad.desc || "-"}</p>
      <p><strong>Sana:</strong> ${ad.date}</p>
    `;

    const actions = document.createElement("div");
    actions.className = "ad-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "✏️ Tahrirlash";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "🗑 O‘chirish";

    const ratingSection = document.createElement("div");
    ratingSection.className = "rating-section";

    if (ad.status === "approved") {
      const stars = document.createElement("div");
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement("span");
        star.textContent = i <= ad.rating ? "★" : "☆";
        star.classList.toggle("active", i <= ad.rating);
        star.addEventListener("click", () => rateAd(ad.id, i));
        stars.appendChild(star);
      }
      ratingSection.appendChild(stars);

      const commentBox = document.createElement("div");
      commentBox.className = "comment-box";
      commentBox.innerHTML = `
        <textarea id="comment-${ad.id}" placeholder="Izoh yozish..."></textarea>
        <button onclick="saveComment(${ad.id})">Izohni saqlash</button>
      `;
      ratingSection.appendChild(commentBox);
    }

    // 🔒 Tasdiqlangan elonlarda tahrirlash cheklovi
    if (ad.status === "approved" || ad.status === "rejected") {
      editBtn.disabled = true;
      editBtn.style.opacity = "0.6";
    }

    editBtn.addEventListener("click", () => editAd(ad.id));
    deleteBtn.addEventListener("click", () => deleteAd(ad.id));

    actions.append(editBtn, deleteBtn);
    card.append(header, body, actions);

    if (ad.status === "approved") card.appendChild(ratingSection);

    adsContainer.appendChild(card);
  });
}

// ===============================
// ✏️ E’LONNI TAHRIRLASH
// ===============================
function editAd(id) {
  const ads = getAllAds();
  const ad = ads.find((a) => a.id === id);

  if (!ad) return;

  if (!ad.editable) {
    alert("❌ Bu e’lonni tahrirlashga ruxsat yo‘q!");
    return;
  }

  const from = prompt("Qayerdan:", ad.from);
  const to = prompt("Qayerga:", ad.to);
  const price = prompt("Narx (so‘m):", ad.price);

  if (!from || !to || !price) {
    alert("⚠️ Barcha maydonlarni to‘ldiring!");
    return;
  }

  ad.from = from;
  ad.to = to;
  ad.price = price;
  ad.date = new Date().toLocaleString();
  ad.editable = false; // faqat bir marta tahrirlashga ruxsat
  saveAllAds(ads);
  renderUserAds();
  alert("✅ E’lon yangilandi!");
}

// ===============================
// ❌ E’LONNI O‘CHIRISH
// ===============================
function deleteAd(id) {
  if (!confirm("E’loni o‘chirishni xohlaysizmi?")) return;
  const ads = getAllAds().filter((a) => a.id !== id);
  saveAllAds(ads);
  renderUserAds();
  alert("🗑 E’lon o‘chirildi!");
}

// ===============================
// ⭐ BAHO BERISH
// ===============================
function rateAd(id, stars) {
  const ads = getAllAds();
  const ad = ads.find((a) => a.id === id);
  if (!ad) return;

  ad.rating = stars;
  saveAllAds(ads);
  renderUserAds();
  updateUserRating();
}

// ===============================
// 💬 IZOH QO‘SHISH
// ===============================
function saveComment(id) {
  const ads = getAllAds();
  const ad = ads.find((a) => a.id === id);
  if (!ad) return;

  const textarea = document.getElementById(`comment-${id}`);
  const text = textarea.value.trim();
  if (!text) return alert("⚠️ Izoh bo‘sh bo‘lishi mumkin emas!");

  ad.comments = ad.comments || [];
  ad.comments.push({
    text,
    author: user.name,
    date: new Date().toLocaleString(),
  });

  saveAllAds(ads);
  textarea.value = "";
  alert("✅ Izoh saqlandi!");
}

// ===============================
// 📈 REYTINGNI HISOBLASH
// ===============================
function updateUserRating() {
  const allAds = getAllAds();
  const myAds = allAds.filter((a) => a.userId === user.id && a.rating > 0);
  if (myAds.length === 0) return;

  const avg = myAds.reduce((sum, a) => sum + a.rating, 0) / myAds.length;
  const u = getUser();
  u.rating = avg;
  saveUser(u);
  renderProfile();
}

// ===============================
// 🚪 CHIQISH
// ===============================
document.getElementById("logoutBtn").addEventListener("click", () => {
  if (confirm("Chiqmoqchimisiz?")) {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
  }
});

// ===============================
// 🚀 BOSHLANG‘ICH YUKLASH
// ===============================
renderProfile();
renderUserAds();
