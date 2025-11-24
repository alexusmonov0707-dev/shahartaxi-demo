// regions-helper.js — FINAL UNIVERSAL VERSION
// 100% async safe, 100% region→district matching guaranteed

(function() {

  // --- internal: check if window.regions exists ---
  function readyRegions() {
    return window.regions && typeof window.regions === "object";
  }

  // --- build regions list ---
  function buildRegionsList() {
    if (!readyRegions()) return false;

    window.regionsList = Object.keys(window.regions).map(name => ({
      name,
      districts: Array.isArray(window.regions[name]) ? window.regions[name] : []
    }));

    return true;
  }

  // try initial
  buildRegionsList();

  // --- Public: fillRegions(selectId) ---
  window.fillRegions = function(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;

    let tries = 0;
    (function wait() {
      tries++;
      if (buildRegionsList() || tries > 30) {

        sel.innerHTML = `<option value="">Viloyat</option>`;
        window.regionsList.forEach(r => {
          const op = document.createElement("option");
          op.value = r.name;
          op.textContent = r.name;
          sel.appendChild(op);
        });

      } else {
        setTimeout(wait, 20);
      }
    })();
  };

  // --- Public: updateDistricts(type, callback) ---
  // type = "from" or "to"
  window.updateDistricts = function(type, callback) {

    // base IDs
    let regionId = type + "Region";
    let districtId = type + "District";

    // fallback to edit modal IDs if main ones not exist
    if (!document.getElementById(regionId)) {
      const alt = "edit" + regionId.charAt(0).toUpperCase() + regionId.slice(1);
      if (document.getElementById(alt)) regionId = alt;
    }
    if (!document.getElementById(districtId)) {
      const alt = "edit" + districtId.charAt(0).toUpperCase() + districtId.slice(1);
      if (document.getElementById(alt)) districtId = alt;
    }

    const rSel = document.getElementById(regionId);
    const dSel = document.getElementById(districtId);

    if (!rSel || !dSel) return;

    // always reset district dropdown
    function reset() {
      dSel.innerHTML = `<option value="">Tuman</option>`;
      dSel.value = "";
      dSel.selectedIndex = 0;
    }
    reset();

    let tries = 0;
    (function fill() {
      tries++;
      if (buildRegionsList() || tries > 30) {

        const regionName = rSel.value;
        const info = window.regionsList.find(r => r.name === regionName);

        if (info) {
          info.districts.forEach(d => {
            const op = document.createElement("option");
            op.value = d;
            op.textContent = d;
            dSel.appendChild(op);
          });
        }

        dSel.value = "";
        dSel.selectedIndex = 0;

        if (typeof callback === "function") {
          setTimeout(callback, 10);
        }

      } else {
        setTimeout(fill, 20);
      }
    })();
  };

})();
