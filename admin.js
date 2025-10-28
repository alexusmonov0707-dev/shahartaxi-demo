<script>
    // === CONFIG: change this if you want ===
    const ADMIN_PASSWORD = 'shahartaxi2025';

    // show overlay if admin not logged in
    function checkAdminLogin() {
      const user = document.getElementById('adminUser').value.trim();
      const pass = document.getElementById('adminPass').value.trim();
      const err = document.getElementById('loginError');
      if (pass === ADMIN_PASSWORD) {
        localStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginOverlay').style.display = 'none';
        renderAds();
      } else {
        err.textContent = '❌ Noto‘g‘ri parol';
      }
    }

    function logoutAdmin() {
      localStorage.removeItem('adminLoggedIn');
      location.reload();
    }

    // if not logged in -> show overlay (block interactions)
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
      document.addEventListener('DOMContentLoaded', ()=>{
        document.getElementById('loginOverlay').style.display = 'flex';
      });
    }

    let currentEdit = { type: null, id: null };

    function getAds() {
      return {
        driver: JSON.parse(localStorage.getItem('driverAds')) || [],
        passenger: JSON.parse(localStorage.getItem('passengerAds')) || []
      };
    }

    function getStatusText(status) {
      if (status === 'approved') return '✅ Tasdiqlangan';
      if (status === 'rejected') return '❌ Rad etilgan';
      return '⏳ Kutilmoqda';
    }

    function renderAds() {
      const { driver, passenger } = getAds();

      let updated = false;
      ['driver', 'passenger'].forEach(type => {
        let arr = type === 'driver' ? driver : passenger;
        arr.forEach((ad, i) => {
          if (!ad.id) {
            ad.id = `${type}_${Date.now()}_${i}`;
            updated = true;
          }
        });
        localStorage.setItem(type + 'Ads', JSON.stringify(arr));
      });
      if (updated) console.log("E’lonlarga ID berildi ✅");

      const typeFilter = document.getElementById('typeFilter').value;
      const statusFilter = document.getElementById('statusFilter').value;

      let ads = [];
      if (typeFilter === 'driver') ads = driver.map(a => ({ ...a, type: 'driver' }));
      else if (typeFilter === 'passenger') ads = passenger.map(a => ({ ...a, type: 'passenger' }));
      else ads = [...driver.map(a => ({ ...a, type: 'driver' })), ...passenger.map(a => ({ ...a, type: 'passenger' }))];

      if (statusFilter !== 'all') ads = ads.filter(a => (a.status || 'pending') === statusFilter);

      const container = document.getElementById('ads');
      container.innerHTML = '';

      if (ads.length === 0) {
        container.innerHTML = '<p>E’lonlar topilmadi.</p>';
        return;
      }

      ads.forEach((ad, index) => {
        const from = ad.fromDistrict && ad.fromRegion
          ? `${ad.fromRegion} ${ad.fromDistrict}`
          : (ad.from || '—');
        const to = ad.toDistrict && ad.toRegion
          ? `${ad.toRegion} ${ad.toDistrict}`
          : (ad.to || '—');

        const div = document.createElement('div');
        div.className = 'ad';
        div.innerHTML = `
          <p><b>Turi:</b> ${ad.type === 'driver' ? 'Haydovchi' : 'Yo‘lovchi'}</p>
          <p><b>Yo‘nalish:</b> ${from} → ${to}</p>
          <p><b>Telefon:</b> ${ad.phone || 'Noma’lum'}</p>
          <p><b>Narx:</b> ${ad.price ? ad.price + ' so‘m' : 'Ko‘rsatilmagan'}</p>
          <p class="status"><b>Holat:</b> ${getStatusText(ad.status)}</p>
          <div class="actions">
            <button class="approve" onclick="updateStatus('${ad.type}', '${ad.id}', 'approved')">Tasdiqlash</button>
            <button class="reject" onclick="updateStatus('${ad.type}', '${ad.id}', 'rejected')">Rad etish</button>
            <button class="edit" onclick="openEdit('${ad.type}', '${ad.id}')">Tahrirlash</button>
            <button class="delete" onclick="deleteAd('${ad.type}', '${ad.id}')">O‘chirish</button>
          </div>
        `;
        container.appendChild(div);
      });
    }

    // ✅ Tasdiqlash holatini o‘zgartirish va tarixga yozish
    function updateStatus(type, id, status) {
      const key = type === 'driver' ? 'driverAds' : 'passengerAds';
      const ads = JSON.parse(localStorage.getItem(key)) || [];
      const index = ads.findIndex(a => String(a.id) === String(id));
      if (index > -1) {
        ads[index].status = status;
        localStorage.setItem(key, JSON.stringify(ads));
        saveApprovalHistory(ads[index], status);
      }
      renderAds();
      updateStats();
    }

    // ✅ Tasdiqlash tarixini saqlash
    function saveApprovalHistory(ad, status) {
      const history = JSON.parse(localStorage.getItem('approvalHistory')) || [];
      const record = {
        date: new Date().toLocaleString(),
        name: ad.name || ad.driver || 'Noma’lum foydalanuvchi',
        type: ad.type,
        from: ad.fromDistrict || ad.fromRegion || ad.from || '—',
        to: ad.toDistrict || ad.toRegion || ad.to || '—',
        status: status
      };
      history.push(record);
      localStorage.setItem('approvalHistory', JSON.stringify(history));
    }

    // ✅ Tasdiqlash tarixini ko‘rsatish
    function showApprovalHistory() {
      const history = JSON.parse(localStorage.getItem('approvalHistory')) || [];
      const list = document.getElementById('historyList');
      list.innerHTML = history.length
        ? history.map(h => `
          <p><b>${h.date}</b> — ${h.type === 'driver' ? 'Haydovchi' : 'Yo‘lovchi'}:
          ${h.from} → ${h.to} — ${getStatusText(h.status)}</p>
        `).join('')
        : '<p>Hozircha tasdiqlash tarixi yo‘q.</p>';
      document.getElementById('historyModal').style.display = 'flex';
    }

    function closeHistory() {
      document.getElementById('historyModal').style.display = 'none';
    }

    // 🔵 Qolgan barcha funksiyalar o‘zgarmagan holda
    function openEdit(type, id) {
      const { driver, passenger } = getAds();
      const ads = type === 'driver' ? driver : passenger;
      const ad = ads.find(a => String(a.id) === String(id));
      if (!ad) return;
      currentEdit = { type, id };
      document.getElementById('editPhone').value = ad.phone || '';
      document.getElementById('editPrice').value = ad.price || '';
      document.getElementById('editFrom').value = ad.from || ad.fromRegion || '';
      document.getElementById('editTo').value = ad.to || ad.toRegion || '';
      document.getElementById('editStatus').value = ad.status || 'pending';
      document.getElementById('editModal').style.display = 'flex';
    }

    function saveEdit() {
      const { type, id } = currentEdit;
      const key = type === 'driver' ? 'driverAds' : 'passengerAds';
      const ads = JSON.parse(localStorage.getItem(key)) || [];
      const index = ads.findIndex(a => String(a.id) === String(id));
      if (index > -1) {
        ads[index].phone = document.getElementById('editPhone').value;
        ads[index].price = document.getElementById('editPrice').value;
        ads[index].from = document.getElementById('editFrom').value;
        ads[index].to = document.getElementById('editTo').value;
        ads[index].status = document.getElementById('editStatus').value;
        localStorage.setItem(key, JSON.stringify(ads));
      }
      closeModal();
      renderAds();
      updateStats();
    }

    function closeModal() {
      document.getElementById('editModal').style.display = 'none';
    }

    function deleteAd(type, id) {
      const key = type === 'driver' ? 'driverAds' : 'passengerAds';
      let ads = JSON.parse(localStorage.getItem(key)) || [];
      ads = ads.filter(a => String(a.id) !== String(id));
      localStorage.setItem(key, JSON.stringify(ads));
      renderAds();
      updateStats();
    }

    function updateStats() {
      const { driver, passenger } = getAds();
      const all = [...driver, ...passenger];
      const stats = {
        drivers: driver.length,
        passengers: passenger.length,
        approved: all.filter(a => a.status === 'approved').length,
        rejected: all.filter(a => a.status === 'rejected').length,
        pending: all.filter(a => !a.status || a.status === 'pending').length
      };
      localStorage.setItem('stats', JSON.stringify(stats));
    }

    function goToStats() {
      updateStats();
      location.href = 'admin-stat.html';
    }

    function goToAdd() {
      location.href = 'admin-add.html';
    }

    window.onload = () => {
      renderAds();
      updateStats();
      setInterval(() => renderAds(), 5000);
    };
  </script>
