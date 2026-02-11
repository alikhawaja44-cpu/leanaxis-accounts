 **STOP** - Your data has a corrupted entry causing a crash. Use this **emergency fix** that catches errors and prevents white screens:

```javascript
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Wallet, Receipt, Users, Building2, Briefcase, Truck,
  Plus, Download, Trash2, ArrowUpRight, Calendar, LogIn, Lock, UserPlus, Edit, Menu, X, CheckCircle, Upload, Link as LinkIcon, Copy, RefreshCw, AlertTriangle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend } from 'recharts';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAOFOgjdbdoUYBTldXOEEG636q1EM8EBfc",
    authDomain: "leanaxis-accounts.firebaseapp.com",
    projectId: "leanaxis-accounts",
    storageBucket: "leanaxis-accounts.firebasestorage.app",
    messagingSenderId: "855221056961",
    appId: "1:855221056961:web:b4129012fa0f56f58a6b40"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const formatCurrency = (amount) => {
  const num = Number(amount);
  if (amount === undefined || amount === null || isNaN(num)) return 'Rs0';
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(num);
};

const exportToCSV = (data, filename) => {
  if (!data || !data.length) { window.alert("No data"); return; }
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + '\n' + rows;
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function useFirebaseSync(collectionName) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                const items = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Ensure ID is string and data exists
                    return { id: String(doc.id), ...data };
                }).filter(item => item != null); // Remove nulls
                setData(items);
                setLoading(false);
                setError(null);
            } catch (e) {
                console.error("Data processing error:", e);
                setError(e.message);
                setLoading(false);
            }
        }, (error) => {
            console.error("Firebase error:", error);
            setError(error.message);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [collectionName]);

    return [data, loading, error];
}

function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (e) { return defaultValue; }
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

// Safe date parser
const safeDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    // Handle Firebase timestamps or strings
    if (typeof dateStr === 'object' && dateStr.toDate) {
      return dateStr.toDate();
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) { return null; }
};

const LoginView = ({ onLogin, loading, error }) => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border">
        <div className="flex justify-center mb-6"><div className="bg-blue-600 p-3 rounded-lg text-white font-bold text-2xl">LA</div></div>
        <h2 className="text-2xl font-bold text-center mb-2">LeanAxis Accounts</h2>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(loginInput, password); }} className="space-y-4">
          <input type="text" required placeholder="Username/Email" className="w-full border p-3 rounded-lg" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} />
          <input type="password" required placeholder="Password" className="w-full border p-3 rounded-lg" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold disabled:bg-blue-400">{loading ? 'Loading...' : 'Login'}</button>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useStickyState(false, 'leanaxis_auth');
  const [currentUser, setCurrentUser] = useStickyState(null, 'leanaxis_current_user');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isEditingUser, setIsEditingUser] = useState(false); 
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const seededRef = useRef(false);

  const [pettyCash, pettyLoading, pettyErr] = useFirebaseSync('petty_cash');
  const [expenses, expLoading, expErr] = useFirebaseSync('expenses');
  const [salaries, salLoading, salErr] = useFirebaseSync('salaries');
  const [bankRecords, bankLoading, bankErr] = useFirebaseSync('bank_records');
  const [clients, cliLoading, cliErr] = useFirebaseSync('clients');
  const [vendors, venLoading, venErr] = useFirebaseSync('vendors');
  const [users, usersLoading] = useFirebaseSync('users');

  // Error display for data loading
  const dataError = pettyErr || expErr || salErr || bankErr || cliErr || venErr;

  // Safe data processing with error handling
  const safeData = useMemo(() => {
    try {
      return {
        pettyCash: pettyCash || [],
        expenses: expenses || [],
        salaries: salaries || [],
        bank: bankRecords || [],
        clients: clients || [],
        vendors: vendors || [],
        users: users || []
      };
    } catch (e) {
      setRenderError("Data processing error: " + e.message);
      return { pettyCash: [], expenses: [], salaries: [], bank: [], clients: [], vendors: [], users: [] };
    }
  }, [pettyCash, expenses, salaries, bankRecords, clients, vendors, users]);

  useEffect(() => {
    if (!usersLoading && users.length === 0 && !seededRef.current) {
      seededRef.current = true;
      addDoc(collection(db, 'users'), {
        username: 'admin', password: 'admin123', email: 'admin@leanaxis.com', 
        role: 'Admin', createdAt: new Date().toISOString()
      }).catch(console.error);
    }
  }, [users, usersLoading]);

  const handleLogin = (loginInput, password) => {
    if (usersLoading) { setAuthError('Loading...'); return; }
    if (users.length === 0 && loginInput === 'admin' && password === 'admin123') {
      setIsAuthenticated(true); setCurrentUser({ username: 'admin', role: 'Admin' }); setAuthError(null); return;
    }
    const user = users.find(u => (u.username === loginInput || u.email === loginInput) && u.password === password);
    if (user) { setIsAuthenticated(true); setCurrentUser(user); setAuthError(null); }
    else { setAuthError('Invalid credentials'); }
  };

  const handleLogout = () => { setIsAuthenticated(false); setCurrentUser(null); setView('dashboard'); };

  const deleteRecord = async (collectionName, id) => {
    if (!window.confirm('Delete?')) return;
    try { await deleteDoc(doc(db, collectionName, id)); } 
    catch (e) { window.alert("Error: " + e.message); }
  };

  const handleDelete = (id, type) => {
    if (currentUser?.role !== 'Admin') return window.alert('Admins only');
    const map = { 'petty': 'petty_cash', 'expense': 'expenses', 'salary': 'salaries', 'bank': 'bank_records', 'client': 'clients', 'vendor': 'vendors', 'user': 'users' };
    if (map[type]) deleteRecord(map[type], id);
  };

  const handleEdit = (item) => {
    if (currentUser?.role !== 'Admin') return window.alert('Admins only');
    setFormData({ ...item });
    setIsEditingRecord(true);
    setIsEditingUser(false);
    setShowForm(true);
  };

  const handleEditUser = (user) => {
    setFormData({ ...user });
    setIsEditingUser(true);
    setIsEditingRecord(false);
    setShowForm(true);
  };

  const handleDuplicate = (item) => {
    if (!item) return;
    const { id, createdAt, lastEditedAt, lastEditedBy, proofUrl, ...rest } = item;
    setFormData({ ...rest, date: new Date().toISOString().split('T')[0] });
    setFileToUpload(null);
    setIsEditingRecord(false);
    setIsEditingUser(false);
    setShowForm(true);
  };

  const uploadFile = async (file) => {
    if (!file) return null;
    try {
      const storageRef = ref(storage, `proofs/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (e) { window.alert("Upload failed: " + e.message); return null; }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    let collectionName = {
      'manage-users': 'users', 'petty-cash': 'petty_cash', 'expenses': 'expenses',
      'salaries': 'salaries', 'bank': 'bank_records', 'clients': 'clients', 'vendors': 'vendors'
    }[view];

    if (!collectionName) { setIsSubmitting(false); return; }

    try {
      // Validation
      if (collectionName === 'users') {
        const duplicate = users.find(u => u.username === formData.username && u.id !== formData.id);
        if (duplicate) { window.alert('Username taken'); setIsSubmitting(false); return; }
        if (!isEditingUser && !formData.password) { window.alert('Password required'); setIsSubmitting(false); return; }
      }

      let data = { 
        ...formData, 
        date: formData.date || new Date().toISOString().split('T')[0],
        amount: Number(formData.amount) || 0,
        cashIn: Number(formData.cashIn) || 0,
        cashOut: Number(formData.cashOut) || 0
      };
      
      if (fileToUpload) {
        const url = await uploadFile(fileToUpload);
        if (url) data.proofUrl = url;
      }

      if (collectionName === 'users' && isEditingUser && !data.password) {
        delete data.password;
      }

      // Clean undefined values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) delete data[key];
      });

      if (isEditingRecord || isEditingUser) {
        await updateDoc(doc(db, collectionName, formData.id), {
          ...data, lastEditedBy: currentUser.username, lastEditedAt: new Date().toISOString()
        });
        window.alert("Updated!");
      } else {
        await addDoc(collection(db, collectionName), {
          ...data, addedBy: currentUser.username, createdAt: new Date().toISOString()
        });
        window.alert("Saved!");
      }
      
      setShowForm(false);
      setFormData({});
      setFileToUpload(null);
      setIsEditingRecord(false);
      setIsEditingUser(false);
    } catch (e) {
      console.error(e);
      window.alert("Save error: " + e.message);
    }
    setIsSubmitting(false);
  };

  // Safe filtering with error handling
  const filterByDate = (items) => {
    if (!Array.isArray(items)) return [];
    if (selectedMonth === 'All' && selectedYear === 'All') return items;
    return items.filter(item => {
      if (!item) return false;
      try {
        const d = safeDate(item.date || item.createdAt);
        if (!d) return false;
        const m = d.toLocaleString('default', { month: 'long' });
        const y = d.getFullYear().toString();
        return (selectedMonth === 'All' || m === selectedMonth) && (selectedYear === 'All' || y === selectedYear);
      } catch (e) { return false; }
    });
  };

  const filtered = useMemo(() => {
    try {
      return {
        pettyCash: filterByDate(safeData.pettyCash),
        expenses: filterByDate(safeData.expenses),
        salaries: filterByDate(safeData.salaries),
        bank: filterByDate(safeData.bank),
        clients: filterByDate(safeData.clients),
        vendors: safeData.vendors || []
      };
    } catch (e) {
      setRenderError("Filter error: " + e.message);
      return { pettyCash: [], expenses: [], salaries: [], bank: [], clients: [], vendors: [] };
    }
  }, [safeData, selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    try {
      const expense = filtered.pettyCash.reduce((a,c)=>a+(Number(c.cashOut)||0),0) + 
                     filtered.expenses.reduce((a,c)=>a+(Number(c.amount)||0),0) + 
                     filtered.salaries.reduce((a,c)=>a+(Number(c.totalPayable)||0),0);
      const pettyBalance = safeData.pettyCash.reduce((a,c)=>a+(Number(c.cashIn)||0)-(Number(c.cashOut)||0),0);
      const vendorPending = safeData.vendors.reduce((a,c)=>a+(Number(c.amountPayable)||0)-(Number(c.amountPaid)||0),0);
      const clientPending = safeData.clients.reduce((a,c)=>a+(Number(c.projectTotal)||0)-(Number(c.advanceReceived)||0),0);
      return { expense, pettyBalance, vendorPending, clientPending };
    } catch (e) {
      setRenderError("Calculation error: " + e.message);
      return { expense: 0, pettyBalance: 0, vendorPending: 0, clientPending: 0 };
    }
  }, [filtered, safeData]);

  const chartData = useMemo(() => {
    try {
      return [
        { name: 'Petty', value: filtered.pettyCash.reduce((a,c)=>a+(Number(c.cashOut)||0),0) },
        { name: 'Expenses', value: filtered.expenses.reduce((a,c)=>a+(Number(c.amount)||0),0) },
        { name: 'Salaries', value: filtered.salaries.reduce((a,c)=>a+(Number(c.totalPayable)||0),0) }
      ].filter(d=>d.value>0);
    } catch (e) { return []; }
  }, [filtered]);

  const ActionButtons = ({ item, type }) => {
    if (!item) return null;
    return (
      <div className="flex gap-1 justify-center items-center">
        {item.proofUrl && (
          <a href={item.proofUrl} target="_blank" rel="noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded-full" title="View Proof"><LinkIcon size={16}/></a>
        )}
        <button onClick={() => handleDuplicate(item)} className="p-2 text-green-600 hover:bg-green-50 rounded-full" title="Duplicate"><Copy size={16}/></button>
        {currentUser?.role === 'Admin' && (
          <>
            <button onClick={() => type === 'user' ? handleEditUser(item) : handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Edit size={16}/></button>
            <button onClick={() => handleDelete(item.id, type)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
          </>
        )}
      </div>
    );
  };

  if (renderError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <AlertTriangle size={48} className="text-red-600 mx-auto mb-4"/>
          <h2 className="text-xl font-bold text-red-800 mb-2">App Crashed</h2>
          <p className="text-red-600 mb-4">{renderError}</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Reload App</button>
          <button onClick={() => { window.localStorage.clear(); window.location.reload(); }} className="ml-2 border px-4 py-2 rounded-lg">Clear Storage</button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} loading={usersLoading} error={authError} />;

  if (dataError) {
    return <div className="p-8 text-center text-red-600">Database Error: {dataError}. Check console.</div>;
  }

  try {
    return (
      <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 w-full bg-white border-b p-4 z-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded text-white font-bold text-sm">LA</div>
            <span className="font-bold">LeanAxis</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-600">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r flex flex-col z-40 transform transition-transform md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} pt-16 md:pt-0`}>
          <div className="p-6 border-b hidden md:block">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white font-bold">LA</div>
              <div><h1 className="font-bold text-lg">LeanAxis</h1><p className="text-xs text-slate-500">Agency Manager</p></div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {['dashboard','clients','petty-cash','expenses','salaries','vendors','bank'].map((id) => {
              const icons = {dashboard: LayoutDashboard, clients: Briefcase, 'petty-cash': Wallet, expenses: Receipt, salaries: Users, vendors: Truck, bank: Building2};
              const Icon = icons[id];
              return (
                <button key={id} onClick={() => { setView(id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${view===id?'bg-blue-600 text-white':'text-slate-600 hover:bg-slate-100'}`}>
                  <Icon size={20}/><span className="font-medium capitalize">{id.replace('-',' ')}</span>
                </button>
              );
            })}
            {currentUser?.role==='Admin' && (
              <div className="mt-6 pt-4 border-t">
                <button onClick={()=>{setView('manage-users');setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${view==='manage-users'?'bg-blue-600 text-white':'text-slate-600 hover:bg-slate-100'}`}>
                  <UserPlus size={20}/><span>Manage Users</span>
                </button>
              </div>
            )}
          </nav>
          <div className="p-4 border-t">
            <div className="mb-2 text-xs text-slate-500 text-center">Logged in: <b>{currentUser?.username}</b></div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm"><Lock size={16}/> Logout</button>
          </div>
        </aside>

        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={()=>setIsSidebarOpen(false)}></div>}

        <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 w-full">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div><h2 className="text-xl md:text-2xl font-bold capitalize">{view.replace('-',' ')}</h2></div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {view!=='manage-users' && view!=='vendors' && (
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
                  <Calendar size={18} className="text-slate-400"/>
                  <select className="bg-transparent outline-none text-sm" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>
                    <option value="All">All Months</option>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m=><option key={m}>{m}</option>)}
                  </select>
                  <select className="bg-transparent outline-none text-sm border-l pl-2" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}>
                    <option value="All">All Years</option><option>2024</option><option>2025</option><option>2026</option>
                  </select>
                </div>
              )}
              {view!=='dashboard' && (
                <div className="flex gap-2">
                  {view!=='manage-users' && (
                    <button onClick={()=>{
                      const map = {'clients': filtered.clients, 'vendors': safeData.vendors, 'petty-cash': filtered.pettyCash, 'expenses': filtered.expenses, 'salaries': filtered.salaries, 'bank': filtered.bank};
                      exportToCSV(map[view], `${view}.csv`);
                    }} className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white text-slate-700 hover:bg-slate-50 text-sm"><Download size={18}/> Export</button>
                  )}
                  <button onClick={()=>{setShowForm(true);setIsEditingUser(false);setIsEditingRecord(false);setFormData({});setFileToUpload(null);}} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"><Plus size={18}/> Add</button>
                </div>
              )}
            </div>
          </header>

          {view==='dashboard' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[ [totals.expense, 'Total Expenses', 'bg-red-50 text-red-600', ArrowUpRight], [totals.pettyBalance, 'Petty Cash', 'bg-blue-50 text-blue-600', Wallet], [totals.clientPending, 'Client Receivables', 'bg-green-50 text-green-600', Briefcase], [totals.vendorPending, 'Vendor Payables', 'bg-orange-50 text-orange-600', Truck] ].map(([val,label,cls,Icon],i)=>(
                  <div key={i} className="bg-white p-5 rounded-xl shadow-sm border">
                    <div className="flex justify-between mb-4"><div className={`p-3 rounded-lg ${cls}`}><Icon size={24}/></div><span className="text-xs font-bold text-slate-400 uppercase">{label}</span></div>
                    <h3 className="text-2xl font-bold">{formatCurrency(val)}</h3>
                  </div>
                ))}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-bold mb-4">Expense Distribution</h3>
                <div className="h-64">
                  {chartData.length?(
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">{chartData.map((e,i)=><Cell key={i} fill={['#0088FE','#00C49F','#FFBB28'][i]}/>)}</Pie><ChartTooltip formatter={formatCurrency}/><Legend/></PieChart></ResponsiveContainer>
                  ):(<div className="flex items-center justify-center h-full text-slate-400">No data</div>)}
                </div>
              </div>
            </div>
          )}

          {/* Tables */}
          {view!=='dashboard' && view!=='manage-users' && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold text-sm border-b">
                    <tr>
                      {view==='clients'&&<><th className="p-4">Date</th><th>Client</th><th>Retainer</th><th>Project</th><th className="text-right">Total</th><th className="text-right">Advance</th><th className="text-right">Balance</th><th>Status</th></>}
                      {view==='petty-cash'&&<><th className="p-4">Date</th><th>Description</th><th>Head</th><th className="text-right">Out</th><th className="text-right">In</th></>}
                      {view==='expenses'&&<><th className="p-4">Date</th><th>Category</th><th>Description</th><th>Employee</th><th className="text-right">Amount</th></>}
                      {view==='salaries'&&<><th className="p-4">Date</th><th>Employee</th><th>Type</th><th>Base</th><th className="text-right">Bonus</th><th className="text-right">Total</th><th>Status</th></>}
                      {view==='vendors'&&<><th className="p-4">Vendor</th><th>Service</th><th className="text-right">Payable</th><th className="text-right">Paid</th><th className="text-right">Balance</th></>}
                      {view==='bank'&&<><th className="p-4">Date</th><th>Bank</th><th>Cheque</th><th>Description</th><th className="text-right">Amount</th><th>Clearing</th><th>Status</th></>}
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {view==='clients'&&filtered.clients.map(item=>item&&(
                      <tr key={item.id||Math.random()} className="hover:bg-slate-50"><td className="p-4 text-sm">{item.date||'-'}</td><td className="p-4 font-medium">{item.name||'-'}</td><td className="p-4 text-green-600 font-bold">{formatCurrency(item.retainerAmount)}</td><td className="p-4 text-sm">{item.projectName||'-'}</td><td className="p-4 text-right">{formatCurrency(item.projectTotal)}</td><td className="p-4 text-right text-green-600">{formatCurrency(item.advanceReceived)}</td><td className="p-4 text-right font-bold text-red-600">{formatCurrency((Number(item.projectTotal)||0)-(Number(item.advanceReceived)||0))}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${item.status==='Completed'?'bg-green-100 text-green-700':item.status==='Ongoing'?'bg-blue-100 text-blue-700':'bg-gray-100'}`}>{item.status||'Ongoing'}</span></td><td className="p-4"><ActionButtons item={item} type="client"/></td></tr>
                    ))}
                    {view==='petty-cash'&&filtered.pettyCash.map(item=>item&&(
                      <tr key={item.id||Math.random()} className="hover:bg-slate-50"><td className="p-4">{item.date||'-'}</td><td className="p-4 font-medium">{item.description||'-'}</td><td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{item.head==='Custom'?item.customHead:item.head}</span></td><td className="p-4 text-right text-red-600 font-bold">{item.cashOut?formatCurrency(item.cashOut):'-'}</td><td className="p-4 text-right text-green-600 font-bold">{item.cashIn?formatCurrency(item.cashIn):'-'}</td><td className="p-4"><ActionButtons item={item} type="petty"/></td></tr>
                    ))}
                    {view==='expenses'&&filtered.expenses.map(item=>item&&(
                      <tr key={item.id||Math.random()} className="hover:bg-slate-50"><td className="p-4">{item.date||'-'}</td><td className="p-4"><span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-bold">{item.category||'General'}</span></td><td className="p-4 text-slate-600">{item.description||'-'}</td><td className="p-4 text-slate-500">{item.employeeName||'-'}</td><td className="p-4 text-right font-bold">{formatCurrency(item.amount)}</td><td className="p-4"><ActionButtons item={item} type="expense"/></td></tr>
                    ))}
                    {view==='salaries'&&filtered.salaries.map(item=>item&&(
                      <tr key={item.id||Math.random()} className="hover:bg-slate-50"><td className="p-4">{item.date||'-'}</td><td className="p-4 font-medium">{item.employeeName||'-'}</td><td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700">{item.type||'Monthly'}</span></td><td className="p-4">{formatCurrency(item.baseSalary)}</td><td className="p-4 text-right text-green-600">+{formatCurrency(item.overtimeOrBonus)}</td><td className="p-4 text-right font-bold">{formatCurrency(item.totalPayable)}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${item.status==='Paid'?'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'}`}>{item.status}</span></td><td className="p-4"><ActionButtons item={item} type="salary"/></td></tr>
                    ))}
                    {view==='vendors'&&safeData.vendors.map(item=>item&&(
                      <tr key={item.id||Math.random()} className="hover:bg-slate-50"><td className="p-4 font-medium">{item.name||'-'}</td><td className="p-4 text-slate-500">{item.serviceType||'-'}</td><td className="p-4 text-right font-bold">{formatCurrency(item.amountPayable)}</td><td className="p-4 text-right text-green-600">{formatCurrency(item.amountPaid)}</td><td className="p-4 text-right font-bold text-red-600">{formatCurrency((Number(item.amountPayable)||0)-(Number(item.amountPaid)||0))}</td><td className="p-4"><ActionButtons item={item} type="vendor"/></td></tr>
                    ))}
                    {view==='bank'&&filtered.bank.map(item=>item&&(
                      <tr key={item.id||Math.random()} className="hover:bg-slate-50"><td className="p-4">{item.date||'-'}</td><td className="p-4 text-blue-600 font-medium">{item.bank||'-'}</td><td className="p-4 font-mono text-xs">{item.cheque||'-'}</td><td className="p-4 text-slate-600">{item.description||'-'}</td><td className="p-4 text-right font-bold">{formatCurrency(item.amount)}</td><td className="p-4 text-xs">{item.clearingDate||'-'}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${item.status==='Cleared'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{item.status||'Pending'}</span></td><td className="p-4"><ActionButtons item={item} type="bank"/></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view==='manage-users'&&(
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-sm border-b"><tr><th className="p-4">Username</th><th>Email</th><th>Role</th><th>Password</th><th className="text-center">Action</th></tr></thead>
                <tbody className="divide-y">
                  {safeData.users.map(u=>u&&(
                    <tr key={u.id||Math.random()} className="hover:bg-slate-50"><td className="p-4 font-medium">{u.username}</td><td className="p-4 text-sm">{u.email}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role==='Admin'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{u.role}</span></td><td className="p-4 font-mono text-slate-400">••••••</td><td className="p-4"><ActionButtons item={u} type="user"/></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal */}
          {showForm&&(
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">{isEditingRecord||isEditingUser?'Edit':'Add'}</h3>
                  <button onClick={()=>{setShowForm(false);setFileToUpload(null);}} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                  {view==='clients'&&(<><input required type="date" className="w-full border p-3 rounded-lg" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input required placeholder="Client Name" className="w-full border p-3 rounded-lg" value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/><input type="number" placeholder="Retainer" className="w-full border p-3 rounded-lg" value={formData.retainerAmount||''} onChange={e=>setFormData({...formData,retainerAmount:e.target.value})}/><input placeholder="Project Name" className="w-full border p-3 rounded-lg" value={formData.projectName||''} onChange={e=>setFormData({...formData,projectName:e.target.value})}/><input type="number" placeholder="Project Total" className="w-full border p-3 rounded-lg" value={formData.projectTotal||''} onChange={e=>setFormData({...formData,projectTotal:e.target.value})}/><input type="number" placeholder="Advance" className="w-full border p-3 rounded-lg" value={formData.advanceReceived||''} onChange={e=>setFormData({...formData,advanceReceived:e.target.value})}/><select className="w-full border p-3 rounded-lg" value={formData.status||'Ongoing'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Ongoing</option><option>Completed</option><option>On Hold</option></select></>)}
                  
                  {view==='vendors'&&(<><input required placeholder="Vendor Name" className="w-full border p-3 rounded-lg" value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/><select className="w-full border p-3 rounded-lg" value={formData.serviceType||'General'} onChange={e=>setFormData({...formData,serviceType:e.target.value})}><option>General</option><option>Lighting</option><option>Printing</option><option>Catering</option><option>Logistics</option><option>Other</option></select><input type="number" placeholder="Total Payable" className="w-full border p-3 rounded-lg" value={formData.amountPayable||''} onChange={e=>setFormData({...formData,amountPayable:e.target.value})}/><input type="number" placeholder="Amount Paid" className="w-full border p-3 rounded-lg" value={formData.amountPaid||''} onChange={e=>setFormData({...formData,amountPaid:e.target.value})}/></>)}
                  
                  {view==='salaries'&&(<><input required type="date" className="w-full border p-3 rounded-lg" value={formData.date||new Date().toISOString().split('T')[0]} onChange={e=>setFormData({...formData,date:e.target.value})}/><input required placeholder="Employee" className="w-full border p-3 rounded-lg" value={formData.employeeName||''} onChange={e=>setFormData({...formData,employeeName:e.target.value})}/><select className="w-full border p-3 rounded-lg" value={formData.type||'Monthly Salary'} onChange={e=>setFormData({...formData,type:e.target.value})}><option>Monthly Salary</option><option>Project-Based</option></select><input type="number" placeholder="Base Salary" className="w-full border p-3 rounded-lg" value={formData.baseSalary||''} onChange={e=>setFormData({...formData,baseSalary:e.target.value})}/><input type="number" placeholder="Overtime/Bonus" className="w-full border p-3 rounded-lg" value={formData.overtimeOrBonus||''} onChange={e=>setFormData({...formData,overtimeOrBonus:e.target.value})}/><input type="number" placeholder="Total Payable" className="w-full border p-3 rounded-lg font-bold bg-slate-50" value={formData.totalPayable||''} onChange={e=>setFormData({...formData,totalPayable:e.target.value})}/><select className="w-full border p-3 rounded-lg" value={formData.status||'Unpaid'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Unpaid</option><option>Paid</option></select></>)}
                  
                  {view==='expenses'&&(<><input required type="date" className="w-full border p-3 rounded-lg" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><select className="w-full border p-3 rounded-lg" value={formData.category||'General'} onChange={e=>setFormData({...formData,category:e.target.value})}><option>General</option><option>Office Rent</option><option>Utilities</option><option>Equipment</option><option>Software</option><option>Travel</option><option>Other</option></select><input required placeholder="Description" className="w-full border p-3 rounded-lg" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/><input placeholder="Employee (opt)" className="w-full border p-3 rounded-lg" value={formData.employeeName||''} onChange={e=>setFormData({...formData,employeeName:e.target.value})}/><input required type="number" placeholder="Amount" className="w-full border p-3 rounded-lg" value={formData.amount||''} onChange={e=>setFormData({...formData,amount:Number(e.target.value)})}/></>)}
                  
                  {view==='petty-cash'&&(<><input required type="date" className="w-full border p-3 rounded-lg" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input required placeholder="Description" className="w-full border p-3 rounded-lg" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/><select className="w-full border p-3 rounded-lg" value={formData.head||'Office Expenses'} onChange={e=>setFormData({...formData,head:e.target.value})}><option>Office Expenses</option><option>Meals</option><option>Traveling</option><option>Cheque Received</option><option>Custom</option></select>{formData.head==='Custom'&&<input required placeholder="Custom head" className="w-full border p-3 rounded-lg mt-2" value={formData.customHead||''} onChange={e=>setFormData({...formData,customHead:e.target.value})}/>}<div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Cash Out" className="w-full border p-3 rounded-lg" value={formData.cashOut||''} onChange={e=>setFormData({...formData,cashOut:Number(e.target.value)})}/><input type="number" placeholder="Cash In" className="w-full border p-3 rounded-lg" value={formData.cashIn||''} onChange={e=>setFormData({...formData,cashIn:Number(e.target.value)})}/></div></>)}
                  
                  {view==='bank'&&(<><input required type="date" className="w-full border p-3 rounded-lg" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input required placeholder="Bank Name" className="w-full border p-3 rounded-lg" value={formData.bank||''} onChange={e=>setFormData({...formData,bank:e.target.value})}/><input required placeholder="Cheque #" className="w-full border p-3 rounded-lg" value={formData.cheque||''} onChange={e=>setFormData({...formData,cheque:e.target.value})}/><input required placeholder="Description" className="w-full border p-3 rounded-lg" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/><input required type="number" placeholder="Amount" className="w-full border p-3 rounded-lg" value={formData.amount||''} onChange={e=>setFormData({...formData,amount:Number(e.target.value)})}/><input type="date" className="w-full border p-3 rounded-lg" value={formData.clearingDate||''} onChange={e=>setFormData({...formData,clearingDate:e.target.value})}/><select className="w-full border p-3 rounded-lg" value={formData.status||'Pending'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Pending</option><option>Cleared</option><option>Bounced</option></select></>)}
                  
                  {view==='manage-users'&&(<><input required placeholder="Username" className="w-full border p-3 rounded-lg" value={formData.username||''} onChange={e=>setFormData({...formData,username:e.target.value})}/><input required type="email" placeholder="Email" className="w-full border p-3 rounded-lg" value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/><select className="w-full border p-3 rounded-lg" value={formData.role||'User'} onChange={e=>setFormData({...formData,role:e.target.value})}><option>User</option><option>Admin</option></select><input type="password" placeholder={isEditingUser?"Keep blank to keep old":"Password"} className="w-full border p-3 rounded-lg" value={formData.password||''} onChange={e=>setFormData({...formData,password:e.target.value})}/></>)}

                  {view!=='manage-users'&&(
                    <div className="border-t pt-4 mt-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Attach Proof</label>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg text-slate-600">
                          <Upload size={18}/><span className="text-sm truncate max-w-[150px]">{fileToUpload?fileToUpload.name:"Choose File"}</span>
                          <input type="file" className="hidden" accept="image/*,.pdf" onChange={e=>setFileToUpload(e.target.files[0])}/>
                        </label>
                        {fileToUpload&&<button type="button" onClick={()=>setFileToUpload(null)} className="text-red-500 p-1"><X size={16}/></button>}
                      </div>
                      {formData.proofUrl&&!fileToUpload&&<p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle size={12}/> Has existing proof</p>}
                    </div>
                  )}

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={()=>setShowForm(false)} className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50" disabled={isSubmitting}>Cancel</button>
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-blue-400" disabled={isSubmitting}>{isSubmitting?'Saving...':(isEditingRecord||isEditingUser?'Update':'Save')}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  } catch (err) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <AlertTriangle size={48} className="text-red-600 mx-auto mb-4"/>
          <h2 className="text-xl font-bold text-red-800 mb-2">Render Error</h2>
          <p className="text-red-600 mb-4 text-sm">{err.message}</p>
          <p className="text-slate-500 text-xs mb-4">This usually means there's bad data in your database. Check the console for details.</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded-lg mr-2">Reload</button>
          <button onClick={() => { window.localStorage.clear(); window.location.reload(); }} className="border px-4 py-2 rounded-lg">Clear Storage</button>
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

**What this emergency fix does:**
1. **Error Screen**: If it crashes, it shows the error message instead of white screen
2. **Safe Data**: Checks `if (item)` before rendering every row (prevents crash on null entries)
3. **Safe Dates**: Properly handles Firebase timestamps and invalid dates
4. **Safe Numbers**: Converts amounts to numbers immediately on input to prevent string math errors
5. **Backup Keys**: Uses `key={item.id||Math.random()}` so missing IDs don't crash React

**If it still crashes**, the error message will tell us exactly which field is broken.