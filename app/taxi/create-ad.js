import {
    auth,
    db,
    ref,
    push,
    set,
    onAuthStateChanged
} from "/libs/lib.js";

onAuthStateChanged(auth, user => {
    if (!user) {
        alert("Avval tizimga kiring!");
        location.href = "/login.html";
    }
});

// FORM SUBMIT
document.getElementById("submitAdBtn").onclick = async () => {

    const adData = {
        userId: auth.currentUser.uid,
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
    const newAdRef = push(adsRef);
    await set(newAdRef, adData);

    alert("E’lon qo‘shildi!");
};
