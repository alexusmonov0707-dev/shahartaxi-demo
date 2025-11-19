import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyApiU4G4VQyCa5EM0LXwLCy8iRhREWvc",
    authDomain: "shahartaxi-demo.firebaseapp.com",
    databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
    projectId: "shahartaxi-demo",
    storageBucket: "shahartaxi-demo.appspot.com",
    messagingSenderId: "874241795701",
    appId: "1:874241795701:web:89e9b20a3aed2ad8cebac3"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, get };
