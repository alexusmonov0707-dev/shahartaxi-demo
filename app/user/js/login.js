// app/user/js/login.js
(function(){
  console.log('LOGIN JS loaded');

  const sendBtn = document.getElementById('sendBtn');
  const verifyBtn = document.getElementById('verifyBtn');
  const phoneInput = document.getElementById('phoneInput');
  const codeInput = document.getElementById('codeInput');

  // ensure lib initialized (in case not)
  window.shahartaxi_lib.initFirebase().catch(e=>{
    console.warn('Firebase init failed (login.js):', e);
  });

  sendBtn.addEventListener('click', async ()=>{
    const phone = phoneInput.value.trim();
    if(!phone){
      alert('Telefon raqam kiriting');
      return;
    }
    sendBtn.disabled = true;
    sendBtn.textContent = 'Yuborilmoqda...';
    const res = await window.shahartaxi_lib.sendVerificationCode(phone);
    if(res.ok){
      alert('Kod yuborildi. Test raqamlar ishlatilayotgan bo\'lsa, test kodni kiriting.');
    } else {
      console.error(res.error);
      alert('Kod yuborishda xatolik: ' + (res.error && res.error.message ? res.error.message : res.error));
    }
    sendBtn.disabled = false;
    sendBtn.textContent = 'SMS kod yuborish';
  });

  verifyBtn.addEventListener('click', async ()=>{
    const code = codeInput.value.trim();
    if(!code){ alert('Kod kiriting'); return; }
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Tekshirilmoqda...';
    const res = await window.shahartaxi_lib.verifyCode(code);
    if(res.ok){
      alert('Muvaffaqiyatli kirdingiz!');
      // redirect to profile or index
      window.location.href = 'index.html';
    } else {
      console.error(res.error);
      alert('Tekshirishda xato: ' + (res.error && res.error.message ? res.error.message : res.error));
    }
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Tasdiqlash va kirish';
  });

})();
