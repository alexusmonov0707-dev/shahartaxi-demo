(function () {

  // 1) regions borligini tekshirish
  function ensureRegionsReady() {
    return (window.regions && typeof window.regions === "object");
  }

  // 2) regionsList yaratish
  function buildRegionsList() {
    if (!ensureRegionsReady()) return false;
    window.regionsList = Object.keys(window.regions).map(region => ({
      name: region,
      districts: window.regions[region]
    }));
    return true;
  }

  buildRegionsList();

  // 3) VILOYATLARNI TO‘LDIRISH
  window.fillRegions = function (id) {
    const el = document.getElementById(id);
    if (!el) return;

    let tries = 0;
    (function wait() {
      tries++;
      if (buildRegionsList() || tries > 20) {
        el.innerHTML = `<option value="">Viloyat</option>`;
        (window.regionsList || []).forEach(r => {
          const op = document.createElement("option");
          op.value = r.name;
          op.textContent = r.name;
          el.appendChild(op);
        });
      } else {
        setTimeout(wait, 20);
      }
    })();
  };

  // 4) TUMANLARNI TOLA RESET QILISH
  function resetDistricts(dSel) {
    dSel.innerHTML = `<option value="">Tuman</option>`;
    dSel.value = "";
    dSel.selectedIndex = 0;
  }

  // 5) TUMANLARNI TO‘LDIRISH (TRIGGER)
  window.updateDistricts = function (type, callback) {
    let rSel = document.getElementById(type + "Region");
    let dSel = document.getElementById(type + "District");

    // edit modal fallback
    if (!rSel || !dSel) {
      const R = "edit" + type.charAt(0).toUpperCase() + type.slice(1) + "Region";
      const D = "edit" + type.charAt(0).toUpperCase() + type.slice(1) + "District";
      rSel = document.getElementById(R);
      dSel = document.getElementById(D);
    }

    if (!rSel || !dSel) return;

    resetDistricts(dSel);

    let tries = 0;
    (function wait() {
      tries++;

      if (buildRegionsList() || tries > 20) {

        const region = rSel.value;
        const info = (window.regionsList || []).find(r => r.name === region);

        if (info) {
          info.districts.forEach(dist => {
            const op = document.createElement("option");
            op.value = dist;
            op.textContent = dist;
            dSel.appendChild(op);
          });
        }

        // **MUHIM** – district to‘liq yuklangach callback
        if (typeof callback === "function") {
          setTimeout(callback, 10);
        }

      } else setTimeout(wait, 20);

    })();
  };

})();
