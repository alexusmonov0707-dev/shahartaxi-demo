// ===============
// 1. Firebase login check
// ===============
import { auth, onAuthStateChanged } from "./lib.js";

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

// ===============
// 2. ELEMENTLAR
// ===============
const adsList = document.getElementById("adsList");
const loading = document.getElementById("loading");

const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const regionSelect = document.getElementById("regionSelect");

// (sening qolgan kodlaring o'z-o'zicha to'g'ri)
// Regions
Object.keys(regionsData).forEach(region => {
    fromRegion.innerHTML += `<option value="${region}">${region}</option>`;
    regionSelect.innerHTML += `<option value="${region}">${region}</option>`;
});

fromRegion.onchange = () => {
    const region = fromRegion.value;
    fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    if (!region) return;

    regionsData[region].forEach(d => {
        fromDistrict.innerHTML += `<option value="${d}">${d}</option>`;
    });
};


// ===============
// 3. Ads load
// ===============
let AllAds = [];

async function loadAds() {
    loading.style.display = "block";
    adsList.innerHTML = "";

    const dbRef = firebase.database().ref("ads");

    dbRef.on("value", snapshot => {
        AllAds = [];
        snapshot.forEach(child => {
            AllAds.push({ id: child.key, ...child.val() });
        });

        loading.style.display = "none";
        renderAds(AllAds);
    });
}

loadAds();


// (hozircha senga tegmaydi, eski kod yaxshi ishlaydi)

