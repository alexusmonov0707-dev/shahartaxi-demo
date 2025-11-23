// docs/app/taxi/create-ad.js
// Type: module
// Works with: ../../assets/regions-helper.js and ../../libs/lib.js
/* eslint-disable no-console */

import { initRegionsForm, updateDistricts, loadRegionsToSelect } from '../../assets/regions-helper.js';
import { auth, db, ref, push, set, onAuthStateChanged, $ } from '../../libs/lib.js';

// safe $ fallback if lib.$ not provided
const $id = id => (typeof $ === 'function' ? $(id) : document.getElementById(id));

const fromRegion = $id('fromRegion');
const fromDistrict = $id('fromDistrict');
const toRegion = $id('toRegion');
const toDistrict = $id('toDistrict');

const submitBtn = $id('submitAdBtn');
const clearBtn = $id('clearFormBtn');

// ensure regions are loaded into selects
document.addEventListener('DOMContentLoaded', async () => {
  // If helper exposes initRegionsForm — use it, otherwise try fallback
  try {
    if (typeof initRegionsForm === 'function') {
      initRegionsForm(); // should fill fromRegion/toRegion and edit selects if any
    } else if (typeof loadRegionsToSelect === 'function') {
      loadRegionsToSelect('fromRegion', 'fromDistrict');
      loadRegionsToSelect('toRegion', 'toDistrict');
    } else {
      console.warn('regions-helper: initRegionsForm / loadRegionsToSelect not found');
    }
  } catch (e) {
    console.error('Regions init error:', e);
  }
});

// wire region -> districts (some helper files expect global functions; also wire here)
fromRegion && fromRegion.addEventListener('change', () => {
  try {
    if (typeof updateDistricts === 'function') updateDistricts('from');
    else fillDistrictsFromHelper('from');
  } catch (e) {
    console.error(e);
  }
});
toRegion && toRegion.addEventListener('change', () => {
  try {
    if (typeof updateDistricts === 'function') updateDistricts('to');
    else fillDistrictsFromHelper('to');
  } catch (e) {
    console.error(e);
  }
});

// fallback: attempt to use global TAXI_REGIONS if helper not available
function fillDistrictsFromHelper(type) {
  const regionId = type === 'from' ? 'fromRegion' : 'toRegion';
  const districtId = type === 'from' ? 'fromDistrict' : 'toDistrict';
  const region = document.getElementById(regionId).value;
  const distEl = document.getElementById(districtId);
  distEl.innerHTML = '<option value="">Tuman</option>';
  const map = window.TAXI_REGIONS || window.regions || null;
  if (!map || !region) return;
  const list = map[region] || [];
  list.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    distEl.appendChild(opt);
  });
}

// AUTH check (redirect to login if no user)
onAuthStateChanged(auth, user => {
  if (!user) {
    // adjust path to your login — this assumes docs/app/auth/login.html
    window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
  }
});

// submit handler: validate -> push to firebase -> alert + redirect to profile
submitBtn && submitBtn.addEventListener('click', async (ev) => {
  ev.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("Iltimos, tizimga kiring!");
    return;
  }

  const fromRegionVal = (fromRegion && fromRegion.value) || '';
  const fromDistrictVal = (fromDistrict && fromDistrict.value) || '';
  const toRegionVal = (toRegion && toRegion.value) || '';
  const toDistrictVal = (toDistrict && toDistrict.value) || '';
  const priceVal = ($id('price') && $id('price').value) || '';
  const departureTimeVal = ($id('departureTime') && $id('departureTime').value) || '';
  const seatsVal = ($id('seats') && $id('seats').value) || '';
  const commentVal = ($id('adComment') && $id('adComment').value) || '';
  const phoneOptional = ($id('phoneOptional') && $id('phoneOptional').value) || '';

  // validation
  if (!fromRegionVal || !fromDistrictVal || !toRegionVal || !toDistrictVal || !priceVal || !departureTimeVal) {
    alert("Iltimos, barcha majburiy maydonlarni to'ldiring (viloyat, tuman, narx, vaqt).");
    return;
  }

  // build ad object (keep existing fields used elsewhere)
  const ad = {
    userId: user.uid,
    userPhone: user.phoneNumber || phoneOptional || '',
    type: window.userRole === 'driver' ? 'Haydovchi' : 'Yo‘lovchi',
    fromRegion: fromRegionVal,
    fromDistrict: fromDistrictVal,
    toRegion: toRegionVal,
    toDistrict: toDistrictVal,
    price: Number(priceVal) || priceVal,
    departureTime: departureTimeVal,
    comment: commentVal,
    approved: false,
    createdAt: Date.now(),
    // role-specific seat field to keep compatibility
    ...(window.userRole === 'driver' ? { driverSeats: seatsVal } : { passengerCount: seatsVal })
  };

  try {
    const adsRef = ref(db, 'ads');
    const newRef = push(adsRef);
    await set(newRef, ad);

    alert("E’lon muvaffaqiyatli joylandi!");
    // redirect to profile or my-ads — profile as you asked
    window.location.href = "/shahartaxi-demo/docs/app/user/profile.html";
  } catch (err) {
    console.error("E'lon yuborishda xato:", err);
    alert("Xatolik yuz berdi. Konsolni tekshiring.");
  }
});

// clear form
clearBtn && clearBtn.addEventListener('click', (ev) => {
  ev.preventDefault();
  if (fromRegion) fromRegion.selectedIndex = 0;
  if (fromDistrict) fromDistrict.innerHTML = '<option value="">Tuman</option>';
  if (toRegion) toRegion.selectedIndex = 0;
  if (toDistrict) toDistrict.innerHTML = '<option value="">Tuman</option>';
  if ($id('price')) $id('price').value = '';
  if ($id('departureTime')) $id('departureTime').value = '';
  if ($id('seats')) $id('seats').value = '';
  if ($id('adComment')) $id('adComment').value = '';
  if ($id('phoneOptional')) $id('phoneOptional').value = '';
});
