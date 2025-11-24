import {
    auth,
    db,
    ref,
    set,
    createUserWithEmailAndPassword
} from "/shahartaxi-demo/docs/libs/lib.js";

// =============================
// 📌 imgbb API key
// =============================
const IMGBB_API_KEY = "4e27dc8a0b6f5bd0262b6f3cba04b09a"; 
// agar bor bo'lsa o'zingnikini qo'yasan

// =============================
// 📌 Helper: rasmni imgbb ga yuklash
// =============================
async function uploadImageToImgbb(file) {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    if (!data.success) {
        throw new Error("Rasm yuklashda xatolik");
    }

    return data.data.url; // imgbb image URL
}


// =============================
// 📌 Elementlar
// =============================
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


// =============================
// 📌 Role o'zgarsa → form o'zgaradi
// =============================
roleSelect.onchange = () => {
    if (roleSelect.value === "driver") {
        driverFields.classList.remove("hidden");
    } else {
        driverFields.classList.add("hidden");
    }
};


// =============================
// 📌 Ro‘yxatdan o‘tish
// =============================
registerBtn.onclick = async () => {
    const fullName = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleSelect.value;

    if (!fullName || !phone || !password) {
        alert("Barcha maydonlarni to‘ldiring!");
        return;
    }

    let carModel = null,
        carColor = null,
        carNumber = null,
        license = null,
        birthdate = null;

    let techPassportUrl = null;
    let avatarUrl = null;

    // =============================
    // 📌 HAYDOVCHI MA'LUMOTLARINI TEKSHIRAMIZ
    // =============================
    if (role === "driver") {
        carModel = carModelInput.value.trim();
        carColor = carColorInput.value.trim();
        carNumber = carNumberInput.value.trim();
        license = licenseInput.value.trim();
        birthdate = birthdateInput.value;

        if (!carModel || !carColor || !carNumber || !license || !birthdate) {
            alert("Haydovchi uchun barcha maydonlar majburiy!");
            return;
        }

        if (!techPassportInput.files[0]) {
            alert("Tex pasport rasm majburiy!");
            return;
        }

        // =============================
        // 📌 Tech pasportni yuklash
        // =============================
        try {
            techPassportUrl = await uploadImageToImgbb(techPassportInput.files[0]);
        } catch (err) {
            console.error(err);
            alert("Tex pasportni yuklashda xatolik!");
            return;
        }
    }

    // =============================
    // 📌 Avatar rasm (ixtiyoriy)
    // =============================
    if (avatarInput.files[0]) {
        try {
            avatarUrl = await uploadImageToImgbb(avatarInput.files[0]);
        } catch (err) {
            alert("Avatarni yuklashda xatolik!");
        }
    }

    // =============================
    // 📌 Firebase Email orqali ro‘yxatdan o‘tkazamiz
    // =============================
    const emailFake = phone + "@shahartaxi.uz"; // backend email sifatida

    let userCredential;
    try {
        userCredential = await createUserWithEmailAndPassword(auth, emailFake, password);
    } catch (err) {
        console.error(err);
        alert("Telefon yoki boshqa maʼlumotlarda xatolik!");
        return;
    }

    const uid = userCredential.user.uid;

    // =============================
    // 📌 Database ga yozamiz
    // =============================
    await set(ref(db, "users/" + uid), {
        uid,
        fullName,
        phone,
        password,  // xohlasang olib tashlaymiz
        role,
        avatar: avatarUrl || null,

        // yo'lovchi uchun null bo'ladi
        carModel,
        carColor,
        carNumber,
        license,
        birthdate,
        techPassportUrl,

        balance: 0,
        subscriptions: {
            taxi: { active: false }
        },
        createdAt: Date.now()
    });

    alert("Ro‘yxatdan o‘tdingiz!");

    // =============================
    // 📌 Keyingi sahifaga o'tkazamiz
    // =============================
    window.location.href = "/shahartaxi-demo/app/user/index.html";
};
