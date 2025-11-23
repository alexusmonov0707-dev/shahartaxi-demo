import {
    auth,
    db,
    ref,
    push,
    set,
    onAuthStateChanged,
    $
} from "https://alexusmonov0707-dev.github.io/shahartaxi-demo/docs/libs/lib.js";

// Sahifa yuklanganda regionlarni to‘ldirish
document.addEventListener("DOMContentLoaded", () => {
    initRegionsForm();
});

// Login tekshirish
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "/shahartaxi-demo/docs/app/auth/login.html";
        return;
    }

    $("submitAdBtn").onclick = () => addAd(user.uid);
    $("clearFormBtn").onclick = clearForm;
});

// ==========================
//    E’lon qo‘shish
// ==========================
async function addAd(uid) {

    const fromRegion = $("fromRegion").value;
    const fromDistrict = $("fromDistrict").value;
    const toRegion = $("toRegion").value;
    const toDistrict = $("toDistrict").value;
    const price = $("price").value;
    const departureTime = $("departureTime").value;
    const seats = $("seats").value.trim();
    const comment = $("adComment").value;

    if (!fromRegion || !toRegion || !price || !departureTime) {
        alert("Iltimos barcha maydonlarni to‘ldiring.");
        return;
    }

    // Role ni profile.js ichida saqlaganmiz
    const role = window.userRole || "passenger";

    const extra =
        role === "driver"
            ? { driverSeats: seats }
            : { passengerCount: seats };

    const newAd = {
        userId: uid,
        type: role === "driver" ? "Haydovchi" : "Yo‘lovchi",
        fromRegion,
        fromDistrict,
        toRegion,
        toDistrict,
        price,
        departureTime,
        comment,
        createdAt: Date.now(),
        approved: false,
        ...extra
    };

    await push(ref(db, "ads"), newAd);

    alert("E’lon joylandi!");
    window.location.href = "/shahartaxi-demo/docs/app/taxi/my-ads.html";
}

// ==========================
//    FORMANI TOZALASH
// ==========================
function clearForm() {
    $("fromRegion").value = "";
    $("fromDistrict").innerHTML = '<option value="">Tuman</option>';

    $("toRegion").value = "";
    $("toDistrict").innerHTML = '<option value="">Tuman</option>';

    $("price").value = "";
    $("departureTime").value = "";
    $("seats").value = "";
    $("adComment").value = "";
}
