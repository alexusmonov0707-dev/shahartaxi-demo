// ===============================
// FIREBASE INIT
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getDatabase, ref, get 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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
const db = getDatabase(app);


// ===============================
// E’LONLARNI YUKLASH
// ===============================
async function loadAllAds() {
  const list = document.getElementById("allAdsList");
  list.innerHTML = "Yuklanmoqda...";

  const snap = await get(ref(db, "ads"));
  if (!snap.exists()) {
    list.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  const adsArr = [];

  snap.forEach(child => {
    adsArr.push({ id: child.key, ...child.val() });
  });

  // 🔵 Eng so‘nggi e’lonlarni yuqoriga chiqaramiz
  adsArr.sort((a,b) => b.createdAt - a.createdAt);

  list.innerHTML = "";

  adsArr.forEach(ad => {
    const div = document.createElement("div");
    div.className = "ad-box";

    const labelClass = ad.type === "Haydovchi" ? "driver" : "passenger";

    div.innerHTML = `
      <span class="type-label ${labelClass}">${ad.type}</span><br><br>
      <b>${ad.fromRegion}, ${ad.fromDistrict}</b> → 
      <b>${ad.toRegion}, ${ad.toDistrict}</b><br>
      Narx: <b>${ad.price || "-"} so‘m</b><br>
      Jo‘nash vaqti: ${ad.departureTime || "-"}<br>
      Qo‘shimcha: ${ad.comment || "-"}<br>
      <small style="color:#777">${new Date(ad.createdAt).toLocaleString()}</small>
    `;

    list.appendChild(div);
  });

}

loadAllAds();
