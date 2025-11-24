// regions-helper.js (FIXED FINAL)
// - buildRegionsList when available
// - fillRegions(selectId)
// - updateDistricts(type, callback) -> callback runs AFTER districts appended
(function () {

  function ensureRegionsObject() {
    return window.regions && typeof window.regions === "object";
  }

  function buildRegionsList() {
    if (!ensureRegionsObject()) return false;
    window.regionsList = Object.keys(window.regions).map(name => ({
      name,
      districts: Array.isArray(window.regions[name]) ? window.regions[name] : []
    }));
    return true;
  }

  buildRegionsList();

  // FILL REGIONS
  window.fillRegions = function(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;

    let tries = 0;
    (function wait() {
      tries++;
      if (buildRegionsList() || tries > 30) {
        el.innerHTML = `<option value="">Viloyat</option>`;
        (window.regionsList || []).forEach(r => {
          const op = document.createElement("option");
          op.value = r.name;
          op.textContent = r.name;
          el.appendChild(op);
        });
      } else {
        setTimeout(wait, 25);
      }
    })();
  };

  // UPDATE DISTRICTS
  window.updateDistricts = function(type, callback) {
    if (!type) return;

    let regionId = type + "Region";
    let districtId = type + "District";

    // fallback to modal IDs
    if (!document.getElementById(regionId)) {
      const altR = "edit" + regionId.charAt(0).toUpperCase() + regionId.slice(1);
      if (document.getElementById(altR)) regionId = altR;
    }
    if (!document.getElementById(districtId)) {
      const altD = "edit" + districtId.charAt(0).toUpperCase() + districtId.slice(1);
      if (document.getElementById(altD)) districtId = altD;
    }

    const rSel = document.getElementById(regionId);
    const dSel = document.getElementById(districtId);
    if (!rSel || !dSel) return;

    // reset district
    dSel.innerHTML = `<option value="">Tuman</option>`;

    let tries = 0;
    (function waitFill() {
      tries++;
      if (buildRegionsList() || tries > 30) {

        const regionName = rSel.value;
        const info = (window.regionsList || []).find(r => r.name === regionName);

        if (info && Array.isArray(info.districts)) {
          info.districts.forEach(d => {
            const op = document.createElement("option");
            op.value = d;
            op.textContent = d;
            dSel.appendChild(op);
          });
        }

        // IMPORTANT FIX — callback sets the district value
        if (typeof callback === "function") {
          setTimeout(callback, 10);
        }

      } else {
        setTimeout(waitFill, 25);
      }
    })();
  };

})();
