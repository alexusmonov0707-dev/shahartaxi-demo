// ShaharTaxi Demo JS funksiyasi

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adForm");
  const list = document.getElementById("adList");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const from = document.getElementById("from").value;
    const to = document.getElementById("to").value;
    const price = document.getElementById("price").value;

    if (!name || !phone || !from || !to || !price) {
      alert("Iltimos, barcha maydonlarni to‘ldiring!");
      return;
    }

    const item = document.createElement("div");
    item.classList.add("ad-item");
    item.innerHTML = `
      <strong>${from}</strong> ➜ <s
