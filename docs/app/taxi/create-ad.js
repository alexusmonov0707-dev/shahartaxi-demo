import { database, push, ref, auth } from "../../libs/lib.js";
import { loadRegions } from "../../assets/regions-helper.js";

document.addEventListener("DOMContentLoaded", () => {

    loadRegions("fromRegion", "fromDistrict");
    loadRegions("toRegion", "toDistrict");

    document.getElementById("submitAdBtn").onclick = submitAd;
    document.getElementById("clearFormBtn").onclick = () => location.reload();
});

async function submitAd() {

    const fromRegion = fromRegion.value;
    const fromDistrict = fromDistrict.value;

    const toRegion = toRegion.value;
    const toDistrict = toDistrict.value;

    const price = price.value;
    const time = departureTime.value;
    const seats = seats.value;
    const comment = adComment.value;

    if (!fromRegion || !fromDistrict || !toRegion || !toDistrict || !price || !time || !seats) {
        alert("Barcha maydonlarni to‘ldiring!");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("Avval tizimga kiring!");
        return;
    }

    const data = {
        fromRegion,
        fromDistrict,
        toRegion,
        toDistrict,
        price,
        time,
        seats,
        comment,
        userId: user.uid,
        createdAt: Date.now()
    };

    await push(ref(database, "ads"), data);

    alert("E’lon muvaffaqiyatli qo‘shildi!");
    location.reload();
}
