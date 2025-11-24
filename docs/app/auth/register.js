// register.js
import {
  auth,
  db,
  ref,
  set,
  createUserWithEmailAndPassword
} from "/shahartaxi-demo/docs/libs/lib.js";

/*
  CONFIG
  - IMGBB API keyni o'zingizning kalitingiz bilan almashtiring
*/
const IMGBB_API_KEY = "4e27dc8a0b6f5bd0262b6f3cba04b09a"; // o'zingiznikini qo'ying

// LOCAL DEFAULT AVATAR (platforma upload/transform uchun shu yerda LOCAL PATH mavjud)
const DEFAULT_AVATAR_LOCAL_PATH = "/mnt/data/avatar-default.png"; // <-- platformangiz shu pathni URLga aylantiradi

// helper: imgbb upload
async function uploadImageToImgbb(file) {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  if (!data || !data.success) throw new Error("Image upload failed");
  return data.data.url;
}

// DOM
const fullNameEl = document.getElementById("fullName");
const phoneEl = document.getElementById("phone");
const passwordEl = document.getElementById("password");
const roleEl = document.getElementById("role");

const driverFields = document.getElementById("driverFields");
const carModelEl = document.getElementById("carModel");
const carColorEl = document.getElementById("carColor");
const carNumberEl = document.getElementById("carNumber");
const licenseEl = document.getElementById("license");
const birthdateEl = document.getElementById("birthdate");
const techPassportEl = document.getElementById("techPassport");
const avatarEl = document.getElementById("avatar");

const registerBtn = document.getElementById("registerBtn");

// role toggle
roleEl.addEventListener("change", () => {
  if (roleEl.value === "driver") driverFields.classList.remove("hidden");
  else driverFields.classList.add("hidden");
});

// sanitize phone: ensure +998XXXXXXXXX form
function normalizePhone(input) {
  if (!input) return "";
  input = input.trim();
  // remove spaces, dashes, parentheses
  input = input.replace(/[\s\-()]/g, "");
  if (input.startsWith("+")) input = input.slice(1);
  // if user typed 998901234567 or 90901234567
  if (input.length === 9 && input.startsWith("9")) input = "998" + input;
  if (input.length === 12 && input.startsWith("998")) return "+" + input;
  if (input.length === 13 && input.startsWith("+998")) return input;
  // fallback: try to add + if missing
  if (input.length === 12) return "+" + input;
  return input; // may be invalid, will be validated later
}

registerBtn.addEventListener("click", async () => {
  const fullName = (fullNameEl.value || "").trim();
  const phoneRaw = (phoneEl.value || "").trim();
  const phone = normalizePhone(phoneRaw);
  const password = (passwordEl.value || "").trim();
  const role = roleEl.value || "passenger";

  if (!fullName || !phone || !password) {
    alert("Iltimos: ism, telefon va parolni to'liq kiriting (telefon +998...)");
    return;
  }

  // driver required fields
  let carModel = null, carColor = null, carNumber = null, license = null, birthdate = null;
  let techPassportUrl = null, avatarUrl = null;

  if (role === "driver") {
    carModel = (carModelEl.value || "").trim();
    carColor = (carColorEl.value || "").trim();
    carNumber = (carNumberEl.value || "").trim();
    license = (licenseEl.value || "").trim();
    birthdate = (birthdateEl.value || "").trim();

    if (!carModel || !carColor || !carNumber || !license || !birthdate) {
      alert("Haydovchi uchun barcha maydonlar majburiy.");
      return;
    }

    if (!techPassportEl.files || !techPassportEl.files[0]) {
      alert("Tex pasport rasm majburiy (rasm yuklang).");
      return;
    }

    // upload tech passport
    try {
      techPassportUrl = await uploadImageToImgbb(techPassportEl.files[0]);
    } catch (err) {
      console.error(err);
      alert("Tex pasportni yuklashda xatolik. Rasm hajmini tekshiring yoki API key-ni yangilang.");
      return;
    }
  }

  // avatar optional
  if (avatarEl.files && avatarEl.files[0]) {
    try {
      avatarUrl = await uploadImageToImgbb(avatarEl.files[0]);
    } catch (err) {
      console.warn("Avatar upload failed, using default.");
      avatarUrl = null;
    }
  }

  // fallback default avatar (local file path will be transformed to URL by platform)
  const avatarToSave = avatarUrl || DEFAULT_AVATAR_LOCAL_PATH;

  // create pseudo-email from phone (remove plus)
  const phoneDigits = phone.replace(/\+/g, "");
  const emailFake = phoneDigits + "@phone.shahartaxi.uz";

  // create user in Firebase Auth
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, emailFake, password);
  } catch (err) {
    console.error("Auth create error:", err);
    alert("Ro'yxatdan o'tishda xatolik (telefon allaqachon ro'yxatda bo'lishi mumkin).");
    return;
  }

  const uid = userCredential.user.uid;

  // prepare DB object
  const userObj = {
    uid,
    fullName,
    phone,
    role,
    avatar: avatarToSave,
    balance: 0,
    subscriptions: { taxi: { active: false } },
    createdAt: Date.now(),
    verified: role === "driver" ? false : true // drivers must be approved by admin
  };

  if (role === "driver") {
    userObj.driverInfo = {
      carModel,
      carColor,
      carNumber,
      license,
      birthdate,
      techPassportUrl
    };
  }

  // write to DB (Realtime DB)
  try {
    await set(ref(db, "users/" + uid), userObj);
  } catch (err) {
    console.error("DB write error:", err);
    alert("Ro'yxatdan o'tishda DB ga yozishda xatolik. Iltimos keyinroq qayta urinib ko'ring.");
    return;
  }

  alert("Ro'yxatdan muvaffaqiyatli o'tdingiz. Agar haydovchi bo'lsangiz, admin tasdiqlashini kuting.");
  window.location.href = "/shahartaxi-demo/app/user/index.html";
});
