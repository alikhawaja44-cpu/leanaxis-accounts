import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Wallet, Receipt, Users, Building2, Briefcase, Truck,
  Plus, Download, Trash2, ArrowUpRight, ArrowDownLeft, Calendar, LogIn, Lock, UserPlus, Edit, Menu, X, CheckCircle, Clock, Upload, Link as LinkIcon, Copy, RefreshCw
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend } from 'recharts';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy, setDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
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

// --- LOCAL STORAGE HOOK (Kept for Auth state only) ---
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200">
        <div className="flex justify-center mb-6">
           <div className="bg-blue-600 p-3 rounded-lg text-white font-bold text-2xl">LA</div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">LeanAxis Accounts</h2>
        <p className="text-center text-slate-500 mb-8">Cloud Agency System ☁️</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Username or Email</label>
            <input 
              type="text" 
              required 
              className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              value={loginInput} 
              onChange={(e) => setLoginInput(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          {error && <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100 flex items-center justify-center gap-2"><Lock size={16} /> {error}</div>}
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md mt-4 flex justify-center gap-2 items-center">
            {loading ? 'Verifying...' : <><LogIn size={20} /> Login</>}
          </button>
        </form>
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---
function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useStickyState(false, 'leanaxis_auth');
  const [currentUser, setCurrentUser] = useStickyState(null, 'leanaxis_current_user');
  
  // Mobile Menu State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState('dashboard');

  // Filter State
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');

  // Forms State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [fileToUpload, setFileToUpload] = useState(null); // File state
  const [isEditingUser, setIsEditingUser] = useState(false); 
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);

  // --- FIREBASE DATA HOOKS ---
  const [pettyCash] = useFirebaseSync('petty_cash');
  const [expenses] = useFirebaseSync('expenses');
  const [salaries] = useFirebaseSync('salaries');
  const [bankRecords] = useFirebaseSync('bank_records');
  const [clients] = useFirebaseSync('clients');
  const [vendors] = useFirebaseSync('vendors');
  const [users, usersLoading] = useFirebaseSync('users');

  // --- SEED ADMIN IF EMPTY ---
  useEffect(() => {
      if (!usersLoading && users.length === 0) {
          const seedAdmin = async () => {
              try {
                  await addDoc(collection(db, 'users'), {
                      username: 'admin',
                      password: 'admin123',
                      email: 'admin@leanaxis.com',
                      role: 'Admin',
                      createdAt: new Date().toISOString()
                  });
              } catch (e) {
                  console.error("Failed to seed admin:", e);
              }
          };
          seedAdmin();
      }
  }, [users, usersLoading]);

  // --- HANDLERS ---
  const handleLogin = (loginInput, password) => {
      if (users.length === 0 && loginInput === 'admin' && password === 'admin123') {
          setIsAuthenticated(true);
          setCurrentUser({ username: 'admin', role: 'Admin' });
          setAuthError(null);
          return;
      }

      const user = users.find(u => (u.username === loginInput || u.email === loginInput) && u.password === password);
      if (user) { 
          setIsAuthenticated(true);
          setCurrentUser(user); 
          setAuthError(null);
      } else {
          setAuthError('Invalid credentials (or syncing, please wait...)');
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setView('dashboard'); 
  };

  const deleteRecord = async (collectionName, id) => {
      try {
          await deleteDoc(doc(db, collectionName, id));
      } catch (e) {
          console.error("Error deleting: ", e);
          alert("Failed to delete record.");
      }
  };

  const handleDelete = (id, type) => {
    if (currentUser.role !== 'Admin') return alert('Access Denied: Only Admins can delete records.');
    if(!confirm('Delete this record? This cannot be undone.')) return;
    
    const map = {
        'petty': 'petty_cash', 'expense': 'expenses', 'salary': 'salaries',
        'bank': 'bank_records', 'client': 'clients', 'vendor': 'vendors', 'user': 'users'
    };
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
      setFormData({ 
          ...dataToCopy, 
          // Auto-set date to today if it's missing or old, ensures dashboard visibility
          date: new Date().toISOString().split('T')[0] 
      });
      setFileToUpload(null); // Clear file
      setIsEditingRecord(false); // Ensure it saves as NEW
      setIsEditingUser(false);
      setShowForm(true);
  };

  const uploadFile = async (file) => {
      if (!file) return null;
      try {
          const storageRef = ref(storage, `proofs/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          return url;
      } catch (e) {
          console.error("Upload failed:", e);
          alert("Failed to upload proof image.");
          return null;
      }
  };

  const saveToFirebase = async (collectionName, data, id = null) => {
      setIsSubmitting(true);
      try {
          let proofUrl = data.proofUrl || null;
          if (fileToUpload) {
              const url = await uploadFile(fileToUpload);
              if (url) proofUrl = url;
          }

          // Ensure date is present
          const finalData = { 
              ...data, 
              date: data.date || new Date().toISOString().split('T')[0], // Fallback date
              proofUrl 
          };

          if (id) {
             await updateDoc(doc(db, collectionName, id), { ...finalData, lastEditedBy: currentUser.username, lastEditedAt: new Date().toISOString() });
             alert("Record updated!");
          } else {
             await addDoc(collection(db, collectionName), { ...finalData, addedBy: currentUser.username, createdAt: new Date().toISOString() });
             alert("Record saved!");
          }
          setShowForm(false);
          setFormData({});
          setFileToUpload(null);
          setIsEditingRecord(false);
          setIsEditingUser(false);
      } catch (e) {
          console.error("Error saving: ", e);
          alert("Failed to save. Check internet connection.");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleAddSubmit = (e) => {
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
        if (targetCollection === 'users' && !isEditingUser) {
            if (users.some(u => u.username === formData.username)) {
                alert("Username already exists!");
                return;
            }
        }

        const docId = (isEditingRecord || isEditingUser) ? formData.id : null;
        const { id, ...dataToSave } = formData; 
        saveToFirebase(targetCollection, dataToSave, docId);
    }
  };

  const handleEditUser = (user) => {
      setFormData({ ...user, originalUsername: user.username });
      setIsEditingUser(true);
      setShowForm(true);
  };

  const handleDeleteUser = (user) => {
      if (user.username === 'admin') { alert("Cannot delete main admin!"); return; }
      if (!confirm("Delete user?")) return;
      deleteRecord('users', user.id);
  };

  // --- FILTERING & CALCULATIONS ---
  const filterByDate = (items, dateKey = 'date') => {
    if (selectedMonth === 'All' && selectedYear === 'All') return items;
    return items.filter(item => {
      // Fallback to createdAt if date is missing
      const dateStr = item[dateKey] || item.createdAt || item.dueDate || item.clearingDate; 
      if (!dateStr) return false;
      const date = new Date(dateStr);
      const monthMatch = selectedMonth === 'All' || date.toLocaleString('default', { month: 'long' }) === selectedMonth;
      const yearMatch = selectedYear === 'All' || date.getFullYear().toString() === selectedYear;
      return monthMatch && yearMatch;
    });
  };

  const filteredPettyCash = useMemo(() => filterByDate(pettyCash), [pettyCash, selectedMonth, selectedYear]);
  const filteredExpenses = useMemo(() => filterByDate(expenses), [expenses, selectedMonth, selectedYear]);
  const filteredSalaries = useMemo(() => filterByDate(salaries), [salaries, selectedMonth, selectedYear]);
  const filteredBankRecords = useMemo(() => filterByDate(bankRecords), [bankRecords, selectedMonth, selectedYear]);
  const filteredClients = useMemo(() => filterByDate(clients), [clients, selectedMonth, selectedYear]); 
  const filteredVendors = useMemo(() => filterByDate(vendors), [vendors]);

  const totals = useMemo(() => {
    const totalPettyCashOut = filteredPettyCash.reduce((acc, curr) => acc + (Number(curr.cashOut) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalSalaries = filteredSalaries.reduce((acc, curr) => acc + (Number(curr.totalPayable) || 0), 0);
    const totalVendorPending = vendors.reduce((acc, curr) => acc + (Number(curr.amountPayable) || 0) - (Number(curr.amountPaid) || 0), 0);
    const totalClientPending = clients.reduce((acc, curr) => acc + (Number(curr.projectTotal) || 0) - (Number(curr.advanceReceived) || 0), 0);
    
    return {
      expense: totalPettyCashOut + totalExpenses + totalSalaries,
      pettyBalance: pettyCash.reduce((acc, curr) => acc + (Number(curr.cashIn) || 0) - (Number(curr.cashOut) || 0), 0),
      vendorPending: totalVendorPending,
      clientPending: totalClientPending
    };
  }, [filteredPettyCash, filteredExpenses, filteredSalaries, vendors, clients, pettyCash]); 

  // --- PIE CHART DATA ---
  const expenseChartData = useMemo(() => {
      const data = [
          { name: 'Petty Cash', value: filteredPettyCash.reduce((acc, curr) => acc + (Number(curr.cashOut) || 0), 0) },
          { name: 'Expenses', value: filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) },
          { name: 'Salaries', value: filteredSalaries.reduce((acc, curr) => acc + (Number(curr.totalPayable) || 0), 0) }
      ];
      return data.filter(d => d.value > 0);
  }, [filteredPettyCash, filteredExpenses, filteredSalaries]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  // --- RENDER HELPERS ---
  const NavButton = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => { setView(id); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  const ActionButtons = ({ item, type }) => (
      <div className="flex gap-1 justify-center items-center">
          {item.proofUrl && (
              <a href={item.proofUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded-full mr-1" title="View Proof">
                  <LinkIcon size={16} />
              </a>
          )}
          
          {/* Duplicate Button - Accessible to all roles if they can create */}
          <button onClick={() => handleDuplicate(item)} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors" title="Duplicate Entry">
              <Copy size={16} />
          </button>

          {currentUser.role === 'Admin' && (
             <>
                <button onClick={() => type === 'user' ? handleEditUser(item) : handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Edit">
                    <Edit size={16} />
                </button>
                <button onClick={() => type === 'user' ? handleDeleteUser(item) : handleDelete(item.id, type)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Delete">
                    <Trash2 size={16} />
                </button>
             </>
          )}
      </div>
  );

  // Reusable File Input Component
  const ProofInput = () => (
      <div className="border-t pt-4 mt-2">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Attach Proof (Receipt/Bill)</label>
          <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg transition">
                  <Upload size={18} />
                  <span className="text-sm font-medium">{fileToUpload ? fileToUpload.name : "Choose File"}</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFileToUpload(e.target.files[0])} />
              </label>
              {fileToUpload && <button type="button" onClick={() => setFileToUpload(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16}/></button>}
          </div>
          {formData.proofUrl && !fileToUpload && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle size={12}/> Existing proof attached</p>}
      </div>
  );

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} error={authError} />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-slate-200 p-4 z-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded text-white font-bold text-sm">LA</div>
            <span className="font-bold text-slate-800">LeanAxis</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-600">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} pt-16 md:pt-0`}>
        <div className="p-6 border-b border-slate-100 hidden md:block">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white font-bold">LA</div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">LeanAxis</h1>
              <p className="text-xs text-slate-500">Agency Manager</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavButton id="clients" icon={Briefcase} label="Clients & Projects" />
          <NavButton id="petty-cash" icon={Wallet} label="Petty Cash" />
          <NavButton id="expenses" icon={Receipt} label="Expense Sheet" />
          <NavButton id="salaries" icon={Users} label="Salary & Payments" />
          <NavButton id="vendors" icon={Truck} label="Vendor Management" />
          <NavButton id="bank" icon={Building2} label="Bank & Cheques" />
          
          {currentUser.role === 'Admin' && (
             <div className="mt-8 pt-4 border-t border-slate-100">
                <NavButton id="manage-users" icon={UserPlus} label="Manage Users" />
             </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <div className="mb-4 px-2 text-xs text-slate-500 text-center">Logged in as: <span className="font-bold text-slate-700">{currentUser.username}</span></div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm">
             <Lock size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* OVERLAY */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 w-full">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 capitalize">
              {view.replace('-', ' ')}
            </h2>
            <p className="text-sm text-slate-500">Overview of your agency finances</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {view !== 'manage-users' && view !== 'vendors' && (
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-sm w-full md:w-auto">
                    <Calendar size={18} className="text-slate-400" />
                    <select className="bg-transparent outline-none text-sm text-slate-700 w-full" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                        <option value="All">All Months</option>
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="bg-transparent outline-none text-sm text-slate-700 border-l pl-2 ml-1" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                        <option value="All">All Years</option>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                </div>
            )}

            {view !== 'dashboard' && (
                <div className="flex gap-2 w-full md:w-auto">
                  {view !== 'manage-users' && (
                      <button onClick={() => {
                        if (view === 'clients') exportToCSV(filteredClients, 'clients.csv'); // Export filtered clients
                        else if (view === 'vendors') exportToCSV(vendors, 'vendors.csv');
                        else if (view === 'petty-cash') exportToCSV(filteredPettyCash, 'petty_cash.csv');
                        else if (view === 'expenses') exportToCSV(filteredExpenses, 'expenses.csv');
                        else if (view === 'salaries') exportToCSV(filteredSalaries, 'salaries.csv');
                        else if (view === 'bank') exportToCSV(filteredBankRecords, 'bank_records.csv');
                      }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition-colors text-slate-700 bg-white shadow-sm text-sm">
                        <Download size={18} /> Export
                      </button>
                  )}
                  <button onClick={() => { setShowForm(true); setIsEditingUser(false); setIsEditingRecord(false); setFormData({}); setFileToUpload(null); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm">
                    <Plus size={18} /> {view === 'manage-users' ? 'Add User' : 'Add New'}
                  </button>
                </div>
            )}
          </div>
        </header>

        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-red-50 rounded-lg text-red-600"><ArrowUpRight size={24} /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Expenses</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totals.expense)}</h3>
                <p className="text-xs text-slate-500 mt-2">Filtered period outflow</p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Wallet size={24} /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Petty Cash</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totals.pettyBalance)}</h3>
                <p className="text-xs text-slate-500 mt-2">Current liquid cash</p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-green-50 rounded-lg text-green-600"><Briefcase size={24} /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Client Receivables</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totals.clientPending)}</h3>
                <p className="text-xs text-slate-500 mt-2">Remaining project balances</p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-orange-50 rounded-lg text-orange-600"><Truck size={24} /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Vendor Payables</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totals.vendorPending)}</h3>
                <p className="text-xs text-slate-500 mt-2">Outstanding vendor bills</p>
              </div>
            </div>

            {/* EXPENSE CHART */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Expense Distribution</h3>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
                        title="Force refresh data"
                    >
                        <RefreshCw size={14} /> Refresh Data
                    </button>
                </div>
                <div className="h-64">
                    {expenseChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={expenseChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                    {expenseChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <ChartTooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <div className="text-center">
                                <p className="mb-2">No expense data found for this period.</p>
                                <p className="text-xs">Try changing the Month/Year filter or add expenses.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {/* TABLES */}
        {view !== 'dashboard' && view !== 'manage-users' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-sm border-b border-slate-200">
                  <tr>
                    {view === 'clients' && <><th className="p-4">Date</th><th className="p-4">Client Name</th><th className="p-4">Retainer (Monthly)</th><th className="p-4">Project Name</th><th className="p-4 text-right">Project Total</th><th className="p-4 text-right">Advance Received</th><th className="p-4 text-right">Balance</th><th className="p-4">Status</th></>}
                    {view === 'petty-cash' && <><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4">Head</th><th className="p-4 text-right">Cash Out</th><th className="p-4 text-right">Cash In</th></>}
                    {view === 'expenses' && <><th className="p-4">Date</th><th className="p-4">Category</th><th className="p-4">Description</th><th className="p-4">Employee</th><th className="p-4 text-right">Amount</th></>}
                    {view === 'salaries' && <><th className="p-4">Date</th><th className="p-4">Employee</th><th className="p-4">Type</th><th className="p-4">Base Salary</th><th className="p-4 text-right">Overtime/Bonus</th><th className="p-4 text-right">Total Payable</th><th className="p-4">Status</th></>}
                    {view === 'vendors' && <><th className="p-4">Vendor Name</th><th className="p-4">Service Type</th><th className="p-4 text-right">Total Payable</th><th className="p-4 text-right">Paid</th><th className="p-4 text-right">Balance</th></>}
                    {view === 'bank' && <><th className="p-4">Date</th><th className="p-4">Bank</th><th className="p-4">Cheque #</th><th className="p-4">Description</th><th className="p-4 text-right">Amount</th><th className="p-4">Clearing Date</th><th className="p-4">Status</th></>}
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  
                  {view === 'clients' && filteredClients.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 text-sm text-slate-500">{item.date}</td>
                      <td className="p-4 font-medium text-sm">{item.name}</td>
                      <td className="p-4 text-sm text-green-600 font-bold">{formatCurrency(item.retainerAmount)}</td>
                      <td className="p-4 text-sm">{item.projectName || '-'}</td>
                      <td className="p-4 text-right text-sm">{formatCurrency(item.projectTotal)}</td>
                      <td className="p-4 text-right text-sm text-green-600">{formatCurrency(item.advanceReceived)}</td>
                      <td className="p-4 text-right text-sm font-bold text-red-600">{formatCurrency(Number(item.projectTotal) - Number(item.advanceReceived))}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${item.status === 'Completed' ? 'bg-green-100 text-green-700' : item.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{item.status || 'Ongoing'}</span></td>
                      <td className="p-4"><ActionButtons item={item} type="client" /></td>
                    </tr>
                  ))}

                  {view === 'petty-cash' && filteredPettyCash.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 whitespace-nowrap text-sm">{item.date}</td>
                      <td className="p-4 font-medium text-sm">{item.description}</td>
                      <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs whitespace-nowrap">{item.head === 'Custom' ? item.customHead : item.head}</span></td>
                      <td className="p-4 text-right text-red-600 text-sm font-bold">{item.cashOut ? formatCurrency(item.cashOut) : '-'}</td>
                      <td className="p-4 text-right text-green-600 text-sm font-bold">{item.cashIn ? formatCurrency(item.cashIn) : '-'}</td>
                      <td className="p-4"><ActionButtons item={item} type="petty" /></td>
                    </tr>
                  ))}
                  
                  {view === 'expenses' && filteredExpenses.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 text-sm whitespace-nowrap">{item.date}</td>
                      <td className="p-4"><span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-bold">{item.category}</span></td>
                      <td className="p-4 text-sm text-slate-600">{item.description}</td>
                      <td className="p-4 text-sm text-slate-500">{item.employeeName || '-'}</td>
                      <td className="p-4 text-right font-bold text-sm">{formatCurrency(item.amount)}</td>
                      <td className="p-4"><ActionButtons item={item} type="expense" /></td>
                    </tr>
                  ))}

                  {view === 'salaries' && filteredSalaries.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 text-sm text-slate-500">{item.date || '-'}</td>
                      <td className="p-4 font-medium text-sm">{item.employeeName}</td>
                      <td className="p-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                            item.type === 'Monthly Salary' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                            {item.type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500">{formatCurrency(item.baseSalary)}</td>
                      <td className="p-4 text-right text-sm text-green-600">+{formatCurrency(item.overtimeOrBonus)}</td>
                      <td className="p-4 text-right font-bold text-sm">{formatCurrency(item.totalPayable)}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${item.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{item.status}</span></td>
                      <td className="p-4"><ActionButtons item={item} type="salary" /></td>
                    </tr>
                  ))}

                  {view === 'vendors' && filteredVendors.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-sm">{item.name}</td>
                      <td className="p-4 text-sm text-slate-500">{item.serviceType}</td>
                      <td className="p-4 text-right text-sm font-bold">{formatCurrency(item.amountPayable)}</td>
                      <td className="p-4 text-right text-sm text-green-600">{formatCurrency(item.amountPaid)}</td>
                      <td className="p-4 text-right text-sm font-bold text-red-600">{formatCurrency(Number(item.amountPayable) - Number(item.amountPaid))}</td>
                      <td className="p-4"><ActionButtons item={item} type="vendor" /></td>
                    </tr>
                  ))}

                  {view === 'bank' && filteredBankRecords.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 whitespace-nowrap text-sm">{item.date}</td>
                      <td className="p-4 text-blue-600 font-medium text-sm">{item.bank}</td>
                      <td className="p-4 font-mono text-xs whitespace-nowrap">{item.cheque}</td>
                      <td className="p-4 text-slate-600 text-sm">{item.description}</td>
                      <td className="p-4 text-right font-bold text-sm">{formatCurrency(item.amount)}</td>
                      <td className="p-4 text-xs text-slate-500">{item.clearingDate}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${item.status === 'Cleared' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span></td>
                      <td className="p-4"><ActionButtons item={item} type="bank" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USER MANAGEMENT VIEW */}
        {view === 'manage-users' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-sm border-b border-slate-200">
                            <tr>
                                <th className="p-4">Username</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Password</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium">{u.username}</td>
                                    <td className="p-4 text-sm">{u.email}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                                    <td className="p-4 font-mono text-slate-400 text-sm">••••••</td>
                                    <td className="p-4"><ActionButtons item={u} type="user" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* MODAL FORM */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold">{view === 'manage-users' ? (isEditingUser ? 'Edit User' : 'Add New User') : (isEditingRecord ? 'Edit Record' : 'Add New Record')}</h3>
                 <button onClick={() => { setShowForm(false); setFileToUpload(null); }} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              
              <form onSubmit={handleAddSubmit} className="space-y-4">
                
                {view === 'clients' && (
                  <>
                    <input required type="date" className="w-full border p-3 rounded-lg" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                    <input required placeholder="Client Name" className="w-full border p-3 rounded-lg" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input type="number" placeholder="Monthly Retainer (PKR)" className="w-full border p-3 rounded-lg" value={formData.retainerAmount || ''} onChange={e => setFormData({...formData, retainerAmount: e.target.value})} />
                    <div className="pt-2 border-t mt-2"><p className="text-xs font-bold text-slate-500 uppercase mb-2">Project Details (Optional)</p></div>
                    <input placeholder="Project Name" className="w-full border p-3 rounded-lg" value={formData.projectName || ''} onChange={e => setFormData({...formData, projectName: e.target.value})} />
                    <input type="number" placeholder="Total Project Amount" className="w-full border p-3 rounded-lg" value={formData.projectTotal || ''} onChange={e => setFormData({...formData, projectTotal: e.target.value})} />
                    <input type="number" placeholder="Advance Received" className="w-full border p-3 rounded-lg" value={formData.advanceReceived || ''} onChange={e => setFormData({...formData, advanceReceived: e.target.value})} />
                    <select className="w-full border p-3 rounded-lg bg-white" value={formData.status || 'Ongoing'} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Ongoing">Ongoing</option><option value="Completed">Completed</option><option value="On Hold">On Hold</option>
                    </select>
                    <ProofInput />
                  </>
                )}

                {view === 'vendors' && (
                  <>
                    <input required placeholder="Vendor Name" className="w-full border p-3 rounded-lg" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <select className="w-full border p-3 rounded-lg bg-white" value={formData.serviceType || 'General'} onChange={e => setFormData({...formData, serviceType: e.target.value})}>
                        <option value="General">Select Type...</option>
                        <option value="Lighting">Lighting</option>
                        <option value="Printing">Printing</option>
                        <option value="Catering">Catering</option>
                        <option value="Logistics">Logistics</option>
                        <option value="Other">Other</option>
                    </select>
                    <input type="number" placeholder="Total Amount Payable" className="w-full border p-3 rounded-lg" value={formData.amountPayable || ''} onChange={e => setFormData({...formData, amountPayable: e.target.value})} />
                    <input type="number" placeholder="Amount Paid" className="w-full border p-3 rounded-lg" value={formData.amountPaid || ''} onChange={e => setFormData({...formData, amountPaid: e.target.value})} />
                    <ProofInput />
                  </>
                )}

                {view === 'salaries' && (
                  <>
                    {/* NEW DATE FIELD FOR SALARY */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Payment/Entry Date</label>
                        <input required type="date" className="w-full border p-3 rounded-lg" value={formData.date || new Date().toISOString().split('T')[0]} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    
                    <input required placeholder="Employee Name" className="w-full border p-3 rounded-lg" value={formData.employeeName || ''} onChange={e => setFormData({...formData, employeeName: e.target.value})} />
                    <select className="w-full border p-3 rounded-lg bg-white" value={formData.type || 'Monthly Salary'} onChange={e => setFormData({...formData, type: e.target.value})}>
                        <option value="Monthly Salary">Monthly Salary</option>
                        <option value="Project-Based">Project-Based</option>
                    </select>
                    <input type="number" placeholder="Base Salary / Project Fee" className="w-full border p-3 rounded-lg" value={formData.baseSalary || ''} onChange={e => setFormData({...formData, baseSalary: e.target.value})} />
                    <input type="number" placeholder="Overtime / Bonus" className="w-full border p-3 rounded-lg" value={formData.overtimeOrBonus || ''} onChange={e => setFormData({...formData, overtimeOrBonus: e.target.value})} />
                    <input type="number" placeholder="Total Payable" className="w-full border p-3 rounded-lg font-bold bg-slate-50" value={formData.totalPayable || ''} onChange={e => setFormData({...formData, totalPayable: e.target.value})} />
                    <select className="w-full border p-3 rounded-lg bg-white" value={formData.status || 'Unpaid'} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Unpaid">Unpaid</option><option value="Paid">Paid</option>
                    </select>
                    <ProofInput />
                  </>
                )}

                {view === 'expenses' && (
                  <>
                    <input required type="date" className="w-full border p-3 rounded-lg" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                    <select className="w-full border p-3 rounded-lg bg-white" value={formData.category || 'General'} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option value="General">Select Category...</option>
                        <option value="Office Rent">Office Rent</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Software">Software</option>
                        <option value="Travel">Travel</option>
                        <option value="Other">Other</option>
                    </select>
                    <input required placeholder="Description" className="w-full border p-3 rounded-lg" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                    <input placeholder="Employee Name (Optional)" className="w-full border p-3 rounded-lg" value={formData.employeeName || ''} onChange={e => setFormData({...formData, employeeName: e.target.value})} />
                    <input required type="number" placeholder="Amount" className="w-full border p-3 rounded-lg" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} />
                    <ProofInput />
                  </>
                )}

                {view === 'petty-cash' && (
                  <>
                    <input required type="date" className="w-full border p-3 rounded-lg" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                    <input required placeholder="Description" className="w-full border p-3 rounded-lg" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                    <select className="w-full border p-3 rounded-lg bg-white" value={formData.head || 'Office Expenses'} onChange={e => setFormData({...formData, head: e.target.value})}>
                      <option>Office Expenses</option><option>Meals & Entertainment</option><option>Traveling</option><option>Cheque Received</option><option>Custom</option>
                    </select>
                    {formData.head === 'Custom' && (
                        <input required placeholder="Enter custom head" className="w-full border p-3 rounded-lg mt-2" value={formData.customHead || ''} onChange={e => setFormData({...formData, customHead: e.target.value})} />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="Cash Out" className="w-full border p-3 rounded-lg" value={formData.cashOut || ''} onChange={e => setFormData({...formData, cashOut: e.target.value})} />
                      <input type="number" placeholder="Cash In" className="w-full border p-3 rounded-lg" value={formData.cashIn || ''} onChange={e => setFormData({...formData, cashIn: e.target.value})} />
                    </div>
                    <ProofInput />
                  </>
                )}

                {view === 'bank' && (
                  <>
                    <input required type="date" className="w-full border p-3 rounded-lg" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                    <input required placeholder="Bank Name" className="w-full border p-3 rounded-lg" value={formData.bank || ''} onChange={e => setFormData({...formData, bank: e.target.value})} />
                    <input required placeholder="Cheque #" className="w-full border p-3 rounded-lg" value={formData.cheque || ''} onChange={e => setFormData({...formData, cheque: e.target.value})} />
                    <input required placeholder="Description" className="w-full border p-3 rounded-lg" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                    <input required type="number" placeholder="Amount" className="w-full border p-3 rounded-lg" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} />
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Expected Clearing Date</label>
                        <input type="date" className="w-full border p-3 rounded-lg" value={formData.clearingDate || ''} onChange={e => setFormData({...formData, clearingDate: e.target.value})} />
                    </div>
                    <select className="w-full border p-3 rounded-lg bg-white" value={formData.status || 'Pending'} onChange={e => setFormData({...formData, status: e.target.value})}>

[Showing lines 1-859 of 916 (50.0KB limit). Use offset=860 to continue.]