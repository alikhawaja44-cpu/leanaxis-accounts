import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Wallet, Receipt, Users, Building2, Briefcase, Truck,
  Plus, Download, Trash2, ArrowUpRight, ArrowDownLeft, Calendar, LogIn, Lock, UserPlus, Edit, Menu, X, CheckCircle, Clock, Upload, Link as LinkIcon, Copy, RefreshCw, FileInput, Settings, FileDown, Search, Filter, FileText, Printer, DollarSign, Percent, CreditCard, Check, Share2, Database
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

// --- GLOBAL ERROR HANDLER ---
window.onerror = function(msg, url, lineNo, columnNo, error) {
    const errorDiv = document.getElementById('global-error');
    if (errorDiv) {
        errorDiv.style.display = 'block';
        errorDiv.innerText = `System Error: ${msg} (Line ${lineNo})`;
    }
    return false;
};

// --- LOGO COMPONENT ---
const Logo = ({ className, white = false }) => (
    <div className={`flex items-center gap-3 ${className}`}>
        {/* Try to load the image first, fallback to text */}
        <img src="./logo.png" alt="LeanAxis" className="h-10 object-contain" onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
        }} />
        <div className="hidden flex-col leading-none">
            <span className={`text-xl font-bold tracking-tight ${white ? 'text-white' : 'text-slate-800'}`}>LEAN<span className="text-violet-500">AXIS</span></span>
            <span className={`text-[0.6rem] font-bold uppercase tracking-[0.2em] ${white ? 'text-slate-400' : 'text-slate-500'}`}>Creative Agency</span>
        </div>
    </div>
);

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) return (
        <div className="p-8 text-center bg-rose-50 min-h-screen flex flex-col items-center justify-center font-sans">
          <h1 className="text-3xl font-bold text-rose-600 mb-4">Something went wrong.</h1>
          <p className="text-rose-800 bg-rose-100 p-4 rounded-xl mb-6 max-w-md break-words font-mono text-sm shadow-sm">{this.state.error && this.state.error.toString()}</p>
          <button onClick={() => window.location.reload()} className="bg-rose-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">Reload Application</button>
        </div>
    );
    return this.props.children;
  }
}

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
  if (!data || !data.length) { alert("No data to export!"); return; }
  const cleanData = data.map(item => {
      const row = { ...item };
      if (row.items && Array.isArray(row.items)) row.items = row.items.map(i => `${i.desc} (${i.qty}x${i.rate})`).join('; ');
      return row;
  });
  const csv = Papa.unparse(cleanData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
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
        }, (error) => { console.error("Firebase sync error:", error); setLoading(false); });
        return () => unsubscribe();
    }, [collectionName]);
    return [data, loading];
}
function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try { const stickyValue = window.localStorage.getItem(key); return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue; } catch (e) { return defaultValue; }
  });
  useEffect(() => { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('LocalStorage failed:', e); } }, [key, value]);
  return [value, setValue];
}
function useExpenseCategories() {
    const [categories, setCategories] = useState(['General', 'Office Rent', 'Utilities', 'Travel', 'Software', 'Meals', 'Other']);
    const [storedCats, setStoredCats] = useStickyState(categories, 'leanaxis_expense_categories');
    return [storedCats, setStoredCats];
}

// --- LOGIN COMPONENT ---
const LoginView = ({ onLogin, loading, error }) => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] font-sans p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-fuchsia-600/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
      
      <div className="bg-slate-900/40 backdrop-blur-2xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 relative z-10">
        <div className="flex flex-col items-center mb-10">
           <img src="./logo.png" alt="LeanAxis" className="h-20 object-contain mb-4 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block'}}/>
           <div className="hidden text-white font-bold text-5xl tracking-tight mb-2">LEAN<span className="text-violet-400">AXIS</span></div>
           <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">Creative Agency</p>
        </div>
        <form onSubmit={(e)=>{e.preventDefault(); onLogin(loginInput, password);}} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Username</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-violet-400 transition-colors"><Briefcase size={18}/></div>
                <input type="text" required className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} placeholder="Agency ID" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-violet-400 transition-colors"><Lock size={18}/></div>
                <input type="password" required className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          {error && <div className="text-rose-400 text-sm text-center bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1"><X size={16} /> {error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-violet-500/25 transition-all transform hover:scale-[1.02] active:scale-95 flex justify-center gap-2 items-center mt-4">
            {loading ? 'Verifying...' : <><LogIn size={20} /> Access Portal</>}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- INVOICE GENERATOR ---
const InvoiceGenerator = ({ clients, onSave, savedInvoices, onDeleteInvoice, onGenerateRecurring, onReceivePayment }) => {
    const [viewMode, setViewMode] = useState('list'); 
    const [invoiceData, setInvoiceData] = useState({ client: '', date: new Date().toISOString().split('T')[0], items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0 });
    const addItem = () => setInvoiceData({...invoiceData, items: [...invoiceData.items, { desc: '', qty: 1, rate: 0 }]});
    const updateItem = (index, field, val) => { const newItems = [...invoiceData.items]; newItems[index][field] = val; setInvoiceData({...invoiceData, items: newItems}); };
    const removeItem = (index) => { if(invoiceData.items.length > 1) setInvoiceData({...invoiceData, items: invoiceData.items.filter((_, i) => i !== index)}); };
    const { subtotal, tax, total } = calculateTax(invoiceData.items.reduce((acc, item) => acc + (item.qty * item.rate), 0), invoiceData.taxRate);

    useEffect(() => {
        if (invoiceData.client && viewMode === 'create') {
            const client = clients.find(c => c.name === invoiceData.client);
            if (client) {
                const isDefaultItem = invoiceData.items.length === 1 && !invoiceData.items[0].desc && invoiceData.items[0].rate === 0;
                if (isDefaultItem) {
                    const newItems = [];
                    const retainer = Number(client.retainerAmount);
                    if (retainer > 0) newItems.push({ desc: 'Monthly Retainer Service', qty: 1, rate: retainer });
                    else {
                        const total = Number(client.projectTotal) || 0;
                        const advance = Number(client.advanceReceived) || 0;
                        const balance = total - advance;
                        if (balance > 0) newItems.push({ desc: `Balance Payment for ${client.projectName || 'Project'}`, qty: 1, rate: balance });
                    }
                    if (newItems.length > 0) setInvoiceData(prev => ({ ...prev, items: newItems }));
                }
            }
        }
    }, [invoiceData.client, clients, viewMode]);

    const handleShareWhatsApp = () => {
        if (!invoiceData.client || total === 0) return alert("Please select a client and add items first.");
        const message = `*INVOICE* from LeanAxis Agency%0A` + `To: ${invoiceData.client}%0A` + `Date: ${invoiceData.date}%0A%0A` + invoiceData.items.map(item => `- ${item.desc}: Rs ${item.rate * item.qty}`).join('%0A') + `%0A%0A*Total: ${formatCurrency(total)}*`;
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    if (viewMode === 'list') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Invoices</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                         <label className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:shadow">
                            <Upload size={18}/> <span className="hidden sm:inline">Import</span> <input type="file" className="hidden" accept=".csv" onChange={(e) => {
                                const file = e.target.files[0];
                                if(file) Papa.parse(file, { header: true, complete: async (results) => { const batch = writeBatch(db); results.data.forEach(row => { if(row.client) { const ref = doc(collection(db, 'invoices')); batch.set(ref, { ...row, createdAt: new Date().toISOString() }); } }); await batch.commit(); alert(`Imported ${results.data.length} invoices!`); } });
                            }}/>
                        </label>
                        <button onClick={() => exportToCSV(savedInvoices, 'Invoices_Export')} className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm hover:shadow"><Download size={18}/> <span className="hidden sm:inline">Export</span></button>
                        <div className="hidden sm:block w-px bg-slate-300 mx-1"></div>
                        <button onClick={onGenerateRecurring} className="flex-1 sm:flex-none bg-white border border-violet-200 text-violet-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-violet-50 transition-all shadow-sm hover:shadow-violet-100"><RefreshCw size={18}/> Retainers</button>
                        <button onClick={() => { setInvoiceData({ client: '', date: new Date().toISOString().split('T')[0], items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0 }); setViewMode('create'); }} className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-200 transition-all hover:scale-105 active:scale-95"><Plus size={18}/> Create</button>
                    </div>
                </div>
                {savedInvoices.length === 0 ? (
                    <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><FileText className="text-slate-300" size={40} /></div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No invoices yet</h3>
                        <p className="text-slate-500 text-sm">Create your first invoice to get started.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <tr><th className="p-6">Date</th><th className="p-6">Client</th><th className="p-6 text-right">Total</th><th className="p-6 text-center">Status</th><th className="p-6 text-center">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {savedInvoices.map(inv => {
                                    const invTotal = calculateTax(inv.items.reduce((a, i) => a + (i.qty * i.rate), 0), inv.taxRate).total;
                                    const isPaid = inv.status === 'Paid';
                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-6 text-sm text-slate-500 font-medium">{inv.date}</td>
                                            <td className="p-6 font-bold text-slate-800 text-base">{inv.client}</td>
                                            <td className="p-6 text-right font-bold text-violet-600 text-base">{formatCurrency(invTotal)}</td>
                                            <td className="p-6 text-center"><span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status || 'Draft'}</span></td>
                                            <td className="p-6 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!isPaid && <button onClick={() => onReceivePayment(inv, invTotal)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors" title="Mark Paid"><CheckCircle size={18} /></button>}
                                                <button onClick={() => { setInvoiceData(inv); setViewMode('create'); }} className="p-2 text-violet-400 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"><Edit size={18} /></button>
                                                <button onClick={() => onDeleteInvoice(inv.id)} className="p-2 text-rose-400 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }
    return (
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
                <button onClick={() => setViewMode('list')} className="text-slate-400 hover:text-violet-600 flex items-center gap-2 text-sm font-bold transition-colors group"><ArrowDownLeft className="rotate-90 group-hover:-translate-x-1 transition-transform" size={16}/> Back to List</button>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start mb-10 border-b border-slate-100 pb-8 gap-6">
                <div>
                    <img src="./logo.png" alt="LeanAxis" className="h-14 object-contain mb-4" onError={(e)=>{e.target.style.display='none'}}/>
                    <h2 className="text-4xl font-bold text-slate-900 hidden">INVOICE</h2>
                    <p className="text-slate-500 font-medium">Creative Agency & Solutions</p>
                </div>
                <div className="text-left md:text-right">
                    <div className="bg-violet-100 text-violet-700 font-bold py-1.5 px-4 rounded-lg text-sm mb-3 inline-block shadow-sm">DRAFT INVOICE</div>
                    <p className="text-slate-400 font-medium">Date: {invoiceData.date}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bill To</label><select className="w-full border-none bg-white p-4 rounded-xl text-base font-semibold shadow-sm focus:ring-2 focus:ring-violet-500 outline-none" value={invoiceData.client} onChange={e => setInvoiceData({...invoiceData, client: e.target.value})}><option value="">Select Client</option>{clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Details</label><div className="flex gap-3"><input type="date" className="w-full border-none bg-white p-4 rounded-xl text-base font-semibold shadow-sm focus:ring-2 focus:ring-violet-500 outline-none text-slate-600" value={invoiceData.date} onChange={e => setInvoiceData({...invoiceData, date: e.target.value})} /><input type="number" placeholder="Tax %" className="w-32 border-none bg-white p-4 rounded-xl text-base font-semibold shadow-sm focus:ring-2 focus:ring-violet-500 outline-none" value={invoiceData.taxRate} onChange={e => setInvoiceData({...invoiceData, taxRate: e.target.value})} /></div></div>
            </div>
            <div className="overflow-x-auto mb-8">
                <table className="w-full min-w-[600px]">
                    <thead><tr className="border-b border-slate-200"><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-left pl-4">Description</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-24 text-center">Qty</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-36 text-right">Rate</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-40 text-right pr-4">Amount</th><th className="w-10"></th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{invoiceData.items.map((item, i) => (<tr key={i} className="group"><td className="py-4 pl-4"><input className="w-full bg-transparent outline-none font-medium text-slate-700 placeholder-slate-300" placeholder="Item description" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} /></td><td className="py-4 text-center"><input type="number" className="w-full bg-transparent outline-none text-slate-600 text-center" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} /></td><td className="py-4 text-right"><input type="number" className="w-full bg-transparent outline-none text-slate-600 text-right" value={item.rate} onChange={e => updateItem(i, 'rate', Number(e.target.value))} /></td><td className="py-4 text-right pr-4 font-bold text-slate-800">{formatCurrency(item.qty * item.rate)}</td><td className="py-4 text-center"><button onClick={() => removeItem(i)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td></tr>))}</tbody>
                </table>
            </div>
            <button onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-800 mb-10 px-4 py-2 hover:bg-violet-50 rounded-lg transition-colors w-max"><Plus size={16}/> Add Line Item</button>
            <div className="flex justify-end mb-10"><div className="w-full md:w-80 space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100"><div className="flex justify-between text-sm text-slate-500 font-medium"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-sm text-slate-500 font-medium"><span>Tax ({invoiceData.taxRate}%)</span><span>{formatCurrency(tax)}</span></div><div className="flex justify-between text-2xl font-bold text-slate-800 border-t border-slate-200 pt-4 mt-2"><span>Total</span><span className="text-violet-600">{formatCurrency(total)}</span></div></div></div>
            <div className="flex flex-col md:flex-row gap-4 print:hidden">
                <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 transition-colors"><Printer size={18}/> Print / PDF</button>
                <button onClick={handleShareWhatsApp} className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-xl font-bold hover:bg-[#20bd5a] transition-colors shadow-lg shadow-green-200"><Share2 size={18}/> WhatsApp</button>
                <button onClick={() => { onSave(invoiceData); setViewMode('list'); }} className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-4 rounded-xl font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"><CheckCircle size={18}/> Save Invoice</button>
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [paymentAccount, setPaymentAccount] = useState('bank');
  
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
              setIsAuthenticated(true); setCurrentUser(user); 
              if (user.password === password) updateDoc(doc(db, 'users', user.id), { password: inputHash });
              return;
          }
      }
      if (users.length === 0 && loginInput === 'admin' && password === 'admin123') { setIsAuthenticated(true); setCurrentUser({ username: 'admin', role: 'Admin' }); return; }
      setAuthError('Invalid credentials');
  };

  const handleLogout = () => { setIsAuthenticated(false); setCurrentUser(null); setView('dashboard'); };
  const deleteRecord = async (collectionName, id) => { if(confirm('Are you sure you want to delete this record?')) await deleteDoc(doc(db, collectionName, id)); };
  const handleDelete = (id, type) => {
    if (currentUser.role !== 'Admin') return alert('Access Denied');
    const map = { 'petty': 'petty_cash', 'expense': 'expenses', 'salary': 'salaries', 'bank': 'bank_records', 'client': 'clients', 'vendor': 'vendors', 'user': 'users', 'invoice': 'invoices', 'bill': 'vendor_bills' };
    if (map[type]) deleteRecord(map[type], id);
  };
  const handleEdit = (item) => { if (currentUser.role !== 'Admin') return alert('Access Denied'); setFormData({ ...item }); setIsEditingRecord(true); setShowForm(true); };
  const handleDuplicate = (item) => { const { id, createdAt, lastEditedAt, ...dataToCopy } = item; setFormData({ ...dataToCopy, date: new Date().toISOString().split('T')[0] }); setIsEditingRecord(false); setShowForm(true); };
  
  const handleMasterExport = () => {
    const dataToExport = { clients, vendors, pettyCash, expenses, salaries, bankRecords, invoices, vendorBills, users };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `LeanAxis_Backup_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };
  const handleImport = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    if (!confirm("Merge imported data into current database?")) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result); const batch = writeBatch(db); let count = 0;
            const collections = { 'clients': 'clients', 'vendors': 'vendors', 'pettyCash': 'petty_cash', 'expenses': 'expenses', 'salaries': 'salaries', 'bankRecords': 'bank_records', 'invoices': 'invoices', 'vendorBills': 'vendor_bills' };
            for (const [key, colName] of Object.entries(collections)) {
                if (importedData[key]) importedData[key].forEach(item => { const { id, ...data } = item; const ref = doc(collection(db, colName)); batch.set(ref, data); count++; });
            }
            await batch.commit(); alert(`Successfully imported ${count} records!`); window.location.reload();
        } catch (error) { console.error("Import failed:", error); alert("Failed to import data."); }
    };
    reader.readAsText(file);
  };
  const handleGenerateRecurring = async () => {
      if(!confirm("Generate draft invoices for retainers?")) return;
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' }); let count = 0;
      for (const client of clients) {
          if (Number(client.retainerAmount) > 0) {
              const exists = invoices.some(inv => inv.client === client.name && new Date(inv.date).toLocaleString('default', { month: 'long', year: 'numeric' }) === currentMonth);
              if (!exists) {
                  await addDoc(collection(db, 'invoices'), { client: client.name, date: new Date().toISOString().split('T')[0], items: [{ desc: `Monthly Retainer - ${currentMonth}`, qty: 1, rate: Number(client.retainerAmount) }], taxRate: 0, status: 'Draft', addedBy: currentUser.username, createdAt: new Date().toISOString() });
                  count++;
              }
          }
      }
      alert(`Generated ${count} recurring invoices!`);
  };
  const uploadFile = async (file) => {
      if (!file || !imgbbKey) return null; setUploadProgress('Uploading...');
      const fd = new FormData(); fd.append("image", file);
      try { const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: "POST", body: fd }); const d = await res.json(); if (d.success) { setUploadProgress('Done!'); return d.data.url; } } catch (e) { alert("Upload failed"); } return null;
  };
  const saveToFirebase = async (collectionName, data, id = null) => {
      setIsSubmitting(true);
      try {
          let proofUrl = data.proofUrl; if (fileToUpload) proofUrl = await uploadFile(fileToUpload);
          let finalData = { ...data, date: data.date || new Date().toISOString().split('T')[0], proofUrl: proofUrl || null };
          if (collectionName === 'users' && finalData.password) finalData.password = await hashPassword(finalData.password);
          if (collectionName === 'users' && !finalData.password && id) delete finalData.password;
          if (id) await updateDoc(doc(db, collectionName, id), { ...finalData, lastEditedBy: currentUser.username });
          else await addDoc(collection(db, collectionName), { ...finalData, addedBy: currentUser.username, createdAt: new Date().toISOString() });
          setShowForm(false); setFormData({}); setFileToUpload(null); setIsEditingRecord(false); setIsEditingUser(false);
      } catch (e) { alert("Error saving"); console.error(e); } finally { setIsSubmitting(false); }
  };
  const handleAddSubmit = (e) => {
    e.preventDefault();
    let col = { 'manage-users': 'users', 'petty-cash': 'petty_cash', 'expenses': 'expenses', 'salaries': 'salaries', 'bank': 'bank_records', 'clients': 'clients', 'vendors': 'vendors', 'vendor-bills': 'vendor_bills' }[view];
    if (col) saveToFirebase(col, formData, (isEditingRecord || isEditingUser) ? formData.id : null);
  };
  const initiatePayment = (item, type, amount) => { setPaymentConfig({ data: item, type, amount }); setPaymentAccount('bank'); setShowPaymentModal(true); };
  const executePayment = async () => {
      if (!paymentConfig) return;
      const { data, type, amount } = paymentConfig; const date = new Date().toISOString().split('T')[0]; const batch = writeBatch(db);
      try {
          if (type === 'bill') {
              batch.update(doc(db, 'vendor_bills', data.id), { paidAmount: amount, status: 'Paid' });
              const recordData = { date, description: `Bill Payment: ${data.vendor} (#${data.billNumber})`, amount: Number(amount), createdAt: new Date().toISOString() };
              if (paymentAccount === 'bank') batch.set(doc(collection(db, 'bank_records')), { ...recordData, amount: -Number(amount), bank: 'Linked Payment', status: 'Cleared' });
              else batch.set(doc(collection(db, 'petty_cash')), { ...recordData, cashOut: Number(amount), cashIn: 0 });
          } else if (type === 'invoice') {
              batch.update(doc(db, 'invoices', data.id), { status: 'Paid' });
              const recordData = { date, description: `Inv Payment: ${data.client}`, createdAt: new Date().toISOString() };
              if (paymentAccount === 'bank') batch.set(doc(collection(db, 'bank_records')), { ...recordData, amount: Number(amount), bank: 'Linked Payment', status: 'Cleared' });
              else batch.set(doc(collection(db, 'petty_cash')), { ...recordData, cashIn: Number(amount), cashOut: 0 });
          }
          await batch.commit(); setShowPaymentModal(false);
      } catch (e) { console.error(e); alert("Error linking payment."); }
  };
  const filterData = (items) => {
    let res = items;
    if (selectedMonth !== 'All' || selectedYear !== 'All') {
        res = res.filter(i => { const d = new Date(i.date || i.createdAt); return (selectedMonth === 'All' || d.toLocaleString('default',{month:'long'}) === selectedMonth) && (selectedYear === 'All' || d.getFullYear().toString() === selectedYear); });
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
    const totalVendorBills = filteredBills.reduce((a,c) => a + (Number(c.amount)||0), 0);
    const totalVendorPaid = filteredBills.reduce((a,c) => a + (Number(c.paidAmount)||0), 0);
    return { revenue: rev, expense: exp, profit: rev - exp, vendorPending: totalVendorBills - totalVendorPaid, clientPending: clients.reduce((a,c) => a + ((Number(c.projectTotal)||0) - (Number(c.advanceReceived)||0)), 0) };
  }, [filteredPetty, filteredExp, filteredSal, clients, vendors, filteredBills]);

  const expenseChartData = [ { name: 'Petty', value: filteredPetty.reduce((a,c) => a+(Number(c.cashOut)||0),0) }, { name: 'Expenses', value: filteredExp.reduce((a,c) => a+(Number(c.amount)||0),0) }, { name: 'Salaries', value: filteredSal.reduce((a,c) => a+(Number(c.totalPayable)||0),0) } ].filter(d => d.value > 0);
  const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B']; // New Violet/Pink theme colors

  const NavButton = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setView(id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden ${view === id ? 'bg-white text-violet-700 shadow-xl shadow-violet-900/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r-full transition-transform duration-300 ${view === id ? 'scale-y-100' : 'scale-y-0'}`}></div>
      <Icon size={20} className={`transition-transform duration-300 ${view === id ? 'scale-110' : 'group-hover:scale-110'}`} /> <span className="font-bold text-sm tracking-wide">{label}</span>
    </button>
  );

  const ActionButtons = ({ item, type }) => (
      <div className="flex gap-2 justify-center items-center">
          {item.proofUrl && <a href={item.proofUrl} target="_blank" className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-100 transition-colors shadow-sm"><LinkIcon size={16} /></a>}
          <button onClick={() => handleDuplicate(item)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors shadow-sm" title="Duplicate"><Copy size={16} /></button>
          {currentUser.role === 'Admin' && (
             <><button onClick={() => type === 'user' ? (setFormData({...item}), setIsEditingUser(true), setShowForm(true)) : handleEdit(item)} className="p-2 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors shadow-sm"><Edit size={16} /></button>
             <button onClick={() => type === 'user' ? deleteRecord('users', item.id) : handleDelete(item.id, type)} className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors shadow-sm"><Trash2 size={16} /></button></>
          )}
      </div>
  );
  const handleGenericImport = (event, collectionName) => {
      const file = event.target.files[0]; if (!file) return;
      Papa.parse(file, { header: true, complete: async (results) => { if (results.data.length === 0) return alert("File empty!"); if (!confirm(`Import ${results.data.length} records?`)) return; const batch = writeBatch(db); results.data.forEach(row => { if (Object.values(row).some(v => v)) { const ref = doc(collection(db, collectionName)); batch.set(ref, { ...row, createdAt: new Date().toISOString() }); } }); await batch.commit(); alert("Import successful!"); } });
  };

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} error={authError} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-violet-100 selection:text-violet-900">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-[#0F172A]/95 backdrop-blur-md border-b border-white/5 p-4 z-50 flex justify-between items-center shadow-lg">
        <Logo white={true} />
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/5"><Menu size={24}/></button>
      </div>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-80 bg-[#0F172A] flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-2xl overflow-hidden`}>
        {/* Abstract shapes for visual interest */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="p-8 pb-4 relative z-10">
            <Logo white={true} className="mb-8" />
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-4">Main Menu</div>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-slate-700">
          <NavButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavButton id="reports" icon={FileText} label="Analytics & P&L" />
          <div className="pt-6 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Operations</div>
          <NavButton id="invoices" icon={FileText} label="Invoices" />
          <NavButton id="clients" icon={Briefcase} label="Clients" />
          <NavButton id="petty-cash" icon={Wallet} label="Petty Cash" />
          <NavButton id="expenses" icon={Receipt} label="Expenses" />
          <NavButton id="salaries" icon={Users} label="Team Salaries" />
          <NavButton id="vendor-bills" icon={FileText} label="Vendor Bills" />
          <NavButton id="vendors" icon={Truck} label="Vendors" />
          <NavButton id="bank" icon={Building2} label="Bank Accounts" />
          {currentUser.role === 'Admin' && (
              <>
                <div className="pt-6 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Administration</div>
                <NavButton id="manage-users" icon={UserPlus} label="User Management" />
                <NavButton id="settings" icon={Settings} label="Configuration" />
                <button onClick={handleMasterExport} className="w-full flex items-center gap-4 px-5 py-3.5 mt-2 rounded-2xl text-emerald-400 hover:bg-emerald-500/10 transition-all font-bold text-sm tracking-wide group">
                    <Database size={20} className="group-hover:scale-110 transition-transform"/> Backup Data
                </button>
              </>
          )}
        </nav>
        <div className="p-6 border-t border-slate-800 bg-[#0F172A] relative z-20">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl bg-slate-800/50 text-slate-300 hover:bg-rose-600 hover:text-white transition-all font-bold text-sm shadow-lg"><Lock size={16}/> Sign Out</button>
        </div>
      </aside>

      {/* OVERLAY */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/80 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* MAIN CONTENT */}
      <main className="md:ml-80 min-h-screen pt-24 md:pt-10 p-6 md:p-10 transition-all duration-300">
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <h2 className="text-4xl font-extrabold text-slate-900 capitalize tracking-tight mb-1">{view.replace('-', ' ')}</h2>
                <p className="text-slate-500 font-medium">Overview & Management</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                {view !== 'dashboard' && <div className="relative flex-1 sm:w-72 group"><Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20}/><input className="w-full pl-12 pr-4 py-3 rounded-2xl border-none bg-white shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium text-slate-600" placeholder="Search records..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>}
                {['clients','expenses','petty-cash','salaries','bank','vendor-bills','vendors'].includes(view) && (
                    <div className="flex gap-3">
                        <label className="bg-white px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-violet-300 hover:text-violet-600 transition-all cursor-pointer flex items-center gap-2">
                            <Upload size={18}/> <span className="hidden sm:inline">Import</span> <input type="file" className="hidden" accept=".csv" onChange={(e) => handleGenericImport(e, view === 'petty-cash' ? 'petty_cash' : view === 'vendor-bills' ? 'vendor_bills' : view)}/>
                        </label>
                        <button onClick={() => { const dataMap = { 'clients': filteredClients, 'vendors': filteredVendors, 'petty-cash': filteredPetty, 'expenses': filteredExp, 'salaries': filteredSal, 'bank': bankRecords, 'vendor-bills': filteredBills }; exportToCSV(dataMap[view], `${view}_Export`); }} className="bg-white px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-violet-300 hover:text-violet-600 transition-all flex items-center gap-2">
                            <Download size={18}/> <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>
                )}
                {['clients','expenses','petty-cash','salaries','bank','vendor-bills'].includes(view) && (
                    <div className="flex gap-3 bg-white p-1.5 rounded-2xl shadow-sm ring-1 ring-slate-200">
                        <select className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer px-2 py-1.5 hover:text-violet-600" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}><option value="All">All Months</option>{['January','February','March','April','May','June','July','August','September','October','November','December'].map(m=><option key={m}>{m}</option>)}</select>
                        <div className="w-px bg-slate-200 my-1"></div>
                        <select className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer px-2 py-1.5 hover:text-violet-600" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}><option value="All">All Years</option><option>2024</option><option>2025</option><option>2026</option></select>
                    </div>
                )}
                {!['dashboard','reports','invoices','settings'].includes(view) && <button onClick={()=>{setShowForm(true);setFormData({});setIsEditingUser(false);setIsEditingRecord(false);}} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 hover:scale-105 active:scale-95 transition-all"><Plus size={20}/> New Entry</button>}
            </div>
        </header>

        {view === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                {[
                    { l:'Total Revenue', v:totals.revenue, i:ArrowDownLeft, c:'text-emerald-600', b:'bg-emerald-50 ring-emerald-100' },
                    { l:'Total Expenses', v:totals.expense, i:ArrowUpRight, c:'text-rose-600', b:'bg-rose-50 ring-rose-100' },
                    { l:'Net Profit', v:totals.profit, i:Wallet, c:totals.profit>=0?'text-violet-600':'text-orange-600', b:totals.profit>=0?'bg-violet-50 ring-violet-100':'bg-orange-50 ring-orange-100' },
                    { l:'Pending Invoices', v:totals.clientPending, i:Clock, c:'text-amber-600', b:'bg-amber-50 ring-amber-100' }
                ].map((s,i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-4 rounded-2xl ring-1 ${s.b} ${s.c} transition-transform group-hover:scale-110 duration-300`}><s.i size={28}/></div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.profit>=0?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>YTD</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.l}</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(s.v)}</h3>
                    </div>
                ))}
                
                <div className="md:col-span-2 lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-96 relative">
                    <h3 className="font-bold text-slate-800 mb-6 text-lg flex items-center gap-2"><div className="w-2 h-6 bg-rose-500 rounded-full"></div> Expense Distribution</h3>
                    <ResponsiveContainer width="100%" height="85%"><RePieChart><Pie data={expenseChartData} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" cornerRadius={8}>{expenseChartData.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} strokeWidth={0}/>)}</Pie><ChartTooltip formatter={formatCurrency} contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding:'12px'}}/><Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{paddingTop:'20px'}}/></RePieChart></ResponsiveContainer>
                    <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Out</p>
                        <p className="text-2xl font-extrabold text-slate-800">{formatCurrency(totals.expense)}</p>
                    </div>
                </div>
            </div>
        )}

        {view === 'reports' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-12 rounded-3xl shadow-2xl text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                    <h2 className="text-3xl font-bold text-white mb-2 relative z-10">Net Profit</h2>
                    <p className={`text-6xl md:text-7xl font-extrabold tracking-tight my-6 relative z-10 ${totals.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(totals.profit)}</p>
                    <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-slate-300 text-sm font-bold backdrop-blur-sm relative z-10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Revenue vs Expenses
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100"><h3 className="font-bold text-emerald-700 mb-6 flex items-center gap-3 text-lg"><div className="p-2 bg-emerald-100 rounded-lg"><ArrowDownLeft size={24}/></div> Income Sources</h3><div className="space-y-4">{[{l:'Client Advance',v:totals.revenue - filteredPetty.reduce((a,c)=>a+(Number(c.cashIn)||0),0)},{l:'Petty Cash In',v:filteredPetty.reduce((a,c)=>a+(Number(c.cashIn)||0),0)}].map((i,k)=><div key={k} className="flex justify-between items-center p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50"><span className="text-emerald-900 font-bold">{i.l}</span><span className="font-extrabold text-emerald-600 text-lg">{formatCurrency(i.v)}</span></div>)}</div></div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100"><h3 className="font-bold text-rose-700 mb-6 flex items-center gap-3 text-lg"><div className="p-2 bg-rose-100 rounded-lg"><ArrowUpRight size={24}/></div> Expense Breakdown</h3><div className="space-y-4">{expenseChartData.map((i,k)=><div key={k} className="flex justify-between items-center p-5 bg-rose-50/50 rounded-2xl border border-rose-100/50"><span className="text-rose-900 font-bold">{i.name}</span><span className="font-extrabold text-rose-600 text-lg">{formatCurrency(i.value)}</span></div>)}</div></div>
                </div>
            </div>
        )}

        {view === 'invoices' && <InvoiceGenerator clients={clients} onSave={(inv) => saveToFirebase('invoices', inv, inv.id)} savedInvoices={invoices} onDeleteInvoice={(id) => handleDelete(id, 'invoice')} onGenerateRecurring={handleGenerateRecurring} onReceivePayment={(inv, amt) => initiatePayment(inv, 'invoice', amt)} />}

        {/* GENERIC TABLE RENDERER */}
        {['clients','vendors','petty-cash','expenses','salaries','bank','manage-users','vendor-bills'].includes(view) && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                            <tr>
                                {view==='clients' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Client</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Paid</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Due</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th></>}
                                {view==='vendors' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Paid</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Due</th></>}
                                {view==='vendor-bills' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Bill #</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Desc</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Paid</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Due</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th></>}
                                {view==='expenses' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Desc</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Details</th></>}
                                {view==='manage-users' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Username</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th></>}
                                {view==='petty-cash' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Desc</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Out</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">In</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Details</th></>}
                                {view==='salaries' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Details</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th></>}
                                {view==='bank' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Bank</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th></>}
                                <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(view==='clients'?filteredClients:view==='vendors'?filteredVendors:view==='vendor-bills'?filteredBills:view==='expenses'?filteredExp:view==='petty-cash'?filteredPetty:view==='salaries'?filteredSal:view==='bank'?bankRecords:users).map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                    {view==='clients' && <><td className="p-6 text-sm text-slate-500 font-medium">{item.date}</td><td className="p-6 font-bold text-slate-800 text-base">{item.name}</td><td className="p-6 text-right font-medium text-slate-600">{formatCurrency(item.projectTotal)}</td><td className="p-6 text-right text-emerald-600 font-bold">{formatCurrency(item.advanceReceived)}</td><td className="p-6 text-right text-rose-600 font-bold">{formatCurrency((item.projectTotal||0)-(item.advanceReceived||0))}</td><td className="p-6"><span className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold uppercase tracking-wide">{item.status}</span></td></>}
                                    {view==='vendors' && <><td className="p-6 font-bold text-slate-800">{item.name}</td><td className="p-6 font-bold text-slate-800">{item.name}</td><td className="p-6 text-sm text-slate-500">{item.serviceType}</td><td className="p-6 text-right font-medium text-slate-600">{formatCurrency(item.amountPayable)}</td><td className="p-6 text-right text-emerald-600 font-medium">{formatCurrency(item.amountPaid)}</td><td className="p-6 text-right text-rose-600 font-bold">{formatCurrency((item.amountPayable||0)-(item.amountPaid||0))}</td></>}
                                    {view==='vendor-bills' && (() => { const due = Number(item.amount) - Number(item.paidAmount); const isPaid = due <= 0; return (<><td className="p-6 text-sm text-slate-500">{item.date}</td><td className="p-6 font-bold text-slate-800">{item.billNumber}</td><td className="p-6 font-bold text-violet-600">{item.vendor}</td><td className="p-6 text-sm text-slate-500">{item.description}</td><td className="p-6 text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td><td className="p-6 text-right text-emerald-600 font-medium">{formatCurrency(item.paidAmount)}</td><td className="p-6 text-right text-rose-600 font-bold">{formatCurrency(due)}</td><td className="p-6"><span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{isPaid ? 'Paid' : 'Due'}</span></td><td className="p-6 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">{!isPaid && <button onClick={() => initiatePayment(item, 'bill', due)} className="p-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-sm" title="Pay Now"><CreditCard size={16}/></button>}<ActionButtons item={item} type="bill" /></td></>); })()}
                                    {view==='expenses' && <><td className="p-6 text-sm text-slate-500">{item.date}</td><td className="p-6"><span className="px-3 py-1.5 bg-fuchsia-50 text-fuchsia-700 rounded-lg text-xs font-bold tracking-wide">{item.category}</span></td><td className="p-6 text-sm font-medium text-slate-700">{item.description}</td><td className="p-6 text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td><td className="p-6 text-xs text-slate-500 font-medium">{item.bankName ? <span className="flex items-center gap-1"><CreditCard size={12}/> {item.bankName} - {item.chequeNumber}</span> : 'Cash'}</td></>}
                                    {view==='manage-users' && <><td className="p-6 font-bold text-slate-800">{item.username}</td><td className="p-6 text-sm text-slate-600">{item.email}</td><td className="p-6"><span className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded-lg text-xs font-bold">{item.role}</span></td></>}
                                    {view==='petty-cash' && <><td className="p-6 text-sm text-slate-500">{item.date}</td><td className="p-6 text-sm font-bold text-slate-700">{item.description}</td><td className="p-6 text-right font-bold text-rose-600">{item.cashOut?formatCurrency(item.cashOut):'-'}</td><td className="p-6 text-right font-bold text-emerald-600">{item.cashIn?formatCurrency(item.cashIn):'-'}</td><td className="p-6 text-xs font-medium text-slate-500">{item.bankName ? `${item.bankName} - ${item.chequeNumber}` : 'Cash'}</td></>}
                                    {view==='salaries' && <><td className="p-6 text-sm text-slate-500">{item.date}</td><td className="p-6 font-bold text-slate-800">{item.employeeName}</td><td className="p-6 text-right font-bold text-slate-800">{formatCurrency(item.totalPayable)}</td><td className="p-6 text-xs font-medium text-slate-500">{item.bankName ? `${item.bankName} - ${item.chequeNumber}` : 'Cash'}</td><td className="p-6"><span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${item.status==='Paid'?'bg-emerald-100 text-emerald-700':item.status==='Pending'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>{item.status || 'Unpaid'}</span></td></>}
                                    {view==='bank' && <><td className="p-6 text-sm text-slate-500">{item.date}</td><td className="p-6 font-bold text-blue-600">{item.bank}</td><td className="p-6 text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td><td className="p-6"><span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${item.status==='Cleared'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{item.status}</span></td></>}
                                    
                                    {!['vendor-bills'].includes(view) && <td className="p-6 text-center opacity-0 group-hover:opacity-100 transition-opacity"><ActionButtons item={item} type={view === 'manage-users' ? 'user' : view === 'salaries' ? 'salary' : view === 'expenses' ? 'expense' : view === 'clients' ? 'client' : view === 'vendors' ? 'vendor' : view === 'petty-cash' ? 'petty' : view === 'bank' ? 'bank' : view.replace('s', '')} /></td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* SETTINGS VIEW */}
        {view === 'settings' && (
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 max-w-2xl mx-auto mt-10">
                <h3 className="text-2xl font-bold mb-8 text-slate-800 flex items-center gap-3"><div className="p-3 bg-violet-100 rounded-xl text-violet-600"><Settings size={24}/></div> Configuration</h3>
                <div className="space-y-8">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Expense Categories</label>
                        <div className="flex flex-wrap gap-2 mb-4">{expenseCategories.map(cat => (<span key={cat} className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">{cat} <button onClick={() => setExpenseCategories(expenseCategories.filter(c => c !== cat))} className="hover:text-rose-500 transition-colors"><X size={14}/></button></span>))}</div>
                        <div className="relative"><Plus size={18} className="absolute left-4 top-4 text-slate-400"/><input className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none transition-all" placeholder="Add new category... (Press Enter)" onKeyDown={e => { if(e.key === 'Enter' && e.target.value) { setExpenseCategories([...expenseCategories, e.target.value]); e.target.value = ''; } }}/></div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">ImgBB API Key (Image Hosting)</label>
                        <div className="flex gap-3"><input type="password" className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none" value={imgbbKey} onChange={e => setImgbbKey(e.target.value)} placeholder="Enter API key..." /><a href="https://api.imgbb.com/" target="_blank" className="bg-slate-100 text-slate-600 px-6 py-4 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Get Key</a></div>
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Data Management</label>
                         <div className="grid grid-cols-2 gap-4">
                             <button onClick={handleMasterExport} className="bg-violet-50 text-violet-700 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-violet-100 transition-colors"><Download size={20} /> Backup Data</button>
                             <label className="bg-slate-50 text-slate-700 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"><Upload size={20} /> Restore Data <input type="file" accept=".json" onChange={handleImport} className="hidden" /></label>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODALS */}
        {showPaymentModal && paymentConfig && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
                <div className="bg-white p-10 rounded-3xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95">
                    <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">{paymentConfig.type === 'bill' ? 'Pay Bill' : 'Receive Payment'}</h3>
                    <div className="bg-slate-50 p-6 rounded-2xl text-center mb-8 border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">{paymentConfig.data.vendor || paymentConfig.data.client}</p>
                        <p className="text-4xl font-extrabold text-slate-800">{formatCurrency(paymentConfig.amount)}</p>
                    </div>
                    <div className="space-y-6">
                        <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Method</label><div className="flex gap-3"><button onClick={() => setPaymentAccount('bank')} className={`flex-1 py-4 rounded-xl font-bold text-sm border-2 transition-all ${paymentAccount === 'bank' ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>Bank Transfer</button><button onClick={() => setPaymentAccount('cash')} className={`flex-1 py-4 rounded-xl font-bold text-sm border-2 transition-all ${paymentAccount === 'cash' ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>Petty Cash</button></div></div>
                        <div className="flex gap-4 pt-4"><button onClick={() => setShowPaymentModal(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button><button onClick={executePayment} className="flex-1 py-4 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all flex justify-center items-center gap-2">Confirm</button></div>
                    </div>
                </div>
            </div>
        )}

        {showForm && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white p-8 md:p-10 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6"><h3 className="text-2xl font-bold text-slate-800">Record Details</h3><button onClick={()=>setShowForm(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"><X size={20}/></button></div>
                    <form onSubmit={handleAddSubmit} className="space-y-6">
                         {/* DYNAMIC FORM FIELDS BASED ON VIEW - STYLED CONSISTENTLY */}
                        {view==='manage-users' && <><input required placeholder="Username" className="form-input" value={formData.username||''} onChange={e=>setFormData({...formData,username:e.target.value})}/><input type="email" required placeholder="Email" className="form-input" value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/><input type="password" placeholder="Password (leave blank to keep)" className="form-input" value={formData.password||''} onChange={e=>setFormData({...formData,password:e.target.value})}/><select className="form-select" value={formData.role||'Viewer'} onChange={e=>setFormData({...formData,role:e.target.value})}><option>Viewer</option><option>Editor</option><option>Admin</option></select></>}
                        {view==='clients' && <><input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input required placeholder="Client Name" className="form-input" value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/><input type="number" placeholder="Project Total" className="form-input" value={formData.projectTotal||''} onChange={e=>setFormData({...formData,projectTotal:e.target.value})}/><input type="number" placeholder="Advance Received" className="form-input" value={formData.advanceReceived||''} onChange={e=>setFormData({...formData,advanceReceived:e.target.value})}/><select className="form-select" value={formData.status||'Ongoing'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Ongoing</option><option>Completed</option></select></>}
                        {!['manage-users','clients','vendor-bills','salaries'].includes(view) && <><input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input placeholder="Description/Name" className="form-input" value={formData.description||formData.name||''} onChange={e=>setFormData({...formData,[view==='vendors'?'name':'description']:e.target.value})}/><input type="number" placeholder="Amount" className="form-input" value={formData.amount||formData.cashOut||formData.totalPayable||formData.amountPayable||''} onChange={e=>setFormData({...formData,[view==='petty-cash'?'cashOut':view==='vendors'?'amountPayable':view==='salaries'?'totalPayable':'amount']:e.target.value})}/></>}
                        {view === 'salaries' && <><input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})} /><input placeholder="Employee Name" className="form-input" value={formData.employeeName||''} onChange={e=>setFormData({...formData,employeeName:e.target.value})} /><input type="number" placeholder="Total Payable" className="form-input" value={formData.totalPayable||''} onChange={e=>setFormData({...formData,totalPayable:e.target.value})} /><select className="form-select" value={formData.status||'Unpaid'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Unpaid</option><option>Paid</option><option>Pending</option></select></>}
                        {view === 'vendor-bills' && <><input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})} /><select className="form-select" value={formData.vendor||''} onChange={e=>setFormData({...formData,vendor:e.target.value})}><option value="">Select Vendor</option>{vendors.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><input placeholder="Bill # / Ref" className="form-input" value={formData.billNumber||''} onChange={e=>setFormData({...formData,billNumber:e.target.value})} /><input placeholder="Description" className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})} /><div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Total" className="form-input" value={formData.amount||''} onChange={e=>setFormData({...formData,amount:e.target.value})} /><input type="number" placeholder="Paid" className="form-input" value={formData.paidAmount||''} onChange={e=>setFormData({...formData,paidAmount:e.target.value})} /></div></>}
                        {view === 'expenses' && <select className="form-select" value={formData.category||'General'} onChange={e=>setFormData({...formData,category:e.target.value})}>{expenseCategories.map(c=><option key={c} value={c}>{c}</option>)}</select>}
                        {(view==='salaries'||view==='petty-cash'||view==='expenses') && <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Details (Optional)</label><div className="grid grid-cols-2 gap-4"><input placeholder="Bank Name" className="form-input bg-white" value={formData.bankName||''} onChange={e=>setFormData({...formData,bankName:e.target.value})} /><input placeholder="Cheque #" className="form-input bg-white" value={formData.chequeNumber||''} onChange={e=>setFormData({...formData,chequeNumber:e.target.value})} /></div></div>}
                        <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-5 rounded-2xl hover:bg-violet-50 transition-colors border-2 border-dashed border-slate-200 hover:border-violet-300 group"><div className="p-2 bg-white rounded-full text-slate-400 group-hover:text-violet-500 shadow-sm"><Upload size={20}/></div><span className="text-sm font-bold text-slate-500 group-hover:text-violet-600">{fileToUpload?fileToUpload.name:"Attach Receipt / Proof"}</span><input type="file" className="hidden" onChange={e=>setFileToUpload(e.target.files[0])}/></label>
                        <button disabled={isSubmitting} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all transform hover:scale-[1.01] active:scale-95 flex justify-center items-center gap-2">{isSubmitting?<RefreshCw className="animate-spin" size={20}/>:<CheckCircle size={20}/>} {isSubmitting?'Saving...':'Save Record'}</button>
                    </form>
                    <style>{`.form-input { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; background: #F8FAFC; outline: none; transition: all; font-weight: 500; font-size: 0.95rem; } .form-input:focus { background: white; border-color: #8B5CF6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); } .form-select { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; background: white; outline: none; font-weight: 500; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }`}</style>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);