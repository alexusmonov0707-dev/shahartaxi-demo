// ads.module.js
import { db, ref, onValue, get } from './firebase.js';

// Globals (module-scoped)
let ALL_ADS = [];
let FILTERED = [];
let lastFilterSnapshot = null;
let debounceTimer = null;

/* ----- Helpers ----- */
const norm = (v) => (v == null ? '' : String(v).trim().toLowerCase());
const unique = (arr) => Array.from(new Set(arr)).filter(Boolean);

/**
 * Flatten different nested structures under /ads:
 * - either /ads/{userId}/{adId}: { ...data }
 * - or /ads/{adId}: { ...data }
 */
function flattenSnapshot(snapshot) {
  const out = [];
  snapshot.forEach(userOrAdSnap => {
    // If child has children that look like ad objects (id keys)
    if (userOrAdSnap.hasChildren && Array.from(userOrAdSnap.val ? Object.keys(userOrAdSnap.val()) : []) .length > 0) {
      // Could be either user->adId->data or adId->data (we handle generic)
      userOrAdSnap.forEach(maybeAdSnap => {
        const data = maybeAdSnap.val();
        if (data && typeof data === 'object') {
          const ad = {
            _key: maybeAdSnap.key ?? '',
            _parentKey: userOrAdSnap.key ?? '',
            ...data
          };
          out.push(ad);
        }
      });
    } else {
      // leaf node — treat as ad
      const data = userOrAdSnap.val();
      if (data && typeof data === 'object') {
        const ad = {
          _key: userOrAdSnap.key ?? '',
          _parentKey: null,
          ...data
        };
        out.push(ad);
      }
    }
  });
  return out;
}

/* ----- UI references (expect these IDs in HTML) ----- */
const selectors = {
  fromRegion: () => document.getElementById('fromRegionFilter'),
  toRegion: () => document.getElementById('toRegionFilter'),
  date: () => document.getElementById('dateFilter'),
  priceFrom: () => document.getElementById('priceFrom'),
  priceTo: () => document.getElementById('priceTo'),
  seats: () => document.getElementById('seatsFilter'),
  search: () => document.getElementById('searchInput'),
  container: () => document.getElementById('adsContainer')
};

function safeEl(id) {
  return document.getElementById(id) || null;
}

/* ----- Render ----- */
function renderAds(list) {
  const container = selectors.container();
  if (!container) return;
  container.innerHTML = '';

  if (!list || list.length === 0) {
    container.innerHTML = `<div class="no-ads">Elonlar topilmadi.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  list.forEach(ad => {
    const card = document.createElement('div');
    card.className = 'ad-card';
    const price = ad.price ?? ad.cost ?? '';
    const from = ad.fromRegion ?? ad.fromRegionName ?? ad.fromDistrict ?? ad.from ?? '';
    const to = ad.toRegion ?? ad.toRegionName ?? ad.toDistrict ?? ad.to ?? '';
    const departure = ad.departureTime ? new Date(Number(ad.departureTime)).toLocaleString() : (ad.departureDate || '');
    const seats = ad.seats ?? ad.driverSeats ?? '';

    card.innerHTML = `
      <div class="ad-head">
        <div class="ad-fromto"><strong>${from}</strong> → <strong>${to}</strong></div>
        <div class="ad-price">${price ? price + ' so\'m' : ''}</div>
      </div>
      <div class="ad-meta">
        <span>Jo'nash: ${departure}</span>
        <span>O'rinlar: ${seats}</span>
      </div>
      <div class="ad-comment">${ad.comment ? escapeHtml(ad.comment) : ''}</div>
    `;
    frag.appendChild(card);
  });

  container.appendChild(frag);
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/* ----- Filters ----- */
function populateFilterOptions(applyAfter = false) {
  // Build sets
  const fromRegions = [];
  const toRegions = [];
  const dates = [];
  const seatsOptions = [];

  ALL_ADS.forEach(ad => {
    if (ad.fromRegion) fromRegions.push(ad.fromRegion);
    if (ad.toRegion) toRegions.push(ad.toRegion);
    // try common keys
    const d = ad.departureTime || ad.departureDate;
    if (d) {
      let dateStr = d;
      if (!isNaN(Number(d))) dateStr = new Date(Number(d)).toLocaleDateString();
      dates.push(dateStr);
    }
    if (ad.seats) seatsOptions.push(String(ad.seats));
    if (ad.driverSeats) seatsOptions.push(String(ad.driverSeats));
  });

  const frEl = selectors.fromRegion();
  const trEl = selectors.toRegion();
  const dateEl = selectors.date();
  const seatsEl = selectors.seats();

  // Save current values to restore
  const cur = {
    from: frEl ? frEl.value : '',
    to: trEl ? trEl.value : '',
    date: dateEl ? dateEl.value : '',
    seats: seatsEl ? seatsEl.value : ''
  };

  // helper to refill select
  const refill = (el, items, placeholder) => {
    if (!el) return;
    // clear without triggering change events
    const selectedValue = cur[el.id.replace('Filter','').replace('From','').replace('To','')] || '';
    el.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder || 'Hammasi';
    el.appendChild(opt);
    unique(items.map(i => i && String(i).trim())).sort().forEach(v => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      el.appendChild(o);
    });
    // restore selection if still available, else keep ''
    if (selectedValue) {
      const has = Array.from(el.options).some(o => o.value === selectedValue);
      if (has) el.value = selectedValue;
      else el.value = '';
    } else {
      el.value = '';
    }
  };

  refill(frEl, fromRegions, 'Hammasi (Joʻnash viloyati)');
  refill(trEl, toRegions, 'Hammasi (Kelish viloyati)');
  refill(dateEl, dates, 'Hammasi (Sana)');
  refill(seatsEl, seatsOptions, 'Hammasi (Oʻrinlar)');

  if (applyAfter) {
    applyFilters();
  }
}

function applyFilters() {
  // read filter inputs
  const fromVal = norm(selectors.fromRegion()?.value);
  const toVal = norm(selectors.toRegion()?.value);
  const dateVal = norm(selectors.date()?.value);
  const priceFrom = Number(selectors.priceFrom()?.value || 0);
  const priceTo = Number(selectors.priceTo()?.value || 0);
  const seatsVal = norm(selectors.seats()?.value);
  const q = norm(selectors.search()?.value);

  FILTERED = ALL_ADS.filter(ad => {
    // Normalized fields to compare
    const aFrom = norm(ad.fromRegion ?? ad.from ?? ad.fromRegionName ?? '');
    const aTo = norm(ad.toRegion ?? ad.to ?? ad.toRegionName ?? '');
    const aDate = norm(ad.departureTime ? new Date(Number(ad.departureTime)).toLocaleDateString() : (ad.departureDate || ''));
    const aPrice = Number(ad.price ?? ad.cost ?? 0);
    const aSeats = norm(ad.seats ?? ad.driverSeats ?? '');
    const text = norm([ad.comment, ad.description, ad.title, ad.fullName].join(' '));

    if (fromVal && aFrom !== fromVal) return false;
    if (toVal && aTo !== toVal) return false;
    if (dateVal && aDate !== dateVal) return false;
    if (seatsVal && aSeats !== seatsVal) return false;
    if (priceFrom && aPrice < priceFrom) return false;
    if (priceTo && priceTo > 0 && aPrice > priceTo) return false;
    if (q && !text.includes(q)) return false;
    return true;
  });

  renderAds(FILTERED.length ? FILTERED : ALL_ADS);
}

/* Debounced apply (prevent flicker) */
function scheduleApplyFilters() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => applyFilters(), 120);
}

/* ----- Initialize: listen to /ads ----- */
function startRealtimeListen() {
  const adsRef = ref(db, 'ads');
  onValue(adsRef, (snapshot) => {
    const flattened = flattenSnapshot(snapshot);
    ALL_ADS = flattened;
    // populate options but do not immediately reset filters to default
    populateFilterOptions(false);
    // apply currently selected filters
    applyFilters();
  }, (err) => {
    console.error('Realtime DB error (ads):', err);
    // show empty
    ALL_ADS = [];
    renderAds([]);
  });
}

/* ----- Hook UI events ----- */
function wireEvents() {
  const ids = ['fromRegionFilter', 'toRegionFilter', 'dateFilter', 'seatsFilter', 'priceFrom', 'priceTo', 'searchInput'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // use input/change with debounce
    el.addEventListener('input', scheduleApplyFilters);
    el.addEventListener('change', scheduleApplyFilters);
  });
}

/* ----- Boot ----- */
function boot() {
  // Wait DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      wireEvents();
      startRealtimeListen();
    });
  } else {
    wireEvents();
    startRealtimeListen();
  }
}

// Immediately boot
boot();
