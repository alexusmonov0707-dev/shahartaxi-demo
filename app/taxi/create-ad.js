import {
    auth,
    db,
    ref,
    push,
    set,
    onAuthStateChanged,
    $
} from "/shahartaxi-demo/assets/js/libs.js";

console.log("CREATE-AD.JS LOADED OK");

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "/shahartaxi-demo/app/auth/login.html";
        return;
    }
});

// SUBMIT BUTTON
$("submitAdBtn").onclick = async () => {
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
        createdAt: Date.now()
    };

    const adsRef = ref(db, "ads");
    const newAd = push(adsRef);

    await set(newAd, adData);

    alert("E’lon joylandi!");
    location.href = "/shahartaxi-demo/app/taxi/my-ads.html";
};
