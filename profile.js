// profile.js — modular Firebase v9
// Replace firebaseConfig values below with your project settings


import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getDatabase, ref, set, get, update, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";


const firebaseConfig = {
apiKey: "AIzaSyApWUG40YuC9aCsE9MOLXwLcYgRihREWvc",
authDomain: "shahartaxi-demo.firebaseapp.com",
databaseURL: "https://shahartaxi-demo-default-rtdb.firebaseio.com",
projectId: "shahartaxi-demo",
storageBucket: "shahartaxi-demo.firebasestorage.app",
messagingSenderId: "874241795701",
appId: "1:874241795701:web:89e9b20a3aed2ad8ceba3c"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


// --- Regions (simple sample list) ---
const regions = {
"Toshkent": ["Bektemir","Chilonzor","Mirzo Ulug'bek","Mirobod"],
"Samarqand": ["Bulungur","Ishtixon","Urgut","Kattaqo'rg'on"],
"Namangan": ["Pop","Chust","To'raqo'rg'on"],
"Andijon": ["Asaka","Andijon sh.","Marhamat"],
"Farg'ona": ["Qo'qon","Qo'rg'ontepa","Beshariq"],
"Buxoro": ["Buxoro sh.","G'ijduvon","Jondor"],
"Xorazm": ["Urganch","Xiva","Shovot"],
"Qashqadaryo": ["Qarshi","G'uzor","Kitob"]
};


let currentUser = null;
let lastStatuses = {};


function $id(id){ return document.getElementById(id); }
function escapeHtml(s){ if(s===undefined||s===null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }


// --- AUTH STATE ---
onAuthStateChanged(auth, async user => {
currentUser = user;
if(user){
// ensure user record exists
try{
await update(ref(db, `users/${user.uid}`), {
phone: user.phoneNumber || '',
name: user.displayName || (user.phoneNumber || ''),
});
}catch(e){
await set(ref(db, `users/${user.uid}`), {
phone: user.phoneNumber || '',
name: user.displayName || (user.phoneNumber || ''),
role: 'driver' // default during demo — registration should set this
});
}


loadUserProfile();
loadUserAds();
startStatusSync();
} else {
// clear UI
if($id('profileName')) $id('profileName').textContent = 'Foydalanuvchi';
if($id('profilePhone')) $id('profilePhone').textContent = '—';
if($id('myAds')) $id('myAds').innerHTML = '<p class="muted">Hozircha e\'lonlar yo\'q.</p>';
}
});


// --- Profile functions ---
async function loadUserProfile(){
if(!currentUser) return;
try{
const snap = await get(ref(db, `users/${currentUser.uid}`));
const data = snap.val() || {};
if($id('profileName')) $id('profileName').textContent = data.name || 'Foydalanuvchi';
if($id('profilePhone')) $id('profilePhone').textContent = data.phone || '—';
if($id('profileRole')) $id('profileRole').textContent = (data.role || '—').toUpperCase();
if($id('profileRatingBig')) $id('profileRatingBig').textContent = data.ratingAvg ? `${data.ratingAvg} / 5` : '—';
if($id('profileRatingCount')) $id('profileRatingCount').textContent = data.ratingCount ? `${data.ratingCount} ta baho` : '—';
if($id('profileAvatar')) $id('profileAvatar').src = data.avatar || '';


if(!/^\+998\d{9}$/.test(phone)) return alert('Telefonni t
