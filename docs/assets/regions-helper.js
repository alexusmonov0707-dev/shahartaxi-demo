// ======================================================
//   SUPER UNIVERSAL REGIONS HELPER (FINAL VERSION)
//   supports create-ad + edit modal + ANY ID formats
//   100% correct district selection reset + sync
// ======================================================

(function () {

  // -------------------------------
  // 1) REGIONS LOADING (SAFE)
  // -------------------------------
  function ensureRegionsList() {
    try {
      if (window.regions && typeof window.regions === "object") {
        window.regionsList = Object.keys(window.regions).map(name => ({
          name,
          districts: window.regions[name]
        }));
        return true;
      }
    } catch {}
    window.regionsList = window.regionsList || [];
    return false;
  }

  ensureRegionsList();

  // -------------------------------
  // 2) REGION SELECT FILLER
  // -------------------------------
  window.fillRegions = function (selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;

    let attempts = 0;
    (function wait() {
      attempts++;
      if (ensureRegionsList() || attempts > 15) {
        el.innerHTML = `<option value="">Viloyat</option>`;
        (window.regionsList || []).forEach(r => {
          const op = document.createElement("option");
          op.value = r.name;
          op.textContent = r.name;
          el.appendChild(op);
        });
      } else setTimeout(wait, 30);
    })();
  };


  // -------------------------------
  // 3) UNIVERSAL DISTRICT UPDATER
  //    (supports edit + normal modes)
  // -------------------------------
  window.updateDistricts = function (type, callback = null) {
    let rSel = document.getElementById(type + "Region");
    let dSel = document.getElementById(type + "District");

    // auto-detect for edit modal
    if (!rSel || !dSel) {
      const m = {
        from: { r: "editFromRegion", d: "editFromDistrict" },
        to:   { r: "editToRegion",   d: "editToDistrict" }
      }[type];

      if (m) {
        rSel = document.getElementById(m.r);
        dSel = document.getElementById(m.d);
      }
    }

    if (!rSel || !dSel) return;

    let tries = 0;
    (function wait() {
      tries++;
      if (ensureRegionsList() || tries > 15) {
        fillDistricts(rSel, dSel);
        if (callback) setTimeout(callback, 20); // ★ tumanni yuklab bo‘lgandan keyin callback
      } else {
        setTimeout(wait, 30);
      }
    })();
  };


  // -------------------------------
  // 4) DISTRICTS FILLER (FINAL FIX)
  // -------------------------------
  function fillDistricts(regionSelect, districtSelect) {

    // ★ ALWAYS reset district select completely
    districtSelect.innerHTML = `<option value="">Tuman</option>`;
    districtSelect.value = "";
    districtSelect.selectedIndex = 0;

    const selectedRegion = regionSelect.value;
    if (!selectedRegion) return;

    const regionData = (window.regionsList || []).find(r => r.name === selectedRegion);
    if (!regionData) return;

    regionData.districts.forEach(d => {
      const op = document.createElement("option");
      op.value = d;
      op.textContent = d;
      districtSelect.appendChild(op);
    });

    // ★ ensure NO OLD district stays
    districtSelect.value = "";
    districtSelect.selectedIndex = 0;
  }

})();
