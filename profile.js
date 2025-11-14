// GLOBAL EXPORT — HTML onclick() uchun
window.openEditProfile = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.saveProfileEdit = saveProfileEdit;
window.addAd = addAd;
window.clearAddForm = clearAddForm;
window.logout = logout;

// Regions (toza, ishlaydigan)
const regions = {
  "Toshkent": ["Bektemir", "Chilonzor", "Yakkasaroy", "Mirzo Ulug‘bek"],
  "Samarqand": ["Bulung‘ur", "Ishtixon", "Urgut"],
  "Buxoro": ["Buxoro sh.", "Jondor", "G‘ijduvon"],
  "Xorazm": ["Urganch", "Xiva", "Shovot"]
};

const $ = document.getElementById.bind(document);

// --- DROPDOWN to‘ldirish ---
function fillRegions() {
  const fr = $("fromRegion");
  const tr = $("toRegion");

  fr.innerHTML = "<option value=''>Viloyat</option>";
  tr.innerHTML = "<option value=''>Viloyat</option>";

  for (let r in regions) {
    fr.innerHTML += `<option value="${r}">${r}</option>`;
    tr.innerHTML += `<option value="${r}">${r}</option>`;
  }
}

function updateDistricts(type) {
  const reg = $(type + "Region").value;
  const dst = $(type + "District");

  dst.innerHTML = "<option value=''>Tuman</option>";

  if (regions[reg]) {
    regions[reg].forEach(t => {
      dst.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }
}

window.updateDistricts = updateDistricts;

// ---------------- MODAL ----------------

function openEditProfile() {
  $("editProfileModal").style.display = "flex";
}

function closeEditProfile() {
  $("editProfileModal").style.display = "none";
}

function saveProfileEdit() {
  alert("Saqlash ishladi (demo)");
  closeEditProfile();
}

// ---------------- ADD AD ----------------

function clearAddForm() {
  $("adType").value = "";
  $("fromRegion").value = "";
  $("fromDistrict").innerHTML = "";
  $("toRegion").value = "";
  $("toDistrict").innerHTML = "";
  $("price").value = "";
  $("adComment").value = "";
}

function addAd() {
  alert("E’lon qo‘shildi (demo)");
}

// ---------------- AUTH ----------------

function logout() {
  alert("Chiqdingiz (demo)");
}

// ---------------- STARTUP ----------------

fillRegions();
