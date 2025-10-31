// admin-stat.js

document.addEventListener("DOMContentLoaded", () => {
  const ads = JSON.parse(localStorage.getItem("ads") || "[]");

  document.getElementById("totalAds").textContent = ads.length;

  const now = new Date();
  const last7days = ads.filter(ad => {
    const date = new Date(ad.createdAt || ad.date);
    return (now - date) / (1000 * 60 * 60 * 24) <= 7;
  }).length;

  document.getElementById("last7days").textContent = last7days;

  const approved = ads.filter(ad => ad.status === "approved").length;
  const rejected = ads.filter(ad => ad.status === "rejected").length;

  document.getElementById("approvedAds").textContent = approved;
  document.getElementById("rejectedAds").textContent = rejected;

  // Haydovchi / Yo‘lovchi ulushi
  const drivers = ads.filter(ad => ad.type === "driver").length;
  const passengers = ads.filter(ad => ad.type === "passenger").length;

  new Chart(document.getElementById("typeChart"), {
    type: "doughnut",
    data: {
      labels: ["Haydovchilar", "Yo‘lovchilar"],
      datasets: [{
        data: [drivers, passengers],
        backgroundColor: ["#007bff", "#28a745"]
      }]
    },
    options: {
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
});
