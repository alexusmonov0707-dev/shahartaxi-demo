// app/user/js/create-ad.js
import { auth, db, $, ref, push, get, onAuthStateChanged } from "./lib.js";

const fromRegion = $("fromRegion");
const fromDistrict = $("fromDistrict");
const toRegion = $("toRegion");
const toDistrict = $("toDistrict");
const price = $("price");
const departureTime = $("departureTime");
const seats = $("seats");
const adComment = $("adComment");
const submitAdBtn = $("submitAdBtn");
const clearFormBtn = $("clearFormBtn");

onAuthStateChanged(auth, user => {
  if (!user) location.href = "../login.html";
  // populate selects from regions.js global
  if (window.regionsData) {
    fromRegion.innerHTML = '<option value="">Qayerdan (Viloyat)</option>';
    toRegion.innerHTML = '<option value="">Qayerga (Viloyat)</option>';
    Object.keys(window.regionsData).forEach(r => {
      fromRegion.innerHTML += `<option value="${r}">${r}</option>`;
      toRegion.innerHTML += `<option value="${r}">${r}</option>`;
    });
  }
});

window.updateDistricts = function(type) {
  const region = document.getElementById(type + "Region").value;
  const districtSelect = document.getElementById(type + "District");
  districtSelect.innerHTML = '<option value="">Tuman</option>';
  if (window.regionsData && window.regionsData[region]) {
    window.regionsData[region].forEach(t => districtSelect.innerHTML += `<option value="${t}">${t}</option>`);
  }
};

submitAdBtn && submitAdBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Iltimos tizimga kiring.");

  const seatsVal = seats && seats.value ? seats.value.trim() : "";
  const extra = {};
  // determine role from users/uid
  const uSnap = await get(ref(db, "users/" + user.uid));
  const role = uSnap.exists() ? (uSnap.val().role || "passenger") : "passenger";

  if (role === "driver") extra.driverSeats = seatsVal || "";
  else extra.passengerCount = seatsVal || "";

  const ad = {
    userId: user.uid,
    type: role === "driver" ? "Haydovchi" : "Yo‘lovchi",
    fromRegion: fromRegion ? fromRegion.value : "",
    fromDistrict: fromDistrict ? fromDistrict.value : "",
    toRegion: toRegion ? toRegion.value : "",
    toDistrict: toDistrict ? toDistrict.value : "",
    price: price ? price.value : "",
    comment: adComment ? adComment.value : "",
    approved: false,
    departureTime: departureTime ? departureTime.value : "",
    createdAt: Date.now(),
    ...extra
  };

  await push(ref(db, "ads"), ad);
  alert("E’lon joylandi!");
  clearForm();
  // optionally redirect to my-ads
  window.location.href = "my-ads.html";
});

clearFormBtn && clearFormBtn.addEventListener("click", clearForm);

function clearForm() {
  if (fromRegion) fromRegion.value = "";
  if (fromDistrict) fromDistrict.innerHTML = '<option value="">Tuman</option>';
  if (toRegion) toRegion.value = "";
  if (toDistrict) toDistrict.innerHTML = '<option value="">Tuman</option>';
  if (price) price.value = "";
  if (adComment) adComment.value = "";
  if (seats) seats.value = "";
  if (departureTime) departureTime.value = "";
}

