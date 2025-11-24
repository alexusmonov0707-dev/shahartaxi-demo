// docs/app/taxi/create-ad.js
// Type: module

import { regions } from "/shahartaxi-demo/docs/assets/regions-helper.js";
import { regionsTaxi } from "/shahartaxi-demo/docs/assets/regions-taxi.js";
import {
  db, ref, push, set, auth
} from "/shahartaxi-demo/docs/libs/lib.js";

// DOM elementlar
const fromRegion = document.getElementById("fromRegion");
const fromDistrict = document.getElementById("fromDistrict");
const toRegion = document.getElementById("toRegion");
const toDistrict = document.getElementById("toDistrict");
const price = document.getElementById("price");
const departureTime = document.getElementById("departureTime");
const seats = document.getElementById("seats");
const comment = document.getElementById("adComment");

const submitBtn = document.getElementById("submitAdBtn");
const clearBtn = document.getElementById("clearFormBtn");

// ============= VILOYATLARNI TOLDIRISH ============
function loadRegions() {
  fromRegion.innerHTML = `<option value="">Viloyat</option>`;
  toRegion.innerHTML = `<option value="">Viloyat</option>`;

  regions.forEach(r => {
    fromRegion.innerHTML += `<option value="${r}">${r}</option>`;
    toRegion.innerHTML += `<option value="${r}">${r}</option>`;
  });
}

// ============= TUMANLARNI TOLDIRISH ============
function loadDistricts(regionName, targetSelect) {
  targetSelect.innerHTML = `<option value="">Tuman</option>`;
  if (!regionName) return;

  const list = regionsTaxi[regionName] || [];
  list.forEach(d => {
    targetSelect.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

// EVENTLAR
fromRegion.addEventListener("change", () => {
  loadDistricts(fromRegion.value, fromDistrict);
});

toRegion.addEventListener("change", () => {
  loadDistricts(toRegion.value, toDistrict);
});

// CLEAR
clearBtn.addEventListener("click", e => {
  e.preventDefault();
  fromRegion.value = "";
  fromDistrict.innerHTML = `<option value="">Tuman</option>`;
  toRegion.value = "";
  toDistrict.innerHTML = `<option value="">Tuman</option>`;
  price.value = "";
  departureTime.value = "";
  seats.value = "";
  comment.value = "";
});

// ============= ELONNI FIREBASE GA YOZISH ============
submitBtn.addEventListener("click", async e => {
  e.preventDefault();

  if (!auth.currentUser) {
    alert("Iltimos, avval tizimga kiring!");
    return;
  }

  const data = {
    fromRegion: fromRegion.value,
    fromDistrict: fromDistrict.value,
    toRegion: toRegion.value,
    toDistrict: toDistrict.value,
    price: price.value,
    departureTime: departureTime.value,
    seats: seats.value,
    comment: comment.value,
    uid: auth.currentUser.uid,
    createdAt: Date.now()
  };

  // Firebase ga yozish
  const adsRef = ref(db, "ads");
  const newRef = push(adsRef);
  await set(newRef, data);

  alert("E’lon muvaffaqiyatli joylandi!");
  window.location.href = "/shahartaxi-demo/docs/app/profile/profile.html";
});

// PAGE START
loadRegions();
