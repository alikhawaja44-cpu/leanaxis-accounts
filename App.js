import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Wallet, Receipt, Users, Building2, Briefcase, Truck,
  Plus, Download, Trash2, ArrowUpRight, ArrowDownLeft, Calendar, LogIn, Lock, UserPlus, Edit, Menu, X, CheckCircle, Clock, Upload, Link as LinkIcon, Copy, RefreshCw, FileInput, Settings, FileDown, Search, Filter, FileText, Printer, DollarSign, Percent, CreditCard, Check, Share2, Database, BookOpen, FileCheck, Landmark
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
  if (!data || !data.length) { window.__leanaxisToast?.('No data to export!', 'warning'); return; }
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

// --- TOAST NOTIFICATION SYSTEM ---
const ToastContext = React.createContext(null);
const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className={`pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm max-w-sm animate-in slide-in-from-right-4 duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : toast.type === 'warning' ? 'bg-amber-500' : 'bg-slate-800'}`}>
                        <span className="flex-1">{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"><X size={16}/></button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
const useToast = () => React.useContext(ToastContext);

// Helper to ensure html2pdf is loaded
const loadPdfLibrary = () => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) return resolve(window.html2pdf);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve(window.html2pdf);
    script.onerror = reject;
    document.head.appendChild(script);
  });
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
const LoginView = ({ onLogin, loading: externalLoading, error }) => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onLogin(loginInput, password);
    setIsLoading(false);
  };
  const loading = externalLoading || isLoading;
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
        <form onSubmit={handleSubmit} className="space-y-6">
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

// --- QUOTATION GENERATOR ---
const QuotationGenerator = ({ clients, onSave, savedQuotations, onDeleteQuotation, onConvertToInvoice }) => {
    const toast = useToast();
    const [viewMode, setViewMode] = useState('list'); 
    const [quoteData, setQuoteData] = useState({ client: '', date: new Date().toISOString().split('T')[0], items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0, status: 'Pending' });
    const addItem = () => setQuoteData({...quoteData, items: [...quoteData.items, { desc: '', qty: 1, rate: 0 }]});
    const updateItem = (index, field, val) => { const newItems = [...quoteData.items]; newItems[index][field] = val; setQuoteData({...quoteData, items: newItems}); };
    const removeItem = (index) => { if(quoteData.items.length > 1) setQuoteData({...quoteData, items: quoteData.items.filter((_, i) => i !== index)}); };
    const { subtotal, tax, total } = calculateTax(quoteData.items.reduce((acc, item) => acc + (item.qty * item.rate), 0), quoteData.taxRate);

    const handleShareWhatsApp = () => {
        if (!quoteData.client || total === 0) return toast("Please select a client and add items first.", "warning");
        const message = `*QUOTATION* from LeanAxis Agency%0A` + `To: ${quoteData.client}%0A` + `Date: ${quoteData.date}%0A%0A` + quoteData.items.map(item => `- ${item.desc}: Rs ${item.rate * item.qty}`).join('%0A') + `%0A%0A*Total Estimate: ${formatCurrency(total)}*`;
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    if (viewMode === 'list') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Quotations</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => { setQuoteData({ client: '', date: new Date().toISOString().split('T')[0], items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0, status: 'Pending' }); setViewMode('create'); }} className="flex-1 sm:flex-none bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all hover:scale-105 active:scale-95"><Plus size={18}/> New Quote</button>
                    </div>
                </div>
                {savedQuotations.length === 0 ? (
                    <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
                        <div className="bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><FileCheck className="text-amber-300" size={40} /></div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No quotations yet</h3>
                        <p className="text-slate-500 text-sm">Create an estimate for your clients.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <tr><th className="p-6">Date</th><th className="p-6">Client</th><th className="p-6 text-right">Total</th><th className="p-6 text-center">Status</th><th className="p-6 text-center">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {savedQuotations.map(q => {
                                    const qTotal = calculateTax(q.items.reduce((a, i) => a + (i.qty * i.rate), 0), q.taxRate).total;
                                    return (
                                        <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-6 text-sm text-slate-500 font-medium">{q.date}</td>
                                            <td className="p-6 font-bold text-slate-800 text-base">{q.client}</td>
                                            <td className="p-6 text-right font-bold text-amber-600 text-base">{formatCurrency(qTotal)}</td>
                                            <td className="p-6 text-center"><span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${q.status === 'Converted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{q.status}</span></td>
                                            <td className="p-6 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {q.status !== 'Converted' && <button onClick={() => onConvertToInvoice(q)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors" title="Convert to Invoice"><CheckCircle size={18} /></button>}
                                                <button onClick={() => { setQuoteData(q); setViewMode('create'); }} className="p-2 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"><Edit size={18} /></button>
                                                <button onClick={() => onDeleteQuotation(q.id)} className="p-2 text-rose-400 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"><Trash2 size={18} /></button>
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
                <button onClick={() => setViewMode('list')} className="text-slate-400 hover:text-amber-600 flex items-center gap-2 text-sm font-bold transition-colors group"><ArrowDownLeft className="rotate-90 group-hover:-translate-x-1 transition-transform" size={16}/> Back to List</button>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start mb-10 border-b border-slate-100 pb-8 gap-6">
                <div>
                    <img src="./logo.png" alt="LeanAxis" className="h-14 object-contain mb-4" onError={(e)=>{e.target.style.display='none'}}/>
                    <h2 className="text-4xl font-bold text-slate-900 hidden">QUOTATION</h2>
                    <p className="text-slate-500 font-medium">Creative Agency & Solutions</p>
                </div>
                <div className="text-left md:text-right">
                    <div className="bg-amber-100 text-amber-700 font-bold py-1.5 px-4 rounded-lg text-sm mb-3 inline-block shadow-sm">QUOTATION</div>
                    <p className="text-slate-400 font-medium">Date: {quoteData.date}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quotation For</label><select className="w-full border-none bg-white p-4 rounded-xl text-base font-semibold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none" value={quoteData.client} onChange={e => setQuoteData({...quoteData, client: e.target.value})}><option value="">Select Client</option>{clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Details</label><div className="flex gap-3"><input type="date" className="w-full border-none bg-white p-4 rounded-xl text-base font-semibold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-600" value={quoteData.date} onChange={e => setQuoteData({...quoteData, date: e.target.value})} /><input type="number" placeholder="Tax %" className="w-32 border-none bg-white p-4 rounded-xl text-base font-semibold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none" value={quoteData.taxRate} onChange={e => setQuoteData({...quoteData, taxRate: e.target.value})} /></div></div>
            </div>
            <div className="overflow-x-auto mb-8">
                <table className="w-full min-w-[600px]">
                    <thead><tr className="border-b border-slate-200"><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-left pl-4">Description</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-24 text-center">Qty</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-36 text-right">Rate</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-40 text-right pr-4">Amount</th><th className="w-10"></th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{quoteData.items.map((item, i) => (<tr key={i} className="group"><td className="py-4 pl-4"><input className="w-full bg-transparent outline-none font-medium text-slate-700 placeholder-slate-300" placeholder="Item description" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} /></td><td className="py-4 text-center"><input type="number" className="w-full bg-transparent outline-none text-slate-600 text-center" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} /></td><td className="py-4 text-right"><input type="number" className="w-full bg-transparent outline-none text-slate-600 text-right" value={item.rate} onChange={e => updateItem(i, 'rate', Number(e.target.value))} /></td><td className="py-4 text-right pr-4 font-bold text-slate-800">{formatCurrency(item.qty * item.rate)}</td><td className="py-4 text-center"><button onClick={() => removeItem(i)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td></tr>))}</tbody>
                </table>
            </div>
            <button onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-800 mb-10 px-4 py-2 hover:bg-amber-50 rounded-lg transition-colors w-max"><Plus size={16}/> Add Line Item</button>
            <div className="flex justify-end mb-10"><div className="w-full md:w-80 space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100"><div className="flex justify-between text-sm text-slate-500 font-medium"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-sm text-slate-500 font-medium"><span>Tax ({quoteData.taxRate}%)</span><span>{formatCurrency(tax)}</span></div><div className="flex justify-between text-2xl font-bold text-slate-800 border-t border-slate-200 pt-4 mt-2"><span>Estimate Total</span><span className="text-amber-600">{formatCurrency(total)}</span></div></div></div>
            <div className="flex flex-col md:flex-row gap-4 print:hidden">
                <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 transition-colors"><Printer size={18}/> Print / PDF</button>
                <button onClick={handleShareWhatsApp} className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-xl font-bold hover:bg-[#20bd5a] transition-colors shadow-lg shadow-green-200"><Share2 size={18}/> WhatsApp</button>
                <button onClick={() => { onSave(quoteData); setViewMode('list'); }} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-4 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"><CheckCircle size={18}/> Save Quote</button>
            </div>
        </div>
    );
};

// --- INVOICE GENERATOR ---
const InvoiceGenerator = ({ clients, onSave, savedInvoices, onDeleteInvoice, onGenerateRecurring, onReceivePayment }) => {
    const toast = useToast();
    const [viewMode, setViewMode] = useState('list'); 
    const [invoiceData, setInvoiceData] = useState({ client: '', date: new Date().toISOString().split('T')[0], dueDate: '', items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0 });
    const [invoiceNumber, setInvoiceNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`);
    const [invSearch, setInvSearch] = useState('');
    const [invStatusFilter, setInvStatusFilter] = useState('All');
    const [invMonthFilter, setInvMonthFilter] = useState('All');
    const addItem = () => setInvoiceData({...invoiceData, items: [...invoiceData.items, { desc: '', qty: 1, rate: 0 }]});
    const updateItem = (index, field, val) => { const newItems = [...invoiceData.items]; newItems[index][field] = val; setInvoiceData({...invoiceData, items: newItems}); };
    const removeItem = (index) => { if(invoiceData.items.length > 1) setInvoiceData({...invoiceData, items: invoiceData.items.filter((_, i) => i !== index)}); };
    const { subtotal, tax, total } = calculateTax(invoiceData.items.reduce((acc, item) => acc + (item.qty * item.rate), 0), invoiceData.taxRate);

    const handleShareWhatsApp = () => {
        if (!invoiceData.client || total === 0) return toast('Please select a client and add items first.', 'warning');
        const message = `*INVOICE* from LeanAxis Agency%0ATo: ${invoiceData.client}%0AInvoice #: ${invoiceNumber}%0ADate: ${invoiceData.date}%0A%0A` + invoiceData.items.map(item => `- ${item.desc}: Rs ${item.rate * item.qty}`).join('%0A') + `%0A%0ASubtotal: ${formatCurrency(subtotal)}%0ATax (${invoiceData.taxRate}%): ${formatCurrency(tax)}%0A*Total: ${formatCurrency(total)}*`;
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

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
                        const t = Number(client.projectTotal) || 0;
                        const advance = Number(client.advanceReceived) || 0;
                        const balance = t - advance;
                        if (balance > 0) newItems.push({ desc: `Balance Payment for ${client.projectName || 'Project'}`, qty: 1, rate: balance });
                    }
                    if (newItems.length > 0) setInvoiceData(prev => ({ ...prev, items: newItems }));
                }
            }
        }
    }, [invoiceData.client, clients, viewMode]);

    const handleDownloadPDF = async () => {
        try {
            await loadPdfLibrary();
            const element = document.getElementById('invoice-content');
            if (!element) return;
            const opt = { margin: 0.5, filename: `Invoice_${invoiceNumber}_${invoiceData.client}_${invoiceData.date}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
            window.html2pdf().set(opt).from(element).save();
            toast('PDF downloaded!', 'success');
        } catch (e) { toast('PDF library failed to load.', 'error'); }
    };

    const displayedInvoices = useMemo(() => {
        return savedInvoices.filter(inv => {
            const matchSearch = !invSearch || inv.client?.toLowerCase().includes(invSearch.toLowerCase()) || (inv.invoiceNumber || '').toLowerCase().includes(invSearch.toLowerCase());
            const matchStatus = invStatusFilter === 'All' || (inv.status || 'Draft') === invStatusFilter;
            const matchMonth = invMonthFilter === 'All' || new Date(inv.date).toLocaleString('default', { month: 'long' }) === invMonthFilter;
            return matchSearch && matchStatus && matchMonth;
        });
    }, [savedInvoices, invSearch, invStatusFilter, invMonthFilter]);

    const invStats = useMemo(() => {
        const paid = savedInvoices.filter(i => i.status === 'Paid').reduce((a, inv) => a + calculateTax((inv.items || []).reduce((s, it) => s + (it.qty * it.rate), 0), inv.taxRate).total, 0);
        const unpaid = savedInvoices.filter(i => i.status !== 'Paid').reduce((a, inv) => a + calculateTax((inv.items || []).reduce((s, it) => s + (it.qty * it.rate), 0), inv.taxRate).total, 0);
        const today = new Date(); today.setHours(0,0,0,0);
        const overdue = savedInvoices.filter(i => i.status !== 'Paid' && i.dueDate && new Date(i.dueDate) < today).length;
        return { paid, unpaid, overdue };
    }, [savedInvoices]);

    if (viewMode === 'list') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Invoices</h2>
                    <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                        <label className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
                            <Upload size={18}/> <span className="hidden sm:inline">Import</span>
                            <input type="file" className="hidden" accept=".csv" onChange={(e) => { const file = e.target.files[0]; if(file) Papa.parse(file, { header: true, complete: async (results) => { const batch = writeBatch(db); results.data.forEach(row => { if(row.client) { const ref = doc(collection(db, 'invoices')); batch.set(ref, { ...row, createdAt: new Date().toISOString() }); } }); await batch.commit(); toast(`Imported ${results.data.length} invoices!`, 'success'); } }); }}/>
                        </label>
                        <button onClick={() => exportToCSV(savedInvoices, 'Invoices_Export')} className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><Download size={18}/> <span className="hidden sm:inline">Export</span></button>
                        <button onClick={onGenerateRecurring} className="flex-1 sm:flex-none bg-white border border-violet-200 text-violet-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-violet-50 transition-all shadow-sm"><RefreshCw size={18}/> Retainers</button>
                        <button onClick={() => { setInvoiceData({ client: '', date: new Date().toISOString().split('T')[0], dueDate: '', items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0 }); setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`); setViewMode('create'); }} className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-200 transition-all hover:scale-105 active:scale-95"><Plus size={18}/> Create</button>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl"><p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Collected</p><p className="text-xl font-extrabold text-emerald-800">{formatCurrency(invStats.paid)}</p></div>
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl"><p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Outstanding</p><p className="text-xl font-extrabold text-amber-800">{formatCurrency(invStats.unpaid)}</p></div>
                    <div className={`${invStats.overdue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'} border p-4 rounded-2xl`}><p className={`text-xs font-bold uppercase tracking-widest mb-1 ${invStats.overdue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Overdue</p><p className={`text-xl font-extrabold ${invStats.overdue > 0 ? 'text-rose-800' : 'text-slate-600'}`}>{invStats.overdue} invoice{invStats.overdue !== 1 ? 's' : ''}</p></div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none" placeholder="Search by client or invoice #..." value={invSearch} onChange={e => setInvSearch(e.target.value)}/></div>
                    <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl flex-shrink-0">
                        {['All','Draft','Paid','Unpaid'].map(s => <button key={s} onClick={() => setInvStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${invStatusFilter===s ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-violet-600'}`}>{s}</button>)}
                    </div>
                    <select className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 outline-none flex-shrink-0" value={invMonthFilter} onChange={e => setInvMonthFilter(e.target.value)}>
                        <option value="All">All Months</option>
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m}>{m}</option>)}
                    </select>
                </div>
                {displayedInvoices.length === 0 ? (
                    <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><FileText className="text-slate-300" size={40} /></div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">{savedInvoices.length === 0 ? 'No invoices yet' : 'No matching invoices'}</h3>
                        <p className="text-slate-500 text-sm">{savedInvoices.length === 0 ? 'Create your first invoice to get started.' : 'Try adjusting your search or filters.'}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <tr><th className="p-5">Inv #</th><th className="p-5">Date</th><th className="p-5">Due</th><th className="p-5">Client</th><th className="p-5 text-right">Total</th><th className="p-5 text-center">Status</th><th className="p-5 text-center">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {displayedInvoices.map(inv => {
                                    const invTotal = calculateTax((inv.items || []).reduce((a, i) => a + (i.qty * i.rate), 0), inv.taxRate).total;
                                    const isPaid = inv.status === 'Paid';
                                    const today = new Date(); today.setHours(0,0,0,0);
                                    const isOverdue = !isPaid && inv.dueDate && new Date(inv.dueDate) < today;
                                    return (
                                        <tr key={inv.id} className={`hover:bg-slate-50/50 transition-colors group ${isOverdue ? 'bg-rose-50/20' : ''}`}>
                                            <td className="p-5 text-xs font-mono text-violet-600 font-bold">{inv.invoiceNumber || '—'}</td>
                                            <td className="p-5 text-sm text-slate-500 font-medium">{inv.date}</td>
                                            <td className="p-5 text-sm">{inv.dueDate ? <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}>{isOverdue ? '⚠ ' : ''}{inv.dueDate}</span> : <span className="text-slate-300">—</span>}</td>
                                            <td className="p-5 font-bold text-slate-800">{inv.client}</td>
                                            <td className="p-5 text-right font-bold text-violet-600">{formatCurrency(invTotal)}</td>
                                            <td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-full text-xs font-bold ${isPaid ? 'bg-emerald-100 text-emerald-700' : isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{isPaid ? 'Paid' : isOverdue ? 'Overdue' : (inv.status || 'Draft')}</span></td>
                                            <td className="p-5 text-center">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isPaid && <button onClick={() => onReceivePayment(inv, invTotal)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors" title="Mark Paid"><CheckCircle size={18}/></button>}
                                                    <button onClick={() => { setInvoiceData(inv); setInvoiceNumber(inv.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`); setViewMode('create'); }} className="p-2 text-violet-400 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"><Edit size={18}/></button>
                                                    <button onClick={() => onDeleteInvoice(inv.id)} className="p-2 text-rose-400 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                                </div>
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
            <div id="invoice-content" className="p-4">
                <div className="flex flex-col md:flex-row justify-between items-start mb-10 border-b border-slate-100 pb-8 gap-6">
                    <div>
                        <img src="./logo.png" alt="LeanAxis" className="h-14 object-contain mb-4" onError={(e)=>{e.target.style.display='none'}}/>
                        <p className="text-slate-500 font-medium">Creative Agency & Solutions</p>
                    </div>
                    <div className="text-left md:text-right">
                        <div className="bg-violet-100 text-violet-700 font-bold py-1.5 px-4 rounded-lg text-sm mb-2 inline-block shadow-sm">INVOICE</div>
                        <p className="text-slate-700 font-bold text-lg">#{invoiceNumber}</p>
                        <p className="text-slate-400 font-medium text-sm">Date: {invoiceData.date}</p>
                        {invoiceData.dueDate && <p className="text-rose-500 font-medium text-sm">Due: {invoiceData.dueDate}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bill To</label><select className="w-full border-none bg-white p-4 rounded-xl text-base font-semibold shadow-sm focus:ring-2 focus:ring-violet-500 outline-none" value={invoiceData.client} onChange={e => setInvoiceData({...invoiceData, client: e.target.value})}><option value="">Select Client</option>{clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dates & Tax</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-xs text-slate-400 mb-1 block">Invoice Date</label><input type="date" className="w-full border-none bg-white p-3 rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-violet-500 outline-none text-slate-600" value={invoiceData.date} onChange={e => setInvoiceData({...invoiceData, date: e.target.value})} /></div>
                            <div><label className="text-xs text-slate-400 mb-1 block">Due Date</label><input type="date" className="w-full border-none bg-white p-3 rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-rose-400 outline-none text-slate-600" value={invoiceData.dueDate || ''} onChange={e => setInvoiceData({...invoiceData, dueDate: e.target.value})} /></div>
                            <div className="col-span-2"><label className="text-xs text-slate-400 mb-1 block">Tax Rate (%)</label><input type="number" placeholder="0" className="w-full border-none bg-white p-3 rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-violet-500 outline-none" value={invoiceData.taxRate} onChange={e => setInvoiceData({...invoiceData, taxRate: e.target.value})} /></div>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto mb-8">
                    <table className="w-full min-w-[600px]">
                        <thead><tr className="border-b border-slate-200"><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-left pl-4">Description</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-24 text-center">Qty</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-36 text-right">Rate</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-40 text-right pr-4">Amount</th><th className="w-10"></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{invoiceData.items.map((item, i) => (<tr key={i} className="group"><td className="py-4 pl-4"><input className="w-full bg-transparent outline-none font-medium text-slate-700 placeholder-slate-300" placeholder="Item description" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} /></td><td className="py-4 text-center"><input type="number" className="w-full bg-transparent outline-none text-slate-600 text-center" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} /></td><td className="py-4 text-right"><input type="number" className="w-full bg-transparent outline-none text-slate-600 text-right" value={item.rate} onChange={e => updateItem(i, 'rate', Number(e.target.value))} /></td><td className="py-4 text-right pr-4 font-bold text-slate-800">{formatCurrency(item.qty * item.rate)}</td><td className="py-4 text-center"><button onClick={() => removeItem(i)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td></tr>))}</tbody>
                    </table>
                </div>
                <button onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-800 mb-10 px-4 py-2 hover:bg-violet-50 rounded-lg transition-colors w-max"><Plus size={16}/> Add Line Item</button>
                <div className="flex justify-end mb-10"><div className="w-full md:w-80 space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100"><div className="flex justify-between text-sm text-slate-500 font-medium"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-sm text-slate-500 font-medium"><span>Tax ({invoiceData.taxRate}%)</span><span>{formatCurrency(tax)}</span></div><div className="flex justify-between text-2xl font-bold text-slate-800 border-t border-slate-200 pt-4 mt-2"><span>Total</span><span className="text-violet-600">{formatCurrency(total)}</span></div></div></div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 print:hidden">
                <button onClick={handleDownloadPDF} className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 transition-colors"><Printer size={18}/> Download PDF</button>
                <button onClick={handleShareWhatsApp} className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-xl font-bold hover:bg-[#20bd5a] transition-colors shadow-lg shadow-green-200"><Share2 size={18}/> WhatsApp</button>
                <button onClick={() => { onSave({...invoiceData, invoiceNumber}); setViewMode('list'); }} className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-4 rounded-xl font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"><CheckCircle size={18}/> Save Invoice</button>
            </div>
        </div>
    );
};

// --- SALARY SLIP COMPONENT ---
const SalarySlip = ({ data, onClose }) => {
    const toast = useToast();
    if (!data) return null;

    const handleWhatsApp = () => {
        const message = `*SALARY SLIP* %0A` +
            `Period: ${new Date(data.date).toLocaleString('default', { month: 'long', year: 'numeric' })}%0A` +
            `Employee: ${data.employeeName}%0A` +
            `Net Pay: ${formatCurrency(data.totalPayable)}%0A` +
            `Status: Paid via ${data.bankName || 'Cash'}`;
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const handlePrint = async () => {
        try {
            await loadPdfLibrary();
            const element = document.getElementById('salary-slip-content');
            if (!element) return;
            const opt = {
                margin: 0.5,
                filename: `Salary_Slip_${data.employeeName}_${data.date}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            window.html2pdf().set(opt).from(element).save();
        } catch (e) {
            console.error(e);
            toast('PDF library failed to load. Please check your internet connection.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-end p-4 bg-slate-50 border-b border-slate-100">
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors shadow-sm"><X size={20}/></button>
                </div>
                
                <div className="overflow-y-auto p-8 md:p-12" id="salary-slip-content">
                    <div className="text-center border-b border-slate-100 pb-8 mb-8">
                        <div className="flex justify-center mb-4"><Logo /></div>
                        <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-widest">Payslip</h2>
                        <p className="text-slate-400 text-sm font-medium">Period: {new Date(data.date).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Employee</p>
                            <p className="text-xl font-bold text-slate-800">{data.employeeName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Date</p>
                            <p className="text-xl font-bold text-slate-800">{data.date}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-600 font-medium">Basic Salary</span>
                            <span className="text-slate-900 font-bold text-lg">{formatCurrency(data.basicSalary || data.totalPayable)}</span>
                        </div>
                        {data.taxDeduction > 0 && (
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-rose-600 font-medium">Tax Deducted</span>
                                <span className="text-rose-600 font-bold text-lg">-{formatCurrency(data.taxDeduction)}</span>
                            </div>
                        )}
                        {data.bankName && (
                            <div className="flex justify-between items-center text-sm text-slate-500 mb-4 pt-4 border-t border-slate-200">
                                <span>Payment Method</span>
                                <span className="font-medium">{data.bankName} {data.chequeNumber ? `(#${data.chequeNumber})` : ''}</span>
                            </div>
                        )}
                        <div className="border-t-2 border-slate-200 mt-4 pt-4 flex justify-between items-center">
                            <span className="text-xl font-bold text-slate-800">Net Pay</span>
                            <span className="text-3xl font-extrabold text-emerald-600">{formatCurrency(data.totalPayable)}</span>
                        </div>
                    </div>

                    <div className="text-center pt-8 mt-8 border-t border-slate-100">
                        <p className="text-slate-400 text-xs italic">This is a computer-generated document.</p>
                        <p className="text-slate-900 font-bold mt-2">LeanAxis Creative Agency</p>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
                    <button onClick={handlePrint} className="flex-1 bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 transition-colors flex justify-center items-center gap-2 shadow-sm"><Printer size={20}/> Download PDF</button>
                    <button onClick={handleWhatsApp} className="flex-1 bg-[#25D366] text-white py-4 rounded-xl font-bold hover:bg-[#20bd5a] transition-colors shadow-lg shadow-green-200 flex justify-center items-center gap-2"><Share2 size={20}/> Send via WhatsApp</button>
                </div>
            </div>
        </div>
    );
};

// --- CLIENT STATEMENT COMPONENT ---
const ClientStatement = ({ clients, invoices, bankRecords, pettyCash }) => {
    const [selectedClient, setSelectedClient] = useState('');
    const [statementData, setStatementData] = useState([]);

    useEffect(() => {
        if (!selectedClient) {
            setStatementData([]);
            return;
        }

        const cleanName = (name) => name ? name.toLowerCase().trim() : '';
        const target = cleanName(selectedClient);

        // 0. Get Client Record Data (Manual Sync)
        const clientRecord = clients.find(c => c.name === selectedClient);
        const manualAdvance = clientRecord && Number(clientRecord.advanceReceived) > 0 ? [{
            id: 'manual-adv',
            date: clientRecord.date || new Date().toISOString().split('T')[0],
            description: 'Opening Advance (from Client Record)',
            type: 'Opening Credit',
            debit: 0,
            credit: Number(clientRecord.advanceReceived),
            rawDate: new Date(clientRecord.date || 0) 
        }] : [];

        // 1. Get Invoices (Debits)
        const clientInvoices = invoices.filter(inv => cleanName(inv.client) === target).map(inv => ({
            id: inv.id,
            date: inv.date,
            description: `Invoice Service`,
            type: 'Invoice',
            debit: calculateTax(inv.items.reduce((a, i) => a + (i.qty * i.rate), 0), inv.taxRate).total,
            credit: 0,
            rawDate: new Date(inv.date)
        }));

        // 2. Get Payments (Credits) - Bank
        // Improved matching: Checks if description contains client name
        const clientBank = bankRecords.filter(r => cleanName(r.description).includes(target) && r.amount > 0).map(r => ({
            id: r.id,
            date: r.date,
            description: r.description,
            type: 'Payment (Bank)',
            debit: 0,
            credit: Number(r.amount),
            rawDate: new Date(r.date)
        }));

        // 3. Get Payments (Credits) - Petty Cash
        const clientCash = pettyCash.filter(r => cleanName(r.description).includes(target) && Number(r.cashIn) > 0).map(r => ({
            id: r.id,
            date: r.date,
            description: r.description,
            type: 'Payment (Cash)',
            debit: 0,
            credit: Number(r.cashIn),
            rawDate: new Date(r.date)
        }));

        // 4. Merge and Sort
        const allTrans = [...manualAdvance, ...clientInvoices, ...clientBank, ...clientCash].sort((a, b) => a.rawDate - b.rawDate);

        // 5. Calculate Running Balance
        let balance = 0;
        const finalData = allTrans.map(t => {
            balance += t.debit - t.credit;
            return { ...t, balance };
        });

        setStatementData(finalData);

    }, [selectedClient, clients, invoices, bankRecords, pettyCash]);

    const totalDebit = statementData.reduce((a, b) => a + b.debit, 0);
    const totalCredit = statementData.reduce((a, b) => a + b.credit, 0);
    const balanceDue = totalDebit - totalCredit;

    return (
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start mb-10 border-b border-slate-100 pb-8 gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Account Statement</h2>
                    <p className="text-slate-500 font-medium">Client Ledger & History</p>
                </div>
                <div className="w-full md:w-64">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Client</label>
                    <select className="w-full border border-slate-200 p-3 rounded-xl text-base font-semibold shadow-sm focus:ring-2 focus:ring-violet-500 outline-none bg-slate-50" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                        <option value="">Choose a Client...</option>
                        {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {selectedClient && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Billed</p>
                            <p className="text-2xl font-extrabold text-slate-800">{formatCurrency(totalDebit)}</p>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Paid</p>
                            <p className="text-2xl font-extrabold text-emerald-800">{formatCurrency(totalCredit)}</p>
                        </div>
                        <div className="bg-violet-50 p-6 rounded-2xl border border-violet-100">
                            <p className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-1">Balance Due</p>
                            <p className="text-2xl font-extrabold text-violet-800">{formatCurrency(balanceDue)}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto mb-8 bg-white rounded-2xl border border-slate-100">
                        <table className="w-full min-w-[600px] text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Debit</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Credit</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {statementData.map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                        <td className="p-4 text-sm font-medium text-slate-800">
                                            {item.description}
                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${item.type.includes('Invoice') ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>{item.type}</span>
                                        </td>
                                        <td className="p-4 text-sm text-right font-medium text-slate-600">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</td>
                                        <td className="p-4 text-sm text-right font-medium text-emerald-600">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</td>
                                        <td className="p-4 text-sm text-right font-bold text-violet-700">{formatCurrency(item.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end print:hidden">
                        <button onClick={() => window.print()} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200">
                            <Printer size={18}/> Print Statement
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// --- CLIENT PROFILE COMPONENT ---
const ClientProfile = ({ client, invoices, bankRecords, pettyCash, onBack, onViewInvoice }) => {
    const clientInvoices = useMemo(() => invoices.filter(inv =>
        (inv.client || '').toLowerCase().trim() === (client.name || '').toLowerCase().trim()
    ), [invoices, client]);

    const payments = useMemo(() => {
        const target = (client.name || '').toLowerCase().trim();
        const fromBank = bankRecords.filter(r =>
            (r.description || '').toLowerCase().includes(target) && Number(r.amount) > 0
        ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Number(r.amount), method: 'Bank Transfer', bank: r.bank }));
        const fromCash = pettyCash.filter(r =>
            (r.description || '').toLowerCase().includes(target) && Number(r.cashIn) > 0 &&
            !(r.description || '').toLowerCase().startsWith('inv payment:')
        ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Number(r.cashIn), method: 'Cash', bank: null }));
        // Payments linked via invoice executePayment (description = "Inv Payment: ClientName")
        const fromInvPayment = bankRecords.filter(r =>
            (r.description || '').toLowerCase() === `inv payment: ${target}` && Number(r.amount) > 0
        ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Number(r.amount), method: 'Bank (Invoice)', bank: r.bank }));
        const fromCashInvPayment = pettyCash.filter(r =>
            (r.description || '').toLowerCase() === `inv payment: ${target}` && Number(r.cashIn) > 0
        ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Number(r.cashIn), method: 'Cash (Invoice)', bank: null }));
        return [...fromBank, ...fromCash, ...fromInvPayment, ...fromCashInvPayment]
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [bankRecords, pettyCash, client]);

    const invoiceSummary = useMemo(() => clientInvoices.map(inv => {
        const total = calculateTax((inv.items || []).reduce((s, it) => s + ((it.qty||0)*(it.rate||0)), 0), inv.taxRate).total;
        const received = Number(inv.amountReceived) || 0;
        const outstanding = inv.status === 'Paid' ? 0 : total - received;
        return { ...inv, total, received, outstanding };
    }), [clientInvoices]);

    const totalBilled = invoiceSummary.reduce((a, i) => a + i.total, 0);
    const totalReceived = invoiceSummary.reduce((a, i) => a + i.received, 0) + payments.filter(p => !p.method.includes('Invoice')).reduce((a, p) => a + p.amount, 0);
    const totalOutstanding = invoiceSummary.reduce((a, i) => a + i.outstanding, 0);
    const advance = Number(client.advanceReceived) || 0;
    const today = new Date(); today.setHours(0,0,0,0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-violet-600 font-bold text-sm transition-colors">
                <ArrowDownLeft className="rotate-90" size={16}/> Back to Clients
            </button>

            {/* Client Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"/>
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-violet-500/20 p-3 rounded-2xl"><Briefcase className="text-violet-300" size={24}/></div>
                            <h2 className="text-3xl font-extrabold text-white">{client.name}</h2>
                        </div>
                        {client.projectName && <p className="text-slate-400 font-medium ml-1">Project: <span className="text-slate-200">{client.projectName}</span></p>}
                        <div className="flex gap-2 mt-3">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${client.status === 'Retainer' ? 'bg-violet-500/30 text-violet-300' : client.status === 'Completed' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-amber-500/30 text-amber-300'}`}>{client.status || 'Ongoing'}</span>
                            {advance > 0 && <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-sky-500/20 text-sky-300">Advance: {formatCurrency(advance)}</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { l: 'Total Billed', v: totalBilled, c: 'text-white' },
                            { l: 'Total Received', v: totalReceived, c: 'text-emerald-400' },
                            { l: 'Outstanding', v: totalOutstanding, c: totalOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.l}</p>
                                <p className={`text-xl font-extrabold ${s.c}`}>{formatCurrency(s.v)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Invoice Breakdown */}
                <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-extrabold text-slate-800 text-lg">Invoice Breakdown</h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">{invoiceSummary.length} invoices</span>
                    </div>
                    {invoiceSummary.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium">No invoices for this client yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <tr><th className="p-4">Inv #</th><th className="p-4">Date</th><th className="p-4">Due</th><th className="p-4 text-right">Amount</th><th className="p-4 text-right">Received</th><th className="p-4 text-right">Balance</th><th className="p-4 text-center">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {invoiceSummary.map(inv => {
                                        const isOverdue = inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < today;
                                        const statusLabel = inv.status === 'Paid' ? 'Paid' : isOverdue ? 'Overdue' : inv.received > 0 ? 'Partial' : (inv.status || 'Unpaid');
                                        const statusColor = inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : isOverdue ? 'bg-rose-100 text-rose-700' : inv.received > 0 ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700';
                                        return (
                                            <tr key={inv.id} className={`hover:bg-slate-50/50 transition-colors ${isOverdue ? 'bg-rose-50/20' : ''}`}>
                                                <td className="p-4 text-xs font-mono text-violet-600 font-bold">{inv.invoiceNumber || '—'}</td>
                                                <td className="p-4 text-sm text-slate-500">{inv.date}</td>
                                                <td className="p-4 text-sm">{inv.dueDate ? <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}>{inv.dueDate}</span> : <span className="text-slate-300">—</span>}</td>
                                                <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(inv.total)}</td>
                                                <td className="p-4 text-right font-bold text-emerald-600">{inv.received > 0 ? formatCurrency(inv.received) : '—'}</td>
                                                <td className="p-4 text-right font-bold text-rose-600">{inv.outstanding > 0 ? formatCurrency(inv.outstanding) : <span className="text-emerald-500">✓ Cleared</span>}</td>
                                                <td className="p-4 text-center"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200">
                                    <tr>
                                        <td colSpan={3} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Totals</td>
                                        <td className="p-4 text-right font-extrabold text-slate-800">{formatCurrency(totalBilled)}</td>
                                        <td className="p-4 text-right font-extrabold text-emerald-700">{formatCurrency(invoiceSummary.reduce((a,i)=>a+i.received,0))}</td>
                                        <td className="p-4 text-right font-extrabold text-rose-700">{formatCurrency(totalOutstanding)}</td>
                                        <td/>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Payment History */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-extrabold text-slate-800 text-lg">Payment History</h3>
                        <p className="text-xs text-slate-400 mt-1">All payments received from this client</p>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-96">
                        {payments.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm font-medium">No payments recorded yet.</div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {payments.map((p, i) => (
                                    <div key={i} className="p-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
                                            <span className="text-xs text-slate-400">{p.date}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{p.ref}</p>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">{p.method}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-emerald-50">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-emerald-800">Total Received</span>
                            <span className="text-lg font-extrabold text-emerald-700">{formatCurrency(payments.reduce((a,p)=>a+p.amount,0) + (advance||0))}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance Summary */}
            <div className={`rounded-3xl p-6 border-2 ${totalOutstanding > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <p className={`text-sm font-bold uppercase tracking-widest mb-1 ${totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {totalOutstanding > 0 ? 'Amount They Owe Us' : 'Account Settled'}
                        </p>
                        <p className={`text-4xl font-extrabold ${totalOutstanding > 0 ? 'text-rose-800' : 'text-emerald-800'}`}>{formatCurrency(totalOutstanding)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div><p className="text-xs text-slate-500 font-bold uppercase mb-1">Agreed Value</p><p className="text-lg font-extrabold text-slate-800">{formatCurrency(client.projectTotal || 0)}</p></div>
                        <div><p className="text-xs text-slate-500 font-bold uppercase mb-1">Invoiced</p><p className="text-lg font-extrabold text-slate-800">{formatCurrency(totalBilled)}</p></div>
                        <div><p className="text-xs text-emerald-600 font-bold uppercase mb-1">Collected</p><p className="text-lg font-extrabold text-emerald-700">{formatCurrency(totalReceived)}</p></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- VENDOR PROFILE COMPONENT ---
const VendorProfile = ({ vendor, vendorBills, bankRecords, pettyCash, onBack }) => {
    const bills = useMemo(() => vendorBills.filter(b =>
        (b.vendor || '').toLowerCase().trim() === (vendor.name || '').toLowerCase().trim()
    ), [vendorBills, vendor]);

    const payments = useMemo(() => {
        const target = (vendor.name || '').toLowerCase().trim();
        const fromBank = bankRecords.filter(r =>
            (r.description || '').toLowerCase().includes(target) && Number(r.amount) < 0
        ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Math.abs(Number(r.amount)), method: 'Bank Transfer' }));
        const fromBankBillPayment = bankRecords.filter(r =>
            (r.description || '').toLowerCase().startsWith('bill payment:') &&
            (r.description || '').toLowerCase().includes(target)
        ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Math.abs(Number(r.amount)), method: 'Bank (Bill)' }));
        const fromCash = pettyCash.filter(r =>
            (r.description || '').toLowerCase().includes(target) && Number(r.cashOut) > 0
        ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Number(r.cashOut), method: 'Cash' }));
        const allPayments = [...fromBank, ...fromBankBillPayment, ...fromCash]
            .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        return allPayments;
    }, [bankRecords, pettyCash, vendor]);

    const billSummary = useMemo(() => bills.map(b => {
        const total = Number(b.amount) || 0;
        const paid = Number(b.paidAmount) || 0;
        const outstanding = b.status === 'Paid' ? 0 : total - paid;
        return { ...b, total, paid, outstanding };
    }), [bills]);

    const totalBilled = billSummary.reduce((a, b) => a + b.total, 0);
    const totalPaid = billSummary.reduce((a, b) => a + b.paid, 0);
    const totalOutstanding = billSummary.reduce((a, b) => a + b.outstanding, 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-violet-600 font-bold text-sm transition-colors">
                <ArrowDownLeft className="rotate-90" size={16}/> Back to Vendors
            </button>

            {/* Vendor Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"/>
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-rose-500/20 p-3 rounded-2xl"><Truck className="text-rose-300" size={24}/></div>
                            <h2 className="text-3xl font-extrabold text-white">{vendor.name}</h2>
                        </div>
                        {vendor.serviceType && <p className="text-slate-400 font-medium ml-1">Service: <span className="text-slate-200">{vendor.serviceType}</span></p>}
                        {vendor.contact && <p className="text-slate-500 text-sm ml-1 mt-1">{vendor.contact}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { l: 'Total Bills', v: totalBilled, c: 'text-white' },
                            { l: 'Total Paid', v: totalPaid, c: 'text-emerald-400' },
                            { l: 'Outstanding', v: totalOutstanding, c: totalOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.l}</p>
                                <p className={`text-xl font-extrabold ${s.c}`}>{formatCurrency(s.v)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Bill Breakdown */}
                <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-extrabold text-slate-800 text-lg">Bill Breakdown</h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">{bills.length} bills</span>
                    </div>
                    {billSummary.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium">No bills recorded for this vendor.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <tr><th className="p-4">Bill #</th><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4 text-right">Total</th><th className="p-4 text-right">Paid</th><th className="p-4 text-right">Balance</th><th className="p-4 text-center">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {billSummary.map(b => {
                                        const isPaid = b.status === 'Paid' || b.outstanding <= 0;
                                        return (
                                            <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 text-xs font-mono text-rose-600 font-bold">{b.billNumber || '—'}</td>
                                                <td className="p-4 text-sm text-slate-500">{b.date}</td>
                                                <td className="p-4 text-sm text-slate-700 max-w-xs truncate">{b.description || '—'}</td>
                                                <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(b.total)}</td>
                                                <td className="p-4 text-right font-bold text-emerald-600">{b.paid > 0 ? formatCurrency(b.paid) : '—'}</td>
                                                <td className="p-4 text-right font-bold text-rose-600">{b.outstanding > 0 ? formatCurrency(b.outstanding) : <span className="text-emerald-500">✓ Cleared</span>}</td>
                                                <td className="p-4 text-center"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{isPaid ? 'Paid' : 'Pending'}</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200">
                                    <tr>
                                        <td colSpan={3} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Totals</td>
                                        <td className="p-4 text-right font-extrabold text-slate-800">{formatCurrency(totalBilled)}</td>
                                        <td className="p-4 text-right font-extrabold text-emerald-700">{formatCurrency(totalPaid)}</td>
                                        <td className="p-4 text-right font-extrabold text-rose-700">{formatCurrency(totalOutstanding)}</td>
                                        <td/>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Payment History */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-extrabold text-slate-800 text-lg">Payment History</h3>
                        <p className="text-xs text-slate-400 mt-1">Payments made to this vendor</p>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-96">
                        {payments.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm font-medium">No payments recorded yet.</div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {payments.map((p, i) => (
                                    <div key={i} className="p-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-rose-600">{formatCurrency(p.amount)}</span>
                                            <span className="text-xs text-slate-400">{p.date}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{p.ref}</p>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">{p.method}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-rose-50">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-rose-800">Total Paid Out</span>
                            <span className="text-lg font-extrabold text-rose-700">{formatCurrency(payments.reduce((a,p)=>a+p.amount,0))}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance Summary */}
            <div className={`rounded-3xl p-6 border-2 ${totalOutstanding > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <p className={`text-sm font-bold uppercase tracking-widest mb-1 ${totalOutstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {totalOutstanding > 0 ? 'Amount We Owe Them' : 'Account Settled'}
                        </p>
                        <p className={`text-4xl font-extrabold ${totalOutstanding > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>{formatCurrency(totalOutstanding)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-center">
                        <div><p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Bills</p><p className="text-lg font-extrabold text-slate-800">{formatCurrency(totalBilled)}</p></div>
                        <div><p className="text-xs text-emerald-600 font-bold uppercase mb-1">Paid Out</p><p className="text-lg font-extrabold text-emerald-700">{formatCurrency(totalPaid)}</p></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- RECEIVABLES & PAYABLES SUMMARY ---
const ReceivablesPayables = ({ clients, invoices, vendors, vendorBills, bankRecords, pettyCash, onViewClient, onViewVendor }) => {
    const [activeTab, setActiveTab] = useState('receivables');

    const clientSummaries = useMemo(() => clients.map(client => {
        const clientInvoices = invoices.filter(inv =>
            (inv.client || '').toLowerCase().trim() === (client.name || '').toLowerCase().trim()
        );
        const totalBilled = clientInvoices.reduce((a, inv) =>
            a + calculateTax((inv.items||[]).reduce((s,it)=>s+((it.qty||0)*(it.rate||0)),0), inv.taxRate).total, 0);
        const totalReceived = clientInvoices.filter(i=>i.status==='Paid').reduce((a, inv) => {
            const r = Number(inv.amountReceived);
            const t = calculateTax((inv.items||[]).reduce((s,it)=>s+((it.qty||0)*(it.rate||0)),0), inv.taxRate).total;
            return a + (r > 0 ? r : t);
        }, 0) + (Number(client.advanceReceived)||0);
        const outstanding = Math.max(0, totalBilled - totalReceived);
        const today = new Date(); today.setHours(0,0,0,0);
        const overdueInvs = clientInvoices.filter(i => i.status!=='Paid' && i.dueDate && new Date(i.dueDate) < today);
        return { ...client, totalBilled, totalReceived, outstanding, overdueCount: overdueInvs.length, invoiceCount: clientInvoices.length };
    }).sort((a, b) => b.outstanding - a.outstanding), [clients, invoices]);

    const vendorSummaries = useMemo(() => vendors.map(vendor => {
        const bills = vendorBills.filter(b =>
            (b.vendor || '').toLowerCase().trim() === (vendor.name || '').toLowerCase().trim()
        );
        const totalBills = bills.reduce((a, b) => a + (Number(b.amount)||0), 0);
        const totalPaid = bills.reduce((a, b) => a + (Number(b.paidAmount)||0), 0);
        const outstanding = Math.max(0, totalBills - totalPaid);
        return { ...vendor, totalBills, totalPaid, outstanding, billCount: bills.length };
    }).sort((a, b) => b.outstanding - a.outstanding), [vendors, vendorBills]);

    const totalReceivables = clientSummaries.reduce((a, c) => a + c.outstanding, 0);
    const totalReceived = clientSummaries.reduce((a, c) => a + c.totalReceived, 0);
    const totalBilled = clientSummaries.reduce((a, c) => a + c.totalBilled, 0);
    const totalPayables = vendorSummaries.reduce((a, v) => a + v.outstanding, 0);
    const totalPaidOut = vendorSummaries.reduce((a, v) => a + v.totalPaid, 0);
    const totalBills = vendorSummaries.reduce((a, v) => a + v.totalBills, 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Receivables</p>
                    <p className="text-2xl font-extrabold text-emerald-800">{formatCurrency(totalReceivables)}</p>
                    <p className="text-xs text-emerald-600 mt-1">Clients owe us</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-3xl">
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">Total Payables</p>
                    <p className="text-2xl font-extrabold text-rose-800">{formatCurrency(totalPayables)}</p>
                    <p className="text-xs text-rose-600 mt-1">We owe vendors</p>
                </div>
                <div className={`border p-6 rounded-3xl ${totalReceivables - totalPayables >= 0 ? 'bg-violet-50 border-violet-200' : 'bg-amber-50 border-amber-200'}`}>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${totalReceivables - totalPayables >= 0 ? 'text-violet-600' : 'text-amber-600'}`}>Net Position</p>
                    <p className={`text-2xl font-extrabold ${totalReceivables - totalPayables >= 0 ? 'text-violet-800' : 'text-amber-800'}`}>{formatCurrency(totalReceivables - totalPayables)}</p>
                    <p className={`text-xs mt-1 ${totalReceivables - totalPayables >= 0 ? 'text-violet-600' : 'text-amber-600'}`}>{totalReceivables >= totalPayables ? 'Net positive' : 'Net negative'}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Collection Rate</p>
                    <p className="text-2xl font-extrabold text-slate-800">{totalBilled > 0 ? Math.round((totalReceived/totalBilled)*100) : 0}%</p>
                    <p className="text-xs text-slate-500 mt-1">{formatCurrency(totalReceived)} of {formatCurrency(totalBilled)}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm ring-1 ring-slate-200 w-fit">
                {[['receivables','Receivables (Clients)', 'text-emerald-600'], ['payables','Payables (Vendors)', 'text-rose-600']].map(([id, label, color]) => (
                    <button key={id} onClick={() => setActiveTab(id)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab===id ? 'bg-slate-900 text-white shadow-sm' : `text-slate-500 hover:${color}`}`}>{label}</button>
                ))}
            </div>

            {activeTab === 'receivables' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 grid grid-cols-3 gap-4">
                        <div className="text-center"><p className="text-xs text-slate-400 font-bold uppercase">Total Invoiced</p><p className="text-lg font-extrabold text-slate-800">{formatCurrency(totalBilled)}</p></div>
                        <div className="text-center"><p className="text-xs text-emerald-600 font-bold uppercase">Collected</p><p className="text-lg font-extrabold text-emerald-700">{formatCurrency(totalReceived)}</p></div>
                        <div className="text-center"><p className="text-xs text-rose-600 font-bold uppercase">Outstanding</p><p className="text-lg font-extrabold text-rose-700">{formatCurrency(totalReceivables)}</p></div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <tr><th className="p-4">Client</th><th className="p-4 text-center">Invoices</th><th className="p-4 text-right">Total Billed</th><th className="p-4 text-right">Received</th><th className="p-4 text-right">Outstanding</th><th className="p-4 text-center">Overdue</th><th className="p-4 text-center">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {clientSummaries.map(c => (
                                <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${c.overdueCount > 0 ? 'bg-rose-50/20' : ''}`}>
                                    <td className="p-4">
                                        <p className="font-bold text-slate-800">{c.name}</p>
                                        {c.projectName && <p className="text-xs text-slate-400">{c.projectName}</p>}
                                    </td>
                                    <td className="p-4 text-center text-sm font-bold text-slate-600">{c.invoiceCount}</td>
                                    <td className="p-4 text-right font-bold text-slate-700">{formatCurrency(c.totalBilled)}</td>
                                    <td className="p-4 text-right font-bold text-emerald-600">{formatCurrency(c.totalReceived)}</td>
                                    <td className="p-4 text-right font-extrabold text-rose-600">{formatCurrency(c.outstanding)}</td>
                                    <td className="p-4 text-center">{c.overdueCount > 0 ? <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-full">{c.overdueCount} overdue</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                                    <td className="p-4 text-center"><button onClick={() => onViewClient(c)} className="text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors">Profile →</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'payables' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 grid grid-cols-3 gap-4">
                        <div className="text-center"><p className="text-xs text-slate-400 font-bold uppercase">Total Bills</p><p className="text-lg font-extrabold text-slate-800">{formatCurrency(totalBills)}</p></div>
                        <div className="text-center"><p className="text-xs text-emerald-600 font-bold uppercase">Paid Out</p><p className="text-lg font-extrabold text-emerald-700">{formatCurrency(totalPaidOut)}</p></div>
                        <div className="text-center"><p className="text-xs text-rose-600 font-bold uppercase">Still Owe</p><p className="text-lg font-extrabold text-rose-700">{formatCurrency(totalPayables)}</p></div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <tr><th className="p-4">Vendor</th><th className="p-4">Service</th><th className="p-4 text-center">Bills</th><th className="p-4 text-right">Total Billed</th><th className="p-4 text-right">Paid</th><th className="p-4 text-right">Outstanding</th><th className="p-4 text-center">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {vendorSummaries.map(v => (
                                <tr key={v.id} className={`hover:bg-slate-50/50 transition-colors ${v.outstanding > 0 ? 'bg-amber-50/20' : ''}`}>
                                    <td className="p-4 font-bold text-slate-800">{v.name}</td>
                                    <td className="p-4 text-sm text-slate-500">{v.serviceType || '—'}</td>
                                    <td className="p-4 text-center text-sm font-bold text-slate-600">{v.billCount}</td>
                                    <td className="p-4 text-right font-bold text-slate-700">{formatCurrency(v.totalBills)}</td>
                                    <td className="p-4 text-right font-bold text-emerald-600">{formatCurrency(v.totalPaid)}</td>
                                    <td className="p-4 text-right font-extrabold text-amber-600">{formatCurrency(v.outstanding)}</td>
                                    <td className="p-4 text-center"><button onClick={() => onViewVendor(v)} className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors">Profile →</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// --- TAX REPORT COMPONENT ---
const TaxReport = ({ invoices, salaries, expenses, vendorBills, month, year }) => {
    const [filterMonth, setFilterMonth] = useState('All');
    const [filterYear, setFilterYear] = useState('All');

    useEffect(() => {
        if (month) setFilterMonth(month);
        if (year) setFilterYear(year);
    }, [month, year]);

    const filter = (items) => {
        return items.filter(i => {
            const d = new Date(i.date || i.createdAt);
            return (filterMonth === 'All' || d.toLocaleString('default',{month:'long'}) === filterMonth) && 
                   (filterYear === 'All' || d.getFullYear().toString() === filterYear);
        });
    };

    const filteredInvoices = filter(invoices);
    const filteredSalaries = filter(salaries);
    const filteredExpenses = filter(expenses);

    // 1. Output Tax (Liability) - From Invoices
    const outputTax = filteredInvoices.reduce((acc, inv) => {
        const { tax } = calculateTax(inv.items.reduce((a, i) => a + (i.qty * i.rate), 0), inv.taxRate);
        return acc + tax;
    }, 0);

    // 2. Withholding Tax (Liability) - From Salaries & Vendor Bills
    const salaryWHT = filteredSalaries.reduce((acc, sal) => acc + (Number(sal.taxDeduction) || 0), 0);
    const vendorWHT = (items) => items.reduce((acc, bill) => acc + (Number(bill.taxDeduction) || 0), 0);
    
    // Filter vendor bills for report
    const filteredBills = (bills) => {
        return bills.filter(i => {
            const d = new Date(i.date || i.createdAt);
            return (filterMonth === 'All' || d.toLocaleString('default',{month:'long'}) === filterMonth) && 
                   (filterYear === 'All' || d.getFullYear().toString() === filterYear);
        });
    };
    const currentVendorBills = filteredBills(vendorBills);
    const totalWHT = salaryWHT + vendorWHT(currentVendorBills);

    // 3. Input Tax (Credit) - From Expenses & Client Payments
    const expenseTax = filteredExpenses.reduce((acc, exp) => acc + (Number(exp.taxAmount) || 0), 0);
    const clientWHT = filteredInvoices.reduce((acc, inv) => acc + (Number(inv.whtDeducted) || 0), 0);
    const totalInput = expenseTax + clientWHT;

    // Total Liability Calculation
    const totalLiability = (outputTax + totalWHT) - totalInput;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Tax Liability Report</h2>
                    <p className="text-slate-500 font-medium">Net Tax Position (Output + WHT - Input)</p>
                </div>
                <div className="flex gap-3 bg-white p-1.5 rounded-2xl shadow-sm ring-1 ring-slate-200">
                    <select className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer px-2 py-1.5 hover:text-violet-600" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}><option value="All">All Months</option>{['January','February','March','April','May','June','July','August','September','October','November','December'].map(m=><option key={m}>{m}</option>)}</select>
                    <div className="w-px bg-slate-200 my-1"></div>
                    <select className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer px-2 py-1.5 hover:text-violet-600" value={filterYear} onChange={e=>setFilterYear(e.target.value)}><option value="All">All Years</option><option>2024</option><option>2025</option><option>2026</option></select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sales Tax (Output)</p>
                    <h3 className="text-2xl font-extrabold text-indigo-600">{formatCurrency(outputTax)}</h3>
                    <div className="w-full h-1 bg-indigo-100 mt-3 rounded-full"><div className="h-full bg-indigo-500 rounded-full" style={{width: '100%'}}></div></div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total WHT (Liability)</p>
                    <h3 className="text-2xl font-extrabold text-rose-600">{formatCurrency(totalWHT)}</h3>
                    <div className="w-full h-1 bg-rose-100 mt-3 rounded-full"><div className="h-full bg-rose-500 rounded-full" style={{width: '100%'}}></div></div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Input (Credit)</p>
                    <h3 className="text-2xl font-extrabold text-emerald-600">-{formatCurrency(totalInput)}</h3>
                    <div className="w-full h-1 bg-emerald-100 mt-3 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{width: '100%'}}></div></div>
                </div>
                <div className="bg-slate-900 p-6 rounded-3xl shadow-lg shadow-slate-200 relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Net Payable</p>
                    <h3 className="text-3xl font-extrabold text-white relative z-10">{formatCurrency(totalLiability)}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-800">Tax Collected (Invoices)</h3></div>
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0"><tr><th className="p-4">Client</th><th className="p-4 text-right">Taxable</th><th className="p-4 text-right">Tax</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredInvoices.map(inv => {
                                    const { subtotal, tax } = calculateTax(inv.items.reduce((a, i) => a + (i.qty * i.rate), 0), inv.taxRate);
                                    if(tax === 0) return null;
                                    return <tr key={inv.id} className="hover:bg-slate-50/50"><td className="p-4 text-sm font-bold text-slate-700">{inv.client}</td><td className="p-4 text-sm text-right text-slate-500">{formatCurrency(subtotal)}</td><td className="p-4 text-sm text-right font-bold text-indigo-600">{formatCurrency(tax)}</td></tr>;
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-800">WHT (Salaries & Vendors)</h3></div>
                        <div className="overflow-x-auto max-h-60 overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0"><tr><th className="p-4">Name</th><th className="p-4 text-right">Tax Withheld</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredSalaries.map(sal => {
                                        const tax = Number(sal.taxDeduction) || 0;
                                        if(tax === 0) return null;
                                        return <tr key={sal.id} className="hover:bg-slate-50/50"><td className="p-4 text-sm font-bold text-slate-700">{sal.employeeName} <span className="text-xs text-slate-400 font-normal">(Salary)</span></td><td className="p-4 text-sm text-right font-bold text-rose-600">{formatCurrency(tax)}</td></tr>;
                                    })}
                                    {currentVendorBills.map(bill => {
                                        const tax = Number(bill.taxDeduction) || 0;
                                        if(tax === 0) return null;
                                        return <tr key={bill.id} className="hover:bg-slate-50/50"><td className="p-4 text-sm font-bold text-slate-700">{bill.vendor} <span className="text-xs text-slate-400 font-normal">(Bill #{bill.billNumber})</span></td><td className="p-4 text-sm text-right font-bold text-rose-600">{formatCurrency(tax)}</td></tr>;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-800">Input Tax (Expenses & Client WHT)</h3></div>
                        <div className="overflow-x-auto max-h-60 overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0"><tr><th className="p-4">Description</th><th className="p-4 text-right">Tax Paid</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredExpenses.map(exp => {
                                        const tax = Number(exp.taxAmount) || 0;
                                        if(tax === 0) return null;
                                        return <tr key={exp.id} className="hover:bg-slate-50/50"><td className="p-4 text-sm font-medium text-slate-700">{exp.description} <span className="text-xs text-slate-400">({exp.category})</span></td><td className="p-4 text-sm text-right font-bold text-emerald-600">{formatCurrency(tax)}</td></tr>;
                                    })}
                                    {filteredInvoices.map(inv => {
                                        const tax = Number(inv.whtDeducted) || 0;
                                        if(tax === 0) return null;
                                        return <tr key={inv.id} className="hover:bg-slate-50/50"><td className="p-4 text-sm font-medium text-slate-700">Client WHT: {inv.client} <span className="text-xs text-slate-400">(Invoice)</span></td><td className="p-4 text-sm text-right font-bold text-emerald-600">{formatCurrency(tax)}</td></tr>;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
function App() {
  const toast = useToast();
  // Make toast accessible to global helper functions
  React.useEffect(() => { window.__leanaxisToast = toast; }, [toast]);
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
  const [clientWHT, setClientWHT] = useState(''); // New state for client WHT
  
  const [showSalarySlip, setShowSalarySlip] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedClientProfile, setSelectedClientProfile] = useState(null);
  const [selectedVendorProfile, setSelectedVendorProfile] = useState(null);

  const [pettyCash] = useFirebaseSync('petty_cash');
  const [expenses] = useFirebaseSync('expenses');
  const [salaries] = useFirebaseSync('salaries');
  const [bankRecords] = useFirebaseSync('bank_records');
  const [clients] = useFirebaseSync('clients');
  const [vendors] = useFirebaseSync('vendors');
  const [invoices] = useFirebaseSync('invoices');
  const [quotations] = useFirebaseSync('quotations');
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
      setAuthError(null);
      setIsSubmitting(true);
      const inputHash = await hashPassword(password);
      const user = users.find(u => u.username === loginInput || u.email === loginInput);
      if (user) {
          if (user.password === password || user.password === inputHash) {
              setIsAuthenticated(true); setCurrentUser(user); setIsSubmitting(false);
              if (user.password === password) updateDoc(doc(db, 'users', user.id), { password: inputHash });
              return;
          }
      }
      if (users.length === 0 && loginInput === 'admin' && password === 'admin123') { setIsAuthenticated(true); setCurrentUser({ username: 'admin', role: 'Admin' }); setIsSubmitting(false); return; }
      setAuthError('Invalid credentials');
      setIsSubmitting(false);
  };

  const handleLogout = () => { if (confirm('Are you sure you want to sign out?')) { setIsAuthenticated(false); setCurrentUser(null); setView('dashboard'); } };
  const deleteRecord = async (collectionName, id) => { 
    if(confirm('Are you sure you want to delete this record? This cannot be undone.')) {
      await deleteDoc(doc(db, collectionName, id));
      toast('Record deleted.', 'info');
    }
  };
  const handleDelete = (id, type) => {
    if (currentUser.role !== 'Admin') return toast('Access denied. Admin role required.', 'error');
    const map = { 'petty': 'petty_cash', 'expense': 'expenses', 'salary': 'salaries', 'bank': 'bank_records', 'client': 'clients', 'vendor': 'vendors', 'user': 'users', 'invoice': 'invoices', 'bill': 'vendor_bills', 'quotation': 'quotations' };
    if (map[type]) deleteRecord(map[type], id);
  };
  const handleEdit = (item) => { if (currentUser.role !== 'Admin') return toast('Access denied. Admin role required.', 'error'); setFormData({ ...item }); setIsEditingRecord(true); setShowForm(true); };
  const handleDuplicate = (item) => { const { id, createdAt, lastEditedAt, ...dataToCopy } = item; setFormData({ ...dataToCopy, date: new Date().toISOString().split('T')[0] }); setIsEditingRecord(false); setShowForm(true); };
  
  const handleMasterExport = () => {
    const dataToExport = { clients, vendors, pettyCash, expenses, salaries, bankRecords, invoices, quotations, vendorBills, users };
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
            const collections = { 'clients': 'clients', 'vendors': 'vendors', 'pettyCash': 'petty_cash', 'expenses': 'expenses', 'salaries': 'salaries', 'bankRecords': 'bank_records', 'invoices': 'invoices', 'quotations': 'quotations', 'vendorBills': 'vendor_bills' };
            for (const [key, colName] of Object.entries(collections)) {
                if (importedData[key]) importedData[key].forEach(item => { const { id, ...data } = item; const ref = doc(collection(db, colName)); batch.set(ref, data); count++; });
            }
            await batch.commit(); toast(`Successfully imported ${count} records!`, 'success'); window.location.reload();
        } catch (error) { console.error("Import failed:", error); toast("Failed to import data. Check file format.", 'error'); }
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
      toast(`Generated ${count} recurring invoice${count !== 1 ? 's' : ''}!`, count > 0 ? 'success' : 'info');
  };
  
  const handleConvertToInvoice = async (quote) => {
      if(!confirm("Convert this quotation to a draft invoice?")) return;
      try {
          // 1. Create Invoice
          const { id, status, createdAt, ...invoiceData } = quote;
          await addDoc(collection(db, 'invoices'), { ...invoiceData, status: 'Draft', createdAt: new Date().toISOString() });
          
          // 2. Update Quote Status
          await updateDoc(doc(db, 'quotations', quote.id), { status: 'Converted' });
          toast('Quotation converted to Invoice!', 'success');
      } catch (e) {
          console.error(e);
          toast('Error converting quotation.', 'error');
      }
  };

  const uploadFile = async (file) => {
      if (!file || !imgbbKey) return null; setUploadProgress('Uploading...');
      const fd = new FormData(); fd.append("image", file);
      try { const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: "POST", body: fd }); const d = await res.json(); if (d.success) { setUploadProgress('Done!'); return d.data.url; } } catch (e) { toast("File upload failed. Check your ImgBB API key.", 'error'); } return null;
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
          toast('Record saved successfully!', 'success');
      } catch (e) { toast('Error saving record. Please try again.', 'error'); console.error(e); } finally { setIsSubmitting(false); }
  };
  const handleAddSubmit = (e) => {
    e.preventDefault();
    let col = { 'manage-users': 'users', 'petty-cash': 'petty_cash', 'expenses': 'expenses', 'salaries': 'salaries', 'bank': 'bank_records', 'clients': 'clients', 'vendors': 'vendors', 'vendor-bills': 'vendor_bills' }[view];
    if (col) saveToFirebase(col, formData, (isEditingRecord || isEditingUser) ? formData.id : null);
  };
  const initiatePayment = (item, type, amount) => { setPaymentConfig({ data: item, type, amount }); setPaymentAccount('bank'); setClientWHT(''); setShowPaymentModal(true); };
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
              const wht = Number(clientWHT) || 0;
              const netReceived = amount - wht;
              
              batch.update(doc(db, 'invoices', data.id), { status: 'Paid', whtDeducted: wht, amountReceived: netReceived });
              const recordData = { date, description: `Inv Payment: ${data.client}`, createdAt: new Date().toISOString() };
              
              if (paymentAccount === 'bank') batch.set(doc(collection(db, 'bank_records')), { ...recordData, amount: netReceived, bank: 'Linked Payment', status: 'Cleared' });
              else batch.set(doc(collection(db, 'petty_cash')), { ...recordData, cashIn: netReceived, cashOut: 0 });
          }
          await batch.commit(); setShowPaymentModal(false); toast('Payment recorded successfully!', 'success');
      } catch (e) { console.error(e); toast('Error linking payment. Please try again.', 'error'); }
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
    // Helper: check if a record falls within the selected month/year filter
    const inFilter = (dateStr) => {
      if (selectedMonth === 'All' && selectedYear === 'All') return true;
      const d = new Date(dateStr);
      if (isNaN(d)) return true;
      const monthMatch = selectedMonth === 'All' || d.toLocaleString('default', { month: 'long' }) === selectedMonth;
      const yearMatch = selectedYear === 'All' || d.getFullYear().toString() === selectedYear;
      return monthMatch && yearMatch;
    };

    // --- REVENUE ---
    // Source 1: Paid invoices (use amountReceived if set, otherwise full invoice total)
    // Filter by the invoice date and only include those matching month/year filter
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid' && inFilter(inv.date));
    const invoiceRevenue = paidInvoices.reduce((a, inv) => {
      const received = Number(inv.amountReceived);
      // amountReceived is set when payment is recorded via executePayment (net of WHT)
      // Fall back to full calculated total if not set
      const total = calculateTax(
        (inv.items || []).reduce((s, it) => s + ((it.qty || 0) * (it.rate || 0)), 0),
        inv.taxRate
      ).total;
      return a + (received > 0 ? received : total);
    }, 0);

    // Source 2: Manual petty cash receipts that are NOT linked to invoice payments
    // Invoice payments via petty cash get description "Inv Payment: ..." — exclude those from double count
    const manualPettyCashIn = filteredPetty.filter(r =>
      !(r.description || '').toLowerCase().startsWith('inv payment:')
    ).reduce((a, c) => a + (Number(c.cashIn) || 0), 0);

    const rev = invoiceRevenue + manualPettyCashIn;

    // --- EXPENSES ---
    const expenseTotal = filteredExp.reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const salaryTotal = filteredSal.reduce((a, c) => a + (Number(c.totalPayable) || 0), 0);
    // Only count petty cash OUTFLOWS (not inflows which are revenue)
    const pettyCashOut = filteredPetty.reduce((a, c) => a + (Number(c.cashOut) || 0), 0);
    const exp = expenseTotal + salaryTotal + pettyCashOut;

    // --- VENDOR BILLS ---
    const totalVendorBills = filteredBills.reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const totalVendorPaid = filteredBills.reduce((a, c) => a + (Number(c.paidAmount) || 0), 0);

    // --- OUTSTANDING INVOICES ---
    const unpaidInvoicesTotal = invoices
      .filter(inv => inv.status !== 'Paid')
      .reduce((a, inv) => a + calculateTax(
        (inv.items || []).reduce((s, it) => s + ((it.qty || 0) * (it.rate || 0)), 0),
        inv.taxRate
      ).total, 0);

    // --- OVERDUE ---
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const overdueCount = invoices.filter(inv =>
      inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < today
    ).length;

    // --- BREAKDOWN for P&L report ---
    const invoiceRevenueBreakdown = invoiceRevenue;
    const pettyCashInBreakdown = manualPettyCashIn;

    return {
      revenue: rev,
      expense: exp,
      profit: rev - exp,
      vendorPending: totalVendorBills - totalVendorPaid,
      clientPending: unpaidInvoicesTotal,
      overdueCount,
      // For P&L breakdown panel
      invoiceRevenueBreakdown,
      pettyCashInBreakdown,
      expenseTotal,
      salaryTotal,
      pettyCashOut,
    };
  }, [filteredPetty, filteredExp, filteredSal, invoices, filteredBills, selectedMonth, selectedYear]);

  const expenseChartData = [ { name: 'Petty', value: filteredPetty.reduce((a,c) => a+(Number(c.cashOut)||0),0) }, { name: 'Expenses', value: filteredExp.reduce((a,c) => a+(Number(c.amount)||0),0) }, { name: 'Salaries', value: filteredSal.reduce((a,c) => a+(Number(c.totalPayable)||0),0) } ].filter(d => d.value > 0);
  const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B'];

  // Monthly revenue vs expense bar chart (last 6 months)
  const monthlyChartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const mIdx = d.getMonth();

      // Revenue: paid invoices in this month (amountReceived or full total)
      const rev = invoices
        .filter(inv => inv.status === 'Paid' && new Date(inv.date).getMonth() === mIdx && new Date(inv.date).getFullYear() === year)
        .reduce((a, inv) => {
          const received = Number(inv.amountReceived);
          const total = calculateTax((inv.items||[]).reduce((s,it) => s+(it.qty*it.rate),0), inv.taxRate).total;
          return a + (received > 0 ? received : total);
        }, 0)
        + pettyCash
          .filter(r => new Date(r.date).getMonth() === mIdx && new Date(r.date).getFullYear() === year && !(r.description||'').toLowerCase().startsWith('inv payment:'))
          .reduce((a, r) => a + (Number(r.cashIn)||0), 0);

      // Expenses: all outflows in this month
      const exp = [
        ...expenses.filter(r => new Date(r.date || r.createdAt).getMonth() === mIdx && new Date(r.date || r.createdAt).getFullYear() === year).map(r => Number(r.amount)||0),
        ...salaries.filter(r => new Date(r.date || r.createdAt).getMonth() === mIdx && new Date(r.date || r.createdAt).getFullYear() === year).map(r => Number(r.totalPayable)||0),
        ...pettyCash.filter(r => new Date(r.date).getMonth() === mIdx && new Date(r.date).getFullYear() === year).map(r => Number(r.cashOut)||0),
      ].reduce((a, v) => a + v, 0);

      months.push({ name: monthName, Revenue: Math.round(rev), Expenses: Math.round(exp) });
    }
    return months;
  }, [invoices, expenses, salaries, pettyCash]);

  // Dynamic year list from data
  const availableYears = useMemo(() => {
    const years = new Set();
    [...invoices, ...expenses, ...salaries, ...pettyCash, ...bankRecords].forEach(r => {
      const y = new Date(r.date || r.createdAt).getFullYear();
      if (!isNaN(y)) years.add(y);
    });
    const currentYear = new Date().getFullYear();
    years.add(currentYear); years.add(currentYear + 1);
    return Array.from(years).sort((a,b) => b - a);
  }, [invoices, expenses, salaries, pettyCash, bankRecords]);

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
      Papa.parse(file, { header: true, complete: async (results) => { if (results.data.length === 0) return toast("File is empty!", 'warning'); if (!confirm(`Import ${results.data.length} records?`)) return; const batch = writeBatch(db); results.data.forEach(row => { if (Object.values(row).some(v => v)) { const ref = doc(collection(db, collectionName)); batch.set(ref, { ...row, createdAt: new Date().toISOString() }); } }); await batch.commit(); toast("Import successful!", 'success'); } });
  };

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} loading={isSubmitting} error={authError} />;

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
          <NavButton id="receivables-payables" icon={CreditCard} label="Receivables & Payables" />
          <NavButton id="reports" icon={FileText} label="Analytics & P&L" />
          <NavButton id="tax-report" icon={Landmark} label="Tax Liability" />
          <NavButton id="statements" icon={BookOpen} label="Statements (Ledger)" />
          <div className="pt-6 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Operations</div>
          <NavButton id="quotations" icon={FileCheck} label="Quotations" />
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
                <h2 className="text-4xl font-extrabold text-slate-900 capitalize tracking-tight mb-1">
                    {view === 'client-profile' && selectedClientProfile ? selectedClientProfile.name :
                     view === 'vendor-profile' && selectedVendorProfile ? selectedVendorProfile.name :
                     view === 'receivables-payables' ? 'Receivables & Payables' :
                     view === 'tax-report' ? 'Tax Liability' :
                     view.replace(/-/g, ' ')}
                </h2>
                <p className="text-slate-500 font-medium">Overview & Management</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                {!['dashboard','receivables-payables','client-profile','vendor-profile','tax-report','reports','statements'].includes(view) && <div className="relative flex-1 sm:w-72 group"><Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20}/><input className="w-full pl-12 pr-4 py-3 rounded-2xl border-none bg-white shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium text-slate-600" placeholder="Search records..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>}
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
                        <select className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer px-2 py-1.5 hover:text-violet-600" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}><option value="All">All Years</option>{availableYears.map(y=><option key={y}>{y}</option>)}</select>
                    </div>
                )}
                {!['dashboard','reports','invoices','settings','statements','quotations','receivables-payables','client-profile','vendor-profile','tax-report'].includes(view) && <button onClick={()=>{setShowForm(true);setFormData({});setIsEditingUser(false);setIsEditingRecord(false);}} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 hover:scale-105 active:scale-95 transition-all"><Plus size={20}/> New Entry</button>}
            </div>
        </header>

        {view === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                {/* Overdue alert banner */}
                {totals.overdueCount > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4">
                        <div className="bg-rose-100 p-3 rounded-xl flex-shrink-0"><Clock className="text-rose-600" size={22}/></div>
                        <div className="flex-1">
                            <p className="font-bold text-rose-800">You have {totals.overdueCount} overdue invoice{totals.overdueCount !== 1 ? 's' : ''}</p>
                            <p className="text-rose-600 text-sm">Go to Invoices and filter by "Overdue" to follow up with clients.</p>
                        </div>
                        <button onClick={() => setView('invoices')} className="bg-rose-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-rose-700 transition-colors flex-shrink-0">View →</button>
                    </div>
                )}

                {/* KPI Cards — 6 cards: P&L + Receivables/Payables */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[
                        { l:'Revenue Collected', v:totals.revenue, i:ArrowDownLeft, c:'text-emerald-600', b:'bg-emerald-50 ring-emerald-100' },
                        { l:'Total Expenses', v:totals.expense, i:ArrowUpRight, c:'text-rose-600', b:'bg-rose-50 ring-rose-100' },
                        { l:'Net Profit', v:totals.profit, i:Wallet, c:totals.profit>=0?'text-violet-600':'text-orange-600', b:totals.profit>=0?'bg-violet-50 ring-violet-100':'bg-orange-50 ring-orange-100' },
                        { l:'Outstanding Invoices', v:totals.clientPending, i:Clock, c:'text-amber-600', b:'bg-amber-50 ring-amber-100', click: () => setView('receivables-payables') },
                        { l:'Vendor Payables', v:totals.vendorPending, i:Truck, c:'text-rose-600', b:'bg-rose-50 ring-rose-100', click: () => setView('receivables-payables') },
                        { l:'Net AR/AP Position', v:totals.clientPending - totals.vendorPending, i:CreditCard, c:(totals.clientPending-totals.vendorPending)>=0?'text-violet-600':'text-amber-600', b:(totals.clientPending-totals.vendorPending)>=0?'bg-violet-50 ring-violet-100':'bg-amber-50 ring-amber-100' },
                    ].map((s,i) => (
                        <div key={i} onClick={s.click} className={`bg-white p-5 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group ${s.click ? 'cursor-pointer' : ''}`}>
                            <div className={`p-3 rounded-2xl ring-1 ${s.b} ${s.c} transition-transform group-hover:scale-110 duration-300 w-fit mb-3`}><s.i size={22}/></div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 leading-tight">{s.l}</p>
                            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(s.v)}</h3>
                        </div>
                    ))}
                </div>

                {/* Who Owes Who — Quick Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-extrabold text-slate-800 flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"/>Clients Owing Us</h3>
                            <button onClick={() => setView('receivables-payables')} className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">View All →</button>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {clients.filter(c => {
                                const cInvs = invoices.filter(inv => (inv.client||'').toLowerCase().trim() === (c.name||'').toLowerCase().trim() && inv.status !== 'Paid');
                                return cInvs.length > 0;
                            }).slice(0, 5).map(c => {
                                const outstanding = invoices.filter(inv => (inv.client||'').toLowerCase().trim() === (c.name||'').toLowerCase().trim() && inv.status !== 'Paid').reduce((a, inv) => a + calculateTax((inv.items||[]).reduce((s,it)=>s+((it.qty||0)*(it.rate||0)),0), inv.taxRate).total, 0);
                                return (
                                    <div key={c.id} onClick={() => { setSelectedClientProfile(c); setView('client-profile'); }} className="flex justify-between items-center p-4 hover:bg-slate-50/50 cursor-pointer transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                                            {c.projectName && <p className="text-xs text-slate-400">{c.projectName}</p>}
                                        </div>
                                        <span className="font-extrabold text-rose-600 text-sm">{formatCurrency(outstanding)}</span>
                                    </div>
                                );
                            })}
                            {clients.filter(c => invoices.some(inv => (inv.client||'').toLowerCase().trim() === (c.name||'').toLowerCase().trim() && inv.status !== 'Paid')).length === 0 && (
                                <div className="p-6 text-center text-sm text-slate-400 font-medium">All invoices are paid ✓</div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-extrabold text-slate-800 flex items-center gap-2"><span className="w-3 h-3 bg-rose-500 rounded-full inline-block"/>Vendors We Owe</h3>
                            <button onClick={() => setView('receivables-payables')} className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">View All →</button>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {vendors.filter(v => {
                                const vBills = vendorBills.filter(b => (b.vendor||'').toLowerCase().trim() === (v.name||'').toLowerCase().trim() && b.status !== 'Paid');
                                return vBills.length > 0;
                            }).slice(0, 5).map(v => {
                                const outstanding = vendorBills.filter(b => (b.vendor||'').toLowerCase().trim() === (v.name||'').toLowerCase().trim()).reduce((a, b) => a + Math.max(0, (Number(b.amount)||0) - (Number(b.paidAmount)||0)), 0);
                                return (
                                    <div key={v.id} onClick={() => { setSelectedVendorProfile(v); setView('vendor-profile'); }} className="flex justify-between items-center p-4 hover:bg-slate-50/50 cursor-pointer transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{v.name}</p>
                                            {v.serviceType && <p className="text-xs text-slate-400">{v.serviceType}</p>}
                                        </div>
                                        <span className="font-extrabold text-amber-600 text-sm">{formatCurrency(outstanding)}</span>
                                    </div>
                                );
                            })}
                            {vendors.filter(v => vendorBills.some(b => (b.vendor||'').toLowerCase().trim() === (v.name||'').toLowerCase().trim() && b.status !== 'Paid')).length === 0 && (
                                <div className="p-6 text-center text-sm text-slate-400 font-medium">All vendor bills are paid ✓</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Monthly Revenue vs Expenses Bar Chart */}
                    <div className="lg:col-span-3 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-6 text-lg flex items-center gap-2"><div className="w-2 h-6 bg-violet-500 rounded-full"></div> Revenue vs Expenses (6 Months)</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={monthlyChartData} barCategoryGap="30%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:12, fontWeight:700, fill:'#94a3b8'}}/>
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize:11, fill:'#94a3b8'}} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
                                <ChartTooltip formatter={(v) => formatCurrency(v)} contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 25px rgba(0,0,0,0.1)', padding:'12px 16px'}}/>
                                <Legend wrapperStyle={{paddingTop:'16px', fontSize:'12px', fontWeight:700}}/>
                                <Bar dataKey="Revenue" fill="#8B5CF6" radius={[6,6,0,0]}/>
                                <Bar dataKey="Expenses" fill="#F87171" radius={[6,6,0,0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Expense Pie Chart */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative">
                        <h3 className="font-bold text-slate-800 mb-2 text-lg flex items-center gap-2"><div className="w-2 h-6 bg-rose-500 rounded-full"></div> Expense Mix</h3>
                        {expenseChartData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <RePieChart><Pie data={expenseChartData} innerRadius={65} outerRadius={88} paddingAngle={6} dataKey="value" cornerRadius={6}>{expenseChartData.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} strokeWidth={0}/>)}</Pie><ChartTooltip formatter={formatCurrency} contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding:'12px'}}/></RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-[52%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Out</p>
                                    <p className="text-xl font-extrabold text-slate-800">{formatCurrency(totals.expense)}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                    {expenseChartData.map((e,i) => <span key={i} className="text-xs font-bold px-2 py-1 rounded-full" style={{background: COLORS[i%COLORS.length]+'22', color: COLORS[i%COLORS.length]}}>{e.name}</span>)}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-48 text-slate-300 text-sm font-bold">No expense data yet</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {view === 'tax-report' && <TaxReport invoices={invoices} salaries={salaries} expenses={expenses} vendorBills={vendorBills} month={selectedMonth} year={selectedYear} />}

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
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-emerald-700 mb-6 flex items-center gap-3 text-lg"><div className="p-2 bg-emerald-100 rounded-lg"><ArrowDownLeft size={24}/></div> Income Sources</h3>
                        <div className="space-y-4">
                            {[
                                { l: 'Invoice Payments', v: totals.invoiceRevenueBreakdown },
                                { l: 'Petty Cash Receipts', v: totals.pettyCashInBreakdown },
                            ].map((item, k) => (
                                <div key={k} className="flex justify-between items-center p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                                    <span className="text-emerald-900 font-bold">{item.l}</span>
                                    <span className="font-extrabold text-emerald-600 text-lg">{formatCurrency(item.v)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center p-5 bg-emerald-100 rounded-2xl border border-emerald-200">
                                <span className="text-emerald-900 font-extrabold">Total Revenue</span>
                                <span className="font-extrabold text-emerald-700 text-xl">{formatCurrency(totals.revenue)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-rose-700 mb-6 flex items-center gap-3 text-lg"><div className="p-2 bg-rose-100 rounded-lg"><ArrowUpRight size={24}/></div> Expense Breakdown</h3>
                        <div className="space-y-4">
                            {[
                                { l: 'General Expenses', v: totals.expenseTotal },
                                { l: 'Team Salaries', v: totals.salaryTotal },
                                { l: 'Petty Cash Outflows', v: totals.pettyCashOut },
                            ].map((item, k) => (
                                <div key={k} className="flex justify-between items-center p-5 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                                    <span className="text-rose-900 font-bold">{item.l}</span>
                                    <span className="font-extrabold text-rose-600 text-lg">{formatCurrency(item.v)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center p-5 bg-rose-100 rounded-2xl border border-rose-200">
                                <span className="text-rose-900 font-extrabold">Total Expenses</span>
                                <span className="font-extrabold text-rose-700 text-xl">{formatCurrency(totals.expense)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {view === 'statements' && <ClientStatement clients={clients} invoices={invoices} bankRecords={bankRecords} pettyCash={pettyCash} />}

        {view === 'receivables-payables' && <ReceivablesPayables clients={clients} invoices={invoices} vendors={vendors} vendorBills={vendorBills} bankRecords={bankRecords} pettyCash={pettyCash} onViewClient={(c) => { setSelectedClientProfile(c); setView('client-profile'); }} onViewVendor={(v) => { setSelectedVendorProfile(v); setView('vendor-profile'); }} />}

        {view === 'client-profile' && selectedClientProfile && <ClientProfile client={selectedClientProfile} invoices={invoices} bankRecords={bankRecords} pettyCash={pettyCash} onBack={() => setView('clients')} />}

        {view === 'vendor-profile' && selectedVendorProfile && <VendorProfile vendor={selectedVendorProfile} vendorBills={vendorBills} bankRecords={bankRecords} pettyCash={pettyCash} onBack={() => setView('vendors')} />}

        {view === 'quotations' && <QuotationGenerator clients={clients} onSave={(q) => saveToFirebase('quotations', q, q.id)} savedQuotations={quotations} onDeleteQuotation={(id) => handleDelete(id, 'quotation')} onConvertToInvoice={handleConvertToInvoice} />}

        {view === 'invoices' && <InvoiceGenerator clients={clients} onSave={(inv) => saveToFirebase('invoices', inv, inv.id)} savedInvoices={invoices} onDeleteInvoice={(id) => handleDelete(id, 'invoice')} onGenerateRecurring={handleGenerateRecurring} onReceivePayment={(inv, amt) => initiatePayment(inv, 'invoice', amt)} />}

        {/* GENERIC TABLE RENDERER */}
        {['clients','vendors','petty-cash','expenses','salaries','bank','manage-users','vendor-bills'].includes(view) && (() => {
            const currentData = view==='clients'?filteredClients:view==='vendors'?filteredVendors:view==='vendor-bills'?filteredBills:view==='expenses'?filteredExp:view==='petty-cash'?filteredPetty:view==='salaries'?filteredSal:view==='bank'?bankRecords:users;
            if (currentData.length === 0) {
                return (
                    <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><FileText className="text-slate-300" size={40} /></div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No records found</h3>
                        <p className="text-slate-500 text-sm">Click "New Entry" to add your first record.</p>
                    </div>
                );
            }
            return (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                            <tr>
                                {view==='clients' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Client</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Paid</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Due</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Profile</th></>}
                                {view==='vendors' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Paid</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Due</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Profile</th></>}
                                {view==='vendor-bills' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Bill #</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Desc</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Bill Total</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">WHT</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Net Payable</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Paid</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Due</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th></>}
                                {view==='expenses' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Desc</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Details</th></>}
                                {view==='petty-cash' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Desc</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Out</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">In</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Balance</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Details</th></>}
                                {view==='salaries' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Net Salary</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Tax Deducted</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Basic Salary</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th></>}
                                {view==='bank' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Bank</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th></>}
                                {view==='manage-users' && <><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Username</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th><th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th></>}
                                <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(view==='clients'?filteredClients:view==='vendors'?filteredVendors:view==='vendor-bills'?filteredBills:view==='expenses'?filteredExp:view==='petty-cash'?filteredPetty:view==='salaries'?filteredSal:view==='bank'?bankRecords:users).map((item, idx, arr) => {
                                // Calculate running balance for petty cash
                                const pettyCashBalance = view === 'petty-cash' ? arr.slice(0, idx + 1).reduce((bal, r) => bal + (Number(r.cashIn)||0) - (Number(r.cashOut)||0), 0) : null;
                                return (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                    {view==='clients' && <><td className="p-6 text-sm text-slate-500 font-medium">{item.date}</td><td className="p-6"><p className="font-bold text-slate-800 text-base">{item.name}</p>{item.projectName && <p className="text-xs text-slate-400">{item.projectName}</p>}</td><td className="p-6 text-right font-medium text-slate-600">{formatCurrency(item.projectTotal)}</td><td className="p-6 text-right text-emerald-600 font-bold">{formatCurrency(item.advanceReceived)}</td><td className="p-6 text-right text-rose-600 font-bold">{formatCurrency((item.projectTotal||0)-(item.advanceReceived||0))}</td><td className="p-6"><span className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold uppercase tracking-wide">{item.status}</span></td><td className="p-6"><button onClick={() => { setSelectedClientProfile(item); setView('client-profile'); }} className="text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-xl transition-colors whitespace-nowrap">View Profile →</button></td></>}
                                    {view==='vendors' && <><td className="p-6"><p className="font-bold text-slate-800">{item.name}</p></td><td className="p-6 text-sm text-slate-500">{item.serviceType}</td><td className="p-6 text-right font-medium text-slate-600">{formatCurrency(item.amountPayable)}</td><td className="p-6 text-right text-emerald-600 font-medium">{formatCurrency(item.amountPaid)}</td><td className="p-6 text-right text-rose-600 font-bold">{formatCurrency((item.amountPayable||0)-(item.amountPaid||0))}</td><td className="p-6"><button onClick={() => { setSelectedVendorProfile(item); setView('vendor-profile'); }} className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-colors whitespace-nowrap">View Profile →</button></td></>}
                                    {view==='vendor-bills' && (() => { const due = Number(item.amount) - Number(item.paidAmount); const isPaid = due <= 0; const wht = Number(item.taxDeduction) || 0; const gross = (Number(item.amount) + wht); return (<><td className="p-6 text-sm text-slate-500">{item.date}</td><td className="p-6 font-bold text-slate-800">{item.billNumber}</td><td className="p-6 font-bold text-violet-600">{item.vendor}</td><td className="p-6 text-sm text-slate-500">{item.description}</td><td className="p-6 text-right font-medium text-slate-600">{formatCurrency(gross)}</td><td className="p-6 text-right font-medium text-rose-600">{wht > 0 ? `-${formatCurrency(wht)}` : '-'}</td><td className="p-6 text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td><td className="p-6 text-right text-emerald-600 font-medium">{formatCurrency(item.paidAmount)}</td><td className="p-6 text-right text-rose-600 font-bold">{formatCurrency(due)}</td><td className="p-6"><span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{isPaid ? 'Paid' : 'Due'}</span></td><td className="p-6 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">{!isPaid && <button onClick={() => initiatePayment(item, 'bill', due)} className="p-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-sm" title="Pay Now"><CreditCard size={16}/></button>}<ActionButtons item={item} type="bill" /></td></>); })()}
                                    {view==='expenses' && <><td className="p-6 text-sm text-slate-500">{item.date}</td><td className="p-6"><span className="px-3 py-1.5 bg-fuchsia-50 text-fuchsia-700 rounded-lg text-xs font-bold tracking-wide">{item.category}</span></td><td className="p-6 text-sm font-medium text-slate-700">{item.description}</td><td className="p-6 text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td><td className="p-6 text-xs text-slate-500 font-medium">{item.bankName ? <span className="flex items-center gap-1"><CreditCard size={12}/> {item.bankName} - {item.chequeNumber}</span> : 'Cash'}</td></>}
                                    {view==='manage-users' && <><td className="p-6 font-bold text-slate-800">{item.username}</td><td className="p-6 text-sm text-slate-600">{item.email}</td><td className="p-6"><span className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded-lg text-xs font-bold">{item.role}</span></td></>}
                                    {view==='petty-cash' && <><td className="p-6 text-sm text-slate-500">{item.date}</td><td className="p-6 text-sm font-bold text-slate-700">{item.description}</td><td className="p-6 text-right font-bold text-rose-600">{item.cashOut?formatCurrency(item.cashOut):'-'}</td><td className="p-6 text-right font-bold text-emerald-600">{item.cashIn?formatCurrency(item.cashIn):'-'}</td><td className="p-6 text-right font-bold text-violet-600">{formatCurrency(pettyCashBalance)}</td><td className="p-6 text-xs font-medium text-slate-500">{item.bankName ? `${item.bankName} - ${item.chequeNumber}` : 'Cash'}</td></>}
                                    {view==='salaries' && <><td className="p-6 text-sm text-slate-500">{item.date}</td><td className="p-6 font-bold text-slate-800">{item.employeeName}</td><td className="p-6 text-right"><div className="font-bold text-slate-800">{formatCurrency(item.totalPayable)}</div><div className="text-xs text-slate-400">Net Salary</div></td><td className="p-6 text-right"><div className="font-medium text-rose-600">-{formatCurrency(item.taxDeduction || 0)}</div><div className="text-xs text-slate-400">Tax</div></td><td className="p-6 text-right"><div className="font-medium text-slate-600">{formatCurrency(item.basicSalary || item.totalPayable)}</div><div className="text-xs text-slate-400">Basic</div></td><td className="p-6"><span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${item.status==='Paid'?'bg-emerald-100 text-emerald-700':item.status==='Pending'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>{item.status || 'Unpaid'}</span></td></>}
                                    {view==='bank' && <><td className="p-6 text-sm text-slate-500">{item.date}</td><td className="p-6 font-bold text-blue-600">{item.bank}</td><td className="p-6 text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td><td className="p-6"><span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${item.status==='Cleared'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{item.status}</span></td></>}
                                    
                                    {!['vendor-bills'].includes(view) && (
                                        <td className="p-6 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {view === 'salaries' && (
                                                <button onClick={() => { setFormData(item); setShowSalarySlip(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors mr-1" title="Print Slip">
                                                    <Printer size={16}/>
                                                </button>
                                            )}
                                            <ActionButtons item={item} type={view === 'manage-users' ? 'user' : view === 'salaries' ? 'salary' : view === 'expenses' ? 'expense' : view === 'clients' ? 'client' : view === 'vendors' ? 'vendor' : view === 'petty-cash' ? 'petty' : view === 'bank' ? 'bank' : view.replace('s', '')} />
                                        </td>
                                    )}
                                </tr>
                            );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            );
        })()}

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
                        {paymentConfig.type === 'invoice' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tax Deducted by Client (WHT)</label>
                                <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-rose-600 outline-none focus:ring-2 focus:ring-rose-500" placeholder="0" value={clientWHT} onChange={e => setClientWHT(e.target.value)} />
                                <div className="flex justify-between mt-2 px-1 text-sm font-medium">
                                    <span className="text-slate-500">Net Receiving:</span>
                                    <span className="text-emerald-600 font-bold">{formatCurrency(paymentConfig.amount - (Number(clientWHT) || 0))}</span>
                                </div>
                            </div>
                        )}
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
                        {view==='clients' && <><input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input required placeholder="Client Name" className="form-input" value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/><input placeholder="Project Name" className="form-input" value={formData.projectName||''} onChange={e=>setFormData({...formData,projectName:e.target.value})}/><input type="number" placeholder="Project Total" className="form-input" value={formData.projectTotal||''} onChange={e=>setFormData({...formData,projectTotal:e.target.value})}/><input type="number" placeholder="Advance Received" className="form-input" value={formData.advanceReceived||''} onChange={e=>setFormData({...formData,advanceReceived:e.target.value})}/><input type="number" placeholder="Monthly Retainer Amount (if any)" className="form-input" value={formData.retainerAmount||''} onChange={e=>setFormData({...formData,retainerAmount:e.target.value})}/><select className="form-select" value={formData.status||'Ongoing'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Ongoing</option><option>Retainer</option><option>Completed</option></select></>}
                        {!['manage-users','clients','vendor-bills','salaries','vendors','petty-cash','bank'].includes(view) && <><input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input placeholder="Description/Name" className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/><input type="number" placeholder="Amount" className="form-input" value={formData.amount||''} onChange={e=>setFormData({...formData,amount:e.target.value})}/></>}
                        {view==='bank' && <>
                            <input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/>
                            <input placeholder="Bank Name (e.g. HBL, Meezan)" className="form-input" value={formData.bank||''} onChange={e=>setFormData({...formData,bank:e.target.value})}/>
                            <input placeholder="Description / Reference" className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amount</label>
                                    <input type="number" placeholder="Positive = Credit, Negative = Debit" className="form-input" value={formData.amount||''} onChange={e=>setFormData({...formData,amount:e.target.value})}/>
                                    <p className="text-xs text-slate-400 mt-1">Use negative (−) for payments out</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label>
                                    <select className="form-select" value={formData.status||'Cleared'} onChange={e=>setFormData({...formData,status:e.target.value})}>
                                        <option>Cleared</option>
                                        <option>Pending</option>
                                    </select>
                                </div>
                            </div>
                        </>}
                        {view==='petty-cash' && <>
                            <input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/>
                            <input placeholder="Description" className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cash Out (Expense)</label><input type="number" placeholder="0" className="form-input text-rose-600" value={formData.cashOut||''} onChange={e=>setFormData({...formData,cashOut:e.target.value,cashIn:formData.cashIn||''})} /></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cash In (Receipt)</label><input type="number" placeholder="0" className="form-input text-emerald-600" value={formData.cashIn||''} onChange={e=>setFormData({...formData,cashIn:e.target.value,cashOut:formData.cashOut||''})} /></div>
                            </div>
                        </>}
                        {view==='vendors' && <><input required placeholder="Vendor / Supplier Name" className="form-input" value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/><input placeholder="Service Type (e.g. Printing, Media)" className="form-input" value={formData.serviceType||''} onChange={e=>setFormData({...formData,serviceType:e.target.value})}/><input placeholder="Contact / Phone" className="form-input" value={formData.contact||''} onChange={e=>setFormData({...formData,contact:e.target.value})}/><input type="number" placeholder="Total Amount Payable" className="form-input" value={formData.amountPayable||''} onChange={e=>setFormData({...formData,amountPayable:e.target.value})}/><input type="number" placeholder="Amount Paid So Far" className="form-input" value={formData.amountPaid||''} onChange={e=>setFormData({...formData,amountPaid:e.target.value})}/></>}
                        {view === 'salaries' && (
                            <>
                                <input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})} />
                                <input placeholder="Employee Name" className="form-input" value={formData.employeeName||''} onChange={e=>setFormData({...formData,employeeName:e.target.value})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Basic Salary</label>
                                        <input type="number" placeholder="0" className="form-input" value={formData.basicSalary || ''} onChange={e => {
                                            const basic = Number(e.target.value);
                                            const tax = Number(formData.taxDeduction || 0);
                                            setFormData({ ...formData, basicSalary: basic, totalPayable: basic - tax });
                                        }} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tax Deducted</label>
                                        <input type="number" placeholder="0" className="form-input text-rose-600" value={formData.taxDeduction || ''} onChange={e => {
                                            const tax = Number(e.target.value);
                                            const basic = Number(formData.basicSalary || 0);
                                            setFormData({ ...formData, taxDeduction: tax, totalPayable: basic - tax });
                                        }} />
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-200 mt-2">
                                    <span className="text-sm font-bold text-slate-600">Net Payable:</span>
                                    <span className="text-xl font-bold text-indigo-600">{formatCurrency(formData.totalPayable || 0)}</span>
                                </div>
                                <select className="form-select mt-2" value={formData.status||'Unpaid'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Unpaid</option><option>Paid</option><option>Pending</option></select>
                            </>
                        )}
                        {view === 'vendor-bills' && (
                            <>
                                <input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})} />
                                <select className="form-select" value={formData.vendor||''} onChange={e=>setFormData({...formData,vendor:e.target.value})}><option value="">Select Vendor</option>{vendors.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select>
                                <input placeholder="Bill # / Ref" className="form-input" value={formData.billNumber||''} onChange={e=>setFormData({...formData,billNumber:e.target.value})} />
                                <input placeholder="Description" className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Total Bill Amount</label>
                                        <input type="number" placeholder="0" className="form-input" value={formData.billAmount||''} onChange={e=> {
                                            const amt = Number(e.target.value);
                                            const tax = Number(formData.taxDeduction || 0);
                                            setFormData({...formData, billAmount: amt, amount: amt - tax});
                                        }} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tax Deducted (WHT)</label>
                                        <input type="number" placeholder="0" className="form-input text-rose-600" value={formData.taxDeduction||''} onChange={e=> {
                                            const tax = Number(e.target.value);
                                            const amt = Number(formData.billAmount || 0);
                                            setFormData({...formData, taxDeduction: tax, amount: amt - tax});
                                        }} />
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-200 mt-2">
                                    <span className="text-sm font-bold text-slate-600">Net Payable:</span>
                                    <span className="text-xl font-bold text-indigo-600">{formatCurrency(formData.amount || 0)}</span>
                                </div>
                                <input type="number" placeholder="Paid So Far" className="form-input mt-2" value={formData.paidAmount||''} onChange={e=>setFormData({...formData,paidAmount:e.target.value})} />
                            </>
                        )}
                        {view === 'expenses' && (
                            <>
                                <input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})} />
                                <select className="form-select" value={formData.category||'General'} onChange={e=>setFormData({...formData,category:e.target.value})}>{expenseCategories.map(c=><option key={c} value={c}>{c}</option>)}</select>
                                <input placeholder="Description (e.g. Office Rent)" className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Total Amount</label>
                                        <input type="number" placeholder="0" className="form-input" value={formData.amount||''} onChange={e=>setFormData({...formData,amount:e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tax Included (Credit)</label>
                                        <input type="number" placeholder="0" className="form-input text-emerald-600" value={formData.taxAmount||''} onChange={e=>setFormData({...formData,taxAmount:e.target.value})} />
                                    </div>
                                </div>
                            </>
                        )}
                        {(view==='salaries'||view==='petty-cash'||view==='expenses') && <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Details (Optional)</label><div className="grid grid-cols-2 gap-4"><input placeholder="Bank Name" className="form-input bg-white" value={formData.bankName||''} onChange={e=>setFormData({...formData,bankName:e.target.value})} /><input placeholder="Cheque #" className="form-input bg-white" value={formData.chequeNumber||''} onChange={e=>setFormData({...formData,chequeNumber:e.target.value})} /></div></div>}
                        <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-5 rounded-2xl hover:bg-violet-50 transition-colors border-2 border-dashed border-slate-200 hover:border-violet-300 group"><div className="p-2 bg-white rounded-full text-slate-400 group-hover:text-violet-500 shadow-sm"><Upload size={20}/></div><span className="text-sm font-bold text-slate-500 group-hover:text-violet-600">{fileToUpload?fileToUpload.name:"Attach Receipt / Proof"}</span><input type="file" className="hidden" onChange={e=>setFileToUpload(e.target.files[0])}/></label>
                        <button disabled={isSubmitting} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all transform hover:scale-[1.01] active:scale-95 flex justify-center items-center gap-2">{isSubmitting?<RefreshCw className="animate-spin" size={20}/>:<CheckCircle size={20}/>} {isSubmitting?'Saving...':'Save Record'}</button>
                    </form>
                    <style>{`.form-input { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; background: #F8FAFC; outline: none; transition: all; font-weight: 500; font-size: 0.95rem; } .form-input:focus { background: white; border-color: #8B5CF6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); } .form-select { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; background: white; outline: none; font-weight: 500; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }`}</style>
                </div>
            </div>
        )}

        {/* SALARY SLIP MODAL */}
        {showSalarySlip && formData && <SalarySlip data={formData} onClose={() => setShowSalarySlip(false)} />}
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><ToastProvider><App /></ToastProvider></ErrorBoundary>);
