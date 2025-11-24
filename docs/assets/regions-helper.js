// ======================================================
//   UNIVERSAL REGIONS HELPER (FINAL FIXED VERSION)
// ======================================================

(function () {

  // 1) REGIONS LOAD
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


  // 2) FILL REGIONS
  window.fillRegions = function (selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;

    let tries = 0;
    (function wait() {
      tries++;
      if (ensureRegionsList() || tries > 10) {
        el.innerHTML = `<option value="">Viloyat</option>`;
        (window.regionsList || []).forEach(r => {
          const opt = document.createElement("option");
          opt.value = r.name;
          opt.textContent = r.name;
          el.appendChild(opt);
        });
      } else {
        setTimeout(wait, 50);
      }
    })();
  };


  // 3) UPDATE DISTRICTS (auto-detect edit modal or create-ad)
  window.updateDistricts = function (type) {
    let rSel = document.getElementById(type + "Region");
    let dSel = document.getElementById(type + "District");

    // auto-detect for edit modal
    if (!rSel || !dSel) {
      const m = {
        from: { r: "editFromRegion", d: "editFromDistrict" },
        to: { r: "editToRegion", d: "editToDistrict" }
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
      if (ensureRegionsList() || tries > 10) {
        fillDistricts(rSel, dSel);
      } else {
        setTimeout(wait, 50);
      }
    })();
  };


  // 4) FINAL DISTRICT FILLER — 100% FIXED VERSION
  function fillDistricts(regionSelect, districtSelect) {

    // ALWAYS reset district select:
    districtSelect.innerHTML = `<option value="">Tuman</option>`;
    districtSelect.value = "";           // ★ KEY FIX
    districtSelect.selectedIndex = 0;    // ★ KEY FIX

    const selectedRegion = regionSelect.value;
    if (!selectedRegion) return;

    const regionData = (window.regionsList || []).find(r => r.name === selectedRegion);
    if (!regionData) return;

    regionData.districts.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      districtSelect.appendChild(opt);
    });

    // after load → must reset again so old value isn't restored
    districtSelect.value = "";
    districtSelect.selectedIndex = 0;
  }

})();
