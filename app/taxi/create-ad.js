import {
    auth,
    db,
    ref,
    push,
    set,
    onAuthStateChanged
} from "../../libs/lib.js";

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "../../auth/login.html";
        return;
    }
});

function $(id) { return document.getElementById(id); }

$("submitAdBtn").onclick = async () => {
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

    const newRef = push(ref(db, "ads"));
    await set(newRef, ad);

    alert("E’lon joylandi!");
    location.href = "my-ads.html";
};
