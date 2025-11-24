(function () {

  // -----------------------------
  //  REGIONS READY
  // -----------------------------
  function ensureRegions() {
    return window.regions && typeof window.regions === "object";
  }

  // -----------------------------
  //  BUILD REGIONS LIST
  // -----------------------------
  function buildList() {
    if (!ensureRegions()) return false;

    window.regionsList = Object.keys(window.regions).map(r => ({
      name: r,
      districts: window.regions[r]
    }));

    return true;
  }

  buildList();

  // -----------------------------
  //  FILL REGIONS (FOR DROPDOWNS)
  // -----------------------------
  window.fillRegions = function (id) {
    const sel = document.getElementById(id);
    if (!sel) return;

    let tries = 0;
    (function wait() {
      tries++;
      if (buildList() || tries > 20) {
        sel.innerHTML = `<option value="">Viloyat</option>`;
        window.regionsList.forEach(r => {
          const op = document.createElement("option");
          op.value = r.name;
          op.textContent = r.name;
          sel.appendChild(op);
        });
      } else {
        setTimeout(wait, 15);
      }
    })();
  };

  // -----------------------------
  //  UPDATE DISTRICTS (KEY FIX)
  // -----------------------------
  window.updateDistricts = function (type, callback) {

    let regionId = type + "Region";
    let districtId = type + "District";

    // For edit modal
    if (!document.getElementById(regionId)) regionId = "edit" + regionId.charAt(0).toUpperCase() + regionId.slice(1);
    if (!document.getElementById(districtId)) districtId = "edit" + districtId.charAt(0).toUpperCase() + districtId.slice(1);

    const rSel = document.getElementById(regionId);
    const dSel = document.getElementById(districtId);

    if (!rSel || !dSel) return;

    // RESET properly
    dSel.innerHTML = `<option value="">Tuman</option>`;
    dSel.value = "";

    let tries = 0;
    (function wait2() {
      tries++;
      if (buildList() || tries > 20) {

        const regionName = rSel.value;
        const data = window.regionsList.find(r => r.name === regionName);

        if (data) {
          data.districts.forEach(d => {
            const op = document.createElement("option");
            op.value = d;
            op.textContent = d;
            dSel.appendChild(op);
          });
        }

        // MOST IMPORTANT PART:
        if (typeof callback === "function") {
          setTimeout(callback, 10);
        }

      } else setTimeout(wait2, 15);

    })();
  };

})();
