// app/user/js/lib.js
// ====== IMPORTANT ======
// Senga mos qilib to‘liq tayyorlangan Firebase lib
// Hech narsa qisqartirilmagan, faqat config to‘g‘rilangan

(function(window){
  // === YOUR FIREBASE CONFIG (100% senga mos) ===
 const firebaseConfig = {
  apiKey: "AIzaSyApNUAG04yUC9aCSe9MOLXwLcYgRihREWvc",
  authDomain: "shahartaxi-demo.firebaseapp.com",
  databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
  projectId: "shahartaxi-demo",
  storageBucket: "shahartaxi-demo.appspot.com",
  messagingSenderId: "874241795701",
  appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

  // CDN urls (compat)
  const CDN = {
    app: "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js",
    auth: "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js",
    database: "https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js",
    storage: "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage-compat.js"
  };

  function loadScript(src){
    return new Promise((resolve, reject)=>{
      if(document.querySelector('script[src="'+src+'"]')) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load '+src));
      document.head.appendChild(s);
    });
  }

  async function ensureFirebaseLoaded(){
    if(window.firebase && window.firebase.apps && window.firebase.apps.length) return;
    await loadScript(CDN.app);
    await loadScript(CDN.auth);
    await loadScript(CDN.database);
    await loadScript(CDN.storage);
  }

  async function initFirebase(){
    if(window._shaha_firebase_initialized) return;
    await ensureFirebaseLoaded();

    window.firebaseApp = window.firebase.initializeApp(firebaseConfig);
    window.firebaseAuth = window.firebase.auth();
    window.firebaseDB = window.firebase.database();
    window.firebaseStorage = window.firebase.storage();

    if(!document.getElementById('recaptcha-container')){
      const div = document.createElement('div');
      div.id = 'recaptcha-container';
      div.style = 'display:none';
      document.body.appendChild(div);
    }

    try {
      window.recaptchaVerifier = new window.firebase.auth.RecaptchaVerifier(
        'recaptcha-container',
        { 'size': 'invisible' }
      );
      window.recaptchaVerifier.render().catch(()=>{});
    } catch(e){
      console.warn('recaptcha init error', e);
    }

    window._shaha_firebase_initialized = true;
    console.log('FIREBASE inited ✔');
  }

  async function sendVerificationCode(phone){
    await initFirebase();
    if(!window.recaptchaVerifier){
      window.recaptchaVerifier = new window.firebase.auth.RecaptchaVerifier(
        'recaptcha-container',
        { 'size': 'invisible' }
      );
    }
    try {
      const confirmation = await window.firebaseAuth.signInWithPhoneNumber(
        phone,
        window.recaptchaVerifier
      );
      window._confirmResult = confirmation;
      return { ok:true };
    } catch(err){
      console.error('sendVerificationCode error', err);
      return { ok:false, error:err };
    }
  }

  async function verifyCode(code){
    try {
      if(!window._confirmResult){
        throw new Error('No confirmation result. Call sendVerificationCode first.');
      }
      const userCredential = await window._confirmResult.confirm(code);
      const user = userCredential.user;

      await createOrUpdateUser(user.uid, {
        phone: user.phoneNumber || '',
        createdAt: Date.now()
      });

      return { ok:true, user };
    } catch(err){
      console.error('verifyCode error', err);
      return { ok:false, error:err };
    }
  }

  async function createOrUpdateUser(uid, data){
    await initFirebase();
    const userRef = window.firebaseDB.ref('users/' + uid);
    const snapshot = await userRef.once('value');

    if(snapshot.exists()){
      await userRef.update(data);
    } else {
      await userRef.set(data);
    }
  }

  async function logout(){
    await initFirebase();
    await window.firebaseAuth.signOut();
  }

  function getCurrentUser(){
    return new Promise((resolve)=>{
      initFirebase().then(()=>{
        const u = window.firebaseAuth.currentUser;
        if(u) return resolve(u);

        const unsub = window.firebaseAuth.onAuthStateChanged(user=>{
          unsub();
          resolve(user);
        });
      });
    });
  }

  window.shahartaxi_lib = {
    initFirebase,
    sendVerificationCode,
    verifyCode,
    logout,
    getCurrentUser,
    createOrUpdateUser,
    firebase: () => window.firebase
  };

})(window);
