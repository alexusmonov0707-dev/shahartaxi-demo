// app/user/js/register.js
(function(){
  const regSendBtn = document.getElementById('regSendBtn');
  const regVerifyBtn = document.getElementById('regVerifyBtn');
  const regPhone = document.getElementById('regPhone');
  const fullName = document.getElementById('fullName');
  const regCode = document.getElementById('regCode');
  const roleInput = document.getElementById('role');

  window.shahartaxi_lib.initFirebase().catch(()=>{});

  regSendBtn.addEventListener('click', async ()=>{
    const phone = regPhone.value.trim();
    if(!phone){ alert('Telefon kiriting'); return; }
    regSendBtn.disabled = true;
    regSendBtn.textContent = 'Yuborilmoqda...';
    const res = await window.shahartaxi_lib.sendVerificationCode(phone);
    if(res.ok){
      alert('SMS yuborildi. Kodni kiriting.');
    } else {
      console.error(res.error);
      alert('Xato: ' + (res.error && res.error.message ? res.error.message : res.error));
    }
    regSendBtn.disabled = false;
    regSendBtn.textContent = 'Davom etish';
  });

  regVerifyBtn.addEventListener('click', async ()=>{
    const code = regCode.value.trim();
    if(!code){ alert('Kod kiriting'); return; }
    regVerifyBtn.disabled = true;
    regVerifyBtn.textContent = 'Tekshirilmoqda...';
    const res = await window.shahartaxi_lib.verifyCode(code);
    if(res.ok){
      // after succ login, update user profile fields (fullName, role)
      const user = res.user;
      const data = {
        fullName: fullName.value || '',
        role: roleInput.value || 'passenger',
        phone: user.phoneNumber || '',
        createdAt: Date.now()
      };
      await window.shahartaxi_lib.createOrUpdateUser(user.uid, data);
      alert('Ro\'yxatdan muvaffaqiyatli o\'tdingiz');
      window.location.href = 'index.html';
    } else {
      console.error(res.error);
      alert('Kod tekshirilganda xatolik: ' + (res.error && res.error.message ? res.error.message : res.error));
    }
    regVerifyBtn.disabled = false;
    regVerifyBtn.textContent = 'Ro\'yxatdan o\'tish';
  });

})();
