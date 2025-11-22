import {
    auth,
    db,
    ref,
    push,
    set,
    onAuthStateChanged
} from "/shahartaxi-demo/libs/lib.js";

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "/shahartaxi-demo/app/auth/login.html";
        return;
    }
});

// SUBMIT
document.getElementById("submitAdBtn").onclick = async () => {
    const u = auth.currentUser;
    if (!u) return;

    const data = {
        userId: u.uid,
        fromRegion: fromRegion.value,
        fromDistrict: fromDistrict.value,
        toRegion: toRegion.value,
        toDistrict: toDistrict.value,
        price: price.value,
        departureTime: departureTime.value,
        seats: seats.value,
        comment: adComment.value,
        createdAt: Date.now()
    };

    const adsRef = ref(db, "ads");
    const newRef = push(adsRef);
    await set(newRef, data);

    alert("E’lon joylandi!");
    location.href = "/shahartaxi-demo/app/taxi/my-ads.html";
};
