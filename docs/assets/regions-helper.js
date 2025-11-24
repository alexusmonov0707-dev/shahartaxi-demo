// ======================================================
//  UNIVERSAL REGIONS HELPER (create-ad + my-ads + future)
//  ✔ Auto-detect IDs
//  ✔ Late-load safe (wait for regions)
//  ✔ No more stuck district bug
//  ✔ Supports: fromRegion/fromDistrict + editFromRegion/editFromDistrict
// ======================================================

(function () {

  //---------------------------------------
  // 1) REGIONS LOADING (SAFE)
  //---------------------------------------
  function ensureRegionsList() {
    try {
      if (window.regions && typeof window.regions === "object") {
        window.regionsList = Object.keys(window.regions).map(name => ({
          name,
          districts: window.regions[name]
        }));
        return true;
      }
    } catch (e) {}
    window.regionsList = window.regionsList || [];
    return false;
  }

  // First try
  ensureRegionsList();


  //---------------------------------------
  // 2) UNIVERSAL REGION FILLER
  //---------------------------------------
  window.fillRegions = function (selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;

    let attempts = 0;
    const tryFill = () => {
      attempts++;
      if (ensureRegionsList() || attempts > 10) {
        insertRegions(el);
      } else {
        setTimeout(tryFill, 50);
      }
    };

    tryFill();
  };

  function insertRegions(el) {
    el.innerHTML = `<option value="">Viloyat</option>`;
    (window.regionsList || []).forEach(r => {
      const op = document.createElement("option");
      op.value = r.name;
      op.textContent = r.name;
      el.appendChild(op);
    });
  }


  //---------------------------------------
  // 3) UNIVERSAL DISTRICT UPDATER
  //---------------------------------------
  window.updateDistricts = function (type) {
    let regionSelect = document.getElementById(type + "Region");
    let districtSelect = document.getElementById(type + "District");

    // AUTODETECT (edit modal)
    if (!regionSelect || !districtSelect) {
      const map = {
        from: { r: "editFromRegion", d: "editFromDistrict" },
        to:   { r: "editToRegion",   d: "editToDistrict" }
      };
      const m = map[type];
      if (m) {
        regionSelect = document.getElementById(m.r);
        districtSelect = document.getElementById(m.d);
      }
    }

    if (!regionSelect || !districtSelect) return;

    let attempts = 0;
    const tryUpdate = () => {
      attempts++;
      if (ensureRegionsList() || attempts > 10) {
        fillDistricts(regionSelect, districtSelect);
      } else {
        setTimeout(tryUpdate, 50);
      }
    };

    tryUpdate();
  };


  //---------------------------------------
  // 4) DISTRICTS FILLER (FIXED VERSION)
  //---------------------------------------
  function fillDistricts(regionSelect, districtSelect) {

    // Har safar tozalaymiz:
    districtSelect.innerHTML = `<option value="">Tuman</option>`;
    districtSelect.selectedIndex = 0;  // ★ ENG MUHIM FIX — eski tuman qotib qolmaydi

    const selectedRegion = regionSelect.value;
    if (!selectedRegion) return;

    const regionData = (window.regionsList || []).find(r => r.name === selectedRegion);
    if (!regionData) return;

    // Yangi tumanlarni qo‘shish
    regionData.districts.forEach(d => {
      const op = document.createElement("option");
      op.value = d;
      op.textContent = d;
      districtSelect.appendChild(op);
    });

    // Yangi tumanga default qaytish (yana kafolat)
    districtSelect.selectedIndex = 0;
  }

})();
