import {
  db,
  ref,
  push,
  set
} from "../../../libs/lib.js";

// REGIONS LOADING
import "../../regions-taxi.js";

document.addEventListener("DOMContentLoaded", () => {

  const fromRegion = document.getElementById("fromRegion");
  const fromDistrict = document.getElementById("fromDistrict");
  const toRegion = document.getElementById("toRegion");
  const toDistrict = document.getElementById("toDistrict");

  const price = document.getElementById("price");
  const departureTime = document.getElementById("departureTime");
  const seats = document.getElementById("seats");
  const adComment = document.getElementById("adComment");

  const submitBtn = document.getElementById("submitAdBtn");
  const clearBtn = document.getElementById("clearFormBtn");

  submitBtn.onclick = async () => {

    if (!fromRegion.value || !toRegion.value || !price.value || !departureTime.value) {
      alert("Iltimos, barcha majburiy maydonlarni to‘ldiring!");
      return;
    }

    const adRef = ref(db, "ads/");
    const newAd = push(adRef);

    await set(newAd, {
      fromRegion: fromRegion.value,
      fromDistrict: fromDistrict.value,
      toRegion: toRegion.value,
      toDistrict: toDistrict.value,
      price: price.value,
      time: departureTime.value,
      seats: seats.value,
      comment: adComment.value || "",
      createdAt: new Date().toISOString()
    });

    alert("E’lon muvaffaqiyatli joylandi!");
  };

  clearBtn.onclick = () => {
    price.value = "";
    seats.value = "";
    adComment.value = "";
  };

});
