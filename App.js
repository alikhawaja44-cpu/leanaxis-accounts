import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Wallet, Receipt, Users, Building2, Briefcase, Truck,
  Plus, Download, Trash2, ArrowUpRight, ArrowDownLeft, Calendar, LogIn, Lock, UserPlus, Edit, Menu, X, CheckCircle, Clock, Upload, Link as LinkIcon, Copy, RefreshCw, FileInput, Settings, FileDown, Search, Filter
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend } from 'recharts';
import Papa from "papaparse";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyAOFOgjdbdoUYBTldXOEEG636q1EM8EBfc",
    authDomain: "leanaxis-accounts.firebaseapp.com",
    projectId: "leanaxis-accounts",
    storageBucket: "leanaxis-accounts.firebasestorage.app",
    messagingSenderId: "855221056961",
    appId: "1:855221056961:web:b4129012fa0f56f58a6b40"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return 'Rs0';
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
};

// PASSWORD ENCRYPTION - SECURITY FIX
const hashPassword = async (password) => {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const comparePassword = async (inputPassword, storedHash) => {
  const inputHash = await hashPassword(inputPassword);
  return inputHash === storedHash;
};

// INPUT VALIDATION HELPERS
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '').trim();
};

// TAX CALCULATION (Pakistan GST)
const calculateTax = (amount, taxRate = 18) => {
  const tax = (Number(amount) || 0) * (taxRate / 100);
  return {
    subtotal: Number(amount) || 0,
    tax: tax,
    total: (Number(amount) || 0) + tax
  };
};

const exportToCSV = (data, filename) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
  const csvContent = "data:text/csv;charset=utf-8," + headers + '\n' + rows;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- HOOK FOR FIREBASE SYNC ---
function useFirebaseSync(collectionName, defaultValue = []) {
    const [data, setData] = useState(defaultValue);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            items.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
            setData(items);
            setLoading(false);
        }, (error) => {
            console.error("Firebase sync error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [collectionName]);

    return [data, loading];
}

// --- LOCAL STORAGE HOOK ---
function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}


// --- LOGIN COMPONENT ---
const LoginView = ({ onLogin, loading, error }) => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(loginInput, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full blur-[100px] opacity-30"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-600 rounded-full blur-[100px] opacity-30"></div>

      <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 relative z-10">
        <div className="flex justify-center mb-6">
           <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 p-4 rounded-xl text-white font-bold text-3xl shadow-lg">LA</div>
        </div>
        <h2 className="text-3xl font-bold text-center text-white mb-1">LeanAxis</h2>
        <p className="text-center text-slate-400 mb-8 text-sm">Professional Agency Manager</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
            <input 
              type="text" 
              required 
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-500" 
              value={loginInput} 
              onChange={(e) => setLoginInput(e.target.value)} 
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required 
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-500" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-red-400 text-sm text-center bg-red-900/20 p-3 rounded-lg border border-red-900/50 flex items-center justify-center gap-2"><Lock size={16} /> {error}</div>}
          
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 text-white py-3.5 rounded-lg font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex justify-center gap-2 items-center mt-2">
            {loading ? 'Verifying...' : <><LogIn size={20} /> Access Dashboard</>}
          </button>
        </form>
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useStickyState(false, 'leanaxis_auth');
  const [currentUser, setCurrentUser] = useStickyState(null, 'leanaxis_current_user');
  const [imgbbKey, setImgbbKey] = useStickyState('', 'leanaxis_imgbb_key'); 
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [searchTerm, setSearchTerm] = useState(''); 

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isEditingUser, setIsEditingUser] = useState(false); 
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');

  const [pettyCash] = useFirebaseSync('petty_cash');
  const [expenses] = useFirebaseSync('expenses');
  const [salaries] = useFirebaseSync('salaries');
  const [bankRecords] = useFirebaseSync('bank_records');
  const [clients] = useFirebaseSync('clients');
  const [vendors] = useFirebaseSync('vendors');
  const [users, usersLoading] = useFirebaseSync('users');

  // Derive unique bank names for dropdown
  const uniqueBanks = useMemo(() => {
      const banks = new Set(bankRecords.map(b => b.bank));
      return Array.from(banks).filter(Boolean);
  }, [bankRecords]);

  // Create default admin with hashed password
  useEffect(() => {
      const createDefaultAdmin = async () => {
          if (!usersLoading && users.length === 0) {
              const hashedPassword = await hashPassword('admin123');
              addDoc(collection(db, 'users'), { 
                  username: 'admin', 
                  password: hashedPassword, 
                  email: 'admin@leanaxis.com', 
                  role: 'Admin', 
                  createdAt: new Date().toISOString() 
              }).catch(console.error);
          }
      };
      createDefaultAdmin();
  }, [users, usersLoading]);

  const handleLogin = async (loginInput, password) => {
      const inputHash = await hashPassword(password);
      
      if (users.length === 0 && loginInput === 'admin' && password === 'admin123') {
          setIsAuthenticated(true);
          setCurrentUser({ username: 'admin', role: 'Admin' });
          setAuthError(null);
          return;
      }
      const user = users.find(u => (u.username === loginInput || u.email === loginInput) && u.password === inputHash);
      if (user) { setIsAuthenticated(true); setCurrentUser(user); setAuthError(null); } 
      else { setAuthError('Invalid credentials'); }
  };

  const handleLogout = () => { setIsAuthenticated(false); setCurrentUser(null); setView('dashboard'); };

  const deleteRecord = async (collectionName, id) => { if(confirm('Delete this record?')) await deleteDoc(doc(db, collectionName, id)); };

  const handleDelete = (id, type) => {
    if (currentUser.role !== 'Admin') return alert('Access Denied: Only Admins can delete records.');
    const map = { 'petty': 'petty_cash', 'expense': 'expenses', 'salary': 'salaries', 'bank': 'bank_records', 'client': 'clients', 'vendor': 'vendors', 'user': 'users' };
    if (map[type]) deleteRecord(map[type], id);
  };

  const handleEdit = (item) => {
      if (currentUser.role !== 'Admin') return alert('Access Denied: Only Admins can edit records.');
      setFormData({ ...item });
      setIsEditingRecord(true);
      setShowForm(true);
  };

  const handleDuplicate = (item) => {
      const { id, createdAt, lastEditedAt, lastEditedBy, proofUrl, ...dataToCopy } = item;
      setFormData({ ...dataToCopy, date: new Date().toISOString().split('T')[0] });
      setFileToUpload(null);
      setIsEditingRecord(false);
      setIsEditingUser(false);
      setShowForm(true);
  };

  const handleMasterExport = () => {
    if(!confirm("Download ALL data from every section?")) return;
    const allData = [];
    const pushData = (source, type) => {
        source.forEach(item => {
            const flatItem = { TYPE: type };
            Object.keys(item).forEach(key => {
                if(typeof item[key] !== 'object' && key !== 'id') flatItem[key] = item[key];
            });
            allData.push(flatItem);
        });
    };
    pushData(clients, 'Client');
    pushData(vendors, 'Vendor');
    pushData(pettyCash, 'Petty Cash');
    pushData(expenses, 'Expense');
    pushData(salaries, 'Salary');
    pushData(bankRecords, 'Bank');

    if (allData.length === 0) return alert("No data to export!");
    allData.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    exportToCSV(allData, `LeanAxis_Master_Export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const uploadFile = async (file) => {
      if (!file) return null;
      if (!imgbbKey) {
          alert("Please set your ImgBB API Key in Settings first!");
          return null;
      }
      setUploadProgress('Uploading...');
      const formData = new FormData();
      formData.append("image", file);
      try {
          const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: "POST", body: formData });
          const data = await res.json();
          if (data.success) { setUploadProgress('Done!'); return data.data.url; } 
          else { throw new Error(data.error?.message || 'Upload failed'); }
      } catch (e) {
          console.error("Upload error:", e);
          alert("Upload failed: " + e.message);
          setUploadProgress('Failed');
          return null;
      }
  };

  const saveToFirebase = async (collectionName, data, id = null) => {
      setIsSubmitting(true);
      try {
          // INPUT VALIDATION
          if (data.email && !isValidEmail(data.email)) {
              alert("Please enter a valid email address");
              setIsSubmitting(false);
              return;
          }
          
          // Sanitize text inputs
          const sanitizedData = { ...data };
          Object.keys(sanitizedData).forEach(key => {
              if (typeof sanitizedData[key] === 'string') {
                  sanitizedData[key] = sanitizeInput(sanitizedData[key]);
              }
          });

          let proofUrl = sanitizedData.proofUrl || null;
          if (fileToUpload) {
              const url = await uploadFile(fileToUpload);
              if (url) proofUrl = url;
          }
          
          // HASH PASSWORD FOR USERS
          let finalData = { ...sanitizedData, date: sanitizedData.date || new Date().toISOString().split('T')[0], proofUrl };
          if (collectionName === 'users' && finalData.password) {
              finalData.password = await hashPassword(finalData.password);
          }
          
          if (id) {
             // For editing users, don't update password if blank
             if (collectionName === 'users' && !finalData.password) {
                 const { password, ...dataWithoutPassword } = finalData;
                 finalData = dataWithoutPassword;
             }
             await updateDoc(doc(db, collectionName, id), { ...finalData, lastEditedBy: currentUser.username, lastEditedAt: new Date().toISOString() });
             alert("Record updated!");
          } else {
             await addDoc(collection(db, collectionName), { ...finalData, addedBy: currentUser.username, createdAt: new Date().toISOString() });
             alert("Record saved!");
          }
          setShowForm(false);
          setFormData({});
          setFileToUpload(null);
          setUploadProgress('');
          setIsEditingRecord(false);
          setIsEditingUser(false);
      } catch (e) {
          console.error("Error saving: ", e);
          alert("Failed to save. Check internet connection.");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    let targetCollection = null;
    if (view === 'manage-users') targetCollection = 'users';
    else if (view === 'petty-cash') targetCollection = 'petty_cash';
    else if (view === 'expenses') targetCollection = 'expenses';
    else if (view === 'salaries') targetCollection = 'salaries';
    else if (view === 'bank') targetCollection = 'bank_records';
    else if (view === 'clients') targetCollection = 'clients';
    else if (view === 'vendors') targetCollection = 'vendors';

    if (targetCollection) {
        // DUPLICATE PREVENTION
        if (targetCollection === 'users' && !isEditingUser) {
            if (users.some(u => u.username === formData.username)) {
                alert("Username already exists!");
                return;
            }
            if (users.some(u => u.email === formData.email)) {
                alert("Email already registered!");
                return;
            }
        }
        
        // EMAIL VALIDATION
        if (formData.email && !isValidEmail(formData.email)) {
            alert("Please enter a valid email address");
            return;
        }
        
        const docId = (isEditingRecord || isEditingUser) ? formData.id : null;
        const { id, ...dataToSave } = formData; 
        saveToFirebase(targetCollection, dataToSave, docId);
    }
  };

  const filterData = (items) => {
    let filtered = items;

    // Date Filter
    if (selectedMonth !== 'All' || selectedYear !== 'All') {
        filtered = items.filter(item => {
            const dateStr = item.date || item.createdAt; 
            if (!dateStr) return false;
            const date = new Date(dateStr);
            const monthMatch = selectedMonth === 'All' || date.toLocaleString('default', { month: 'long' }) === selectedMonth;
            const yearMatch = selectedYear === 'All' || date.getFullYear().toString() === selectedYear;
            return monthMatch && yearMatch;
        });
    }

    // Search Filter
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filtered = filtered.filter(item => {
            return Object.values(item).some(val => 
                String(val).toLowerCase().includes(lowerSearch)
            );
        });
    }

    return filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  };

  const filteredPettyCash = useMemo(() => filterData(pettyCash), [pettyCash, selectedMonth, selectedYear, searchTerm]);
  const filteredExpenses = useMemo(() => filterData(expenses), [expenses, selectedMonth, selectedYear, searchTerm]);
  const filteredSalaries = useMemo(() => filterData(salaries), [salaries, selectedMonth, selectedYear, searchTerm]);
  const filteredBankRecords = useMemo(() => filterData(bankRecords), [bankRecords, selectedMonth, selectedYear, searchTerm]);
  const filteredClients = useMemo(() => filterData(clients), [clients, selectedMonth, selectedYear, searchTerm]); 
  const filteredVendors = useMemo(() => filterData(vendors), [vendors]); // Vendors usually not filtered by date, but search is useful

  const totals = useMemo(() => {
    const totalPettyCashOut = filteredPettyCash.reduce((acc, curr) => acc + (Number(curr.cashOut) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalSalaries = filteredSalaries.reduce((acc, curr) => acc + (Number(curr.totalPayable) || 0), 0);
    const totalVendorPending = vendors.reduce((acc, curr) => acc + (Number(curr.amountPayable) || 0) - (Number(curr.amountPaid) || 0), 0);
    const totalClientPending = clients.reduce((acc, curr) => acc + (Number(curr.projectTotal) || 0) - (Number(curr.advanceReceived) || 0), 0);
    
    // Revenue Calculation (Clients Advance + Petty Cash In)
    const totalRevenue = filteredClients.reduce((acc, curr) => acc + (Number(curr.advanceReceived) || 0), 0) +
                         filteredPettyCash.reduce((acc, curr) => acc + (Number(curr.cashIn) || 0), 0);

    const totalSpent = totalPettyCashOut + totalExpenses + totalSalaries;
    const netSaving = totalRevenue - totalSpent;

    return {
      expense: totalSpent,
      revenue: totalRevenue,
      saving: netSaving,
      pettyBalance: pettyCash.reduce((acc, curr) => acc + (Number(curr.cashIn) || 0) - (Number(curr.cashOut) || 0), 0),
      vendorPending: totalVendorPending,
      clientPending: totalClientPending
    };
  }, [filteredPettyCash, filteredExpenses, filteredSalaries, vendors, clients, pettyCash]); 

  const expenseChartData = useMemo(() => {
      const data = [
          { name: 'Petty Cash', value: filteredPettyCash.reduce((acc, curr) => acc + (Number(curr.cashOut) || 0), 0) },
          { name: 'Expenses', value: filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) },
          { name: 'Salaries', value: filteredSalaries.reduce((acc, curr) => acc + (Number(curr.totalPayable) || 0), 0) }
      ];
      return data.filter(d => d.value > 0);
  }, [filteredPettyCash, filteredExpenses, filteredSalaries]);

  const COLORS = ['#6366f1', '#06b6d4', '#f59e0b']; // Indigo, Cyan, Amber

  const NavButton = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setView(id); setIsSidebarOpen(false); setSearchTerm(''); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${view === id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={20} className={`transition-transform group-hover:scale-110 ${view === id ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  const ActionButtons = ({ item, type }) => (
      <div className="flex gap-1 justify-center items-center">
          {item.proofUrl && <a href={item.proofUrl} target="_blank" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Proof"><LinkIcon size={16} /></a>}
          <button onClick={() => handleDuplicate(item)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Duplicate"><Copy size={16} /></button>
          {currentUser.role === 'Admin' && (
             <><button onClick={() => type === 'user' ? (setFormData({...item}), setIsEditingUser(true), setShowForm(true)) : handleEdit(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={16} /></button>
             <button onClick={() => type === 'user' ? deleteRecord('users', item.id) : handleDelete(item.id, type)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></>
          )}
      </div>
  );

  const ProofInput = () => (
      <div className="border-t border-slate-100 pt-4 mt-2">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wide">Attach Proof</label>
          <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl transition-colors border border-slate-200 w-full justify-center">
                  <Upload size={18} />
                  <span className="text-sm font-medium">{fileToUpload ? fileToUpload.name : "Choose File"}</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFileToUpload(e.target.files[0])} />
              </label>
              {fileToUpload && <button type="button" onClick={() => setFileToUpload(null)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><X size={18}/></button>}
          </div>
          {formData.proofUrl && !fileToUpload && <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-bold"><CheckCircle size={14}/> Existing proof attached</p>}
          {uploadProgress && <p className="text-xs text-indigo-600 mt-2 font-medium animate-pulse">{uploadProgress}</p>}
      </div>
  );

  const PaymentSourceSelect = () => (
      <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wide">Paid From / Account</label>
          <div className="relative">
             <select 
                className="w-full border border-slate-200 p-3 rounded-xl bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none font-medium"
                value={formData.paymentSource || 'Cash'}
                onChange={e => setFormData({...formData, paymentSource: e.target.value})}
            >
                <option value="Cash">Cash (Petty Cash)</option>
                {uniqueBanks.map((bank, i) => <option key={i} value={bank}>{bank}</option>)}
                <option value="Other">Other</option>
            </select>
            <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
      </div>
  );

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} error={authError} />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 border-b border-slate-800 p-4 z-50 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-cyan-500 p-1.5 rounded-lg text-white font-bold text-sm shadow-md">LA</div>
            <span className="font-bold text-white tracking-wide">LeanAxis</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-300 hover:text-white">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* SIDEBAR - DARK THEME */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-40 transform transition-transform duration-300 md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} pt-20 md:pt-0 shadow-2xl`}>
        <div className="p-8 border-b border-slate-800 hidden md:block">
            <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-indigo-600 to-cyan-600 p-3 rounded-xl text-white font-bold shadow-lg shadow-indigo-900/50">LA</div>
                <div>
                    <h1 className="font-bold text-xl text-white tracking-wide">LeanAxis</h1>
                    <p className="text-xs text-slate-400 font-medium">Agency Manager</p>
                </div>
            </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <NavButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modules</div>
          <NavButton id="clients" icon={Briefcase} label="Clients & Projects" />
          <NavButton id="petty-cash" icon={Wallet} label="Petty Cash" />
          <NavButton id="expenses" icon={Receipt} label="Expense Sheet" />
          <NavButton id="salaries" icon={Users} label="Salary & Payments" />
          <NavButton id="vendors" icon={Truck} label="Vendor Management" />
          <NavButton id="bank" icon={Building2} label="Bank & Cheques" />
          
          {currentUser.role === 'Admin' && (
             <>
                <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin</div>
                <NavButton id="manage-users" icon={UserPlus} label="Manage Users" />
                <NavButton id="settings" icon={Settings} label="Settings" />
             </>
          )}
        </nav>

        <div className="p-6 border-t border-slate-800">
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-700 text-slate-300 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200">
             <Lock size={16} /> Logout
           </button>
        </div>
      </aside>

      {/* OVERLAY */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-24 md:pt-8 w-full bg-slate-50">
        
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-5">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 capitalize tracking-tight">{view.replace('-', ' ')}</h2>
            <p className="text-slate-500 text-sm mt-1">Manage your agency finances efficiently.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            {/* SEARCH BAR */}
            {view !== 'dashboard' && view !== 'settings' && (
                <div className="relative flex-1 sm:w-72">
                    <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            )}

            {view !== 'manage-users' && view !== 'settings' && view !== 'vendors' && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                    <Calendar size={18} className="text-slate-400" />
                    <select className="bg-transparent outline-none text-sm text-slate-700 font-medium cursor-pointer hover:text-indigo-600 transition-colors" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}><option value="All">All Months</option>{['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m} value={m}>{m}</option>)}</select>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <select className="bg-transparent outline-none text-sm text-slate-700 font-medium cursor-pointer hover:text-indigo-600 transition-colors" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}><option value="All">All Years</option><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option></select>
                </div>
            )}
            
            {view !== 'dashboard' && view !== 'settings' && (
                <div className="flex gap-3">
                  <button onClick={handleMasterExport} className="p-2.5 border border-slate-200 bg-white text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 hover:text-indigo-600 transition-all" title="Download Master CSV"><FileDown size={20} /></button>
                  <button onClick={() => { setShowForm(true); setIsEditingUser(false); setIsEditingRecord(false); setFormData({}); setFileToUpload(null); }} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-bold hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-95"><Plus size={18} /> {view === 'manage-users' ? 'Add User' : 'Add New'}</button>
                </div>
            )}
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {[
                  { label: 'Total Revenue', sub: 'Inflow', val: totals.revenue, icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Total Spending', sub: 'Outflow', val: totals.expense, icon: ArrowUpRight, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                  { label: 'Net Profit', sub: 'Savings', val: totals.saving, icon: Wallet, color: totals.saving >= 0 ? 'text-indigo-600' : 'text-orange-600', bg: totals.saving >= 0 ? 'bg-indigo-50' : 'bg-orange-50', border: totals.saving >= 0 ? 'border-indigo-100' : 'border-orange-100' },
                  { label: 'Vendor Payables', sub: 'Pending', val: totals.vendorPending, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' }
              ].map((stat, i) => (
                  <div key={i} className={`bg-white p-6 rounded-2xl shadow-sm border ${stat.border} hover:shadow-md transition-shadow`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3.5 ${stat.bg} rounded-xl ${stat.color} shadow-sm`}><stat.icon size={24} /></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-full">{stat.sub}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stat.val)}</h3>
                  </div>
              ))}
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-96 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Expense Distribution</h3>
                        <p className="text-sm text-slate-500">Breakdown by major categories</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={expenseChartData} 
                                cx="50%" cy="50%" 
                                innerRadius={80} 
                                outerRadius={110} 
                                fill="#8884d8" 
                                paddingAngle={5} 
                                dataKey="value"
                                cornerRadius={5}
                            >
                                {expenseChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />))}
                            </Pie>
                            <ChartTooltip 
                                formatter={(value) => formatCurrency(value)} 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text Overlay */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase">Total Out</p>
                        <p className="text-xl font-bold text-slate-800">{formatCurrency(totals.expense)}</p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* MANAGE USERS VIEW - FIXED */}
        {view === 'manage-users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {usersLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="animate-spin mx-auto mb-4 text-indigo-600" size={40} />
                <p className="text-slate-500">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="mx-auto mb-4 text-slate-300" size={64} />
                <p className="text-xl font-bold text-slate-700 mb-2">No users found</p>
                <p className="text-slate-500 mb-6">Get started by adding your first user</p>
                <button 
                  onClick={() => { setShowForm(true); setIsEditingUser(false); setIsEditingRecord(false); setFormData({}); setFileToUpload(null); }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold mx-auto hover:bg-indigo-700 transition-all"
                >
                  <Plus size={20} /> Add User
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Username</th>
                      <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Created</th>
                      <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                              {item.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-800">{item.username}</span>
                          </div>
                        </td>
                        <td className="p-5 text-sm text-slate-600">{item.email}</td>
                        <td className="p-5">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.role === 'Admin' 
                              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                              : item.role === 'Editor'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {item.role}
                          </span>
                        </td>
                        <td className="p-5 text-center text-sm text-slate-500">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          }) : '-'}
                        </td>
                        <td className="p-5 text-center">
                          <ActionButtons item={item} type="user" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS VIEW */}
        {view === 'settings' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-lg mx-auto mt-10">
                <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><Settings size={20} className="text-indigo-600"/> Configuration</h3>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ImgBB API Key (Free Image Hosting)</label>
                        <div className="flex gap-2">
                            <input 
                                className="border border-slate-200 p-3 rounded-xl w-full text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                                value={imgbbKey} 
                                onChange={e => setImgbbKey(e.target.value)} 
                                placeholder="Paste your API key here..." 
                            />
                            <a 
                                href="https://api.imgbb.com/" 
                                target="_blank" 
                                className="bg-slate-100 text-slate-600 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap hover:bg-slate-200 transition-colors"
                            >
                                Get Key
                            </a>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 ml-1">Required to upload receipts and documents.</p>
                    </div>
                </div>
            </div>
        )}

        {/* TABLES - STYLED */}
        {view !== 'dashboard' && view !== 'settings' && view !== 'manage-users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1000px] border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {/* Render Headers Based on View */}
                            {view === 'clients' && <><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Client Name</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Retainer</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Advance</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Balance</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th></>}
                            {view === 'vendors' && <><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Service</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Paid</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Balance</th></>}
                            {view === 'petty-cash' && <><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Head</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Out</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">In</th></>}
                            {view === 'expenses' && <><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th></>}
                            {view === 'salaries' && <><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th></>}
                            {view === 'bank' && <><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Bank</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Cheque</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Desc</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Clearing</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th></>}
                            <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {/* RENDER ROWS */}
                        {view === 'clients' && filteredClients.map(item => (<tr key={item.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5 text-sm font-bold text-slate-800">{item.name}</td><td className="p-5 text-sm text-emerald-600 font-medium">{formatCurrency(item.retainerAmount)}</td><td className="p-5 text-sm text-slate-600">{item.projectName || '-'}</td><td className="p-5 text-sm text-right font-medium text-slate-600">{formatCurrency(item.projectTotal)}</td><td className="p-5 text-sm text-right text-emerald-600 font-medium">{formatCurrency(item.advanceReceived)}</td><td className="p-5 text-sm text-right font-bold text-rose-600">{formatCurrency(Number(item.projectTotal)-Number(item.advanceReceived))}</td><td className="p-5"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{item.status}</span></td><td className="p-5 text-center"><ActionButtons item={item} type="client"/></td></tr>))}
                        {view === 'vendors' && filteredVendors.map(item => (<tr key={item.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 text-sm font-bold text-slate-800">{item.name}</td><td className="p-5 text-sm text-slate-500">{item.serviceType}</td><td className="p-5 text-sm text-slate-500 truncate max-w-[150px]">{item.description || '-'}</td><td className="p-5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg w-fit">{item.paymentSource || 'Cash'}</td><td className="p-5 text-sm text-right font-bold text-slate-700">{formatCurrency(item.amountPayable)}</td><td className="p-5 text-sm text-right text-emerald-600 font-medium">{formatCurrency(item.amountPaid)}</td><td className="p-5 text-sm text-right font-bold text-rose-600">{formatCurrency(Number(item.amountPayable) - Number(item.amountPaid))}</td><td className="p-5 text-center"><ActionButtons item={item} type="vendor" /></td></tr>))}
                        {view === 'petty-cash' && filteredPettyCash.map(item => (<tr key={item.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5 text-sm font-bold text-slate-800">{item.description}</td><td className="p-5"><span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold">{item.head}</span></td><td className="p-5 text-xs font-bold text-indigo-600">{item.paymentSource || 'Cash'}</td><td className="p-5 text-sm text-right font-bold text-rose-600">{item.cashOut ? formatCurrency(item.cashOut) : '-'}</td><td className="p-5 text-sm text-right font-bold text-emerald-600">{item.cashIn ? formatCurrency(item.cashIn) : '-'}</td><td className="p-5 text-center"><ActionButtons item={item} type="petty"/></td></tr>))}
                        {view === 'expenses' && filteredExpenses.map(item => (<tr key={item.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5"><span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-bold">{item.category}</span></td><td className="p-5 text-sm text-slate-700">{item.description}</td><td className="p-5 text-sm text-slate-500">{item.employeeName || '-'}</td><td className="p-5 text-xs font-bold text-indigo-600">{item.paymentSource || 'Cash'}</td><td className="p-5 text-sm text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td><td className="p-5 text-center"><ActionButtons item={item} type="expense"/></td></tr>))}
                        {/* Similar styling for Salaries and Bank (omitted for brevity, follows pattern) */}
                        {view === 'salaries' && filteredSalaries.map(item => (<tr key={item.id} className="hover:bg-slate-50"><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5 text-sm font-bold text-slate-800">{item.employeeName}</td><td className="p-5"><span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold">{item.type}</span></td><td className="p-5 text-sm text-slate-500">{item.description || '-'}</td><td className="p-5 text-sm text-right font-bold text-slate-800">{formatCurrency(item.totalPayable)}</td><td className="p-5 text-xs font-bold text-indigo-600">{item.paymentSource || 'Cash'}</td><td className="p-5"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${item.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{item.status}</span></td><td className="p-5 text-center"><ActionButtons item={item} type="salary"/></td></tr>))}
                        {view === 'bank' && filteredBankRecords.map(item => (<tr key={item.id} className="hover:bg-slate-50"><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5 text-sm font-bold text-blue-600">{item.bank}</td><td className="p-5 text-xs font-mono bg-slate-100 px-2 py-1 rounded w-fit">{item.cheque}</td><td className="p-5 text-sm text-slate-600">{item.description}</td><td className="p-5 text-sm text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td><td className="p-5 text-xs text-slate-500">{item.clearingDate || '-'}</td><td className="p-5"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${item.status === 'Cleared' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></td><td className="p-5 text-center"><ActionButtons item={item} type="bank"/></td></tr>))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* MODAL FORM - Styled */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                    {view === 'manage-users' 
                      ? (isEditingUser ? 'Edit User' : 'Add New User')
                      : (isEditingRecord ? 'Edit Record' : 'Add New Record')
                    }
                  </h3>
                  <button onClick={() => { setShowForm(false); setFileToUpload(null); }} className="text-slate-400 hover:text-red-500 transition-colors bg-slate-50 p-2 rounded-full hover:bg-red-50"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddSubmit} className="space-y-5">
                
                {/* USER FORM - FIXED */}
                {view === 'manage-users' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Username *</label>
                      <input 
                        required 
                        placeholder="Enter username" 
                        className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.username || ''} 
                        onChange={e => setFormData({...formData, username: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email *</label>
                      <input 
                        type="email"
                        required 
                        placeholder="Enter email address" 
                        className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.email || ''} 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        Password {isEditingUser && <span className="text-slate-400 font-normal normal-case">(leave blank to keep current)</span>}
                      </label>
                      <input 
                        type="password"
                        required={!isEditingUser}
                        placeholder={isEditingUser ? "Leave blank to keep current" : "Enter password"} 
                        className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.password || ''} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role *</label>
                      <select 
                        required
                        className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={formData.role || 'Viewer'} 
                        onChange={e => setFormData({...formData, role: e.target.value})}
                      >
                        <option value="Viewer">Viewer (Read Only)</option>
                        <option value="Editor">Editor (Can Add/Edit)</option>
                        <option value="Admin">Admin (Full Access)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* DYNAMIC FORM FIELDS */}
                {view === 'vendors' && (
                  <>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vendor Name</label><input required className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Service Type</label><select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.serviceType || 'General'} onChange={e => setFormData({...formData, serviceType: e.target.value})}><option value="General">Select Type...</option><option value="Lighting">Lighting</option><option value="Printing">Printing</option><option value="Catering">Catering</option><option value="Logistics">Logistics</option><option value="Other">Other</option></select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total Payable</label><input type="number" className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.amountPayable || ''} onChange={e => setFormData({...formData, amountPayable: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Amount Paid</label><input type="number" className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold text-emerald-600" value={formData.amountPaid || ''} onChange={e => setFormData({...formData, amountPaid: e.target.value})} /></div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label><textarea className="w-full border border-slate-200 p-3 rounded-xl text-sm" rows="3" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea></div>
                    <PaymentSourceSelect />
                    <ProofInput />
                  </>
                )}
                
                {/* Simplified repeats for other forms with same styling classes... (Clients, Expenses, etc.) */}
                {/* Clients Form */}
                {view === 'clients' && (
                  <>
                    <input type="date" required className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                    <input required placeholder="Client Name" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input type="number" placeholder="Retainer Amount" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.retainerAmount || ''} onChange={e => setFormData({...formData, retainerAmount: e.target.value})} />
                    <input placeholder="Project Name" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.projectName || ''} onChange={e => setFormData({...formData, projectName: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Project Total" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.projectTotal || ''} onChange={e => setFormData({...formData, projectTotal: e.target.value})} />
                        <input type="number" placeholder="Advance" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.advanceReceived || ''} onChange={e => setFormData({...formData, advanceReceived: e.target.value})} />
                    </div>
                    <select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white" value={formData.status || 'Ongoing'} onChange={e => setFormData({...formData, status: e.target.value})}><option>Ongoing</option><option>Completed</option><option>On Hold</option></select>
                    <ProofInput />
                  </>
                )}

                {/* Expenses Form */}
                {view === 'expenses' && (
                   <>
                     <input type="date" required className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                     <select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white" value={formData.category || 'General'} onChange={e => setFormData({...formData, category: e.target.value})}><option>General</option><option>Office Rent</option><option>Utilities</option><option>Travel</option><option>Software</option><option>Other</option></select>
                     <input required placeholder="Description" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                     <input type="number" required placeholder="Amount" className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} />
                     <PaymentSourceSelect />
                     <ProofInput />
                   </>
                )}
                
                {/* Petty Cash Form */}
                {view === 'petty-cash' && (
                   <>
                     <input type="date" required className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                     <input required placeholder="Description" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                     <select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white" value={formData.head || 'Office Expenses'} onChange={e => setFormData({...formData, head: e.target.value})}><option>Office Expenses</option><option>Meals</option><option>Travel</option><option>Custom</option></select>
                     {formData.head === 'Custom' && <input placeholder="Enter Head" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.customHead || ''} onChange={e => setFormData({...formData, customHead: e.target.value})} />}
                     <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Cash Out" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.cashOut || ''} onChange={e => setFormData({...formData, cashOut: e.target.value})} />
                        <input type="number" placeholder="Cash In" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.cashIn || ''} onChange={e => setFormData({...formData, cashIn: e.target.value})} />
                     </div>
                     {formData.cashOut && <PaymentSourceSelect />}
                     <ProofInput />
                   </>
                )}

                 {/* Salaries Form */}
                 {view === 'salaries' && (
                   <>
                     <input type="date" required className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.date || new Date().toISOString().split('T')[0]} onChange={e => setFormData({...formData, date: e.target.value})} />
                     <input required placeholder="Employee Name" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.employeeName || ''} onChange={e => setFormData({...formData, employeeName: e.target.value})} />
                     <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Base Salary" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.baseSalary || ''} onChange={e => setFormData({...formData, baseSalary: e.target.value})} />
                        <input type="number" placeholder="Bonus" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.overtimeOrBonus || ''} onChange={e => setFormData({...formData, overtimeOrBonus: e.target.value})} />
                     </div>
                     <input type="number" placeholder="Total Payable" className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.totalPayable || ''} onChange={e => setFormData({...formData, totalPayable: e.target.value})} />
                     <input placeholder="Remarks" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                     <select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white" value={formData.status || 'Unpaid'} onChange={e => setFormData({...formData, status: e.target.value})}><option>Unpaid</option><option>Paid</option></select>
                     {formData.status === 'Paid' && <PaymentSourceSelect />}
                     <ProofInput />
                   </>
                )}

                 {/* Bank Form */}
                 {view === 'bank' && (
                   <>
                     <input type="date" required className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                     <input required placeholder="Bank Name" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.bank || ''} onChange={e => setFormData({...formData, bank: e.target.value})} />
                     <input placeholder="Cheque #" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.cheque || ''} onChange={e => setFormData({...formData, cheque: e.target.value})} />
                     <input type="number" placeholder="Amount" className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} />
                     <input placeholder="Description" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                     <select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white" value={formData.status || 'Pending'} onChange={e => setFormData({...formData, status: e.target.value})}><option>Pending</option><option>Cleared</option></select>
                     {formData.status === 'Cleared' && <input type="date" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.clearingDate || ''} onChange={e => setFormData({...formData, clearingDate: e.target.value})} />}
                     <ProofInput />
                   </>
                )}

                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                  {isSubmitting ? <><RefreshCw className="animate-spin" size={20} /> Saving...</> : <><CheckCircle size={20} /> Save Record</>}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);