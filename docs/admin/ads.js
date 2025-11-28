// Diagnostic & debug helper — paste whole block into the page Console
(function(){
  function normForDebug(v){
    if (v === null || v === undefined) return '';
    // normalize whitespace (including non-breaking), trim and lowercase
    return String(v).replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
  }

  // quick guards
  if (typeof ALL_ADS === 'undefined' || !Array.isArray(ALL_ADS)) {
    console.error('ALL_ADS not found or not an array. Did the page fully load? ALL_ADS:', ALL_ADS);
    return;
  }

  console.group('ADS DEBUG SUMMARY');
  console.log('ALL_ADS length =', ALL_ADS.length);
  console.log('FILTERED length =', (typeof FILTERED !== 'undefined')? FILTERED.length : 'undefined');

  // show sample first 5 entries
  console.group('Sample ALL_ADS[0..4]');
  ALL_ADS.slice(0,5).forEach((a,i)=>{
    console.log(i, a.id, a.data);
  });
  console.groupEnd();

  // collect unique raw / normalized regions & districts
  const fromRegions = new Map();
  const toRegions = new Map();
  const fromDistricts = new Map();
  const toDistricts = new Map();

  ALL_ADS.forEach(a=>{
    const d = a.data || {};
    const fr = (d.fromRegion === undefined) ? '' : String(d.fromRegion);
    const tr = (d.toRegion === undefined) ? '' : String(d.toRegion);
    const fd = (d.fromDistrict === undefined) ? '' : String(d.fromDistrict);
    const td = (d.toDistrict === undefined) ? '' : String(d.toDistrict);
    fromRegions.set(fr, normForDebug(fr));
    toRegions.set(tr, normForDebug(tr));
    fromDistricts.set(fd, normForDebug(fd));
    toDistricts.set(td, normForDebug(td));
  });

  function printMap(name, map){
    const arr = Array.from(map.entries()).map(([raw,norm])=>({raw,norm}));
    console.group(name + ' — unique count: ' + arr.length);
    arr.slice(0,200).forEach(x => console.log(x));
    console.groupEnd();
  }

  printMap('From Regions', fromRegions);
  printMap('To Regions', toRegions);
  printMap('From Districts', fromDistricts);
  printMap('To Districts', toDistricts);

  // Show currently selected UI filter values (raw + normalized)
  const getVal = id => document.getElementById(id) ? document.getElementById(id).value : undefined;
  const ui = {
    fromRegion: getVal('fromRegionFilter'),
    toRegion: getVal('toRegionFilter'),
    fromDistrict: getVal('fromDistrictFilter'),
    toDistrict: getVal('toDistrictFilter'),
    seats: getVal('seatsFilter'),
    category: getVal('categoryFilter'),
    search: getVal('searchInput'),
    minPrice: getVal('minPrice'),
    maxPrice: getVal('maxPrice'),
  };
  console.log('UI selected (raw):', ui);
  const uiNorm = Object.fromEntries(Object.entries(ui).map(([k,v]) => [k, (v===undefined?undefined:normForDebug(v))]));
  console.log('UI selected (normalized):', uiNorm);

  // Detailed per-item filter reasoner (first N items)
  function reasonForItem(item, uiNormLocal){
    const d = item.data || {};
    // quick checks, same logic as applyFilters but with normalized comparison
    // returns null if passes all, otherwise string reason
    const q = (ui.search || '').trim().toLowerCase();
    if (q) {
      const text = [
        d.comment||'',
        d.fromRegion||'', d.fromDistrict||'',
        d.toRegion||'', d.toDistrict||'',
        d.userId||'', d.price||''
      ].join(' ').toLowerCase();
      if (!text.includes(q)) return 'search-miss';
    }

    if (uiNormLocal.fromRegion && uiNormLocal.fromRegion !== '' && uiNormLocal.fromRegion !== 'hammasi') {
      if (normForDebug(d.fromRegion) !== uiNormLocal.fromRegion) return 'fromRegion-miss';
    }
    if (uiNormLocal.toRegion && uiNormLocal.toRegion !== '' && uiNormLocal.toRegion !== 'hammasi') {
      if (normForDebug(d.toRegion) !== uiNormLocal.toRegion) return 'toRegion-miss';
    }
    if (uiNormLocal.fromDistrict && uiNormLocal.fromDistrict !== '' && uiNormLocal.fromDistrict !== 'hammasi') {
      if (normForDebug(d.fromDistrict) !== uiNormLocal.fromDistrict) return 'fromDistrict-miss';
    }
    if (uiNormLocal.toDistrict && uiNormLocal.toDistrict !== '' && uiNormLocal.toDistrict !== 'hammasi') {
      if (normForDebug(d.toDistrict) !== uiNormLocal.toDistrict) return 'toDistrict-miss';
    }

    // seats
    const seatsReqRaw = ui.seats || '';
    let seatsReq = 0;
    if (seatsReqRaw) {
      const n = Number(String(seatsReqRaw).replace('+','').trim());
      seatsReq = isNaN(n) ? 0 : n;
    }
    const seatsVal = Number(d.seats || d.driverSeats || 0);
    if (seatsReq && seatsVal < seatsReq) return 'seats-miss';

    // price
    const minP = Number(ui.minPrice) || 0;
    const maxP = Number(ui.maxPrice) || Number.MAX_SAFE_INTEGER;
    const priceVal = Number(d.price) || 0;
    if (priceVal < minP) return 'price-below-min';
    if (priceVal > maxP) return 'price-above-max';

    return null;
  }

  // run reasoner on first 100 items and count reasons
  const reasonCounts = {};
  const failSamples = {};
  ALL_ADS.slice(0,200).forEach(item=>{
    const reason = reasonForItem(item, uiNorm);
    if (reason) {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      if (!failSamples[reason]) failSamples[reason] = item;
    } else {
      reasonCounts['pass'] = (reasonCounts['pass'] || 0) + 1;
      if (!failSamples['pass']) failSamples['pass'] = item;
    }
  });

  console.group('Filter reason counts (first 200 checked)');
  console.log(reasonCounts);
  console.groupEnd();

  console.group('Sample items for each reason');
  Object.entries(failSamples).forEach(([r,it]) => {
    console.log(r, it && it.id, it && it.data);
  });
  console.groupEnd();

  // Helper to run manual test: pass a specific ui selection object
  window.applyFilters_debug = function(testUI){
    const uiTest = Object.assign({}, ui, testUI);
    const uiTestNorm = Object.fromEntries(Object.entries(uiTest).map(([k,v]) => [k, (v===undefined?undefined:normForDebug(v))]));
    console.log('Running applyFilters_debug with:', uiTest, uiTestNorm);
    const passed = [];
    const failed = [];
    ALL_ADS.forEach(item => {
      const reason = (function(){ // reuse reasonForItem logic with test values
        const d = item.data || {};
        const q = (uiTest.search || '').trim().toLowerCase();
        if (q) {
          const text = [
            d.comment||'',
            d.fromRegion||'', d.fromDistrict||'',
            d.toRegion||'', d.toDistrict||'',
            d.userId||'', d.price||''
          ].join(' ').toLowerCase();
          if (!text.includes(q)) return 'search-miss';
        }
        if (uiTestNorm.fromRegion && uiTestNorm.fromRegion !== '' && uiTestNorm.fromRegion !== 'hammasi') {
          if (normForDebug(d.fromRegion) !== uiTestNorm.fromRegion) return 'fromRegion-miss';
        }
        if (uiTestNorm.toRegion && uiTestNorm.toRegion !== '' && uiTestNorm.toRegion !== 'hammasi') {
          if (normForDebug(d.toRegion) !== uiTestNorm.toRegion) return 'toRegion-miss';
        }
        if (uiTestNorm.fromDistrict && uiTestNorm.fromDistrict !== '' && uiTestNorm.fromDistrict !== 'hammasi') {
          if (normForDebug(d.fromDistrict) !== uiTestNorm.fromDistrict) return 'fromDistrict-miss';
        }
        if (uiTestNorm.toDistrict && uiTestNorm.toDistrict !== '' && uiTestNorm.toDistrict !== 'hammasi') {
          if (normForDebug(d.toDistrict) !== uiTestNorm.toDistrict) return 'toDistrict-miss';
        }
        const seatsReqRaw = uiTest.seats || '';
        let seatsReq = 0;
        if (seatsReqRaw) {
          const n = Number(String(seatsReqRaw).replace('+','').trim());
          seatsReq = isNaN(n) ? 0 : n;
        }
        const seatsVal = Number(d.seats || d.driverSeats || 0);
        if (seatsReq && seatsVal < seatsReq) return 'seats-miss';

        const minP = Number(uiTest.minPrice) || 0;
        const maxP = Number(uiTest.maxPrice) || Number.MAX_SAFE_INTEGER;
        const priceVal = Number(d.price) || 0;
        if (priceVal < minP) return 'price-below-min';
        if (priceVal > maxP) return 'price-above-max';

        return null;
      })();

      if (reason) failed.push({ id: item.id, reason, data: item.data });
      else passed.push({ id: item.id, data: item.data });
    });

    console.log('applyFilters_debug result: passed=', passed.length, 'failed=', failed.length);
    console.group('Passed sample (first 10)');
    passed.slice(0,10).forEach(p=>console.log(p.id, p.data));
    console.groupEnd();
    console.group('Failed sample (first 10)');
    failed.slice(0,10).forEach(f=>console.log(f.id, f.reason, f.data));
    console.groupEnd();

    return { passedCount: passed.length, failedCount: failed.length, passed, failed };
  };

  console.log('Diagnostics ready. Use applyFilters_debug({ fromRegion: "Andijon" }) to simulate a filter. Or run applyFilters_debug({}) to simulate current UI selection.');
  console.groupEnd();
})();
