// ======================================
//   REGIONS HELPER — DEFENSIVE VERSION
// ======================================

(function () {
  // internal helper to (re)build regionsList when window.regions available
  function ensureRegionsList() {
    try {
      if (window.regions && typeof window.regions === "object") {
        // build regionsList once
        window.regionsList = Object.keys(window.regions).map(name => ({
          name,
          districts: window.regions[name]
        }));
        return true;
      }
    } catch (err) {
      console.warn("ensureRegionsList error:", err);
    }
    // fallback empty array if not yet available
    window.regionsList = window.regionsList || [];
    return false;
  }

  // Fill/select functions will attempt to ensure regionsList first.
  window.fillRegions = function (selectId, opts = {}) {
    const el = document.getElementById(selectId);
    if (!el) return;

    // Try to ensure regionsList. If not ready, retry a few times.
    if (!ensureRegionsList()) {
      // retry a few times with a short delay to handle async loads
      let attempts = 0;
      const tryFill = () => {
        attempts++;
        if (ensureRegionsList() || attempts > 10) {
          // proceed (maybe empty) so page doesn't break
          _doFill(el);
        } else {
          setTimeout(tryFill, 50);
        }
      };
      tryFill();
      return;
    }

    _doFill(el);

    function _doFill(elm) {
      elm.innerHTML = opts.emptyLabel ? opts.emptyLabel : `<option value="">Viloyat</option>`;
      (window.regionsList || []).forEach(r => {
        const op = document.createElement("option");
        op.value = r.name;
        op.textContent = r.name;
        elm.appendChild(op);
      });
    }
  };

  window.updateDistricts = function (type) {
    const regionSelect = document.getElementById(type + "Region");
    const districtSelect = document.getElementById(type + "District");
    if (!regionSelect || !districtSelect) return;

    // ensure regions
    if (!ensureRegionsList()) {
      // try a few times then give up (prevents immediate crash)
      let attempts = 0;
      const tryUpdate = () => {
        attempts++;
        if (ensureRegionsList() || attempts > 10) {
          _doUpdate();
        } else {
          setTimeout(tryUpdate, 50);
        }
      };
      tryUpdate();
      return;
    }

    _doUpdate();

    function _doUpdate() {
      districtSelect.innerHTML = `<option value="">Tuman</option>`;
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
    }
  };

  // initialize if possible now
  ensureRegionsList();
})();
