// app/user/js/lib.js
// ====== IMPORTANT ======
// 1) Quyidagi firebaseConfig object ni o'zingizning Firebase konsolingizdagi konfiguratsiya bilan to'ldiring.
//    (Project settings -> SDK setup and configuration -> config)
// 2) Joylashtirgandan so'ng faylni serverga / GitHub Pages ga push qiling.

(function(window){
  // Put your firebase config here (replace with your project's values)
  const firebaseConfig = {
    apiKey: "REPLACE_WITH_YOUR_API_KEY",
    authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
    databaseURL: "REPLACE_WITH_YOUR_DB_URL",
    projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
    storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
    messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
    appId: "REPLACE_WITH_YOUR_APP_ID"
  };

  // CDN urls (compat) - change versions if you want
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
    // load compat scripts sequentially
    await loadScript(CDN.app);
    await loadScript(CDN.auth);
    await loadScript(CDN.database);
    await loadScript(CDN.storage);
  }

  // init firebase app
  async function initFirebase(){
    if(window._shaha_firebase_initialized) return;
    await ensureFirebaseLoaded();
    window.firebaseApp = window.firebase.initializeApp(firebaseConfig);
    window.firebaseAuth = window.firebase.auth();
    window.firebaseDB = window.firebase.database();
    window.firebaseStorage = window.firebase.storage();
    // create invisible recaptcha container if not exists
    if(!document.getElementById('recaptcha-container')){
      const div = document.createElement('div');
      div.id = 'recaptcha-container';
      div.style = 'display:none';
      document.body.appendChild(div);
    }
    // create RecaptchaVerifier (invisible) - keep a reference
    try {
      window.recaptchaVerifier = new window.firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible'
      });
      // render (returns promise)
      window.recaptchaVerifier.render().catch(()=>{/* ignore render error in some env */});
    } catch(e){
      console.warn('recaptcha init error', e);
    }

    window._shaha_firebase_initialized = true;
    console.log('FIREBASE inited');
  }

  // send verification code (phone auth)
  async function sendVerificationCode(phone){
    await initFirebase();
    if(!window.recaptchaVerifier){
      // fallback: try to init recaptcha
      window.recaptchaVerifier = new window.firebase.auth.RecaptchaVerifier('recaptcha-container', { 'size':'invisible' });
    }
    try {
      const confirmation = await window.firebaseAuth.signInWithPhoneNumber(phone, window.recaptchaVerifier);
      window._confirmResult = confirmation; // save globally
      return { ok:true };
    } catch(err){
      console.error('sendVerificationCode error', err);
      return { ok:false, error:err };
    }
  }

  // verify code after SMS
  async function verifyCode(code){
    try {
      if(!window._confirmResult){
        throw new Error('No confirmation result. Call sendVerificationCode first.');
      }
      const userCredential = await window._confirmResult.confirm(code);
      // userCredential.user contains user
      const user = userCredential.user;
      // ensure user node in realtime database
      await createOrUpdateUser(user.uid, {
        phone: user.phoneNumber || '',
        createdAt: Date.now()
      });
      return { ok:true, user: userCredential.user };
    } catch(err){
      console.error('verifyCode error', err);
      return { ok:false, error:err };
    }
  }

  // create or update user object in realtime db
  async function createOrUpdateUser(uid, data){
    await initFirebase();
    const userRef = window.firebaseDB.ref('users/' + uid);
    const snapshot = await userRef.once('value');
    if(snapshot.exists()){
      // update existing
      await userRef.update(data);
    } else {
      await userRef.set(data);
    }
  }

  // logout
  async function logout(){
    await initFirebase();
    await window.firebaseAuth.signOut();
  }

  // helper: get current user (promise)
  function getCurrentUser(){
    return new Promise((resolve)=>{
      initFirebase().then(()=>{
        const u = window.firebaseAuth.currentUser;
        if(u) return resolve(u);
        // wait for auth state change
        const unsub = window.firebaseAuth.onAuthStateChanged(user=>{
          unsub();
          resolve(user);
        });
      });
    });
  }

  // expose to global
  window.shahartaxi_lib = {
    initFirebase,
    sendVerificationCode,
    verifyCode,
    logout,
    getCurrentUser,
    createOrUpdateUser,
    firebase: () => window.firebase
  };

  // auto-init in background (optional). If you want init later, comment this out.
  // initFirebase();

})(window);
