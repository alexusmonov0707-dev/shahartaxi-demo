// /docs/app/taxi/create-ad.js
// Module for Create Ad page (works with docs/ path)
// Expects:
//  - /docs/libs/lib.js to export: auth, db, ref, push, set, onAuthStateChanged, $
//  - regions data available as window.regionsData OR window.regions
//  - HTML has selects with ids: fromRegion, fromDistrict, toRegion, toDistrict
//  - Buttons/inputs: price, departureTime, seats, adComment, submitAdBtn, clearFormBtn

import {
  auth,
  db,
  ref,
  push,
  set,
  onAuthStateChanged,
  $
} from '/shahartaxi-demo/docs/libs/lib.js';

console.log("CREATE-AD.JS LOADED:", import.meta.url);

// helper: safe get regions object
function getRegionsObj() {
  if (window.regionsData && typeof window.regionsData === 'object') return window.regionsData;
  if (window.regions && typeof window.regions === 'object') return window.regions;
  return {};
}

function fillSelectOptions(selectEl, items, emptyLabel) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = emptyLabel || '—';
  selectEl.appendChild(opt0);
  items.forEach(it => {
    const o = document.createElement('option');
    o.value = it;
    o.textContent = it;
    selectEl.appendChild(o);
  });
}

function fillRegions() {
  const regions = getRegionsObj();
  const fromRegion = document.getElementById('fromRegion');
  const toRegion = document.getElementById('toRegion');
  if (!fromRegion || !toRegion) return;

  const keys = Object.keys(regions).sort((a,b)=>a.localeCompare(b,'uz'));
  fillSelectOptions(fromRegion, keys, 'Qayerdan (Viloyat)');
  fillSelectOptions(toRegion, keys, 'Qayerga (Viloyat)');

  // trigger initial district fill
  updateDistricts('from');
  updateDistricts('to');
}

function updateDistricts(side) {
  // side = 'from' or 'to'
  const regionId = (side === 'from') ? 'fromRegion' : 'toRegion';
  const districtBoxId = (side === 'from') ? 'fromDistrict' : 'toDistrict';
  const regionSelect = document.getElementById(regionId);
  const districtSelect = document.getElementById(districtBoxId);
  if (!regionSelect || !districtSelect) return;

  const regions = getRegionsObj();
  const selectedRegion = regionSelect.value;
  if (!selectedRegion || !regions[selectedRegion]) {
    // clear to default
    districtSelect.innerHTML = '';
    const o = document.createElement('option');
    o.value = '';
    o.textContent = 'Tuman';
    districtSelect.appendChild(o);
    return;
  }

  const districts = Array.isArray(regions[selectedRegion]) ? regions[selectedRegion] : [];
  fillSelectOptions(districtSelect, districts, 'Tuman');
}

function initListeners() {
  const fr = document.getElementById('fromRegion');
  const tr = document.getElementById('toRegion');
  if (fr) fr.addEventListener('change', ()=> updateDistricts('from'));
  if (tr) tr.addEventListener('change', ()=> updateDistricts('to'));

  const submitBtn = document.getElementById('submitAdBtn');
  if (submitBtn) submitBtn.addEventListener('click', onSubmitAd);

  const clearBtn = document.getElementById('clearFormBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearForm);
}

// Clears form inputs (keeps selects default)
function clearForm(e) {
  e && e.preventDefault();
  const fields = ['price','departureTime','seats','adComment'];
  fields.forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const fromDistrict = document.getElementById('fromDistrict');
  const toDistrict = document.getElementById('toDistrict');
  if (fromDistrict) fromDistrict.selectedIndex = 0;
  if (toDistrict) toDistrict.selectedIndex = 0;
}

// SUBMIT handler
async function onSubmitAd(e) {
  e && e.preventDefault();
  try {
    const user = auth.currentUser;
    if (!user) {
      // redirect to login (docs path)
      window.location.href = '/shahartaxi-demo/docs/app/auth/login.html';
      return;
    }

    const adData = {
      userId: user.uid,
      fromRegion: (document.getElementById('fromRegion') || {}).value || '',
      fromDistrict: (document.getElementById('fromDistrict') || {}).value || '',
      toRegion: (document.getElementById('toRegion') || {}).value || '',
      toDistrict: (document.getElementById('toDistrict') || {}).value || '',
      price: (document.getElementById('price') || {}).value || '',
      departureTime: (document.getElementById('departureTime') || {}).value || '',
      seats: (document.getElementById('seats') || {}).value || '',
      comment: (document.getElementById('adComment') || {}).value || '',
      createdAt: Date.now(),
      type: '' // optional, can set 'Haydovchi'/'Yo\'lovchi' elsewhere
    };

    // validation minimal
    if (!adData.fromRegion || !adData.toRegion) {
      alert("Iltimos: qayerdan va qayerga maydonlarini to'ldiring.");
      return;
    }

    // push to firebase realtime db
    const adsRef = ref(db, 'ads');
    const newAdRef = push(adsRef);
    await set(newAdRef, adData);

    alert("E'lon muvaffaqiyatli joylandi!");
    // navigate to my-ads (docs path)
    window.location.href = '/shahartaxi-demo/docs/app/taxi/my-ads.html';
  } catch (err) {
    console.error("E'lon qo'shishda xato:", err);
    alert("Xato yuz berdi: " + (err && err.message ? err.message : String(err)));
  }
}

// wait DOM ready
document.addEventListener('DOMContentLoaded', ()=> {
  // try fill regions (may be loaded earlier)
  try {
    fillRegions();
    initListeners();
  } catch (err) {
    console.error("Create-ad init error:", err);
  }
});

// Also ensure regions are filled if regions-taxi.js loads later (listen for global event)
if (typeof window !== 'undefined') {
  // if some other script sets window.regionsData and dispatches an event, listen to it
  window.addEventListener('regionsReady', () => {
    try { fillRegions(); } catch(e){ console.error(e); }
  });
}
