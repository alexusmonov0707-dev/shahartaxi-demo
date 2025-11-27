import { db, ref, get, set, update } from "./firebase.js";

export function initSettings() {
  loadSettings();
  document.getElementById("saveBtn").addEventListener("click", saveSettings);
}

// SOZLAMALARNI YUKLASH
async function loadSettings() {
  const snap = await get(ref(db, "settings"));

  if (snap.exists()) {
    const s = snap.val();

    document.getElementById("minPrice").value = s.minPrice ?? "";
    document.getElementById("maxPrice").value = s.maxPrice ?? "";
    document.getElementById("minSeat").value = s.minSeat ?? "";
    document.getElementById("adExpire").value = s.adExpire ?? "";
    document.getElementById("maintenance").value = s.maintenance ?? "off";
  }
}

// SAQLASH
async function saveSettings() {
  const data = {
    minPrice: Number(document.getElementById("minPrice").value),
    maxPrice: Number(document.getElementById("maxPrice").value),
    minSeat: Number(document.getElementById("minSeat").value),
    adExpire: Number(document.getElementById("adExpire").value),
    maintenance: document.getElementById("maintenance").value
  };

  await update(ref(db, "settings"), data);

  alert("Saqlab qo‘yildi!");
}
