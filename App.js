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

const hashPassword = async (password) => {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

// EXPENSE CATEGORIES HOOK
function useExpenseCategories() {
    const [categories, setCategories] = useState(['General', 'Office Rent', 'Utilities', 'Travel', 'Software', 'Meals', 'Other']);
    const [storedCats, setStoredCats] = useStickyState(categories, 'leanaxis_expense_categories');
    return [storedCats, setStoredCats];
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

// --- INVOICE GENERATOR ---
const InvoiceGenerator = ({ clients, onSave, savedInvoices, onDeleteInvoice, onGenerateRecurring }) => {
    const [viewMode, setViewMode] = useState('list'); 
    const [invoiceData, setInvoiceData] = useState({
        client: '', date: new Date().toISOString().split('T')[0], items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0
    });

    const addItem = () => setInvoiceData({...invoiceData, items: [...invoiceData.items, { desc: '', qty: 1, rate: 0 }]});
    const updateItem = (index, field, val) => {
        const newItems = [...invoiceData.items];
        newItems[index][field] = val;
        setInvoiceData({...invoiceData, items: newItems});
    };
    const removeItem = (index) => {
        if(invoiceData.items.length > 1) setInvoiceData({...invoiceData, items: invoiceData.items.filter((_, i) => i !== index)});
    };

    const { subtotal, tax, total } = calculateTax(invoiceData.items.reduce((acc, item) => acc + (item.qty * item.rate), 0), invoiceData.taxRate);

    // AUTO-FILL LOGIC
    useEffect(() => {
        if (invoiceData.client && viewMode === 'create' && (!invoiceData.items[0].desc || invoiceData.items.length === 1)) {
            const client = clients.find(c => c.name === invoiceData.client);
            if (client) {
                const newItems = [];
                if (Number(client.retainerAmount) > 0) {
                    newItems.push({ desc: 'Monthly Retainer Service', qty: 1, rate: Number(client.retainerAmount) });
                }
                const balance = Number(client.projectTotal) - Number(client.advanceReceived);
                if (balance > 0 && Number(client.retainerAmount) === 0) {
                    newItems.push({ desc: `Balance Payment for ${client.projectName || 'Project'}`, qty: 1, rate: balance });
                }
                if (newItems.length > 0) {
                    setInvoiceData(prev => ({ ...prev, items: newItems }));
                }
            }
        }
    }, [invoiceData.client, clients, viewMode]);

    if (viewMode === 'list') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Invoices</h2>
                    <div className="flex gap-2">
                        <button onClick={onGenerateRecurring} className="bg-white border border-indigo-200 text-indigo-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-50 transition-all"><RefreshCw size={18}/> Generate Monthly Retainers</button>
                        <button onClick={() => { setInvoiceData({ client: '', date: new Date().toISOString().split('T')[0], items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0 }); setViewMode('create'); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"><Plus size={18}/> Create Invoice</button>
                    </div>
                </div>
                
                {savedInvoices.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
                        <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500 font-medium">No invoices created yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-5">Date</th>
                                    <th className="p-5">Client</th>
                                    <th className="p-5 text-right">Total</th>
                                    <th className="p-5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {savedInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-5 text-sm text-slate-500">{inv.date}</td>
                                        <td className="p-5 font-bold text-slate-800">{inv.client}</td>
                                        <td className="p-5 text-right font-bold text-indigo-600">{formatCurrency(calculateTax(inv.items.reduce((a, i) => a + (i.qty * i.rate), 0), inv.taxRate).total)}</td>
                                        <td className="p-5 text-center flex justify-center gap-2">
                                            <button onClick={() => { setInvoiceData(inv); setViewMode('create'); }} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={18} /></button>
                                            <button onClick={() => onDeleteInvoice(inv.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => setViewMode('list')} className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 text-sm font-bold"><ArrowDownLeft className="rotate-90" size={16}/> Back to List</button>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 border-b border-slate-100 pb-6 gap-4">
                <div><h2 className="text-2xl md:text-3xl font-bold text-slate-900">INVOICE</h2><p className="text-slate-500">LeanAxis Agency</p></div>
                <div className="text-left md:text-right"><div className="bg-indigo-600 text-white font-bold py-1 px-3 rounded text-sm mb-2 inline-block">DRAFT</div><p className="text-slate-400 text-sm">Date: {invoiceData.date}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bill To</label><select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-slate-50" value={invoiceData.client} onChange={e => setInvoiceData({...invoiceData, client: e.target.value})}><option value="">Select Client</option>{clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Details</label><div className="flex gap-2"><input type="date" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={invoiceData.date} onChange={e => setInvoiceData({...invoiceData, date: e.target.value})} /><input type="number" placeholder="Tax %" className="w-24 border border-slate-200 p-3 rounded-xl text-sm" value={invoiceData.taxRate} onChange={e => setInvoiceData({...invoiceData, taxRate: e.target.value})} /></div></div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full mb-8 min-w-[600px]">
                    <thead><tr className="bg-slate-50 text-left"><th className="p-3 text-xs font-bold text-slate-500 uppercase rounded-l-lg">Description</th><th className="p-3 text-xs font-bold text-slate-500 uppercase w-20">Qty</th><th className="p-3 text-xs font-bold text-slate-500 uppercase w-32">Rate</th><th className="p-3 text-xs font-bold text-slate-500 uppercase w-32 text-right rounded-r-lg">Amount</th><th className="w-10"></th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{invoiceData.items.map((item, i) => (<tr key={i}><td className="p-2"><input className="w-full bg-transparent outline-none font-medium text-slate-700" placeholder="Item description" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} /></td><td className="p-2"><input type="number" className="w-full bg-transparent outline-none text-slate-600" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} /></td><td className="p-2"><input type="number" className="w-full bg-transparent outline-none text-slate-600" value={item.rate} onChange={e => updateItem(i, 'rate', Number(e.target.value))} /></td><td className="p-2 text-right font-bold text-slate-700">{formatCurrency(item.qty * item.rate)}</td><td className="p-2 text-center"><button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td></tr>))}</tbody>
                </table>
            </div>
            <button onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 mb-8"><Plus size={16}/> Add Line Item</button>
            <div className="flex justify-end mb-8"><div className="w-full md:w-64 space-y-3"><div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-sm text-slate-500"><span>Tax ({invoiceData.taxRate}%)</span><span>{formatCurrency(tax)}</span></div><div className="flex justify-between text-xl font-bold text-slate-800 border-t border-slate-200 pt-3"><span>Total</span><span>{formatCurrency(total)}</span></div></div></div>
            <div className="flex flex-col md:flex-row gap-4 print:hidden"><button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"><Printer size={18}/> Print / PDF</button><button onClick={() => { onSave(invoiceData); setViewMode('list'); }} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"><CheckCircle size={18}/> Save Invoice</button></div>
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
  const [vendorBills] = useFirebaseSync('vendor_bills');
  const [users, usersLoading] = useFirebaseSync('users');
  
  const [expenseCategories, setExpenseCategories] = useExpenseCategories();

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
    const map = { 'petty': 'petty_cash', 'expense': 'expenses', 'salary': 'salaries', 'bank': 'bank_records', 'client': 'clients', 'vendor': 'vendors', 'user': 'users', 'invoice': 'invoices', 'bill': 'vendor_bills' };
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

  const handleGenerateRecurring = async () => {
      if(!confirm("Generate draft invoices for all retainer clients for this month?")) return;
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      let count = 0;
      
      for (const client of clients) {
          if (Number(client.retainerAmount) > 0) {
              const exists = invoices.some(inv => inv.client === client.name && new Date(inv.date).toLocaleString('default', { month: 'long', year: 'numeric' }) === currentMonth);
              if (!exists) {
                  const newInvoice = {
                      client: client.name,
                      date: new Date().toISOString().split('T')[0],
                      items: [{ desc: `Monthly Retainer - ${currentMonth}`, qty: 1, rate: Number(client.retainerAmount) }],
                      taxRate: 0,
                      status: 'Draft',
                      addedBy: currentUser.username,
                      createdAt: new Date().toISOString()
                  };
                  await addDoc(collection(db, 'invoices'), newInvoice);
                  count++;
              }
          }
      }
      alert(`Generated ${count} recurring invoices!`);
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
    let col = { 'manage-users': 'users', 'petty-cash': 'petty_cash', 'expenses': 'expenses', 'salaries': 'salaries', 'bank': 'bank_records', 'clients': 'clients', 'vendors': 'vendors', 'vendor-bills': 'vendor_bills' }[view];
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
  const filteredBills = useMemo(() => filterData(vendorBills), [vendorBills, selectedMonth, selectedYear, searchTerm]);

  const totals = useMemo(() => {
    const rev = filteredClients.reduce((a,c) => a + (Number(c.advanceReceived)||0), 0) + filteredPetty.reduce((a,c) => a + (Number(c.cashIn)||0), 0);
    const exp = filteredExp.reduce((a,c) => a + (Number(c.amount)||0), 0) + filteredSal.reduce((a,c) => a + (Number(c.totalPayable)||0), 0) + filteredPetty.reduce((a,c) => a + (Number(c.cashOut)||0), 0);
    
    // NEW: Calculate vendor pending from bills
    const totalVendorBills = filteredBills.reduce((a,c) => a + (Number(c.amount)||0), 0);
    const totalVendorPaid = filteredBills.reduce((a,c) => a + (Number(c.paidAmount)||0), 0);

    return { revenue: rev, expense: exp, profit: rev - exp, 
             vendorPending: totalVendorBills - totalVendorPaid,
             clientPending: clients.reduce((a,c) => a + ((Number(c.projectTotal)||0) - (Number(c.advanceReceived)||0)), 0)
    };
  }, [filteredPetty, filteredExp, filteredSal, clients, vendors, filteredBills]);

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

  const ActionButtons = ({ item, type }) => (
      <div className="flex gap-1 justify-center items-center">
          {item.proofUrl && <a href={item.proofUrl} target="_blank" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><LinkIcon size={16} /></a>}
          <button onClick={() => handleDuplicate(item)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Duplicate"><Copy size={16} /></button>
          {currentUser.role === 'Admin' && (
             <><button onClick={() => type === 'user' ? (setFormData({...item}), setIsEditingUser(true), setShowForm(true)) : handleEdit(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={16} /></button>
             <button onClick={() => type === 'user' ? deleteRecord('users', item.id) : handleDelete(item.id, type)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></>
          )}
      </div>
  );

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} error={authError} />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden text-slate-900">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 border-b border-slate-800 p-4 z-50 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3 text-white font-bold"><div className="bg-indigo-500 p-1.5 rounded-lg">LA</div> LeanAxis</div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-300 hover:text-white"><Menu size={24}/></button>
      </div>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-2xl`}>
        <div className="p-8 border-b border-slate-800 hidden md:block">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3"><div className="bg-gradient-to-r from-indigo-500 to-cyan-500 p-2 rounded-lg">LA</div> LeanAxis</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavButton id="reports" icon={FileText} label="Profit & Loss" />
          <div className="pt-4 px-4 text-xs font-bold text-slate-600 uppercase tracking-widest">Modules</div>
          <NavButton id="invoices" icon={FileText} label="Invoices" />
          <NavButton id="clients" icon={Briefcase} label="Clients" />
          <NavButton id="petty-cash" icon={Wallet} label="Petty Cash" />
          <NavButton id="expenses" icon={Receipt} label="Expenses" />
          <NavButton id="salaries" icon={Users} label="Salaries" />
          <NavButton id="vendor-bills" icon={FileText} label="Vendor Bills" />
          <NavButton id="vendors" icon={Truck} label="Vendors List" />
          <NavButton id="bank" icon={Building2} label="Bank" />
          {currentUser.role === 'Admin' && <><div className="pt-4 px-4 text-xs font-bold text-slate-600 uppercase tracking-widest">Admin</div><NavButton id="manage-users" icon={UserPlus} label="Users" /><NavButton id="settings" icon={Settings} label="Settings" /></>}
        </nav>
        <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-red-600 hover:border-red-600 hover:text-white transition-all font-bold text-sm"><Lock size={16}/> Logout</button></div>
      </aside>

      {/* OVERLAY */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* MAIN CONTENT */}
      <main className="md:ml-72 min-h-screen pt-20 md:pt-8 p-4 md:p-8 transition-all duration-300">
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div><h2 className="text-3xl font-bold text-slate-900 capitalize tracking-tight">{view.replace('-', ' ')}</h2></div>
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                {view !== 'dashboard' && <div className="relative flex-1 sm:w-64"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>}
                {['clients','expenses','petty-cash','salaries','bank','vendor-bills'].includes(view) && (
                    <div className="flex gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                        <select className="bg-transparent text-sm font-medium outline-none cursor-pointer" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}><option value="All">All Months</option>{['January','February','March','April','May','June','July','August','September','October','November','December'].map(m=><option key={m}>{m}</option>)}</select>
                        <div className="w-px bg-slate-200 mx-1"></div>
                        <select className="bg-transparent text-sm font-medium outline-none cursor-pointer" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}><option value="All">All Years</option><option>2024</option><option>2025</option><option>2026</option></select>
                    </div>
                )}
                {!['dashboard','reports','invoices','settings'].includes(view) && <button onClick={()=>{setShowForm(true);setFormData({});setIsEditingUser(false);setIsEditingRecord(false);}} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"><Plus size={18}/> Add New</button>}
            </div>
        </header>

        {view === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                {[
                    { l:'Total Revenue', v:totals.revenue, i:ArrowDownLeft, c:'text-emerald-600', b:'bg-emerald-50' },
                    { l:'Total Expenses', v:totals.expense, i:ArrowUpRight, c:'text-rose-600', b:'bg-rose-50' },
                    { l:'Net Profit', v:totals.profit, i:Wallet, c:totals.profit>=0?'text-indigo-600':'text-orange-600', b:totals.profit>=0?'bg-indigo-50':'bg-orange-50' },
                    { l:'Pending Invoices', v:totals.clientPending, i:Clock, c:'text-amber-600', b:'bg-amber-50' }
                ].map((s,i) => <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"><div className="flex justify-between mb-4"><div className={`p-3.5 rounded-xl ${s.b} ${s.c}`}><s.i size={24}/></div></div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.l}</p><h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(s.v)}</h3></div>)}
                <div className="md:col-span-2 lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96 relative">
                    <h3 className="font-bold text-slate-800 mb-4 text-lg">Expense Breakdown</h3>
                    <ResponsiveContainer width="100%" height="90%"><RePieChart><Pie data={expenseChartData} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value" cornerRadius={6}>{expenseChartData.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} strokeWidth={0}/>)}</Pie><ChartTooltip formatter={formatCurrency} contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}/><Legend verticalAlign="bottom" iconType="circle"/></RePieChart></ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-4"><p className="text-xs font-bold text-slate-400 uppercase">Total Out</p><p className="text-xl font-bold text-slate-800">{formatCurrency(totals.expense)}</p></div>
                </div>
            </div>
        )}

        {view === 'reports' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Net Profit</h2>
                    <p className={`text-5xl font-bold tracking-tight ${totals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(totals.profit)}</p>
                    <p className="text-slate-400 text-sm mt-3 font-medium">Total Revenue - Total Expenses</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="font-bold text-emerald-700 mb-4 flex items-center gap-2"><ArrowDownLeft size={20}/> Income Breakdown</h3><div className="space-y-3">{[{l:'Client Advance',v:totals.revenue - filteredPetty.reduce((a,c)=>a+(Number(c.cashIn)||0),0)},{l:'Petty Cash In',v:filteredPetty.reduce((a,c)=>a+(Number(c.cashIn)||0),0)}].map((i,k)=><div key={k} className="flex justify-between p-4 bg-emerald-50 rounded-xl"><span className="text-emerald-900 font-medium">{i.l}</span><span className="font-bold text-emerald-700">{formatCurrency(i.v)}</span></div>)}</div></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="font-bold text-rose-700 mb-4 flex items-center gap-2"><ArrowUpRight size={20}/> Expense Breakdown</h3><div className="space-y-3">{expenseChartData.map((i,k)=><div key={k} className="flex justify-between p-4 bg-rose-50 rounded-xl"><span className="text-rose-900 font-medium">{i.name}</span><span className="font-bold text-rose-700">{formatCurrency(i.value)}</span></div>)}</div></div>
                </div>
            </div>
        )}

        {view === 'invoices' && <InvoiceGenerator clients={clients} onSave={(inv) => saveToFirebase('invoices', inv, inv.id)} savedInvoices={invoices} onDeleteInvoice={(id) => handleDelete(id, 'invoice')} onGenerateRecurring={handleGenerateRecurring} />}

        {/* GENERIC TABLE RENDERER - Responsive Wrapper */}
        {['clients','vendors','petty-cash','expenses','salaries','bank','manage-users','vendor-bills'].includes(view) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px] border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                                {view==='clients' && <><th className="p-5">Date</th><th className="p-5">Client</th><th className="p-5 text-right">Total</th><th className="p-5 text-right">Paid</th><th className="p-5 text-right">Due</th><th className="p-5">Status</th></>}
                                {view==='vendors' && <><th className="p-5">Vendor</th><th className="p-5">Type</th><th className="p-5 text-right">Total</th><th className="p-5 text-right">Paid</th><th className="p-5 text-right">Due</th></>}
                                {view==='vendor-bills' && <><th className="p-5">Date</th><th className="p-5">Bill #</th><th className="p-5">Vendor</th><th className="p-5">Description</th><th className="p-5 text-right">Amount</th><th className="p-5 text-right">Paid</th><th className="p-5 text-right">Due</th><th className="p-5">Status</th></>}
                                {view==='expenses' && <><th className="p-5">Date</th><th className="p-5">Category</th><th className="p-5">Desc</th><th className="p-5 text-right">Amount</th></>}
                                {view==='manage-users' && <><th className="p-5">Username</th><th className="p-5">Email</th><th className="p-5">Role</th></>}
                                {view==='petty-cash' && <><th className="p-5">Date</th><th className="p-5">Desc</th><th className="p-5 text-right">Out</th><th className="p-5 text-right">In</th><th className="p-5">Payment</th></>}
                                {view==='salaries' && <><th className="p-5">Date</th><th className="p-5">Employee</th><th className="p-5 text-right">Total</th><th className="p-5">Payment</th></>}
                                {view==='bank' && <><th className="p-5">Date</th><th className="p-5">Bank</th><th className="p-5 text-right">Amount</th><th className="p-5">Status</th></>}
                                <th className="p-5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(view==='clients'?filteredClients:view==='vendors'?filteredVendors:view==='vendor-bills'?filteredBills:view==='expenses'?filteredExp:view==='petty-cash'?filteredPetty:view==='salaries'?filteredSal:view==='bank'?bankRecords:users).map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    {view==='clients' && <><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5 font-bold text-slate-800">{item.name}</td><td className="p-5 text-right font-medium text-slate-600">{formatCurrency(item.projectTotal)}</td><td className="p-5 text-right text-emerald-600 font-medium">{formatCurrency(item.advanceReceived)}</td><td className="p-5 text-right text-rose-600 font-bold">{formatCurrency((item.projectTotal||0)-(item.advanceReceived||0))}</td><td className="p-5"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase">{item.status}</span></td></>}
                                    {view==='vendors' && <><td className="p-5 font-bold text-slate-800">{item.name}</td><td className="p-5 text-sm text-slate-500">{item.serviceType}</td><td className="p-5 text-right font-medium text-slate-600">{formatCurrency(item.amountPayable)}</td><td className="p-5 text-right text-emerald-600 font-medium">{formatCurrency(item.amountPaid)}</td><td className="p-5 text-right text-rose-600 font-bold">{formatCurrency((item.amountPayable||0)-(item.amountPaid||0))}</td></>}
                                    {view==='vendor-bills' && <><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5 font-bold text-slate-800">{item.billNumber}</td><td className="p-5 font-medium text-indigo-600">{item.vendor}</td><td className="p-5 text-sm text-slate-500">{item.description}</td><td className="p-5 text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td><td className="p-5 text-right text-emerald-600 font-medium">{formatCurrency(item.paidAmount)}</td><td className="p-5 text-right text-rose-600 font-bold">{formatCurrency(Number(item.amount) - Number(item.paidAmount))}</td><td className="p-5"><span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${Number(item.amount)-Number(item.paidAmount)<=0 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{Number(item.amount)-Number(item.paidAmount)<=0 ? 'Paid' : 'Due'}</span></td></>}
                                    {view==='expenses' && <><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5"><span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold">{item.category}</span></td><td className="p-5 text-sm text-slate-700">{item.description}</td><td className="p-5 text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td></>}
                                    {view==='manage-users' && <><td className="p-5 font-bold text-slate-800">{item.username}</td><td className="p-5 text-sm text-slate-600">{item.email}</td><td className="p-5"><span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{item.role}</span></td></>}
                                    {view==='petty-cash' && <><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5 text-sm font-medium text-slate-800">{item.description}</td><td className="p-5 text-right font-bold text-rose-600">{item.cashOut?formatCurrency(item.cashOut):'-'}</td><td className="p-5 text-right font-bold text-emerald-600">{item.cashIn?formatCurrency(item.cashIn):'-'}</td><td className="p-5 text-xs">{item.bankName ? `${item.bankName} - ${item.chequeNumber}` : 'Cash'}</td></>}
                                    {view==='salaries' && <><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5 font-bold text-slate-800">{item.employeeName}</td><td className="p-5 text-right font-bold text-slate-800">{formatCurrency(item.totalPayable)}</td><td className="p-5 text-xs">{item.bankName ? `${item.bankName} - ${item.chequeNumber}` : 'Cash'}</td></>}
                                    {view==='bank' && <><td className="p-5 text-sm text-slate-500">{item.date}</td><td className="p-5 font-bold text-blue-600">{item.bank}</td><td className="p-5 text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td><td className="p-5"><span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${item.status==='Cleared'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{item.status}</span></td></>}
                                    
                                    <td className="p-5 text-center"><ActionButtons item={item} type={view==='vendor-bills'?'bill':view==='manage-users'?'user':view.replace('s','')} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* SETTINGS VIEW - Updated with Expense Categories */}
        {view === 'settings' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-lg mx-auto mt-10">
                <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><Settings size={20} className="text-indigo-600"/> Configuration</h3>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Expense Categories</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {expenseCategories.map(cat => (
                                <span key={cat} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                                    {cat} 
                                    <button onClick={() => setExpenseCategories(expenseCategories.filter(c => c !== cat))} className="hover:text-red-500"><X size={14}/></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                className="border border-slate-200 p-3 rounded-xl w-full text-sm outline-none focus:border-indigo-500" 
                                placeholder="Add new category... (Press Enter)" 
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && e.target.value) {
                                        setExpenseCategories([...expenseCategories, e.target.value]);
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>
                    </div>

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

        {/* FORM MODAL - Updated Styles */}
        {showForm && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
                    <div className="flex justify-between mb-8 border-b border-slate-100 pb-4"><h3 className="text-2xl font-bold text-slate-800">Add / Edit Record</h3><button onClick={()=>setShowForm(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24}/></button></div>
                    <form onSubmit={handleAddSubmit} className="space-y-5">
                        {view==='manage-users' && <><input required placeholder="Username" className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.username||''} onChange={e=>setFormData({...formData,username:e.target.value})}/><input type="email" required placeholder="Email" className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/><input type="password" placeholder="Password (leave blank to keep)" className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.password||''} onChange={e=>setFormData({...formData,password:e.target.value})}/><select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.role||'Viewer'} onChange={e=>setFormData({...formData,role:e.target.value})}><option>Viewer</option><option>Editor</option><option>Admin</option></select></>}
                        {view==='clients' && <><input type="date" required className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input required placeholder="Client Name" className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/><input type="number" placeholder="Project Total" className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.projectTotal||''} onChange={e=>setFormData({...formData,projectTotal:e.target.value})}/><input type="number" placeholder="Advance" className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.advanceReceived||''} onChange={e=>setFormData({...formData,advanceReceived:e.target.value})}/><select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.status||'Ongoing'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Ongoing</option><option>Completed</option></select></>}
                        {!['manage-users','clients','vendor-bills'].includes(view) && <><input type="date" required className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input placeholder="Description/Name" className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.description||formData.name||''} onChange={e=>setFormData({...formData,[view==='vendors'?'name':'description']:e.target.value})}/><input type="number" placeholder="Amount" className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.amount||formData.cashOut||formData.totalPayable||formData.amountPayable||''} onChange={e=>setFormData({...formData,[view==='petty-cash'?'cashOut':view==='vendors'?'amountPayable':view==='salaries'?'totalPayable':'amount']:e.target.value})}/></>}
                        
                        {view === 'vendor-bills' && (
                            <>
                                <input type="date" required className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                <select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white" value={formData.vendor || ''} onChange={e => setFormData({ ...formData, vendor: e.target.value })}>
                                    <option value="">Select Vendor</option>
                                    {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                </select>
                                <input placeholder="Bill # / Invoice Ref" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.billNumber || ''} onChange={e => setFormData({ ...formData, billNumber: e.target.value })} />
                                <input placeholder="Description" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Total Bill Amount" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                                    <input type="number" placeholder="Amount Paid" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.paidAmount || ''} onChange={e => setFormData({ ...formData, paidAmount: e.target.value })} />
                                </div>
                            </>
                        )}

                        {view === 'expenses' && (
                            <select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.category || 'General'} onChange={e => setFormData({...formData, category: e.target.value})}>
                                {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        )}

                        {(view === 'salaries' || view === 'petty-cash') && (
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                <div className="col-span-2 text-xs font-bold text-slate-500 uppercase">Payment Details (Optional)</div>
                                <input placeholder="Bank Name" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.bankName || ''} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                                <input placeholder="Cheque Number" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.chequeNumber || ''} onChange={e => setFormData({...formData, chequeNumber: e.target.value})} />
                            </div>
                        )}

                        <div className="border-t border-slate-100 pt-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-4 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"><Upload size={18} className="text-slate-400"/><span className="text-sm font-medium text-slate-600">{fileToUpload?fileToUpload.name:"Attach Proof (Image/PDF)"}</span><input type="file" className="hidden" onChange={e=>setFileToUpload(e.target.files[0])}/></label>
                        </div>
                        <button disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2">{isSubmitting?<><RefreshCw className="animate-spin" size={20}/> Saving...</>:<><CheckCircle size={20}/> Save Record</>}</button>
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