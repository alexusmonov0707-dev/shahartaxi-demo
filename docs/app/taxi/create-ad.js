console.log("CREATE-AD.JS LOADED:", import.meta.url);

// Firebase universal backend
import {
    auth,
    db,
    ref,
    push,
    set,
    onAuthStateChanged,
    $
} from "/shahartaxi-demo/libs/lib.js";

// --- AUTH CHECK ---
onAuthStateChanged(auth, user => {
    if (!user) {
        console.warn("User not logged in — redirecting...");
        window.location.href = "/shahartaxi-demo/app/auth/login.html";
    }
});


// --- FORM SUBMIT HANDLER ---
document.getElementById("submitAdBtn").onclick = async () => {
    const user = auth.currentUser;

    if (!user) {
        alert("Avval tizimga kiring.");
        return;
    }

    // Gather form data
    const adData = {
        userId: user.uid,
        fromRegion: $("fromRegion").value,
        fromDistrict: $("fromDistrict").value,
        toRegion: $("toRegion").value,
        toDistrict: $("toDistrict").value,
        price: $("price").value,
        departureTime: $("departureTime").value,
        seats: $("seats").value,
        comment: $("adComment").value,
        createdAt: Date.now()
    };

    // Simple validation
    if (!adData.fromRegion || !adData.toRegion) {
        alert("Qayerdan va Qayerga maydonlari to‘ldirilishi shart!");
        return;
    }

    // Firebase push
    try {
        const adsRef = ref(db, "ads");
        const newAd = push(adsRef);
        await set(newAd, adData);

        alert("E’lon muvaffaqiyatli joylandi!");
        window.location.href = "/shahartaxi-demo/app/taxi/my-ads.html";
    } catch (err) {
        console.error("E’lon qo‘shishda xatolik:", err);
        alert("Xatolik yuz berdi: " + err.message);
    }
};



// OPTIONAL: CLEAR FORM BUTTON
document.getElementById("clearFormBtn").onclick = () => {
    $("fromRegion").value = "";
    $("fromDistrict").value = "";
    $("toRegion").value = "";
    $("toDistrict").value = "";
    $("price").value = "";
    $("departureTime").value = "";
    $("seats").value = "";
    $("adComment").value = "";
};
