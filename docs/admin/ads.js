// ads.js — to'liq, HTML/CSS ga mos va qisqartirmasdan ishlaydigan versiya
// HTML faylingizda Firebase v8 skriptlari ulangan bo'lishi kerak (ads.html ichida bor)

(function () {
  // --- Firebase DB (HTMLda firebase-app + firebase-database v8 yuklangan) ---
  if (typeof firebase === "undefined" || !firebase.database) {
    console.error("Firebase kutubxonasi yuklanmagan. ads.html ichida firebase-app.js va firebase-database.js kiriting.");
    return;
  }
  const db = firebase.database();

  // --- DOM elementlari (ads.html ga mos) ---
  const adsTable = document.getElementById("adsTable");
  const searchInput = document.getElementById("search");

  // modal elementlari (ads.html ichidagi idlar)
  const modal = document.getElementById("modal");
  const m_route = document.getElementById("m_route");
  const m_depart = document.getElementById("m_depart");
  const m_price = document.getElementById("m_price");
  const m_seats = document.getElementById("m_seats");
  const m_dseats = document.getElementById("m_dseats");
  const m_comment = document.getElementById("m_comment");
  const m_created = document.getElementById("m_created");

  const m_avatar = document.getElementById("m_avatar");
  const m_userName = document.getElementById("m_userName");
  const m_userPhone = document.getElementById("m_userPhone");
  const m_userRole = document.getElementById("m_userRole");

  const deleteBtn = document.getElementById("deleteBtn");
  const closeBtn = document.getElementById("closeBtn");

  // state
  let CURRENT_USER_ID = null;
  let CURRENT_AD_ID = null;

  // --- Helper ---
  function safe(v, fallback = "-") {
    return v === undefined || v === null || v === "" ? fallback : v;
  }

  function formatDate(ts) {
    if (!ts) return "-";
    // ts might be number or string; try as number first
    const n = Number(ts);
    if (!isNaN(n)) return new Date(n).toLocaleString();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString();
  }

  // --- Load & render ads ---
  function loadAds() {
    // clear table
    adsTable.innerHTML = "";

    // ads stored as: ads/{userId}/{adId}/{fields...}
    db.ref("ads").once("value")
      .then(snapshot => {
        if (!snapshot.exists()) {
          adsTable.innerHTML = `<tr><td colspan="5" style="padding:18px;color:#666">E'lonlar mavjud emas</td></tr>`;
          return;
        }

        // iterate users
        snapshot.forEach(userSnap => {
          const userId = userSnap.key;
          const userAds = userSnap.val() || {};

          // fetch user info once per user
          db.ref(`users/${userId}`).once("value")
            .then(userSnapshot => {
              const user = userSnapshot.exists() ? userSnapshot.val() : { fullName: "Noma'lum", phone: "-", role: "-" };

              // iterate this user's ads
              Object.entries(userAds).forEach(([adId, ad]) => {
                drawRow(ad, user, userId, adId);
              });
            })
            .catch(err => {
              console.error("User fetch error:", err);
              // still draw rows with fallback user
              Object.entries(userAds).forEach(([adId, ad]) => {
                drawRow(ad, { fullName: "Noma'lum", phone: "-", role: "-" }, userId, adId);
              });
            });
        });
      })
      .catch(err => {
        console.error("ads fetch error:", err);
        adsTable.innerHTML = `<tr><td colspan="5" style="padding:18px;color:#c00">Xatolik yuz berdi (konsolga qarang)</td></tr>`;
      });
  }

  // draw a single row
  function drawRow(ad, user, userId, adId) {
    const tr = document.createElement("tr");

    const fromRegion = safe(ad.fromRegion);
    const fromDistrict = safe(ad.fromDistrict);
    const toRegion = safe(ad.toRegion);
    const toDistrict = safe(ad.toDistrict);

    const route = `${fromRegion} / ${fromDistrict} → ${toRegion} / ${toDistrict}`;
    const priceText = ad.price ? `${ad.price} so‘m` : "-";
    const dateText = ad.departureTime ? formatDate(ad.departureTime) : safe(ad.createdAt ? formatDate(ad.createdAt) : "-");

    // Use data attributes for event delegation
    tr.innerHTML = `
      <td><strong>${safe(user.fullName)}</strong><br><small style="color:#666">${safe(user.phone, "")}</small></td>
      <td>${route}</td>
      <td>${priceText}</td>
      <td>${dateText}</td>
      <td>
        <button class="btn btn-view" data-open="${userId}|${adId}" type="button">Ko'rish</button>
        <button class="btn btn-delete" data-del="${userId}|${adId}" type="button">Delete</button>
      </td>
    `;

    adsTable.appendChild(tr);
  }

  // --- Event delegation for buttons inside table ---
  document.addEventListener("click", function (e) {
    const t = e.target;

    // open modal
    if (t && t.dataset && t.dataset.open) {
      const [u, a] = t.dataset.open.split("|");
      openModal(u, a);
      return;
    }

    // external delete
    if (t && t.dataset && t.dataset.del) {
      const [u, a] = t.dataset.del.split("|");
      // confirm and delete
      deleteAd(u, a);
      return;
    }
  });

  // --- Open modal (load ad + user) ---
  function openModal(userId, adId) {
    CURRENT_USER_ID = userId;
    CURRENT_AD_ID = adId;

    // read ad
    db.ref(`ads/${userId}/${adId}`).once("value")
      .then(adSnap => {
        const ad = adSnap.exists() ? adSnap.val() : null;
        if (!ad) {
          alert("E'lon topilmadi");
          return;
        }

        // read user
        return db.ref(`users/${userId}`).once("value")
          .then(userSnap => {
            const user = userSnap.exists() ? userSnap.val() : { fullName: "Noma'lum", phone: "-", role: "-" };

            // fill modal safely
            m_route.innerText = `${safe(ad.fromRegion)} / ${safe(ad.fromDistrict)} → ${safe(ad.toRegion)} / ${safe(ad.toDistrict)}`;
            m_depart.innerText = ad.departureTime ? formatDate(ad.departureTime) : "-";
            m_price.innerText = ad.price ? `${ad.price} so‘m` : "-";
            m_seats.innerText = safe(ad.seats, "-");
            m_dseats.innerText = safe(ad.driverSeats, "-");
            m_comment.innerText = safe(ad.comment, "-");
            m_created.innerText = ad.createdAt ? formatDate(ad.createdAt) : "-";

            m_userName.innerText = safe(user.fullName, "-");
            m_userPhone.innerText = safe(user.phone, "-");
            m_userRole.innerText = safe(user.role, "-");
            m_avatar.src = user.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='100%25' height='100%25' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999'%3Eavatar%3C/text%3E%3C/svg%3E";

            // show modal
            modal.style.display = "flex";
            modal.setAttribute("aria-hidden", "false");
          });
      })
      .catch(err => {
        console.error("openModal error:", err);
        alert("E'lonni ochishda xatolik yuz berdi");
      });
  }

  // --- Close handlers ---
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    });
  }

  // close modal by clicking the overlay
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      }
    });
  }

  // --- Delete (can be called from table or modal) ---
  function deleteAd(userId, adId) {
    if (!confirm("Rostdan ham o'chirishni tasdiqlaysizmi?")) return;

    db.ref(`ads/${userId}/${adId}`).remove()
      .then(() => {
        // refresh view
        loadAds();

        // if modal showed same ad — hide it
        if (modal && CURRENT_USER_ID === userId && CURRENT_AD_ID === adId) {
          modal.style.display = "none";
          modal.setAttribute("aria-hidden", "true");
        }

        // reset selected
        CURRENT_USER_ID = null;
        CURRENT_AD_ID = null;
      })
      .catch(err => {
        console.error("deleteAd error:", err);
        alert("O'chirish vaqtida xatolik yuz berdi");
      });
  }

  // bind delete button inside modal (if present)
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (CURRENT_USER_ID && CURRENT_AD_ID) deleteAd(CURRENT_USER_ID, CURRENT_AD_ID);
    });
  }

  // --- Search (live) ---
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = String(searchInput.value || "").toLowerCase().trim();
      Array.from(adsTable.querySelectorAll("tr")).forEach(row => {
        const txt = row.innerText.toLowerCase();
        row.style.display = q === "" || txt.includes(q) ? "" : "none";
      });
    });
  }

  // initial load
  loadAds();

  // expose for debug (optional)
  window._ads_admin = {
    reload: loadAds
  };
})();
