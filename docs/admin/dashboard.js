import { db, ref, get, onValue } from "./firebase.js";

// ADMIN SESSION
const adminSession = sessionStorage.getItem("admin");
if (!adminSession) location.href = "./login.html";
document.getElementById("adminName").textContent = adminSession;

// CHART VARIABLES
let adsChart = null;
let popularChart = null;

function normalizeTimestamp(ts) {
    // Agar timestamp kelajak bo'lsa → uni hozirga tenglash
    const now = Date.now();
    if (ts > now) {
        return now - 1000; // 1 sekund avval qilib qo'yamiz
    }
    return ts;
}

// LOAD STATS
async function loadAdvancedStats() {
    const snap = await get(ref(db, "ads"));
    if (!snap.exists()) return;

    const ads = Object.values(snap.val());
    const now = Date.now();
    const dayMS = 24 * 60 * 60 * 1000;

    let today = 0, week = 0, month = 0;
    let weeklyData = [0,0,0,0,0,0,0];

    ads.forEach(ad => {
        if (!ad.createdAt) return;

        const created = normalizeTimestamp(ad.createdAt);
        const diff = now - created;

        if (diff < 0) return; // noto'g'ri kelajak sanalar

        const dayIndex = Math.floor(diff / dayMS);

        if (dayIndex === 0) today++;
        if (dayIndex < 7) weeklyData[6 - dayIndex] += 1;
        if (dayIndex < 7) week++;
        if (dayIndex < 30) month++;
    });

    document.getElementById("statToday").textContent = today;
    document.getElementById("statWeek").textContent = week;
    document.getElementById("statMonth").textContent = month;

    drawAdsChart(weeklyData);
    extractPopularRoutes(ads);
}

// POPULAR ROUTES
function extractPopularRoutes(ads) {
    const map = {};

    ads.forEach(ad => {
        if (!ad.fromRegion || !ad.toRegion) return;
        const key = `${ad.fromRegion} → ${ad.toRegion}`;
        map[key] = (map[key] || 0) + 1;
    });

    const sorted = Object.entries(map)
        .sort((a,b) => b[1]-a[1])
        .slice(0, 7);

    drawPopularChart(sorted.map(v => v[0]), sorted.map(v => v[1]));
}

// REAL-TIME ONLINE DRIVERS
function realTimeMonitoring() {
    onValue(ref(db, "online/drivers"), snap => {
        const val = snap.exists() ? Object.keys(snap.val()).length : 0;
        document.getElementById("statOnlineDrivers").textContent = val;
    });
}

// CHARTS
function drawAdsChart(data) {
    const ctx = document.getElementById("adsChart");
    if (adsChart) adsChart.destroy();
    adsChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: ["6 kun", "5", "4", "3", "2", "1", "Bugun"],
            datasets: [{
                label: "7 kunlik e’lonlar",
                data,
                borderWidth: 2,
                tension: 0.3
            }]
        }
    });
}

function drawPopularChart(labels, values) {
    const ctx = document.getElementById("popularChart");
    if (popularChart) popularChart.destroy();
    popularChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Mashhur yo‘nalishlar",
                data: values,
                borderWidth: 1
            }]
        }
    });
}

async function init() {
    await loadAdvancedStats();
    realTimeMonitoring();
}
init();

// LOGOUT
document.getElementById("logoutBtn").onclick = () => {
    sessionStorage.removeItem("admin");
    location.href = "./login.html";
};
