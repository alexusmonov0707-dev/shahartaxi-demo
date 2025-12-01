// ==============================
// FIREBASE CONFIG
// ==============================
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getDatabase,
    ref,
    child,
    get,
    set,
    update,
    push,
    remove,
    query,
    orderByChild,
    orderByKey,
    orderByValue,
    limitToFirst,
    limitToLast,
    startAt,
    endAt,
    equalTo,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import {
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,

    // 💚 EMAIL AUTH qo'shildi
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut

} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// ==============================
// INITIALIZE
// ==============================
const firebaseConfig = {
    apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.appspot.com",
    messagingSenderId: "874241795701",
    appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);


// ==============================
// OPTIONAL: LOCAL PERSISTENCE
// ==============================
setPersistence(auth, browserLocalPersistence);


// ==============================
// RECAPTCHA HELPER
// ==============================
function createRecaptcha(containerId) {
    window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        containerId,
        {
            size: "invisible",
            callback: () => { }
        }
    );
    return window.recaptchaVerifier;
}


// ==============================
// EXPORT QILINADIGAN OBYEKT VA FUNKSIYALAR
// ==============================
export {
    // main services
    auth,
    db,

    // database
    ref,
    child,
    get,
    set,
    update,
    push,
    remove,
    query,
    orderByChild,
    orderByKey,
    orderByValue,
    limitToFirst,
    limitToLast,
    startAt,
    endAt,
    equalTo,
    onValue,

    // auth
    onAuthStateChanged,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    createRecaptcha,

    // 💚 EMAIL AUTH EXPORTLARI
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
};
// ==============================
// FETCH ALL ADS (new safe method)
// ==============================
export async function fetchAllAds() {
    try {
        const db = firebase.database();
        const root = db.ref("ads");

        const snap = await root.get();
        if (!snap.exists()) return [];

        const data = snap.val();
        const results = [];

        for (const userId in data) {
            const userAds = data[userId];
            for (const adId in userAds) {
                const ad = userAds[adId];
                results.push({
                    id: adId,
                    userId,
                    ...ad
                });
            }
        }

        // Yangi → eski bo‘yicha saralash
        results.sort((a, b) => b.createdAt - a.createdAt);

        return results;
    } catch (err) {
        console.error("fetchAllAds error:", err);
        return [];
    }
}
