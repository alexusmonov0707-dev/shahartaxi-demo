console.log("CREATE-AD.JS LOADED:", import.meta.url);

import {
    auth,
    db,
    ref,
    push,
    set,
    onAuthStateChanged,
    $
} from "../../libs/lib.js";

// USER TEKSHIRISH
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
    }
});

// FORM SUBMIT
document.getElementById("submitAdBtn").onclick = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Avval tizimga kiring!");

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
    const newAd = push(adsRef);

    await set(newAd, adData);

    alert("E’lon muvaffaqiyatli joylandi!");
    location.href = "/shahartaxi-demo/docs/app/taxi/my-ads.html";
};

// FORM TOZALASH
document.getElementById("clearFormBtn").onclick = () => {
    $("fromRegion").value = "";
    $("fromDistrict").innerHTML = "<option value=''>Tuman</option>";
    $("toRegion").value = "";
    $("toDistrict").innerHTML = "<option value=''>Tuman</option>";
    $("price").value = "";
    $("departureTime").value = "";
    $("seats").value = "";
    $("adComment").value = "";
};
