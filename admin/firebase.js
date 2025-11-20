// Firebase config (o'zingdagi qiymatlarni qo'y)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.appspot.com",
    messagingSenderId: "xxxxxxx",
    appId: "xxxxxxx"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, get };
