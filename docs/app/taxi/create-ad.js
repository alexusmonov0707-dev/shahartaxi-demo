console.log("CREATE-AD.JS LOADED:", import.meta.url);

import {
    auth,
    db,
    ref,
    push,
    set,
    onAuthStateChanged,
    $
} from "/shahartaxi-demo/docs/libs/lib.js";

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    }
});

// FORM SUBMIT
document.getElementById("submitAdBtn").onclick = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Avval tizimga kiring.");

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

    const adsRef = ref(db, "ads");
    const newAdRef = push(adsRef);

    await set(newAdRef, adData);

    alert("E’lon muvaffaqiyatli joylandi!");
    location.href = "/shahartaxi-demo/docs/app/taxi/my-ads.html";
};

// CLEAR BUTTON
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
