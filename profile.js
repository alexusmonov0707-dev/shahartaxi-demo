import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase, ref, set, push, onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.firebasestorage.app",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// REGIONS
const regions = {
  "Toshkent": ["Bektemir","Chilonzor","Sergeli","Mirobod","Yakkasaroy"],
  "Samarqand": ["Bulung‘ur","Kattaqo‘rg‘on","Urgut"],
  "Namangan": ["Pop","Norin","Chust"],
  "Farg‘ona": ["Oltiariq","Dang‘ara","Beshariq"],
};

// DROPDOWNSNI TOʻLDIRISH
function loadRegions() {
  for (let r in regions) {
    fromRegion.innerHTML += `<option>${r}</option>`;
    toRegion.innerHTML += `<option>${r}</option>`;
  }
}

fromRegion.onchange = () => loadDistricts("from");
toRegion.onchange = () => loadDistricts("to");

function loadDistricts(type) {
  const r = (type === "from") ? fromRegion.value : toRegion.value;
  const target = (type === "from") ? fromDistrict : toDistrict;

  target.innerHTML = "";
  regions[r].forEach(d => {
    target.innerHTML += `<option>${d}</option>`;
  });
}

// USER KIRGANINI TEKSHIRAMIZ
onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  
  loadRegions();
  loadMyAds(user.uid);
});

// E’LON YOZISH
window.addAd = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const ad = {
    type: adType.value,
    fromRegion: fromRegion.value,
    fromDistrict: fromDistrict.value,
    toRegion: toRegion.value,
    toDistrict: toDistrict.value,
    price: price.value,
    comment: adComment.value,
    userId: user.uid,
    time: Date.now()
  };

  await push(ref(db, "ads/"), ad);

  alert("E’lon joylandi!");
};

// Mening e’lonlarimni chiqarish
function loadMyAds(uid) {
  onValue(ref(db, "ads/"), snap => {
    myAds.innerHTML = "";
    snap.forEach(ch => {
      const ad = ch.val();
      if (ad.userId === uid) {
        myAds.innerHTML += `
          <div style="padding:10px;border:1px solid #ddd;margin-top:8px;border-radius:6px">
            <b>${ad.type}</b><br>
            ${ad.fromRegion}, ${ad.fromDistrict} → 
            ${ad.toRegion}, ${ad.toDistrict}
            <br> Narx: ${ad.price}
            <br> Izoh: ${ad.comment}
          </div>
        `;
      }
    });
  });
}

// LOGOUT
window.logout = function () {
  signOut(auth);
};
