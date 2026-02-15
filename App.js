import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Wallet, Receipt, Users, Building2, Briefcase, Truck,
  Plus, Download, Trash2, ArrowUpRight, ArrowDownLeft, Calendar, LogIn, Lock, UserPlus, Edit, Menu, X, CheckCircle, Clock, Upload, Link as LinkIcon, Copy, RefreshCw, FileInput, Settings, FileDown, Search, Filter, FileText, Printer, DollarSign, Percent
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
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

// PASSWORD ENCRYPTION
const hashPassword = async (password) => {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '').trim();
};

const calculateTax = (amount, taxRate = 0) => {
  const numAmount = Number(amount) || 0;
  const tax = numAmount * (taxRate / 100);
  return { subtotal: numAmount, tax: tax, total: numAmount + tax };
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

// --- HOOKS ---
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
            <input type="text" required className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-500" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} placeholder="Enter username" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <input type="password" required className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-500" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
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

// --- INVOICE GENERATOR COMPONENT ---
const InvoiceGenerator = ({ clients, onSave }) => {
    const [invoiceData, setInvoiceData] = useState({
        client: '', date: new Date().toISOString().split('T')[0], dueDate: '', 
        items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0, notes: ''
    });

    const addItem = () => setInvoiceData({...invoiceData, items: [...invoiceData.items, { desc: '', qty: 1, rate: 0 }]});
    const updateItem = (index, field, val) => {
        const newItems = [...invoiceData.items];
        newItems[index][field] = val;
        setInvoiceData({...invoiceData, items: newItems});
    };
    const removeItem = (index) => {
        if(invoiceData.items.length > 1) {
            setInvoiceData({...invoiceData, items: invoiceData.items.filter((_, i) => i !== index)});
        }
    };

    const calculateTotal = () => {
        const subtotal = invoiceData.items.reduce((acc, item) => acc + (item.qty * item.rate), 0);
        const { tax, total } = calculateTax(subtotal, invoiceData.taxRate);
        return { subtotal, tax, total };
    };

    const { subtotal, tax, total } = calculateTotal();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">INVOICE</h2>
                    <p className="text-slate-500">LeanAxis Agency</p>
                </div>
                <div className="text-right">
                    <div className="bg-indigo-600 text-white font-bold py-1 px-3 rounded text-sm mb-2 inline-block">DRAFT</div>
                    <p className="text-slate-400 text-sm">Date: {invoiceData.date}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bill To</label>
                    <select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-slate-50" value={invoiceData.client} onChange={e => setInvoiceData({...invoiceData, client: e.target.value})}>
                        <option value="">Select Client</option>
                        {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Details</label>
                    <div className="flex gap-2">
                        <input type="date" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={invoiceData.date} onChange={e => setInvoiceData({...invoiceData, date: e.target.value})} />
                        <input type="number" placeholder="Tax %" className="w-24 border border-slate-200 p-3 rounded-xl text-sm" value={invoiceData.taxRate} onChange={e => setInvoiceData({...invoiceData, taxRate: e.target.value})} />
                    </div>
                </div>
            </div>

            <table className="w-full mb-8">
                <thead>
                    <tr className="bg-slate-50 text-left">
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase rounded-l-lg">Description</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase w-20">Qty</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase w-32">Rate</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase w-32 text-right rounded-r-lg">Amount</th>
                        <th className="w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoiceData.items.map((item, i) => (
                        <tr key={i}>
                            <td className="p-2"><input className="w-full bg-transparent outline-none font-medium text-slate-700" placeholder="Item description" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} /></td>
                            <td className="p-2"><input type="number" className="w-full bg-transparent outline-none text-slate-600" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} /></td>
                            <td className="p-2"><input type="number" className="w-full bg-transparent outline-none text-slate-600" value={item.rate} onChange={e => updateItem(i, 'rate', Number(e.target.value))} /></td>
                            <td className="p-2 text-right font-bold text-slate-700">{formatCurrency(item.qty * item.rate)}</td>
                            <td className="p-2 text-center"><button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <button onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 mb-8"><Plus size={16}/> Add Line Item</button>

            <div className="flex justify-end mb-8">
                <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between text-sm text-slate-500"><span>Tax ({invoiceData.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
                    <div className="flex justify-between text-xl font-bold text-slate-800 border-t border-slate-200 pt-3"><span>Total</span><span>{formatCurrency(total)}</span></div>
                </div>
            </div>

            <div className="flex gap-4 print:hidden">
                <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"><Printer size={18}/> Print / PDF</button>
                <button onClick={() => onSave(invoiceData)} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"><CheckCircle size={18}/> Save Invoice</button>
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
  const [invoices] = useFirebaseSync('invoices');
  const [users, usersLoading] = useFirebaseSync('users');

  const uniqueBanks = useMemo(() => {
      const banks = new Set(bankRecords.map(b => b.bank));
      return Array.from(banks).filter(Boolean);
  }, [bankRecords]);

  // Create default admin
  useEffect(() => {
      const createDefaultAdmin = async () => {
          if (!usersLoading && users.length === 0) {
              const hashedPassword = await hashPassword('admin123');
              addDoc(collection(db, 'users'), { username: 'admin', password: hashedPassword, email: 'admin@leanaxis.com', role: 'Admin', createdAt: new Date().toISOString() }).catch(console.error);
          }
      };
      createDefaultAdmin();
  }, [users, usersLoading]);

  const handleLogin = async (loginInput, password) => {
      const inputHash = await hashPassword(password);
      const user = users.find(u => u.username === loginInput || u.email === loginInput);
      if (user) {
          if (user.password === password || user.password === inputHash) {
              setIsAuthenticated(true); 
              setCurrentUser(user); 
              if (user.password === password) updateDoc(doc(db, 'users', user.id), { password: inputHash });
              return;
          }
      }
      if (users.length === 0 && loginInput === 'admin' && password === 'admin123') {
          setIsAuthenticated(true); setCurrentUser({ username: 'admin', role: 'Admin' }); return;
      }
      setAuthError('Invalid credentials');
  };

  const handleLogout = () => { setIsAuthenticated(false); setCurrentUser(null); setView('dashboard'); };
  const deleteRecord = async (collectionName, id) => { if(confirm('Delete this record?')) await deleteDoc(doc(db, collectionName, id)); };
  
  const handleDelete = (id, type) => {
    if (currentUser.role !== 'Admin') return alert('Access Denied');
    const map = { 'petty': 'petty_cash', 'expense': 'expenses', 'salary': 'salaries', 'bank': 'bank_records', 'client': 'clients', 'vendor': 'vendors', 'user': 'users', 'invoice': 'invoices' };
    if (map[type]) deleteRecord(map[type], id);
  };

  const handleEdit = (item) => {
      if (currentUser.role !== 'Admin') return alert('Access Denied');
      setFormData({ ...item }); setIsEditingRecord(true); setShowForm(true);
  };

  const handleDuplicate = (item) => {
      const { id, createdAt, lastEditedAt, ...dataToCopy } = item;
      setFormData({ ...dataToCopy, date: new Date().toISOString().split('T')[0] });
      setIsEditingRecord(false); setShowForm(true);
  };

  const handleMasterExport = () => {
    if(!confirm("Download ALL data?")) return;
    const allData = [];
    const push = (src, type) => src.forEach(i => allData.push({TYPE: type, ...i}));
    push(clients, 'Client'); push(vendors, 'Vendor'); push(pettyCash, 'Petty'); push(expenses, 'Expense'); push(salaries, 'Salary');
    if (allData.length) exportToCSV(allData, 'Master_Export.csv');
  };

  const uploadFile = async (file) => {
      if (!file || !imgbbKey) return null;
      setUploadProgress('Uploading...');
      const fd = new FormData(); fd.append("image", file);
      try {
          const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: "POST", body: fd });
          const d = await res.json();
          if (d.success) { setUploadProgress('Done!'); return d.data.url; }
      } catch (e) { alert("Upload failed"); }
      return null;
  };

  const saveToFirebase = async (collectionName, data, id = null) => {
      setIsSubmitting(true);
      try {
          let proofUrl = data.proofUrl;
          if (fileToUpload) proofUrl = await uploadFile(fileToUpload);
          let finalData = { ...data, date: data.date || new Date().toISOString().split('T')[0], proofUrl: proofUrl || null };
          
          if (collectionName === 'users' && finalData.password) finalData.password = await hashPassword(finalData.password);
          if (collectionName === 'users' && !finalData.password && id) delete finalData.password;

          if (id) await updateDoc(doc(db, collectionName, id), { ...finalData, lastEditedBy: currentUser.username });
          else await addDoc(collection(db, collectionName), { ...finalData, addedBy: currentUser.username, createdAt: new Date().toISOString() });
          
          setShowForm(false); setFormData({}); setFileToUpload(null); setIsEditingRecord(false); setIsEditingUser(false); alert("Saved!");
      } catch (e) { alert("Error saving"); console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    let col = { 'manage-users': 'users', 'petty-cash': 'petty_cash', 'expenses': 'expenses', 'salaries': 'salaries', 'bank': 'bank_records', 'clients': 'clients', 'vendors': 'vendors' }[view];
    if (col) saveToFirebase(col, formData, (isEditingRecord || isEditingUser) ? formData.id : null);
  };

  // --- FILTERING & TOTALS ---
  const filterData = (items) => {
    let res = items;
    if (selectedMonth !== 'All' || selectedYear !== 'All') {
        res = res.filter(i => {
            const d = new Date(i.date || i.createdAt);
            return (selectedMonth === 'All' || d.toLocaleString('default',{month:'long'}) === selectedMonth) && (selectedYear === 'All' || d.getFullYear().toString() === selectedYear);
        });
    }
    if (searchTerm) res = res.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase())));
    return res;
  };

  const filteredPetty = useMemo(() => filterData(pettyCash), [pettyCash, selectedMonth, selectedYear, searchTerm]);
  const filteredExp = useMemo(() => filterData(expenses), [expenses, selectedMonth, selectedYear, searchTerm]);
  const filteredSal = useMemo(() => filterData(salaries), [salaries, selectedMonth, selectedYear, searchTerm]);
  const filteredClients = useMemo(() => filterData(clients), [clients, selectedMonth, selectedYear, searchTerm]); 
  const filteredVendors = useMemo(() => filterData(vendors), [vendors]);

  const totals = useMemo(() => {
    const rev = filteredClients.reduce((a,c) => a + (Number(c.advanceReceived)||0), 0) + filteredPetty.reduce((a,c) => a + (Number(c.cashIn)||0), 0);
    const exp = filteredExp.reduce((a,c) => a + (Number(c.amount)||0), 0) + filteredSal.reduce((a,c) => a + (Number(c.totalPayable)||0), 0) + filteredPetty.reduce((a,c) => a + (Number(c.cashOut)||0), 0);
    return { revenue: rev, expense: exp, profit: rev - exp, 
             vendorPending: vendors.reduce((a,c) => a + ((Number(c.amountPayable)||0) - (Number(c.amountPaid)||0)), 0),
             clientPending: clients.reduce((a,c) => a + ((Number(c.projectTotal)||0) - (Number(c.advanceReceived)||0)), 0)
    };
  }, [filteredPetty, filteredExp, filteredSal, clients, vendors]);

  const expenseChartData = [
      { name: 'Petty', value: filteredPetty.reduce((a,c) => a+(Number(c.cashOut)||0),0) },
      { name: 'Expenses', value: filteredExp.reduce((a,c) => a+(Number(c.amount)||0),0) },
      { name: 'Salaries', value: filteredSal.reduce((a,c) => a+(Number(c.totalPayable)||0),0) }
  ].filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#06b6d4', '#f59e0b'];

  const NavButton = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setView(id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={20} /> <span className="font-medium text-sm">{label}</span>
    </button>
  );

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} error={authError} />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* MOBILE NAV */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 border-b border-slate-800 p-4 z-50 flex justify-between items-center shadow">
        <div className="flex items-center gap-3 text-white font-bold"><div className="bg-indigo-500 p-1 rounded">LA</div> LeanAxis</div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-300"><Menu/></button>
      </div>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 w-72 bg-slate-900 flex flex-col z-40 transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} pt-20 md:pt-0`}>
        <div className="p-8 border-b border-slate-800 hidden md:block">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3"><div className="bg-gradient-to-r from-indigo-500 to-cyan-500 p-2 rounded-lg">LA</div> LeanAxis</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavButton id="reports" icon={FileText} label="Profit & Loss" />
          <div className="pt-4 px-4 text-xs font-bold text-slate-600 uppercase">Modules</div>
          <NavButton id="invoices" icon={FileText} label="Invoices" />
          <NavButton id="clients" icon={Briefcase} label="Clients" />
          <NavButton id="petty-cash" icon={Wallet} label="Petty Cash" />
          <NavButton id="expenses" icon={Receipt} label="Expenses" />
          <NavButton id="salaries" icon={Users} label="Salaries" />
          <NavButton id="vendors" icon={Truck} label="Vendors" />
          <NavButton id="bank" icon={Building2} label="Bank" />
          {currentUser.role === 'Admin' && <><div className="pt-4 px-4 text-xs font-bold text-slate-600 uppercase">Admin</div><NavButton id="manage-users" icon={UserPlus} label="Users" /><NavButton id="settings" icon={Settings} label="Settings" /></>}
        </nav>
        <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-red-600 hover:border-red-600 hover:text-white transition-all font-bold text-sm"><Lock size={16}/> Logout</button></div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-24 md:pt-8 bg-slate-50">
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-5">
            <div><h2 className="text-3xl font-bold text-slate-900 capitalize">{view.replace('-', ' ')}</h2></div>
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                {view !== 'dashboard' && <div className="relative flex-1 sm:w-64"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>}
                {['clients','expenses','petty-cash','salaries','bank'].includes(view) && (
                    <div className="flex gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                        <select className="bg-transparent text-sm font-medium outline-none" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}><option value="All">All Months</option>{['January','February','March','April','May','June','July','August','September','October','November','December'].map(m=><option key={m}>{m}</option>)}</select>
                        <select className="bg-transparent text-sm font-medium outline-none border-l pl-2" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}><option value="All">All Years</option><option>2024</option><option>2025</option><option>2026</option></select>
                    </div>
                )}
                {!['dashboard','reports','invoices','settings'].includes(view) && <button onClick={()=>{setShowForm(true);setFormData({});setIsEditingUser(false);setIsEditingRecord(false);}} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200"><Plus size={18}/> Add New</button>}
            </div>
        </header>

        {view === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { l:'Revenue', v:totals.revenue, i:ArrowDownLeft, c:'text-emerald-600', b:'bg-emerald-50' },
                    { l:'Expenses', v:totals.expense, i:ArrowUpRight, c:'text-rose-600', b:'bg-rose-50' },
                    { l:'Net Profit', v:totals.profit, i:Wallet, c:totals.profit>=0?'text-indigo-600':'text-orange-600', b:totals.profit>=0?'bg-indigo-50':'bg-orange-50' },
                    { l:'Pending', v:totals.clientPending, i:Clock, c:'text-amber-600', b:'bg-amber-50' }
                ].map((s,i) => <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><div className="flex justify-between mb-4"><div className={`p-3 rounded-xl ${s.b} ${s.c}`}><s.i/></div></div><p className="text-xs font-bold text-slate-400 uppercase">{s.l}</p><h3 className="text-2xl font-bold text-slate-800">{formatCurrency(s.v)}</h3></div>)}
                
                <div className="md:col-span-2 lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
                    <h3 className="font-bold text-slate-800 mb-4">Expense Breakdown</h3>
                    <ResponsiveContainer><RePieChart><Pie data={expenseChartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{expenseChartData.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><ChartTooltip formatter={formatCurrency}/><Legend/></RePieChart></ResponsiveContainer>
                </div>
            </div>
        )}

        {view === 'reports' && (
            <div className="space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Net Profit</h2>
                    <p className={`text-4xl font-bold ${totals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(totals.profit)}</p>
                    <p className="text-slate-400 text-sm mt-2">Total Revenue - Total Expenses</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="font-bold text-emerald-700 mb-4">Income Breakdown</h3><div className="space-y-3">{[{l:'Client Advance',v:totals.revenue - filteredPetty.reduce((a,c)=>a+(Number(c.cashIn)||0),0)},{l:'Petty Cash In',v:filteredPetty.reduce((a,c)=>a+(Number(c.cashIn)||0),0)}].map((i,k)=><div key={k} className="flex justify-between p-3 bg-emerald-50 rounded-lg"><span className="text-emerald-900 font-medium">{i.l}</span><span className="font-bold text-emerald-700">{formatCurrency(i.v)}</span></div>)}</div></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="font-bold text-rose-700 mb-4">Expense Breakdown</h3><div className="space-y-3">{expenseChartData.map((i,k)=><div key={k} className="flex justify-between p-3 bg-rose-50 rounded-lg"><span className="text-rose-900 font-medium">{i.name}</span><span className="font-bold text-rose-700">{formatCurrency(i.value)}</span></div>)}</div></div>
                </div>
            </div>
        )}

        {view === 'invoices' && <InvoiceGenerator clients={clients} onSave={(inv) => saveToFirebase('invoices', inv)} />}

        {/* GENERIC TABLE RENDERER */}
        {['clients','vendors','petty-cash','expenses','salaries','bank','manage-users'].includes(view) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                {view==='clients' && <><th className="p-4">Date</th><th className="p-4">Client</th><th className="p-4 text-right">Total</th><th className="p-4 text-right">Paid</th><th className="p-4 text-right">Due</th><th className="p-4">Status</th></>}
                                {view==='vendors' && <><th className="p-4">Vendor</th><th className="p-4">Type</th><th className="p-4 text-right">Total</th><th className="p-4 text-right">Paid</th><th className="p-4 text-right">Due</th></>}
                                {view==='expenses' && <><th className="p-4">Date</th><th className="p-4">Category</th><th className="p-4">Desc</th><th className="p-4 text-right">Amount</th></>}
                                {view==='manage-users' && <><th className="p-4">Username</th><th className="p-4">Email</th><th className="p-4">Role</th></>}
                                {view==='petty-cash' && <><th className="p-4">Date</th><th className="p-4">Desc</th><th className="p-4 text-right">Out</th><th className="p-4 text-right">In</th></>}
                                {view==='salaries' && <><th className="p-4">Date</th><th className="p-4">Employee</th><th className="p-4 text-right">Total</th><th className="p-4">Status</th></>}
                                {view==='bank' && <><th className="p-4">Date</th><th className="p-4">Bank</th><th className="p-4 text-right">Amount</th><th className="p-4">Status</th></>}
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(view==='clients'?filteredClients:view==='vendors'?filteredVendors:view==='expenses'?filteredExp:view==='petty-cash'?filteredPetty:view==='salaries'?filteredSal:view==='bank'?bankRecords:users).map(item => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    {view==='clients' && <><td className="p-4 text-sm text-slate-500">{item.date}</td><td className="p-4 font-bold">{item.name}</td><td className="p-4 text-right">{formatCurrency(item.projectTotal)}</td><td className="p-4 text-right text-emerald-600">{formatCurrency(item.advanceReceived)}</td><td className="p-4 text-right text-rose-600 font-bold">{formatCurrency((item.projectTotal||0)-(item.advanceReceived||0))}</td><td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{item.status}</span></td></>}
                                    {view==='vendors' && <><td className="p-4 font-bold">{item.name}</td><td className="p-4 text-sm">{item.serviceType}</td><td className="p-4 text-right">{formatCurrency(item.amountPayable)}</td><td className="p-4 text-right text-emerald-600">{formatCurrency(item.amountPaid)}</td><td className="p-4 text-right text-rose-600 font-bold">{formatCurrency((item.amountPayable||0)-(item.amountPaid||0))}</td></>}
                                    {view==='expenses' && <><td className="p-4 text-sm">{item.date}</td><td className="p-4"><span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-bold">{item.category}</span></td><td className="p-4 text-sm">{item.description}</td><td className="p-4 text-right font-bold">{formatCurrency(item.amount)}</td></>}
                                    {view==='manage-users' && <><td className="p-4 font-bold">{item.username}</td><td className="p-4 text-sm">{item.email}</td><td className="p-4"><span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">{item.role}</span></td></>}
                                    {view==='petty-cash' && <><td className="p-4 text-sm">{item.date}</td><td className="p-4 text-sm">{item.description}</td><td className="p-4 text-right font-bold text-rose-600">{item.cashOut?formatCurrency(item.cashOut):'-'}</td><td className="p-4 text-right font-bold text-emerald-600">{item.cashIn?formatCurrency(item.cashIn):'-'}</td></>}
                                    {view==='salaries' && <><td className="p-4 text-sm">{item.date}</td><td className="p-4 font-bold">{item.employeeName}</td><td className="p-4 text-right">{formatCurrency(item.totalPayable)}</td><td className="p-4"><span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-bold">{item.status}</span></td></>}
                                    {view==='bank' && <><td className="p-4 text-sm">{item.date}</td><td className="p-4 font-bold text-blue-600">{item.bank}</td><td className="p-4 text-right">{formatCurrency(item.amount)}</td><td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{item.status}</span></td></>}
                                    
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            {item.proofUrl && <a href={item.proofUrl} target="_blank" className="p-1.5 bg-blue-50 text-blue-600 rounded"><LinkIcon size={16}/></a>}
                                            {currentUser.role === 'Admin' && <><button onClick={()=>handleEdit(item)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded"><Edit size={16}/></button><button onClick={()=>handleDelete(item.id, view==='manage-users'?'user':view.replace('s',''))} className="p-1.5 bg-red-50 text-red-600 rounded"><Trash2 size={16}/></button></>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* FORM MODAL */}
        {showForm && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Add / Edit</h3><button onClick={()=>setShowForm(false)}><X/></button></div>
                    <form onSubmit={handleAddSubmit} className="space-y-4">
                        {view==='manage-users' && <><input required placeholder="Username" className="w-full border p-3 rounded-xl" value={formData.username||''} onChange={e=>setFormData({...formData,username:e.target.value})}/><input type="email" required placeholder="Email" className="w-full border p-3 rounded-xl" value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/><input type="password" placeholder="Password" className="w-full border p-3 rounded-xl" value={formData.password||''} onChange={e=>setFormData({...formData,password:e.target.value})}/><select className="w-full border p-3 rounded-xl" value={formData.role||'Viewer'} onChange={e=>setFormData({...formData,role:e.target.value})}><option>Viewer</option><option>Editor</option><option>Admin</option></select></>}
                        {view==='clients' && <><input type="date" required className="w-full border p-3 rounded-xl" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input required placeholder="Client Name" className="w-full border p-3 rounded-xl" value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/><input type="number" placeholder="Project Total" className="w-full border p-3 rounded-xl" value={formData.projectTotal||''} onChange={e=>setFormData({...formData,projectTotal:e.target.value})}/><input type="number" placeholder="Advance" className="w-full border p-3 rounded-xl" value={formData.advanceReceived||''} onChange={e=>setFormData({...formData,advanceReceived:e.target.value})}/><select className="w-full border p-3 rounded-xl" value={formData.status||'Ongoing'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Ongoing</option><option>Completed</option></select></>}
                        {/* Generic Fields for other views */}
                        {!['manage-users','clients'].includes(view) && <><input type="date" required className="w-full border p-3 rounded-xl" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input placeholder="Description/Name" className="w-full border p-3 rounded-xl" value={formData.description||formData.name||''} onChange={e=>setFormData({...formData,[view==='vendors'?'name':'description']:e.target.value})}/><input type="number" placeholder="Amount" className="w-full border p-3 rounded-xl" value={formData.amount||formData.cashOut||formData.totalPayable||formData.amountPayable||''} onChange={e=>setFormData({...formData,[view==='petty-cash'?'cashOut':view==='vendors'?'amountPayable':view==='salaries'?'totalPayable':'amount']:e.target.value})}/></>}
                        
                        <div className="border-t pt-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-100 p-3 rounded-xl hover:bg-slate-200"><Upload size={18}/><span className="text-sm font-medium">{fileToUpload?fileToUpload.name:"Attach Proof (Image/PDF)"}</span><input type="file" className="hidden" onChange={e=>setFileToUpload(e.target.files[0])}/></label>
                        </div>
                        <button disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">{isSubmitting?'Saving...':'Save Record'}</button>
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