/*
  profile.js
  React + Firebase single-file implementation of the "Profil" page for ShaharTaxi.

  - This file contains Firebase initialization (replace config with your values).
  - Fetches user's ads from Firestore, allows edit (inline modal), delete, search, filter by region/city,
    pagination, CSV export, image preview, status badges (Tasdiqlangan, Kutilyapti, Rad etilgan),
    phone validation (numbers-only), file uploads to Firebase Storage, optimistic UI updates,
    and accessibility considerations.

  NOTE:
  - Replace the firebaseConfig object with your project's values.
  - If you prefer a separate firebase.js file, move the initialization there and import { auth, db, storage }.

  This file intentionally includes detailed comments and helper functions to be self-contained and
  readable. It's long because it implements multiple features and helpful utilities.
*/

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

// =========================
// Firebase configuration
// =========================
// Replace these values with your Firebase project's config.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Initialize Firebase app (safe to call multiple times in modern SDK if already initialized)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  // If initializeApp is called multiple times in dev HMR, it throws. Ignore.
  // eslint-disable-next-line no-console
  console.warn('Firebase app initialize warning (likely already initialized):', err.message);
}

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// =========================
// Helper utilities
// =========================

const STATUS_OPTIONS = ['Kutilyapti', 'Tasdiqlangan', 'Rad etilgan'];

function formatDate(ts) {
  if (!ts) return '-';
  try {
    // Firestore timestamp has toDate() or seconds
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleString();
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleString();
    }
    return new Date(ts).toLocaleString();
  } catch (err) {
    return String(ts);
  }
}

function truncate(text, len = 160) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len) + '...' : text;
}

function isNumericString(s) {
  if (typeof s !== 'string') return false;
  return /^\d+$/.test(s);
}

// small debounce util
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// CSV exporter
function toCSV(rows = [], columns = []) {
  if (!rows || rows.length === 0) return '';
  const header = columns.join(',');
  const lines = rows.map((r) =>
    columns
      .map((c) => {
        const cell = r[c] == null ? '' : String(r[c]).replace(/"/g, '""');
        return `"${cell}"`;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}

// =========================
// Small UI subcomponents
// =========================

const Icon = ({ name, className = '' }) => {
  const map = {
    search: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    ),
    edit: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
      </svg>
    ),
    trash: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6L18.333 20.333A2 2 0 0 1 16.333 22H7.667A2 2 0 0 1 5.667 20.333L5 6"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
      </svg>
    ),
    plus: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14"></path>
        <path d="M5 12h14"></path>
      </svg>
    ),
  };
  return <span className={`inline-block align-middle ${className}`}>{map[name] || null}</span>;
};

// Status badge component
const StatusBadge = ({ status }) => {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  if (status === 'Tasdiqlangan') return <span className={`${base} bg-green-100 text-green-800`}>{status}</span>;
  if (status === 'Rad etilgan') return <span className={`${base} bg-red-100 text-red-800`}>{status}</span>;
  return <span className={`${base} bg-yellow-100 text-yellow-800`}>{status}</span>;
};

// Modal wrapper
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} aria-hidden="true"></div>
      <div className="relative bg-white rounded-2xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="close modal" className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

// =========================
// Main Profil component
// =========================
export default function Profil() {
  const navigate = useNavigate();

  // auth & user
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ads state
  const [ads, setAds] = useState([]); // raw fetched ads
  const [filteredAds, setFilteredAds] = useState([]); // filtered / searched
  const [loadingAds, setLoadingAds] = useState(true);

  // pagination
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);

  // UI controls
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [saving, setSaving] = useState(false);

  // delete confirmation
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // image upload progress
  const [uploadProgress, setUploadProgress] = useState(0);

  // region/city list derived from ads
  const regions = useMemo(() => Array.from(new Set(ads.map((a) => a.region).filter(Boolean))), [ads]);
  const cities = useMemo(() => Array.from(new Set(ads.map((a) => a.city).filter(Boolean))), [ads]);

  // refs for cleanup
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthLoading(false);
      if (!u) {
        // not logged in -> redirect to login page
        navigate('/login');
        return;
      }
      setUser(u);
      await loadAds(u.uid);
    });
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, []);

  // load ads from Firestore for the current user
  async function loadAds(uid) {
    setLoadingAds(true);
    try {
      const adsCol = collection(db, 'ads');
      const q = query(adsCol, where('userId', '==', uid), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      if (!mountedRef.current) return;
      setAds(items);
      setFilteredAds(items);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading ads:', err);
    } finally {
      if (mountedRef.current) setLoadingAds(false);
    }
  }

  // Basic client-side search & filters
  useEffect(() => {
    // apply search + filters in-memory for responsiveness
    let items = [...ads];
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((a) => {
        return (
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          (a.phone && String(a.phone).includes(q)) ||
          (a.city && a.city.toLowerCase().includes(q)) ||
          (a.region && a.region.toLowerCase().includes(q))
        );
      });
    }
    if (regionFilter) items = items.filter((a) => a.region === regionFilter);
    if (cityFilter) items = items.filter((a) => a.city === cityFilter);
    if (statusFilter) items = items.filter((a) => a.status === statusFilter);

    // sorting
    items.sort((x, y) => {
      const a = x[sortBy];
      const b = y[sortBy];
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      if (sortDir === 'asc') return a > b ? 1 : a < b ? -1 : 0;
      return a > b ? -1 : a < b ? 1 : 0;
    });

    setFilteredAds(items);
    setPage(1); // reset to first page when filters change
  }, [ads, search, regionFilter, cityFilter, statusFilter, sortBy, sortDir]);

  // pagination helper
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAds.slice(start, start + PAGE_SIZE);
  }, [filteredAds, page]);

  // ---------- actions ----------

  async function handleDeleteAd(adId, adImagePath) {
    // adImagePath is optional path in storage to delete
    try {
      // optimistic UI
      const prev = ads;
      setAds((cur) => cur.filter((a) => a.id !== adId));

      // delete Firestore doc
      await deleteDoc(doc(db, 'ads', adId));

      // delete image in storage if provided
      if (adImagePath) {
        try {
          const sRef = storageRef(storage, adImagePath);
          await deleteObject(sRef);
        } catch (err) {
          // image deletion failed; not critical
          // eslint-disable-next-line no-console
          console.warn('Failed to delete image from storage:', err.message);
        }
      }
    } catch (err) {
      // rollback on error
      // eslint-disable-next-line no-console
      console.error('Delete failed:', err);
      await loadAds(user.uid);
    }
  }

  function confirmDelete(ad) {
    setDeletingId(ad.id);
    setDeleteConfirmOpen(true);
  }

  // open inline edit modal with full ad object
  function openEdit(ad) {
    setEditingAd({ ...ad });
    setUploadProgress(0);
    setEditOpen(true);
  }

  // save edited ad (updates Firestore)
  async function saveEdit() {
    if (!editingAd || !editingAd.id) return;
    setSaving(true);
    try {
      // basic validation
      if (!editingAd.title || editingAd.title.trim().length < 3) {
        alert('Iltimos, e\'lon sarlavhasini 3 ta belgidan ko\'proq kiriting.');
        setSaving(false);
        return;
      }
      if (editingAd.phone && !isNumericString(String(editingAd.phone))) {
        alert('Telefon faqat raqamlardan iborat bo\'lishi kerak.');
        setSaving(false);
        return;
      }

      const adRef = doc(db, 'ads', editingAd.id);
      const updateData = {
        title: editingAd.title,
        description: editingAd.description || '',
        phone: editingAd.phone || '',
        region: editingAd.region || '',
        city: editingAd.city || '',
        price: editingAd.price || '',
        status: editingAd.status || 'Kutilyapti',
        updatedAt: serverTimestamp(),
      };

      // if a new file was chosen and staged as editingAd._newFile, upload it
      if (editingAd._newFile instanceof File) {
        const file = editingAd._newFile;
        const path = `ads/${editingAd.id}/${file.name}`;
        const sRef = storageRef(storage, path);
        const uploadTask = uploadBytesResumable(sRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress(progress);
            },
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              updateData.imageUrl = url;
              updateData.imagePath = path;
              resolve();
            }
          );
        });
      }

      await updateDoc(adRef, updateData);

      // update local state
      setAds((cur) => cur.map((a) => (a.id === editingAd.id ? { ...a, ...updateData } : a)));
      setEditOpen(false);
      setEditingAd(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save ad:', err);
      alert('E\'lonni saqlashda xatolik yuz berdi. Konsolga qarang.');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  }

  // create a new ad inline (optional utility) - convenience function
  async function createAdSkeleton() {
    if (!user) return;
    try {
      const newAd = {
        title: 'Yangi e\'lon - tahrirlash uchun bosing',
        description: '',
        userId: user.uid,
        phone: '',
        region: '',
        city: '',
        price: '',
        status: 'Kutilyapti',
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'ads'), newAd);
      // reload list or append
      const adObj = { id: docRef.id, ...newAd };
      setAds((cur) => [adObj, ...cur]);
      // open editor for new ad
      openEdit(adObj);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Create ad failed:', err);
    }
  }

  // export current filteredAds to CSV
  function exportCSV() {
    const columns = ['id', 'title', 'description', 'region', 'city', 'phone', 'price', 'status', 'createdAt'];
    const rows = filteredAds.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      region: r.region,
      city: r.city,
      phone: r.phone,
      price: r.price,
      status: r.status,
      createdAt: r.createdAt ? formatDate(r.createdAt) : '',
    }));
    const csv = toCSV(rows, columns);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `shahartaxi-ads-${new Date().toISOString()}.csv`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function userSignOut() {
    signOut(auth)
      .then(() => navigate('/login'))
      .catch((err) => console.error('Sign out error:', err));
  }

  // safe input handlers
  function handlePhoneInputChange(e) {
    const v = e.target.value;
    // only allow digits
    const cleaned = v.replace(/[^0-9]/g, '');
    setEditingAd((cur) => ({ ...cur, phone: cleaned }));
  }

  // debounce search updates to avoid frequent re-renders
  const debouncedSetSearch = useMemo(() => debounce((v) => setSearch(v), 300), []);

  // ---------- rendering helpers ----------
  function renderEmptyState() {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">Hozircha e\'loningiz yo\'q</h3>
        <p className="text-sm text-gray-500">Yangi e\'lon yaratish uchun tugmani bosing.</p>
        <div className="mt-4">
          <button onClick={createAdSkeleton} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
            <Icon name="plus" /> Yangi e\'lon
          </button>
        </div>
      </div>
    );
  }

  // Big list item
  function AdCard({ ad }) {
    return (
      <article className="bg-white rounded-2xl shadow p-4 flex flex-col md:flex-row md:justify-between gap-3">
        <div className="flex gap-4 items-start md:items-center">
          <div className="w-24 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {ad.imageUrl ? (
              <img src={ad.imageUrl} alt={ad.title} className="object-cover w-full h-full" />
            ) : (
              <div className="text-xs text-gray-400">Rasm yo\'q</div>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-lg font-semibold truncate">{ad.title}</h4>
            <div className="text-xs text-gray-500 mt-1">{truncate(ad.description, 180)}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <span>{ad.region} — {ad.city}</span>
              <span>•</span>
              <span>{ad.price ? `${ad.price} so'm` : 'Narx yo\'q'}</span>
            </div>
            <div className="mt-2">
              <StatusBadge status={ad.status || 'Kutilyapti'} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center md:items-start">
          <button onClick={() => openEdit(ad)} className="px-3 py-1 bg-blue-500 text-white rounded-lg flex items-center gap-2">
            <Icon name="edit" /> Tahrirlash
          </button>
          <button onClick={() => confirmDelete(ad)} className="px-3 py-1 bg-red-500 text-white rounded-lg flex items-center gap-2">
            <Icon name="trash" /> O'chirish
          </button>
        </div>
      </article>
    );
  }

  // ---------- main render ----------
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mening profil — ShaharTaxi</h1>
            <p className="text-sm text-gray-500">Foydalanuvchi: {user ? user.email : '...'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportCSV} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">CSV export</button>
            <button onClick={userSignOut} className="px-3 py-2 bg-gray-200 rounded-lg text-sm">Chiqish</button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 space-y-2">
            <label className="sr-only">Qidiruv</label>
            <div className="relative">
              <input
                type="search"
                placeholder="Sarlavha, tavsif, shahar, raqam..."
                onChange={(e) => debouncedSetSearch(e.target.value)}
                className="w-full rounded-xl border p-3 pl-10 bg-white"
              />
              <div className="absolute left-3 top-3 text-gray-400"><Icon name="search" /></div>
            </div>

            <div className="flex gap-2 mt-2">
              <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="rounded-xl border p-2 bg-white">
                <option value="">Barcha viloyatlar</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="rounded-xl border p-2 bg-white">
                <option value="">Barcha shaharlar</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border p-2 bg-white">
                <option value="">Barcha statuslar</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="md:col-span-1 flex flex-col gap-2">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl border p-2 bg-white">
              <option value="createdAt">Yaratilgan sana</option>
              <option value="title">Sarlavha</option>
              <option value="price">Narx</option>
            </select>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="rounded-xl border p-2 bg-white">
              <option value="desc">Teskari</option>
              <option value="asc">O'suvchi</option>
            </select>
            <button onClick={createAdSkeleton} className="mt-auto px-3 py-2 bg-green-600 text-white rounded-lg">Yangi e\'lon</button>
          </div>
        </section>

        <main>
          {loadingAds ? (
            <div className="text-center py-16">Yuklanmoqda...</div>
          ) : ads.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="space-y-4">
              {paginated.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}

              {/* pagination controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">Jami: {filteredAds.length} e\'lon</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg bg-gray-200">Oldingi</button>
                  <span className="px-3 py-1">{page}</span>
                  <button onClick={() => setPage((p) => (p * PAGE_SIZE < filteredAds.length ? p + 1 : p))} className="px-3 py-1 rounded-lg bg-gray-200">Keyingi</button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* delete confirm modal */}
        <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="E\'lonni o\'chirish">
          <p>Haqiqatan ham ushbu e\'lonni o\'chirishni xohlaysizmi? Bu amal qaytarilmaydi.</p>
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => setDeleteConfirmOpen(false)} className="px-3 py-1 rounded-lg bg-gray-200">Bekor qilish</button>
            <button
              onClick={async () => {
                setDeleteConfirmOpen(false);
                const ad = ads.find((x) => x.id === deletingId);
                if (!ad) return;
                await handleDeleteAd(ad.id, ad.imagePath);
              }}
              className="px-3 py-1 rounded-lg bg-red-600 text-white"
            >
              O'chirish
            </button>
          </div>
        </Modal>

        {/* edit modal */}
        <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditingAd(null); }} title={editingAd ? 'E\'lonni tahrirlash' : 'Tahrirlash'}>
          {editingAd ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Sarlavha</label>
                <input value={editingAd.title || ''} onChange={(e) => setEditingAd((cur) => ({ ...cur, title: e.target.value }))} className="w-full rounded-lg border p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Tavsif</label>
                <textarea value={editingAd.description || ''} onChange={(e) => setEditingAd((cur) => ({ ...cur, description: e.target.value }))} rows={6} className="w-full rounded-lg border p-2" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium">Viloyat</label>
                  <input value={editingAd.region || ''} onChange={(e) => setEditingAd((cur) => ({ ...cur, region: e.target.value }))} className="w-full rounded-lg border p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Shahar</label>
                  <input value={editingAd.city || ''} onChange={(e) => setEditingAd((cur) => ({ ...cur, city: e.target.value }))} className="w-full rounded-lg border p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Telefon</label>
                  <input value={editingAd.phone || ''} onChange={handlePhoneInputChange} className="w-full rounded-lg border p-2" placeholder="9989xxxxxxx" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium">Narx</label>
                  <input value={editingAd.price || ''} onChange={(e) => setEditingAd((cur) => ({ ...cur, price: e.target.value }))} className="w-full rounded-lg border p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Status</label>
                  <select value={editingAd.status || 'Kutilyapti'} onChange={(e) => setEditingAd((cur) => ({ ...cur, status: e.target.value }))} className="w-full rounded-lg border p-2">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Rasm</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                      // store file in special temp field
                      setEditingAd((cur) => ({ ...cur, _newFile: file, imagePreview: URL.createObjectURL(file) }));
                    }
                  }} className="w-full rounded-lg border p-2 bg-white" />
                  {editingAd.imagePreview || editingAd.imageUrl ? (
                    <div className="mt-2 w-40 h-28 bg-gray-100 rounded overflow-hidden">
                      <img src={editingAd.imagePreview || editingAd.imageUrl} alt="preview" className="object-cover w-full h-full" />
                    </div>
                  ) : null}
                </div>
              </div>

              {uploadProgress > 0 && (
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div style={{ width: `${uploadProgress}%` }} className="h-2 bg-green-500"></div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => { setEditOpen(false); setEditingAd(null); }} className="px-3 py-1 bg-gray-200 rounded-lg">Bekor qilish</button>
                <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded-lg" disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>

            </div>
          ) : (
            <div>Loading...</div>
          )}
        </Modal>

        <footer className="mt-8 text-xs text-gray-400">© ShaharTaxi</footer>
      </div>
    </div>
  );
}
