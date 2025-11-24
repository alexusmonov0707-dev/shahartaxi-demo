// regions-helper.js (FINAL, universal, callback safe)
// - buildRegionsList when available
// - fillRegions(selectId)
// - updateDistricts(type, callback) -> callback runs AFTER districts appended
(function () {

  // check if window.regions exists
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

  // initial attempt
  buildRegionsList();

  // Fill region select by id (retries while regions not ready)
  window.fillRegions = function(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;

    let tries = 0;
    (function wait() {
      tries++;
      if (buildRegionsList() || tries > 30) {
        // reset
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

  // updateDistricts(type, callback) — type: "from" or "to"
  // supports IDs like fromRegion/fromDistrict or editFromRegion/editFromDistrict
  window.updateDistricts = function(type, callback) {
    if (!type) return;
    // primary ids
    let regionId = type + "Region";
    let districtId = type + "District";

    // fallback to edit modal naming if main ids missing
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

    // ALWAYS fully reset district select before filling
    function resetDistrictSelect() {
      dSel.innerHTML = `<option value="">Tuman</option>`;
      dSel.value = "";
      dSel.selectedIndex = 0;
    }
    resetDistrictSelect();

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
        // After districts appended, ensure reset of value then call callback
        dSel.value = dSel.value || "";
        dSel.selectedIndex = dSel.selectedIndex || 0;
        if (typeof callback === "function") {
          // small timeout to guarantee DOM updated before callback uses .value
          setTimeout(callback, 10);
        }
      } else {
        setTimeout(waitFill, 25);
      }
    })();
  };

})();
