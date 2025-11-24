// ================= FIREBASE INIT ===================
const firebaseConfig = {
  apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.getAuth(app);
const db = firebase.getDatabase(app);

// ============ ELEMENTS =================
const $ = id => document.getElementById(id);
const myAdsList = $("myAdsList");

// =============== LOAD REGIONS ==============

function fillRegionSelects() {
  const fr = $("editFromRegion");
  const tr = $("editToRegion");

  fr.innerHTML = `<option value="">Viloyat</option>`;
  tr.innerHTML = `<option value="">Viloyat</option>`;

  regionsTaxi.forEach(r => {
    fr.innerHTML += `<option value="${r.name}">${r.name}</option>`;
    tr.innerHTML += `<option value="${r.name}">${r.name}</option>`;
  });
}

window.updateEditDistricts = function(type){
  const regionSelect = type === "from" ? $("editFromRegion") : $("editToRegion");
  const districtSelect = type === "from" ? $("editFromDistrict") : $("editToDistrict");

  const region = regionsTaxi.find(r => r.name === regionSelect.value);
  districtSelect.innerHTML = `<option value="">Tuman</option>`;

  if (!region) return;
  region.districts.forEach(d => districtSelect.innerHTML += `<option value="${d}">${d}</option>`);
};

// =============== MY ADS LOAD ===================

firebase.onAuthStateChanged(auth, user => {
  if (!user) return window.location.href = "/app/auth/login.html";
  window.currentUID = user.uid;
  loadMyAds();
});

async function loadMyAds() {
  const snap = await firebase.get(firebase.ref(db, "ads"));
  myAdsList.innerHTML = "";

  if (!snap.exists()) {
    myAdsList.innerHTML = "<p>Hozircha e’lon yo‘q.</p>";
    return;
  }

  snap.forEach(child => {
    const ad = child.val();
    if (ad.userId !== currentUID) return;

    const box = document.createElement("div");
    box.className = "ad-box";
    box.innerHTML = `
      <b style="color:#0069d9">${ad.type}</b><br>
      ${ad.fromRegion}, ${ad.fromDistrict} → ${ad.toRegion}, ${ad.toDistrict}<br>
      Narx: <b style="color:#28a745">${ad.price} so‘m</b><br>
      Vaqt: ${ad.departureTime}<br>
      Bo‘sh joy: ${ad.driverSeats ?? ad.passengerCount ?? "-"}
      <div style="display:flex; gap:10px; margin-top:10px;">
        <button class="blue-btn" onclick='openEditAd("${child.key}")'>Tahrirlash</button>
        <button class="red-btn" onclick='deleteAd("${child.key}")'>O‘chirish</button>
      </div>
    `;
    myAdsList.appendChild(box);
  });
}

// ================== EDIT LOGIC ==================

let editingAdId = null;

window.openEditAd = async function(id){
  editingAdId = id;

  const snap = await firebase.get(firebase.ref(db, "ads/" + id));
  const ad = snap.val();

  fillRegionSelects();

  $("editFromRegion").value = ad.fromRegion;
  updateEditDistricts("from");
  $("editFromDistrict").value = ad.fromDistrict;

  $("editToRegion").value = ad.toRegion;
  updateEditDistricts("to");
  $("editToDistrict").value = ad.toDistrict;

  $("editPrice").value = ad.price;
  $("editTime").value = ad.departureTime;
  $("editSeats").value = ad.driverSeats ?? ad.passengerCount ?? "";
  $("editComment").value = ad.comment ?? "";

  $("editAdModal").style.display = "flex";
};

window.closeEditAd = () => $("editAdModal").style.display = "none";

window.saveAdEdit = async function(){
  const updates = {
    fromRegion: $("editFromRegion").value,
    fromDistrict: $("editFromDistrict").value,
    toRegion: $("editToRegion").value,
    toDistrict: $("editToDistrict").value,
    price: $("editPrice").value,
    departureTime: $("editTime").value,
    comment: $("editComment").value,
    driverSeats: $("editSeats").value
  };

  await firebase.update(firebase.ref(db, "ads/" + editingAdId), updates);

  alert("Tahrirlandi!");
  closeEditAd();
  loadMyAds();
};

// ============= DELETE ===============
window.deleteAd = async function(id){
  if (!confirm("O‘chirilsinmi?")) return;
  await firebase.remove(firebase.ref(db, "ads/" + id));
  loadMyAds();
};
