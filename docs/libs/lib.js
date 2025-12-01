// docs/libs/lib.js
// Universal helper library for ShaharTaxi frontend
// IMPORTANT: This file is ESM module (type="module" script must be used)

//
// NOTE:
// - This file expects that `firebase` global is already initialized in the page
//   (via your existing firebase.js which initializes app and database).
// - It exports helper functions used by pages like app/taxi/index.js.
//

// -----------------------
// Small helpers
// -----------------------
export function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function fmtDate(ts) {
  if (!ts) return '—';
  const n = Number(ts);
  if (isNaN(n) || n <= 0) return '—';
  const d = new Date(n);
  // local date/time
  return d.toLocaleString();
}

export function safeNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// -----------------------
// Read all ads from /ads/{userId}/{adId}
// Returns: array of { id, userId, data... }
// -----------------------
export async function fetchAllAds() {
  try {
    // Expect firebase global (compat) or modular wrapper
    if (window.firebase && typeof window.firebase.database === 'function') {
      const db = window.firebase.database();
      const rootRef = db.ref('ads');
      const snap = await rootRef.once('value');
      const val = snap.val();
      if (!val) return [];

      const res = [];
      // val is { userId: { adId: { ... } } }
      Object.entries(val).forEach(([userId, userAds]) => {
        if (!userAds || typeof userAds !== 'object') return;
        Object.entries(userAds).forEach(([adId, adObj]) => {
          // Some nested nodes could be metadata; check createdAt or price or fromRegion
          res.push({
            id: adId,
            userId,
            data: adObj
          });
        });
      });

      // default sort by createdAt desc
      res.sort((a, b) => {
        const A = safeNum(a.data.createdAt, 0);
        const B = safeNum(b.data.createdAt, 0);
        return B - A;
      });

      return res;
    }

    // Fallback: modular exports attached to window as db (if you wrapped)
    if (window.db && typeof window.db.ref === 'function') {
      const rootRef = window.db.ref('ads');
      const snap = await rootRef.once('value');
      const val = snap.val();
      if (!val) return [];
      const res = [];
      Object.entries(val).forEach(([userId, userAds]) => {
        Object.entries(userAds).forEach(([adId, adObj]) => {
          res.push({ id: adId, userId, data: adObj });
        });
      });
      return res;
    }

    console.warn('fetchAllAds: firebase not found on window');
    return [];
  } catch (err) {
    console.error('fetchAllAds error:', err);
    return [];
  }
}

// -----------------------
// Utility: extract unique regions/districts to populate selects
// -----------------------
export function collectRegionsAndDistricts(adItems) {
  const fromRegions = new Set();
  const toRegions = new Set();
  const fromDistricts = new Set();
  const toDistricts = new Set();

  adItems.forEach(item => {
    const d = item.data || {};
    if (d.fromRegion) fromRegions.add(d.fromRegion);
    if (d.toRegion) toRegions.add(d.toRegion);
    if (d.fromDistrict) fromDistricts.add(d.fromDistrict);
    if (d.toDistrict) toDistricts.add(d.toDistrict);
  });

  return {
    fromRegions: Array.from(fromRegions).sort(),
    toRegions: Array.from(toRegions).sort(),
    fromDistricts: Array.from(fromDistricts).sort(),
    toDistricts: Array.from(toDistricts).sort()
  };
}

// default export nothing (named exports used)
