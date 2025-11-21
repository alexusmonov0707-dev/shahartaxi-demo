// app/user/js/index.js
// ===============================
//  FIREBASE INIT + IMPORTS
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  onChildAdded,
  onChildChanged,
  onChildRemoved
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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

let REGIONS = {};
if (window.regionsData) REGIONS = window.regionsData;
else if (window.regions) REGIONS = window.regions;
else REGIONS = {};

function markAsRead(adId) {
  if (!adId) return;
  let read = [];
  try { read = JSON.parse(localStorage.getItem("readAds") || "[]"); } catch (e) {}
  if (!read.includes(adId)) {
    read.push(adId);
    localStorage.setItem("readAds", JSON.stringify(read));
  }
}
function isRead(adId) {
  try {
    const read = JSON.parse(localStorage.getItem("readAds") || "[]");
    return read.includes(adId);
  } catch (e) { return false; }
}

function escapeHtml(str) {
  if (str === 0) return "0";
  if (!str && str !== 0) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function normalizeType(t) {
  if (!t) return "";
  t = String(t).trim().toLowerCase().replace(/[‘’`ʼ']/g, "'");
  if (t.includes("haydov")) return "Haydovchi";
  if (t.includes("yo") && t.includes("lov")) return "Yo‘lovchi";
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function formatTime(val) {
  if (!val) return "—";
  if (typeof val === "number")
    return new Date(val).toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  if (typeof val === "string") {
    const fixed = val.replace(" ", "T");
    if (!isNaN(Date.parse(fixed)))
      return new Date(fixed).toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  return String(val);
}
function escapeSelector(s) {
  return String(s || "").replace(/([ #;?%&,.+*~':\"!^$[\]()=>|\/])/g,'\$1');
}
async function getUserInfo(uid) {
  if (!uid) return {};
  try {
    const snap = await get(ref(db, "users/"+uid));
    if (!snap.exists()) return {};
    const u = snap.val();
    return {
      uid,
      phone: u.phone || u.telephone || "",
      avatar: u.avatar || "",
      fullName: u.fullName || ((u.firstname||"" )+" "+(u.lastname||"") ).trim(),
      role: (u.role||u.userRole||"").toString(),
      carModel: u.carModel || u.car || "",
      carColor: u.carColor || "",
      carNumber: u.carNumber || u.plate || "",
      seatCount: Number(u.seatCount||u.seats||0)
    };
  } catch(e){ return {}; }
}

let ALL_ADS=[];
let ADS_MAP=new Map();
let CURRENT_USER=null;
let CURRENT_PAGE=1;
const PAGE_SIZE=10;

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href="login.html";
  CURRENT_USER=await getUserInfo(user.uid);
  loadRegionsFilter();
  loadRouteFilters();
  await initialLoadAds();
  attachRealtimeHandlers();
});

function loadRegionsFilter(){
  const el=document.getElementById("filterRegion");
  if(!el) return;
  el.innerHTML='<option value="">Viloyat (filter)</option>';
  Object.keys(REGIONS).forEach(r=>{
    el.insertAdjacentHTML("beforeend",`<option value="${r}">${r}</option>`);
  });
}

function loadRouteFilters(){
  const fr=document.getElementById("fromRegion");
  const tr=document.getElementById("toRegion");
  if(!fr||!tr) return;
  fr.innerHTML='<option value="">Viloyat</option>';
  tr.innerHTML='<option value="">Viloyat</option>';
  Object.keys(REGIONS).forEach(r=>{
    fr.insertAdjacentHTML("beforeend",`<option value="${r}">${r}</option>`);
    tr.insertAdjacentHTML("beforeend",`<option value="${r}">${r}</option>`);
  });
  fr.onchange=()=>{fillFromDistricts();CURRENT_PAGE=1;scheduleRenderAds();document.getElementById("fromDistrictBox").style.display="";};
  tr.onchange=()=>{fillToDistricts();CURRENT_PAGE=1;scheduleRenderAds();document.getElementById("toDistrictBox").style.display="";};
  fillFromDistricts();
  fillToDistricts();
}
function fillFromDistricts(){
  const r=document.getElementById("fromRegion").value;
  const box=document.getElementById("fromDistrictBox");
  box.innerHTML="";
  if(!r||!REGIONS[r]) return box.style.display="none";
  box.style.display="";
  REGIONS[r].forEach(d=>{
    box.insertAdjacentHTML("beforeend",`<label class="district-item"><input type="checkbox" class="fromDistrict" value="${d}"> ${d}</label>`);
  });
  box.querySelectorAll("input").forEach(ch=>ch.onchange=()=>{CURRENT_PAGE=1;scheduleRenderAds();});
}
function fillToDistricts(){
  const r=document.getElementById("toRegion").value;
  const box=document.getElementById("toDistrictBox");
  box.innerHTML="";
  if(!r||!REGIONS[r]) return box.style.display="none";
  box.style.display="";
  REGIONS[r].forEach(d=>{
    box.insertAdjacentHTML("beforeend",`<label class="district-item"><input type="checkbox" class="toDistrict" value="${d}"> ${d}</label>`);
  });
  box.querySelectorAll("input").forEach(ch=>ch.onchange=()=>{CURRENT_PAGE=1;scheduleRenderAds();});
}

async function initialLoadAds(){
  const snap=await get(ref(db,"ads"));
  if(!snap.exists()){ADS_MAP.clear();ALL_ADS=[];document.getElementById("adsList").innerHTML="E’lon yo‘q.";attachInputsOnce();renderPaginationControls(0,0,0);return;}
  const list=[];
  snap.forEach(ch=>list.push({id:ch.key,...ch
