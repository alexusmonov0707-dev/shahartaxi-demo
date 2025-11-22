import {
  auth, db, ref, push, set, onAuthStateChanged, $
} from "/shahartaxi-demo/libs/lib.js";

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "../auth/login.html";
        return;
    }
});

document.getElementById("submitAdBtn").onclick = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const ad = {
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
    await set(newAd, ad);

    alert("E’lon joylandi!");
    window.location.href = "my-ads.html";
};
