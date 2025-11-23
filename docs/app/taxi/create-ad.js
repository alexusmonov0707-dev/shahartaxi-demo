// docs/app/taxi/create-ad.js
// Type: module

console.log("CREATE-AD.JS STARTED");

// GLOBAL TAXI_REGIONS borligi tekshiriladi
function waitForRegions() {
  return new Promise(resolve => {
    let check = setInterval(() => {
      if (window.TAXI_REGIONS && typeof window.TAXI_REGIONS === "object") {
        clearInterval(check);
        resolve(window.TAXI_REGIONS);
      }
    }, 50);
  });
}

// DOM
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const price = document.getElementById("price");
const time = document.getElementById("departureTime");
const seats = document.getElementById("seats");
const comment = document.getElementById("adComment");
const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

let TAXI_REGIONS = {};

function fillRegionSelects() {
  const keys = Object.keys(TAXI_REGIONS);
  fromRegion.innerHTML = `<option value="">Qayerdan (Viloyat)</option>`;
  toRegion.innerHTML = `<option value="">Qayerga (Viloyat)</option>`;

  keys.forEach(name => {
    fromRegion.innerHTML += `<option value="${name}">${name}</option>`;
    toRegion.innerHTML += `<option value="${name}">${name}</option>`;
  });
}

function fillDistricts(region, target) {
  target.innerHTML = `<option value="">Tuman</option>`;
  if (!region) return;
  const list = TAXI_REGIONS[region];
  list.forEach(dist => {
    target.innerHTML += `<option value="${dist}">${dist}</option>`;
  });
}

function setupHandlers() {
  fromRegion.onchange = () =>
    fillDistricts(fromRegion.value, fromDistrict);

  toRegion.onchange = () =>
    fillDistricts(toRegion.value, toDistrict);

  clearBtn.onclick = e => {
    e.preventDefault();
    fromRegion.selectedIndex = 0;
    toRegion.selectedIndex = 0;
    fromDistrict.innerHTML = `<option value="">Tuman</option>`;
    toDistrict.innerHTML = `<option value="">Tuman</option>`;
    price.value = "";
    time.value = "";
    seats.value = "";
    comment.value = "";
  };

  submitBtn.onclick = async e => {
    e.preventDefault();

    const payload = {
      fromRegion: fromRegion.value,
      fromDistrict: fromDistrict.value,
      toRegion: toRegion.value,
      toDistrict: toDistrict.value,
      price: price.value,
      departureTime: time.value,
      seats: seats.value,
      comment: comment.value,
      createdAt: Date.now()
    };

    console.log("Yangi elon:", payload);

    alert("E’lon joylandi!");
    window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";
  };
}

(async function init() {
  console.log("Regions yuklanishini kutyapmiz...");

  TAXI_REGIONS = await waitForRegions();

  console.log("TAXI_REGIONS yuklandi:", TAXI_REGIONS);

  fillRegionSelects();
  setupHandlers();
})();
