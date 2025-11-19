// === FIREBASE MODULE IMPORTS ===
import { initializeApp } 
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { getDatabase, ref, get }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


// === YOUR FIREBASE CONFIG ===
const firebaseConfig = {
    apiKey: "AIzaSyApU4G4VVQaCsEM0LXwLCy8RihREwvc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.firebasestorage.app",
    messagingSenderId: "874241795701",
    appId: "1:874241795701:web:89e9b20a3aed2ad8ceb3ac"
};


// === INIT FIREBASE ===
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// EXPORTS for other files (admin.js)
export { ref, get, signInWithEmailAndPassword, signOut, onAuthStateChanged };
