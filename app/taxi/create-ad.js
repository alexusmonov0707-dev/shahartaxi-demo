console.log("CREATE-AD.JS LOADED:", import.meta.url);

import { 
    auth,
    db,
    ref,
    push,
    set,
    onAuthStateChanged,
    $
} from "../../libs/lib.js";   // ✔ TO‘G‘RI YO‘L

// AUTH CHECK
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "../../auth/login.html";  // ✔ to‘g‘ri yo‘l
    }
});

// SUBMIT FORM
document.getElementById("submitAdBtn").onclick = async () => {
    const user = auth.currentUser;
    if (!user) return;

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
        createdAt: Date.now(),
        approved: false,      // admin tasdiqlashi uchun
        type: "Haydovchi"     // supper app talabiga mos
    };

    const adsRef = ref(db, "ads");
    const newAdRef = push(adsRef);
    await set(newAdRef, adData);

    alert("E’lon muvaffaqiyatli joylandi!");
    location.href = "./my-ads.html";    // ✔ RELATIVE LINK
};
