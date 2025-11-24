import {
  auth,
  db,
  ref,
  set,
  createUserWithEmailAndPassword
} from "/shahartaxi-demo/docs/libs/lib.js";

// IMGBB key (agar o'zgartirsang o'zingniki)
const IMGBB_API_KEY = "c1e60d9bd47514a3bce5c700011aa4ab";

// upload helper
async function uploadImageToImgbb(file) {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  if (!data.success) throw new Error("Rasm yuklashda xato");
  return data.data.url;
}

// DOM
const nameInput = document.getElementById("fullName");
const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const roleSelect = document.getElementById("role");

const driverFields = document.getElementById("driverFields");
const carModelInput = document.getElementById("carModel");
const carColorInput = document.getElementById("carColor");
const carNumberInput = document.getElementById("carNumber");
const licenseInput = document.getElementById("license");
const birthdateInput = document.getElementById("birthdate");
const techPassportInput = document.getElementById("techPassport");
const avatarInput = document.getElementById("avatar");

const registerBtn = document.getElementById("registerBtn");

roleSelect.onchange = () => {
  if (roleSelect.value === "driver") driverFields.classList.remove("hidden");
  else driverFields.classList.add("hidden");
};

registerBtn.onclick = async () => {
  const fullName = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;
  const role = roleSelect.value;

  if (!fullName || !phone || !password) {
    alert("Iltimos: ism, telefon va parolni kiriting.");
    return;
  }

  // driver specific checks
  let carModel = null, carColor = null, carNumber = null, license = null, birthdate = null;
  let techPassportUrl = null, avatarUrl = null;

  if (role === "driver") {
    carModel = carModelInput.value.trim();
    carColor = carColorInput.value.trim();
    carNumber = carNumberInput.value.trim();
    license = licenseInput.value.trim();
    birthdate = birthdateInput.value;

    if (!carModel || !carColor || !carNumber || !license || !birthdate) {
      alert("Haydovchi uchun barcha maydonlar to‘ldirilishi kerak.");
      return;
    }

    if (!techPassportInput.files[0]) {
      alert("Tex pasport rasm majburiy.");
      return;
    }

    try {
      techPassportUrl = await uploadImageToImgbb(techPassportInput.files[0]);
    } catch (e) {
      console.error(e);
      alert("Tex pasport yuklashda xato.");
      return;
    }
  }

  // avatar optional
  if (avatarInput.files[0]) {
    try {
      avatarUrl = await uploadImageToImgbb(avatarInput.files[0]);
    } catch (e) {
      console.warn("Avatar yuklash xatosi, davom etamiz.");
    }
  }

  // create user (email fake)
  const emailFake = phone + "@shahartaxi.uz";
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, emailFake, password);
  } catch (err) {
    console.error(err);
    alert("Ro‘yxatdan o‘tishda xatolik — foydalanuvchi allaqachon bor yoki server xatosi.");
    return;
  }

  const uid = userCredential.user.uid;

  // write user data to DB; do NOT store password
  const userObj = {
    uid,
    fullName,
    phone,
    role,
    avatar: avatarUrl || null,
    balance: 0,
    subscriptions: { taxi: { active: false } },
    createdAt: Date.now(),
    verified: role === "driver" ? false : true  // drivers must be verified by admin
  };

  if (role === "driver") {
    userObj.carModel = carModel;
    userObj.carColor = carColor;
    userObj.carNumber = carNumber;
    userObj.license = license;
    userObj.birthdate = birthdate;
    userObj.techPassportUrl = techPassportUrl;
  }

  await set(ref(db, "users/" + uid), userObj);

  alert("Ro‘yxatdan o‘tildi! Agar haydovchi bo‘lsangiz, admin tasdiqlashini kuting.");
  window.location.href = "/shahartaxi-demo/app/user/index.html";
};
