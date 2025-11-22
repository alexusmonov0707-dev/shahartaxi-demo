import { db, ref, get, update, remove } from "./firebase.js";

console.log("ADS.JS LOADED");

const adsTable = document.getElementById("adsTable");
const searchInput = document.getElementById("search");

let ADS_CACHE = {}; // caching — faqat 1 marta yuklanadi

// ====================================
// 1) ADSlarni 1 MARTA yuklash
// ====================================
async function loadAds() {
    const snap = await get(ref(db, "ads"));

    if (!snap.exists()) {
        adsTable.innerHTML = `<tr><td colspan="5" class="p-4">E'lonlar topilmadi</td></tr>`;
        return;
    }

    ADS_CACHE = snap.val(); // CACHEGA SAQLAYAPMIZ (Firebasega ikkinchi so‘rov bo‘lmaydi)

    renderAds(ADS_CACHE);
}


// ====================================
// 2) ADSlarni render qilish (client-side)
// ====================================
function renderAds(data) {
    adsTable.innerHTML = "";

    Object.entries(data).forEach(([id, ad]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="p-3">${id}</td>
            <td class="p-3">${ad.title || "(no title)"}</td>
            <td class="p-3">${ad.user || "-"}</td>
            <td class="p-3">${ad.status || "pending"}</td>
            <td class="p-3">
                <button data-id="${id}" class="approve px-2 py-1 bg-green-600 text-white rounded">OK</button>
                <button data-id="${id}" class="reject px-2 py-1 bg-yellow-600 text-white rounded">Reject</button>
                <button data-id="${id}" class="delete px-2 py-1 bg-red-600 text-white rounded">Delete</button>
            </td>
        `;
        adsTable.appendChild(tr);
    });

    initButtons();
}


// ====================================
// 3) Tugmalarni ishga tushirish
// ====================================
function initButtons() {

    document.querySelectorAll(".approve").forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            await update(ref(db, "ads/" + id), { status: "approved" });
            ADS_CACHE[id].status = "approved";
            renderAds(ADS_CACHE);
        };
    });

    document.querySelectorAll(".reject").forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            await update(ref(db, "ads/" + id), { status: "rejected" });
            ADS_CACHE[id].status = "rejected";
            renderAds(ADS_CACHE);
        };
    });

    document.querySelectorAll(".delete").forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            await remove(ref(db, "ads/" + id));
            delete ADS_CACHE[id];
            renderAds(ADS_CACHE);
        };
    });

}


// ====================================
// 4) Qidiruv (Firebasega emas, faqat CACHEga ishlaydi)
// ====================================
searchInput.oninput = () => {
    const text = searchInput.value.toLowerCase();

    const filtered = {};

    for (let id in ADS_CACHE) {
        const ad = ADS_CACHE[id];
        const str = `${id} ${ad.title} ${ad.user} ${ad.status}`.toLowerCase();
        if (str.includes(text)) filtered[id] = ad;
    }

    renderAds(filtered);
};


// ====================================
// START
// ====================================
loadAds();
