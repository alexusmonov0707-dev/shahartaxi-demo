(function () {

  /* ------------------------------
     1) REGIONS LIST READY CHECKER
  ------------------------------ */
  function ensureRegionsList() {
    if (window.regions && typeof window.regions === "object") {
      window.regionsList = Object.keys(window.regions).map(name => ({
        name,
        districts: window.regions[name]
      }));
      return true;
    }
    return false;
  }

  // initialize once
  ensureRegionsList();

  /* ------------------------------
      2) FILL REGIONS DROPDOWN
  ------------------------------ */
  window.fillRegions = function (selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;

    let tries = 0;
    (function wait() {
      tries++;
      if (ensureRegionsList() || tries > 20) {
        // reset select
        el.innerHTML = `<option value="">Viloyat</option>`;
        if (window.regionsList) {
          window.regionsList.forEach(r => {
            const op = document.createElement("option");
            op.value = r.name;
            op.textContent = r.name;
            el.appendChild(op);
          });
        }
      } else {
        setTimeout(wait, 25);
      }
    })();
  };


  /* ------------------------------
      3) UPDATE DISTRICTS UNIVERSAL
  ------------------------------ */
  window.updateDistricts = function (type, callback = null) {
    let regionId = type + "Region";
    let districtId = type + "District";

    // EDIT MODAL fallback
    if (!document.getElementById(regionId)) {
      regionId = "edit" + regionId.charAt(0).toUpperCase() + regionId.slice(1);
    }
    if (!document.getElementById(districtId)) {
      districtId = "edit" + districtId.charAt(0).toUpperCase() + districtId.slice(1);
    }

    const rSel = document.getElementById(regionId);
    const dSel = document.getElementById(districtId);

    if (!rSel || !dSel) return;

    let tries = 0;
    (function wait() {
      tries++;
      if (ensureRegionsList() || tries > 20) {
        fillDistricts(rSel, dSel);
        if (typeof callback === "function") {
          setTimeout(callback, 15);
        }
      } else setTimeout(wait, 25);
    })();
  };


  /* ------------------------------
      4) FILL DISTRICTS SAFE
  ------------------------------ */
  function fillDistricts(rSel, dSel) {

    // RESET tumanlar
    dSel.innerHTML = `<option value="">Tuman</option>`;
    dSel.value = "";
    dSel.selectedIndex = 0;

    const regionName = rSel.value;
    if (!regionName) return;

    const regionData = window.regionsList?.find(r => r.name === regionName);
    if (!regionData) return;

    regionData.districts.forEach(dist => {
      const op = document.createElement("option");
      op.value = dist;
      op.textContent = dist;
      dSel.appendChild(op);
    });

    // RESET AGAIN to prevent any old values
    dSel.value = "";
    dSel.selectedIndex = 0;
  }

})();
