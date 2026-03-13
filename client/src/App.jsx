// src/App.jsx
// LeanAxis Accounts - Main Application
// All UI components + App orchestration

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {LayoutDashboard, Wallet, Receipt, Users, Building2, Briefcase, Truck, Plus, Download, Trash2, ArrowUpRight, ArrowDownLeft, Calendar, LogIn, Lock, UserPlus, Edit, Menu, X, CheckCircle, Clock, Upload, Link as LinkIcon, Copy, RefreshCw, Settings, Search, Filter, FileText, Printer, DollarSign, Percent, CreditCard, Check, Share2, Database, BookOpen, FileCheck, Landmark, Command, Moon, Sun, Bell, StickyNote, Zap, TrendingUp, TrendingDown, ChevronRight} from 'lucide-react';
import {PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid} from 'recharts';
import Papa from 'papaparse';

// Contexts & Hooks
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { useToast } from './components/Toast';

// API clients
import {
  clientsAPI, vendorsAPI, expensesAPI, pettyCashAPI, salariesAPI,
  bankRecordsAPI, invoicesAPI, quotationsAPI, vendorBillsAPI, usersAPI, settingsAPI
} from './utils/api';

// Utilities
import { formatCurrency, calculateTax, calcInvoiceTotal, printDocument, downloadElementAsPDF, today, exportToCSV } from './utils/helpers';

// ── Helpers replicated inline for components ──────────────────────────────────
const hashPassword = async (password) => {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const Logo = ({ className, white = false, companyName, tagline }) => (
 <div className={`flex items-center gap-3 ${className}`}>
  <img src="./logo.png" alt={companyName || 'Company'} className="h-10 object-contain" onError={(e) => {
   e.target.style.display = 'none';
   e.target.nextSibling.style.display = 'flex';
  }} />
  <div className="hidden flex-col leading-none">
   <span className={`text-xl font-bold tracking-tight ${white ? 'text-white' : 'text-slate-800'}`}>{companyName || <><span>LEAN</span><span className="text-violet-500">AXIS</span></>}</span>
   <span className={`text-[0.6rem] font-bold uppercase tracking-[0.2em] ${white ? 'text-slate-400' : 'text-slate-500'}`}>{tagline || 'Creative Agency'}</span>
  </div>
 </div>
);
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
// Hook moved to DataContext
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
function useCompanyProfile() {
 return useStickyState({
  name: 'LeanAxis',
  tagline: 'Creative Agency & Solutions',
  address: '',
  phone: '',
  email: '',
  website: '',
 }, 'leanaxis_company_profile');
}
function useAppSettings() {
 return useStickyState({
  currency: 'PKR',
  locale: 'en-PK',
  invoicePrefix: 'INV',
  invoiceCounter: 1,
  defaultTaxRate: 0,
  defaultPaymentTerms: 'Payment due within 30 days.',
  pettyCashOpeningBalance: 0,
  pettyCashMinBalance: 0,
  quotePrefix: 'QT',
  quoteCounter: 1,
  billPrefix: 'BILL',
  billCounter: 1,
  darkMode: false,
 }, 'leanaxis_app_settings');
}
const LoginView = ({ onLogin, loading: externalLoading, error }) => {
 const [loginInput, setLoginInput] = useState('');
 const [password, setPassword] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const loginCompany = (() => {
 try { return JSON.parse(localStorage.getItem('leanaxis_company_profile') || '{}'); } catch { return {}; }
 })();
 const handleSubmit = async (e) => {
 e.preventDefault();
 setIsLoading(true);
 await onLogin(loginInput, password);
 setIsLoading(false);
 };
 const loading = externalLoading || isLoading;
 return (
 <div className="min-h-screen flex items-center justify-center bg-[#0F172A] font-sans p-4 relative overflow-hidden">
  {}
  <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse"></div>
  <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-fuchsia-600/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
  <div className="bg-slate-900/40 backdrop-blur-2xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 relative z-10">
  <div className="flex flex-col items-center mb-10">
   <img src="./logo.png" alt={loginCompany.name || 'Company'} className="h-20 object-contain mb-4 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block'}}/>
   <div className="hidden text-white font-bold text-5xl tracking-tight mb-2">{loginCompany.name || 'ACCOUNTS'}</div>
   <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">{loginCompany.tagline || 'Business Management'}</p>
  </div>
  <form onSubmit={handleSubmit} className="space-y-6">
   <div className="space-y-2">
   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Username or Email</label>
   <div className="relative group">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-violet-400 transition-colors"><Briefcase size={18}/></div>
    <input type="text" required autoComplete="username" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} placeholder="username or email@company.com" />
   </div>
   <p className="text-xs text-slate-600 ml-1">You can sign in with either your username or email address.</p>
   </div>
   <div className="space-y-2">
   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
   <div className="relative group">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-violet-400 transition-colors"><Lock size={18}/></div>
    <input type="password" required autoComplete="current-password" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
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
const QuotationGenerator = ({ clients, onSave, savedQuotations, onDeleteQuotation, onConvertToInvoice, companyProfile = {}, appSettings = {}, onUpdateSettings, canWrite }) => {
 const toast = useToast();
 const [viewMode, setViewMode] = useState('list');
 const nextQuoteNumber = () => {
  const prefix  = appSettings.quotePrefix  || 'QT';
  const counter = Number(appSettings.quoteCounter || 1);
  return `${prefix}-${String(counter).padStart(3, '0')}`;
 };
 const [quoteNumber, setQuoteNumber] = useState(() => nextQuoteNumber());
 const [quoteData, setQuoteData] = useState({ client: '', date: new Date().toISOString().split('T')[0], validUntil: '', items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0, notes: '', status: 'Pending' });
 const addItem = () => setQuoteData({...quoteData, items: [...quoteData.items, { desc: '', qty: 1, rate: 0 }]});
 const updateItem = (index, field, val) => { const newItems = [...quoteData.items]; newItems[index][field] = val; setQuoteData({...quoteData, items: newItems}); };
 const removeItem = (index) => { if(quoteData.items.length > 1) setQuoteData({...quoteData, items: quoteData.items.filter((_, i) => i !== index)}); };
 const { subtotal, tax, total } = calculateTax(quoteData.items.reduce((acc, item) => acc + ((Number(item.qty)||0) * (Number(item.rate)||0)), 0), quoteData.taxRate);
 const handleShareWhatsApp = () => {
  if (!quoteData.client || total === 0) return toast("Please select a client and add items first.", "warning");
  const message = `*QUOTATION ${quoteNumber}*\nFrom: ${companyProfile.name || 'Our Company'}%0ATo: ${quoteData.client}%0ADate: ${quoteData.date}${quoteData.validUntil?`%0AValid Until: ${quoteData.validUntil}`:''}%0A%0A` + quoteData.items.map(item => `- ${item.desc}: ${formatCurrency((parseFloat(item.qty)||0) * (parseFloat(item.rate)||0))}`).join('%0A') + `%0A%0A*Total Estimate: ${formatCurrency(total)}*`;
  window.open(`https://wa.me/?text=${message}`, '_blank');
 };
 if (viewMode === 'list') {
  return (
   <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
     <div>
      <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Quotations</h2>
      <p className="text-slate-500 text-sm font-medium mt-0.5">{savedQuotations.length} total</p>
     </div>
     <div className="flex gap-2 w-full sm:w-auto">
      {canWrite && <button onClick={() => {
       setQuoteNumber(nextQuoteNumber());
       setQuoteData({ client: '', date: new Date().toISOString().split('T')[0], validUntil: '', items: [{ desc: '', qty: 1, rate: 0 }], taxRate: 0, notes: '', status: 'Pending' });
       setViewMode('create');
      }} className="flex-1 sm:flex-none bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all hover:scale-105 active:scale-95"><Plus size={18}/> New Quote</button>}
      <button onClick={() => exportToCSV(savedQuotations, 'Quotations_Export')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm"><Download size={15}/> Export</button>
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
        <tr><th className="p-5">Ref #</th><th className="p-5">Date</th><th className="p-5">Client</th><th className="p-5">Valid Until</th><th className="p-5 text-right">Total</th><th className="p-5 text-center">Status</th><th className="p-5 text-center">Actions</th></tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
        {savedQuotations.map(q => {
         const qTotal = calculateTax(q.items.reduce((a, i) => a + ((Number(i.qty)||0) * (Number(i.rate)||0)), 0), q.taxRate).total;
         const isExpired = q.validUntil && new Date(q.validUntil) < new Date();
         return (
          <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
           <td className="p-5 font-mono font-bold text-violet-600 text-sm">{q.quoteNumber || '—'}</td>
           <td className="p-5 text-sm text-slate-500 font-medium">{q.date}</td>
           <td className="p-5 font-bold text-slate-800">{q.client}</td>
           <td className="p-5 text-sm">
            {q.validUntil ? <span className={`font-medium ${isExpired ? 'text-rose-500' : 'text-slate-500'}`}>{q.validUntil}{isExpired && ' (Expired)'}</span> : <span className="text-slate-300">—</span>}
           </td>
           <td className="p-5 text-right font-bold text-amber-600">{formatCurrency(qTotal)}</td>
           <td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${q.status === 'Converted' ? 'bg-emerald-100 text-emerald-700' : q.status === 'Approved' ? 'bg-sky-100 text-sky-700' : isExpired ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>{q.status}</span></td>
           <td className="p-5 text-center">
            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
             {q.status !== 'Converted' && canWrite && <button onClick={() => onConvertToInvoice(q)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors" title="Convert to Invoice"><CheckCircle size={16} /></button>}
             {canWrite && <button onClick={() => { const newNum = nextQuoteNumber(); setQuoteData({...q, id: undefined, status: 'Pending', date: new Date().toISOString().split('T')[0]}); setQuoteNumber(newNum); if(onUpdateSettings) onUpdateSettings(prev=>({...prev,quoteCounter:(Number(prev.quoteCounter)||1)+1})); setViewMode('create'); }} className="p-2 text-amber-400 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors" title="Duplicate Quote"><Copy size={16}/></button>}
             {canWrite && <button onClick={() => { setQuoteData(q); setQuoteNumber(q.quoteNumber || ''); setViewMode('create'); }} className="p-2 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"><Edit size={16} /></button>}
             {canWrite && <button onClick={() => onDeleteQuotation(q.id)} className="p-2 text-rose-400 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"><Trash2 size={16} /></button>}
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
    <button onClick={() => setViewMode('list')} className="text-slate-400 hover:text-amber-600 flex items-center gap-2 text-sm font-bold transition-colors group"><ArrowDownLeft className="rotate-90 group-hover:-translate-x-1 transition-transform" size={16}/> Back to List</button>
   </div>
   {}
   <div id="quotation-printable">
   {}
   <div className="flex flex-col md:flex-row justify-between items-start mb-10 border-b border-slate-100 pb-8 gap-6">
    <div>
     <img src="./logo.png" alt={companyProfile.name || 'Company'} className="h-14 object-contain mb-3" onError={(e)=>{e.target.style.display='none'}}/>
     <p className="text-slate-600 font-bold text-base">{companyProfile.name || ''}</p>
     <p className="text-slate-400 text-sm font-medium">{companyProfile.tagline || ''}</p>
     {companyProfile.address && <p className="text-slate-400 text-xs mt-1">{companyProfile.address}</p>}
     {companyProfile.phone && <p className="text-slate-400 text-xs">{companyProfile.phone}</p>}
     {companyProfile.email && <p className="text-slate-400 text-xs">{companyProfile.email}</p>}
    </div>
    <div className="text-left md:text-right">
     <div className="bg-amber-100 text-amber-700 font-bold py-1.5 px-4 rounded-lg text-sm mb-3 inline-block shadow-sm">QUOTATION</div>
     <div className="flex items-center gap-2">
      <input className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 w-36"
       value={quoteNumber} onChange={e=>setQuoteNumber(e.target.value)}/>
      {!quoteData.id && <span className="text-xs font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Auto</span>}
     </div>
     <p className="text-slate-400 text-xs font-medium mt-1">Date: {quoteData.date}</p>
     {quoteData.validUntil && <p className="text-amber-600 text-xs font-bold mt-0.5">Valid Until: {quoteData.validUntil}</p>}
    </div>
   </div>
   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
    <div>
     <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quotation For</label>
     <select className="w-full border-none bg-white p-4 rounded-xl text-base font-semibold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none" value={quoteData.client} onChange={e => setQuoteData({...quoteData, client: e.target.value})}>
      <option value="">Select Client</option>{clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
     </select>
     {quoteData.client && (() => { const c = clients.find(x=>x.name===quoteData.client); return c && (c.address||c.email||c.phone) ? <div className="mt-2 text-xs text-slate-400 px-1 space-y-0.5">{c.address && <p>📍 {c.address}</p>}{c.email && <p>✉ {c.email}</p>}{c.phone && <p>📞 {c.phone}</p>}</div> : null; })()}
    </div>
    <div className="space-y-3">
     <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Details</label>
     <div className="flex gap-3">
      <input type="date" className="flex-1 border-none bg-white p-3.5 rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-600" value={quoteData.date} onChange={e => setQuoteData({...quoteData, date: e.target.value})} />
      <input type="number" placeholder="Tax %" className="w-24 border-none bg-white p-3.5 rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none" value={quoteData.taxRate} onChange={e => setQuoteData({...quoteData, taxRate: e.target.value})} />
     </div>
     <div className="flex gap-3 items-center">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Valid Until:</label>
      <input type="date" className="flex-1 border-none bg-white p-3 rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-600" value={quoteData.validUntil||''} onChange={e => setQuoteData({...quoteData, validUntil: e.target.value})} />
     </div>
     <select className="w-full border-none bg-white p-3 rounded-xl text-sm font-semibold shadow-sm outline-none text-slate-600" value={quoteData.status} onChange={e => setQuoteData({...quoteData, status: e.target.value})}>
      <option>Pending</option><option>Approved</option><option>Rejected</option><option>Converted</option>
     </select>
    </div>
   </div>
   <div className="overflow-x-auto mb-8">
    <table className="w-full min-w-[600px]">
     <thead><tr className="border-b border-slate-200"><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-left pl-4">Description</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-24 text-center">Qty</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-36 text-right">Rate</th><th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-40 text-right pr-4">Amount</th><th className="w-10"></th></tr></thead>
     <tbody className="divide-y divide-slate-100">{quoteData.items.map((item, i) => (<tr key={i} className="group"><td className="py-4 pl-4"><input className="w-full bg-transparent outline-none font-medium text-slate-700 placeholder-slate-300" placeholder="Item description" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} /></td><td className="py-4 text-center"><input inputMode="decimal" className="w-full bg-transparent outline-none text-slate-600 text-center" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} onBlur={e=>{const v=parseFloat(e.target.value);updateItem(i,'qty',isNaN(v)||v<=0?1:v);}} /></td><td className="py-4 text-right"><input inputMode="decimal" className="w-full bg-transparent outline-none text-slate-600 text-right" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} onBlur={e=>{const v=parseFloat(e.target.value);updateItem(i,'rate',isNaN(v)?0:v);}} /></td><td className="py-4 text-right pr-4 font-bold text-slate-800">{formatCurrency((parseFloat(item.qty)||0) * (parseFloat(item.rate)||0))}</td><td className="py-4 text-center"><button onClick={() => removeItem(i)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td></tr>))}</tbody>
    </table>
   </div>
   <button onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-800 mb-10 px-4 py-2 hover:bg-amber-50 rounded-lg transition-colors w-max"><Plus size={16}/> Add Line Item</button>
   <div className="flex justify-end mb-6"><div className="w-full md:w-80 space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100"><div className="flex justify-between text-sm text-slate-500 font-medium"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-sm text-slate-500 font-medium"><span>Tax ({quoteData.taxRate}%)</span><span>{formatCurrency(tax)}</span></div><div className="flex justify-between text-2xl font-bold text-slate-800 border-t border-slate-200 pt-4 mt-2"><span>Estimate Total</span><span className="text-amber-600">{formatCurrency(total)}</span></div></div></div>
   {}
   <div className="mb-6"><textarea rows={2} placeholder="Notes or terms for this quotation (optional)" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400 resize-none" value={quoteData.notes||''} onChange={e=>setQuoteData({...quoteData,notes:e.target.value})}/></div>
   {}
   <div className="pt-4 border-t border-slate-100 flex justify-between items-end text-xs text-slate-400">
    <p className="italic">This is an estimate. Prices subject to change.</p>
    <p className="font-bold">{companyProfile.name || ''}</p>
   </div>
   </div>{}
   <div className="flex flex-col md:flex-row gap-4 mt-6">
    <button onClick={() => printDocument('quotation-printable', `Quotation ${quoteNumber} — ${quoteData.client || ''}`)} className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 transition-colors"><Printer size={18}/> Print</button>
    <button onClick={() => downloadElementAsPDF('quotation-printable', `Quotation_${quoteNumber}_${quoteData.client}_${quoteData.date}.pdf`)} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-700 transition-colors"><Download size={18}/> Download PDF</button>
    <button onClick={handleShareWhatsApp} className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-xl font-bold hover:bg-[#20bd5a] transition-colors shadow-lg shadow-green-200"><Share2 size={18}/> WhatsApp</button>
    <button onClick={() => {
     const isNew = !quoteData.id;
     onSave({...quoteData, quoteNumber});
     if (isNew && onUpdateSettings) {
      onUpdateSettings(prev => ({...prev, quoteCounter: (Number(prev.quoteCounter)||1) + 1}));
     }
     setViewMode('list');
    }} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-4 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"><CheckCircle size={18}/> Save Quote</button>
   </div>
  </div>
 );
};
const InvoiceGenerator = ({ clients, onSave, savedInvoices, onDeleteInvoice, onGenerateRecurring, onReceivePayment, companyProfile = {}, appSettings = {}, onUpdateSettings, pendingClient, onClearPendingClient }) => {
 const toast = useToast();
 const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'preview'
 const [invoiceData, setInvoiceData] = useState({
  client: '', date: new Date().toISOString().split('T')[0],
  dueDate: '', items: [{ desc: '', qty: 1, rate: 0 }],
  taxRate: appSettings.defaultTaxRate || 0, discount: 0, notes: '', terms: appSettings.defaultPaymentTerms || '', status: 'Draft'
 });
 const nextInvNumber = () => {
  const prefix = appSettings.invoicePrefix || 'INV';
  const counter = Number(appSettings.invoiceCounter || 1);
  return `${prefix}-${String(counter).padStart(3, '0')}`;
 };
 const [invoiceNumber, setInvoiceNumber] = useState(() => nextInvNumber());
 const [invSearch, setInvSearch]           = useState('');
 useEffect(() => {
  if (pendingClient) {
   const retainerAmt = Number(pendingClient.retainerAmount) || 0;
   const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
   const items = retainerAmt > 0
    ? [
     { desc: `Monthly Retainer — ${currentMonth}`, qty: 1, rate: retainerAmt },
     { desc: '', qty: 1, rate: 0 }
     ]
    : [{ desc: '', qty: 1, rate: 0 }];
   setInvoiceData({
    client: pendingClient.name || '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items,
    taxRate: appSettings.defaultTaxRate || 0,
    discount: 0, notes: '',
    terms: appSettings.defaultPaymentTerms || '',
    status: 'Draft'
   });
   setInvoiceNumber(nextInvNumber());
   setViewMode('create');
   if (onClearPendingClient) onClearPendingClient();
  }
 }, [pendingClient]);
 const [invStatusFilter, setInvStatusFilter] = useState('All');
 const [invClientFilter, setInvClientFilter] = useState('All');
 const [sortBy, setSortBy]                 = useState('date-desc');
 const [showPreview, setShowPreview]       = useState(false);
 const addItem    = () => setInvoiceData(d => ({...d, items: [...d.items, { desc: '', qty: 1, rate: 0 }]}));
 const updateItem = (i, f, v) => setInvoiceData(d => { const it = [...d.items]; it[i] = {...it[i], [f]: v}; return {...d, items: it}; });
 const removeItem = (i) => setInvoiceData(d => ({ ...d, items: d.items.length > 1 ? d.items.filter((_, idx) => idx !== i) : d.items }));
 const subtotalRaw = invoiceData.items.reduce((a, it) => a + (parseFloat(it.qty)||0) * (parseFloat(it.rate)||0), 0);
 const discountAmt = Math.min(subtotalRaw, (subtotalRaw * (Number(invoiceData.discount)||0)) / 100);
 const afterDiscount = subtotalRaw - discountAmt;
 const { tax, total } = calculateTax(afterDiscount, invoiceData.taxRate);
 const subtotal = afterDiscount;
 useEffect(() => {
  if (invoiceData.client && viewMode === 'create') {
   const client = clients.find(c => c.name === invoiceData.client);
   if (client) {
    const isBlank = invoiceData.items.length === 1 && !invoiceData.items[0].desc && invoiceData.items[0].rate === 0;
    if (isBlank) {
     const retainer = Number(client.retainerAmount);
     if (retainer > 0) {
      setInvoiceData(d => ({...d, items: [{ desc: 'Monthly Retainer Service', qty: 1, rate: retainer }]}));
     } else {
      const bal = (Number(client.projectTotal)||0) - (Number(client.advanceReceived)||0);
      if (bal > 0) setInvoiceData(d => ({...d, items: [{ desc: `Balance Payment — ${client.projectName||'Project'}`, qty: 1, rate: bal }]}));
     }
    }
   }
  }
 }, [invoiceData.client, clients, viewMode]);
 const setDueDays = (days) => {
  const d = new Date(invoiceData.date || new Date());
  d.setDate(d.getDate() + days);
  setInvoiceData(prev => ({...prev, dueDate: d.toISOString().split('T')[0]}));
 };
 const handleShareWhatsApp = (inv) => {
  const data   = inv || invoiceData;
  const invNum = inv ? (inv.invoiceNumber||'') : invoiceNumber;
  const st     = inv ? calculateTax(inv.items.reduce((a,i)=>a+(Number(i.qty)||0)*(Number(i.rate)||0),0) - (inv.items.reduce((a,i)=>a+(Number(i.qty)||0)*(Number(i.rate)||0),0)*(Number(inv.discount)||0)/100), inv.taxRate) : { subtotal, tax, total };
  if (!data.client || st.total === 0) return toast('Please select a client and add items first.', 'warning');
  const received = Number(inv?.amountReceived||0);
  const balance  = st.total - received;
  const msg = encodeURIComponent(
   `*INVOICE #${invNum}*\n` +
   `${companyProfile.name || 'Our Company'}\n\n` +
   `To: ${data.client}\n` +
   `Date: ${data.date}${data.dueDate ? `\nDue: ${data.dueDate}` : ''}\n\n` +
   `*Items:*\n` + (data.items||[]).map(i=>`• ${i.desc}: ${formatCurrency((Number(i.qty)||0)*(Number(i.rate)||0))}`).join('\n') + '\n\n' +
   (Number(data.discount)>0 ? `Discount (${data.discount}%): -${formatCurrency(discountAmt)}\n` : '') +
   `Tax (${data.taxRate}%): ${formatCurrency(st.tax)}\n` +
   `*Total: ${formatCurrency(st.total)}*` +
   (received > 0 ? `\nReceived: ${formatCurrency(received)}\n*Balance Due: ${formatCurrency(balance)}*` : '') +
   (data.notes ? `\n\n${data.notes}` : '') +
   `\n\nThank you for your business!`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
 };
 const handleDownloadPDF = async () => {
  const ok = await downloadElementAsPDF(
   'invoice-preview-content',
   `Invoice_${invoiceNumber}_${invoiceData.client}_${invoiceData.date}.pdf`
  );
  if (ok) toast('PDF downloaded!', 'success');
  else toast('PDF export failed. Please try again.', 'error');
 };
 const handlePrintInvoice = () => {
  printDocument('invoice-preview-content', `Invoice ${invoiceNumber} — ${invoiceData.client}`);
 };
 const invStats = useMemo(() => {
  const getTotal = inv => {
   const s = inv.items?.reduce((a, i) => a + (Number(i.qty)||0)*(Number(i.rate)||0), 0)||0;
   const disc = s * (Number(inv.discount)||0) / 100;
   return calculateTax(s - disc, inv.taxRate).total;
  };
  const today = new Date(); today.setHours(0,0,0,0);
  let totalRevenue=0, collected=0, outstanding=0, overdueAmt=0, overdueCount=0, draftCount=0, sentCount=0, partialCount=0;
  savedInvoices.forEach(inv => {
   const t = getTotal(inv);
   const recv = Number(inv.amountReceived)||0;
   const isOverdue = inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < today;
   totalRevenue += t;
   if (inv.status === 'Paid') collected += t;
   else {
    outstanding += t - recv;
    if (isOverdue) { overdueAmt += t - recv; overdueCount++; }
    if (recv > 0 && inv.status !== 'Paid') partialCount++;
   }
   if (inv.status === 'Draft') draftCount++;
   if (inv.status === 'Sent') sentCount++;
  });
  return { totalRevenue, collected, outstanding, overdueAmt, overdueCount, draftCount, sentCount, partialCount, total: savedInvoices.length };
 }, [savedInvoices]);
 const monthlyChart = useMemo(() => {
  const today = new Date();
  return Array.from({length:6}, (_,i) => {
   const d = new Date(today.getFullYear(), today.getMonth()-5+i, 1);
   const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
   const label = d.toLocaleString('default', { month: 'short' });
   const getTotal = inv => { const s=inv.items?.reduce((a,it)=>a+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0)||0; return calculateTax(s-(s*(Number(inv.discount)||0)/100),inv.taxRate).total; };
   const invoiced = savedInvoices.filter(inv => (inv.date||'').slice(0,7) === key).reduce((a,inv) => a+getTotal(inv), 0);
   const paid     = savedInvoices.filter(inv => inv.status==='Paid' && (inv.date||'').slice(0,7) === key).reduce((a,inv) => a+getTotal(inv), 0);
   return { name: label, Invoiced: invoiced, Collected: paid };
  });
 }, [savedInvoices]);
 const agingData = useMemo(() => {
  const today = new Date(); today.setHours(0,0,0,0);
  const buckets = { '0–30 days': 0, '31–60 days': 0, '61–90 days': 0, '90+ days': 0 };
  savedInvoices.filter(inv => inv.status !== 'Paid' && inv.dueDate).forEach(inv => {
   const days = Math.floor((today - new Date(inv.dueDate)) / 86400000);
   const getTotal = inv => { const s=inv.items?.reduce((a,it)=>a+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0)||0; return calculateTax(s-(s*(Number(inv.discount)||0)/100),inv.taxRate).total; };
   const bal = getTotal(inv) - (Number(inv.amountReceived)||0);
   if (days <= 30) buckets['0–30 days'] += bal;
   else if (days <= 60) buckets['31–60 days'] += bal;
   else if (days <= 90) buckets['61–90 days'] += bal;
   else buckets['90+ days'] += bal;
  });
  return Object.entries(buckets).map(([name, value]) => ({ name, value })).filter(b => b.value > 0);
 }, [savedInvoices]);
 const AGING_COLORS = ['#10b981','#f59e0b','#f97316','#ef4444'];
 const displayedInvoices = useMemo(() => {
  const getTotal = inv => { const s=inv.items?.reduce((a,i)=>a+(Number(i.qty)||0)*(Number(i.rate)||0),0)||0; return calculateTax(s-(s*(Number(inv.discount)||0)/100),inv.taxRate).total; };
  const today = new Date(); today.setHours(0,0,0,0);
  let res = savedInvoices.map(inv => {
   const total = getTotal(inv);
   const received = Number(inv.amountReceived)||0;
   const isOverdue = inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < today;
   const isPaid = inv.status === 'Paid';
   const isPartial = !isPaid && received > 0;
   const daysOverdue = isOverdue ? Math.floor((today - new Date(inv.dueDate)) / 86400000) : 0;
   const statusLabel = isPaid ? 'Paid' : isOverdue ? 'Overdue' : isPartial ? 'Partial' : (inv.status||'Draft');
   return {...inv, _total: total, _received: received, _balance: total - received, _isPaid: isPaid, _isOverdue: isOverdue, _isPartial: isPartial, _daysOverdue: daysOverdue, _statusLabel: statusLabel };
  });
  if (invSearch)      res = res.filter(inv => (inv.client||'').toLowerCase().includes(invSearch.toLowerCase()) || (inv.invoiceNumber||'').toLowerCase().includes(invSearch.toLowerCase()));
  if (invStatusFilter !== 'All') res = res.filter(inv => inv._statusLabel === invStatusFilter);
  if (invClientFilter !== 'All') res = res.filter(inv => inv.client === invClientFilter);
  if (sortBy === 'date-desc')   res = [...res].sort((a,b) => new Date(b.date)-new Date(a.date));
  if (sortBy === 'date-asc')    res = [...res].sort((a,b) => new Date(a.date)-new Date(b.date));
  if (sortBy === 'amount-desc') res = [...res].sort((a,b) => b._total - a._total);
  if (sortBy === 'overdue')     res = [...res].sort((a,b) => b._daysOverdue - a._daysOverdue);
  return res;
 }, [savedInvoices, invSearch, invStatusFilter, invClientFilter, sortBy]);
 const uniqueClients = useMemo(() => [...new Set(savedInvoices.map(i => i.client).filter(Boolean))].sort(), [savedInvoices]);
 const statusBadgeClass = {
  Paid:    'bg-emerald-100 text-emerald-700',
  Overdue: 'bg-rose-100 text-rose-700',
  Partial: 'bg-blue-100 text-blue-700',
  Draft:   'bg-slate-100 text-slate-500',
  Sent:    'bg-sky-100 text-sky-700',
  Unpaid:  'bg-amber-100 text-amber-700',
 };
 if (viewMode === 'list') return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
   {}
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {[
     { l:'Total Revenue', v: formatCurrency(invStats.totalRevenue), sub:`${invStats.total} invoices`, c:'text-slate-800', bg:'bg-white border-slate-200', icon: FileText },
     { l:'Collected',     v: formatCurrency(invStats.collected),    sub:'fully paid',   c:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200', icon: CheckCircle },
     { l:'Outstanding',   v: formatCurrency(invStats.outstanding),  sub:'unpaid balance',c:'text-violet-700', bg:'bg-violet-50 border-violet-200',  icon: Clock },
     { l:'Overdue',       v: formatCurrency(invStats.overdueAmt),   sub:`${invStats.overdueCount} invoice${invStats.overdueCount!==1?'s':''}`, c: invStats.overdueCount>0?'text-rose-700':'text-slate-500', bg: invStats.overdueCount>0?'bg-rose-50 border-rose-200':'bg-white border-slate-200', icon: ArrowUpRight },
     { l:'Partial',       v: invStats.partialCount,                  sub:'part-paid',    c:'text-blue-700',   bg:'bg-blue-50 border-blue-200',       icon: Percent },
     { l:'Sent',          v: invStats.sentCount,                     sub:'awaiting payment', c:'text-sky-700', bg:'bg-sky-50 border-sky-200',        icon: Share2 },
     { l:'Drafts',        v: invStats.draftCount,                    sub:'not sent',     c:'text-slate-600',  bg:'bg-white border-slate-200',        icon: Edit },
    ].map((k,i) => (
     <div key={i} className={`${k.bg} border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex justify-between items-start mb-2">
       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{k.l}</p>
       <k.icon size={13} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 mt-0.5"/>
      </div>
      <p className={`text-lg font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
      <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
     </div>
    ))}
   </div>
   {}
   {savedInvoices.length > 0 && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
     <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
       <div className="w-2 h-5 bg-violet-500 rounded-full"/>
       Revenue vs Collections
       <span className="text-xs font-bold text-slate-400 ml-1">(Last 6 Months)</span>
      </h3>
      <ResponsiveContainer width="100%" height={180}>
       <BarChart data={monthlyChart} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fontWeight:700,fill:'#94a3b8'}}/>
        <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
        <ChartTooltip formatter={v=>formatCurrency(v)} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',padding:'10px 14px'}}/>
        <Bar dataKey="Invoiced"  fill="#a78bfa" radius={[5,5,0,0]}/>
        <Bar dataKey="Collected" fill="#34d399" radius={[5,5,0,0]}/>
       </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2">
       <span className="flex items-center gap-1.5 text-xs font-bold text-violet-500"><span className="w-3 h-3 bg-violet-400 rounded-sm inline-block"/>Invoiced</span>
       <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="w-3 h-3 bg-emerald-400 rounded-sm inline-block"/>Collected</span>
      </div>
     </div>
     <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
       <div className="w-2 h-5 bg-rose-500 rounded-full"/>
       Receivable Aging
      </h3>
      {agingData.length > 0 ? (
       <div className="space-y-3 mt-2">
        {agingData.map((b,i) => (
         <div key={i}>
          <div className="flex justify-between items-center mb-1">
           <span className="text-xs font-bold text-slate-600">{b.name}</span>
           <span className="text-xs font-extrabold tabular-nums" style={{color:AGING_COLORS[i]}}>{formatCurrency(b.value)}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
           <div className="h-full rounded-full" style={{width:`${Math.min(100,(b.value/invStats.outstanding)*100).toFixed(1)}%`, backgroundColor: AGING_COLORS[i]}}/>
          </div>
         </div>
        ))}
       </div>
      ) : (
       <div className="flex flex-col items-center justify-center h-32 text-center">
        <CheckCircle className="text-emerald-400 mb-2" size={32}/>
        <p className="text-sm font-bold text-emerald-600">All invoices current!</p>
        <p className="text-xs text-slate-400 mt-1">No overdue receivables.</p>
       </div>
      )}
     </div>
    </div>
   )}
   {}
   <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
    <div className="flex flex-wrap gap-2 items-center">
     <div className="relative">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
      <input className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none w-52 transition-all"
       placeholder="Search client or inv #..." value={invSearch} onChange={e=>setInvSearch(e.target.value)}/>
     </div>
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      {['All','Draft','Sent','Unpaid','Partial','Paid','Overdue'].map(s => (
       <button key={s} onClick={() => setInvStatusFilter(s)}
        className={`px-2.5 py-2 text-xs font-bold transition-all ${invStatusFilter===s?'bg-violet-600 text-white':'text-slate-500 hover:text-violet-600'}`}>{s}</button>
      ))}
     </div>
     {uniqueClients.length > 1 && (
      <select value={invClientFilter} onChange={e=>setInvClientFilter(e.target.value)}
       className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Clients</option>
       {uniqueClients.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
     )}
     <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="date-desc">Newest First</option>
      <option value="date-asc">Oldest First</option>
      <option value="amount-desc">Highest Amount</option>
      <option value="overdue">Most Overdue</option>
     </select>
    </div>
    <div className="flex gap-2 flex-shrink-0">
     <label className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
      <Upload size={14}/> Import
      <input type="file" className="hidden" accept=".csv" onChange={(e) => { const file=e.target.files[0]; if(file) Papa.parse(file, { header: true, complete: async (results) => { const validRows = results.data.filter(r => r.client); try { const res = await settingsAPI.importData({ invoices: validRows }); toast(`Imported ${validRows.length} invoices!`, 'success'); } catch(e) { toast('Import failed.', 'error'); } } }); }}/>
     </label>
     <button onClick={() => exportToCSV(savedInvoices,'Invoices_Export')} className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-all shadow-sm"><Download size={14}/> Export</button>
     <button onClick={onGenerateRecurring} className="bg-white border border-violet-200 text-violet-600 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-violet-50 transition-all shadow-sm"><RefreshCw size={14}/> Retainers</button>
     <button onClick={() => {
      setInvoiceData({ client:'', date: new Date().toISOString().split('T')[0], dueDate:'', items:[{desc:'',qty:1,rate:0}], taxRate: appSettings.defaultTaxRate||0, discount:0, notes:'', terms: appSettings.defaultPaymentTerms||'', status:'Draft' });
      setInvoiceNumber(nextInvNumber());
      setViewMode('create');
     }} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:shadow-lg hover:shadow-violet-200 transition-all hover:scale-105 active:scale-95 shadow-sm">
      <Plus size={14}/> New Invoice
     </button>
    </div>
   </div>
   {}
   {(invSearch || invStatusFilter!=='All' || invClientFilter!=='All') && (
    <p className="text-sm text-slate-500 font-medium -mt-2">
     Showing <span className="font-bold text-violet-600">{displayedInvoices.length}</span> of {savedInvoices.length} invoices
     {displayedInvoices.length > 0 && <> · Total: <span className="font-bold text-slate-700">{formatCurrency(displayedInvoices.reduce((a,i)=>a+i._total,0))}</span></>}
    </p>
   )}
   {}
   {displayedInvoices.length === 0 && (
    <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
     <div className="bg-violet-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"><FileText className="text-violet-300" size={40}/></div>
     <h3 className="text-lg font-bold text-slate-800 mb-2">{savedInvoices.length===0?'No invoices yet':'No invoices match your filters'}</h3>
     <p className="text-slate-400 text-sm mb-6">{savedInvoices.length===0?'Create your first invoice to start billing clients.':'Try clearing your filters.'}</p>
     {savedInvoices.length===0 && <button onClick={()=>{ setInvoiceData({client:'',date:new Date().toISOString().split('T')[0],dueDate:'',items:[{desc:'',qty:1,rate:0}],taxRate:appSettings.defaultTaxRate||0,discount:0,notes:'',terms:appSettings.defaultPaymentTerms||'',status:'Draft'}); setInvoiceNumber(nextInvNumber()); setViewMode('create'); }} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors">+ Create First Invoice</button>}
    </div>
   )}
   {}
   {displayedInvoices.length > 0 && (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
     <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[1060px]">
       <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
         {['Invoice #','Client','Date','Due','Amount','Collected','Balance Due','Status','Actions'].map((h,i)=>(
          <th key={i} className={`px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${['Amount','Collected'].includes(h)?'text-right':''}`}>{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
        {displayedInvoices.map(inv => (
         <tr key={inv.id} className={`hover:bg-slate-50/80 transition-colors group ${inv._isOverdue?'bg-rose-50/30':''}`}>
          <td className="px-5 py-4">
           <p className="font-mono font-bold text-violet-600 text-sm">{inv.invoiceNumber||'—'}</p>
           {inv._isOverdue && <p className="text-xs font-bold text-rose-500 mt-0.5">⚠ {inv._daysOverdue}d overdue</p>}
          </td>
          <td className="px-5 py-4">
           <p className="font-bold text-slate-800 text-sm">{inv.client}</p>
           {inv.items?.length > 0 && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[140px]">{inv.items[0].desc}</p>}
           {inv.internalNotes && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md mt-1" title={inv.internalNotes}>
             <StickyNote size={10}/> Note
            </span>
           )}
          </td>
          <td className="px-5 py-4 text-sm text-slate-500 font-medium">{inv.date}</td>
          <td className="px-5 py-4">
           {inv.dueDate
            ? <span className={`text-sm font-medium ${inv._isOverdue?'text-rose-600 font-bold':'text-slate-500'}`}>{inv.dueDate}</span>
            : <span className="text-slate-300 text-sm">—</span>}
          </td>
          <td className="px-5 py-4 text-right">
           <p className="font-extrabold text-slate-800 tabular-nums">{formatCurrency(inv._total)}</p>
           {inv._isPartial && <p className="text-xs text-blue-600 font-bold mt-0.5">+{formatCurrency(inv._received)} rcvd</p>}
          </td>
          <td className="px-5 py-4 text-right">
           {inv._isPaid ? (
            <div className="text-right">
             <span className="text-sm font-extrabold text-emerald-600 tabular-nums">{formatCurrency(inv._total)}</span>
             {inv.paidDate && <p className="text-xs text-emerald-500 font-medium mt-0.5">on {inv.paidDate}</p>}
            </div>
           ) : (
            <div>
             <p className="text-sm font-bold tabular-nums text-slate-600">{formatCurrency(inv._received)}</p>
             {inv._total > 0 && (
              <div className="mt-1 h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden ml-auto">
               <div className="h-full bg-emerald-400 rounded-full" style={{width:`${Math.min(100,(inv._received/inv._total)*100).toFixed(0)}%`}}/>
              </div>
             )}
            </div>
           )}
          </td>
          <td className="px-5 py-4 text-right">
           {inv._isPaid
            ? <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">✓ Paid</span>
            : <div className="inline-flex flex-col items-end gap-0.5">
                <span className="font-extrabold tabular-nums text-rose-600 text-sm">{formatCurrency(inv._balance)}</span>
                {inv._isPartial && <span className="text-[10px] text-slate-400 font-medium">{Math.round((inv._received/inv._total)*100)}% collected</span>}
              </div>
           }
          </td>
          <td className="px-5 py-4">
           <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${statusBadgeClass[inv._statusLabel]||'bg-slate-100 text-slate-500'}`}>
            {inv._statusLabel}
           </span>
          </td>
          <td className="px-5 py-4">
           <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {!inv._isPaid && (
             <button onClick={() => onReceivePayment(inv, inv._balance)}
              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Record Payment">
              <CheckCircle size={13}/>
             </button>
            )}
            {(inv.status === 'Draft' || inv.status === 'Unpaid') && (
             <button onClick={() => onSave({...inv, status: 'Sent'})}
              className="p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors" title="Mark as Sent">
              <Share2 size={13}/>
             </button>
            )}
            <button onClick={() => handleShareWhatsApp(inv)}
             className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors" title="Send WhatsApp">
             <Share2 size={13}/>
            </button>
            <button onClick={() => {
             // Duplicate: copy invoice with new number and today's date
             const newNum = nextInvNumber();
             setInvoiceData({...inv, id: undefined, status: 'Draft', date: new Date().toISOString().split('T')[0], amountReceived: 0, paidDate: ''});
             setInvoiceNumber(newNum);
             setViewMode('create');
             if (onUpdateSettings) onUpdateSettings(prev => ({...prev, invoiceCounter: (Number(prev.invoiceCounter)||1) + 1}));
            }} className="p-1.5 bg-amber-50 text-amber-500 hover:bg-amber-100 rounded-lg transition-colors" title="Duplicate Invoice">
             <Copy size={13}/>
            </button>
            <button onClick={() => {
             setInvoiceData(inv);
             setInvoiceNumber(inv.invoiceNumber || nextInvNumber());
             setShowPreview(true);
             setViewMode('create');
            }} className="p-1.5 bg-violet-50 text-violet-500 hover:bg-violet-100 rounded-lg transition-colors" title="View / Edit">
             <Edit size={13}/>
            </button>
            <button onClick={() => onDeleteInvoice(inv.id)}
             className="p-1.5 bg-rose-50 text-rose-400 hover:bg-rose-100 rounded-lg transition-colors" title="Delete">
             <Trash2 size={13}/>
            </button>
           </div>
          </td>
         </tr>
        ))}
       </tbody>
       <tfoot className="bg-gradient-to-r from-slate-50 to-violet-50/30 border-t-2 border-slate-200">
        <tr>
         <td colSpan={4} className="px-5 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">TOTALS — {displayedInvoices.length} invoices</td>
         <td className="px-5 py-4 text-right font-extrabold text-slate-800 tabular-nums">{formatCurrency(displayedInvoices.reduce((a,i)=>a+i._total,0))}</td>
         <td className="px-5 py-4 text-right font-extrabold text-emerald-600 tabular-nums">{formatCurrency(displayedInvoices.reduce((a,i)=>a+i._received,0))}</td>
       <td className="px-5 py-4 text-right font-extrabold text-rose-600 tabular-nums">{formatCurrency(displayedInvoices.reduce((a,i)=>a+i._balance,0))}</td>
         <td colSpan={1}/>
        </tr>
       </tfoot>
      </table>
     </div>
    </div>
   )}
  </div>
 );
 return (
  <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
   {}
   <div className="flex items-center justify-between">
    <button onClick={() => setViewMode('list')} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-violet-600 transition-colors group">
     <ArrowDownLeft className="rotate-90 group-hover:-translate-x-0.5 transition-transform" size={16}/> Back to Invoices
    </button>
    <div className="flex gap-2">
     <button onClick={() => setShowPreview(p => !p)}
      className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${showPreview?'bg-violet-600 text-white shadow-lg shadow-violet-200':'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
      <FileText size={15}/> {showPreview ? 'Hide Preview' : 'Preview'}
     </button>
     <button onClick={handleDownloadPDF}
      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
      <Printer size={15}/> PDF
     </button>
     <button onClick={handlePrintInvoice}
      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
      <Printer size={15}/> Print
     </button>
     <button onClick={() => handleShareWhatsApp()}
      className="px-4 py-2 bg-[#25D366] text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#20bd5a] transition-all shadow-lg shadow-green-200">
      <Share2 size={15}/> WhatsApp
     </button>
     <button onClick={() => {
      const isNew = !invoiceData.id;
      onSave({...invoiceData, invoiceNumber});
      if (isNew && onUpdateSettings) {
       onUpdateSettings(prev => ({...prev, invoiceCounter: (Number(prev.invoiceCounter)||1) + 1}));
      }
      setViewMode('list');
     }}
      className="px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-violet-200 hover:scale-105 active:scale-95 transition-all">
      <CheckCircle size={15}/> Save Invoice
     </button>
    </div>
   </div>
   <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
    {}
    <div className="space-y-5">
     {}
     <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
       <div className="w-2 h-5 bg-violet-500 rounded-full"/>
       <h3 className="font-extrabold text-slate-800">Invoice Details</h3>
       <div className="ml-auto flex items-center gap-2">
        <input className="font-mono font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-400 w-40"
         value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} placeholder="INV-000000"/>
        {!invoiceData.id && (
         <span className="text-xs font-bold bg-violet-100 text-violet-600 px-2 py-1 rounded-full whitespace-nowrap">Auto</span>
        )}
       </div>
      </div>
      <div className="space-y-4">
       <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Bill To *</label>
        <select className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-violet-500 outline-none"
         value={invoiceData.client} onChange={e=>setInvoiceData(d=>({...d,client:e.target.value}))}>
         <option value="">Select Client</option>
         {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
       </div>
       <div className="grid grid-cols-2 gap-4">
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Invoice Date</label>
         <input type="date" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-violet-500 outline-none"
          value={invoiceData.date} onChange={e=>setInvoiceData(d=>({...d,date:e.target.value}))}/>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Due Date</label>
         <input type="date" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-rose-400 outline-none"
          value={invoiceData.dueDate||''} onChange={e=>setInvoiceData(d=>({...d,dueDate:e.target.value}))}/>
         <div className="flex gap-1 mt-1.5">
          {[7,15,30].map(n=>(
           <button key={n} onClick={()=>setDueDays(n)}
            className="flex-1 py-1 text-xs font-bold bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-500 rounded-lg transition-colors">
            {n}d
           </button>
          ))}
         </div>
        </div>
       </div>
       <div className="grid grid-cols-3 gap-3">
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Tax Rate (%)</label>
         <input type="number" min="0" max="100" placeholder="0" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-violet-500 outline-none"
          value={invoiceData.taxRate} onChange={e=>setInvoiceData(d=>({...d,taxRate:e.target.value}))}/>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Discount (%)</label>
         <input type="number" min="0" max="100" placeholder="0" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-violet-500 outline-none"
          value={invoiceData.discount||''} onChange={e=>setInvoiceData(d=>({...d,discount:e.target.value}))}/>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
         <select className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-violet-500 outline-none"
          value={invoiceData.status||'Draft'} onChange={e=>setInvoiceData(d=>({...d,status:e.target.value}))}>
          <option>Draft</option><option>Sent</option><option>Unpaid</option><option>Paid</option>
         </select>
        </div>
       </div>
       {true && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
         <div>
          <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1.5 block">Amount Received</label>
          <input inputMode="decimal" placeholder="0"
           className="w-full border border-emerald-200 bg-emerald-50 p-3 rounded-xl text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-400 outline-none"
           value={invoiceData.amountReceived||''}
           onChange={e=>setInvoiceData(d=>({...d,amountReceived:e.target.value}))}
           onBlur={e=>{
            const v=parseFloat(e.target.value);
            const amt=isNaN(v)?0:v;
            setInvoiceData(d=>({...d,amountReceived:amt,status:amt>=total?'Paid':amt>0?'Unpaid':d.status}));
           }}/>
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Date Received</label>
          <input type="date"
           className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-violet-500 outline-none"
           value={invoiceData.paidDate||''}
           onChange={e=>setInvoiceData(d=>({...d,paidDate:e.target.value}))}/>
         </div>
        </div>
       )}
      </div>
     </div>
     {}
     <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
       <div className="w-2 h-5 bg-fuchsia-500 rounded-full"/>
       <h3 className="font-extrabold text-slate-800">Line Items</h3>
      </div>
      <div className="space-y-2">
       <div className="grid grid-cols-12 gap-2 px-1 mb-1">
        <div className="col-span-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</div>
        <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Qty</div>
        <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Rate</div>
        <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</div>
        <div className="col-span-1"/>
       </div>
       {invoiceData.items.map((item, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl p-2">
         <input className="col-span-5 bg-white rounded-lg px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-400 placeholder-slate-300"
          placeholder="Item description" value={item.desc} onChange={e=>updateItem(i,'desc',e.target.value)}/>
         <input inputMode="decimal" className="col-span-2 bg-white rounded-lg px-2 py-2 text-sm font-medium text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-400 text-center"
          placeholder="1" value={item.qty}
          onChange={e=>updateItem(i,'qty',e.target.value)}
          onBlur={e=>{const v=parseFloat(e.target.value); updateItem(i,'qty',isNaN(v)||v<=0?1:v);}}/>
         <input inputMode="decimal" className="col-span-2 bg-white rounded-lg px-2 py-2 text-sm font-medium text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-400 text-right"
          placeholder="0" value={item.rate}
          onChange={e=>updateItem(i,'rate',e.target.value)}
          onBlur={e=>{const v=parseFloat(e.target.value); updateItem(i,'rate',isNaN(v)?0:v);}}/>
         <div className="col-span-2 text-right font-extrabold text-slate-800 text-sm tabular-nums px-1">{formatCurrency((parseFloat(item.qty)||0)*(parseFloat(item.rate)||0))}</div>
         <button onClick={()=>removeItem(i)} className="col-span-1 flex justify-center text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={14}/></button>
        </div>
       ))}
      </div>
      <button onClick={addItem} className="mt-3 flex items-center gap-2 text-xs font-bold text-violet-600 hover:text-violet-800 px-3 py-2 hover:bg-violet-50 rounded-xl transition-colors">
       <Plus size={14}/> Add Line Item
      </button>
      {}
      <div className="mt-5 bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2">
       <div className="flex justify-between text-sm text-slate-500 font-medium">
        <span>Subtotal</span><span className="tabular-nums">{formatCurrency(subtotalRaw)}</span>
       </div>
       {discountAmt > 0 && (
        <div className="flex justify-between text-sm text-emerald-600 font-medium">
         <span>Discount ({invoiceData.discount}%)</span><span className="tabular-nums">-{formatCurrency(discountAmt)}</span>
        </div>
       )}
       {Number(invoiceData.taxRate) > 0 && (
        <div className="flex justify-between text-sm text-slate-500 font-medium">
         <span>Tax ({invoiceData.taxRate}%)</span><span className="tabular-nums">{formatCurrency(tax)}</span>
        </div>
       )}
       <div className="flex justify-between text-lg font-extrabold text-slate-800 border-t border-slate-200 pt-3 mt-1">
        <span>Invoice Total</span>
        <span className="text-violet-600 tabular-nums">{formatCurrency(total)}</span>
       </div>
       {Number(invoiceData.amountReceived) > 0 && (
        <div className="pt-3 mt-1 border-t border-dashed border-slate-200 space-y-2">
         <div className="flex justify-between text-sm font-bold text-emerald-600">
          <span>✓ Amount Received</span>
          <span className="tabular-nums">-{formatCurrency(Number(invoiceData.amountReceived))}</span>
         </div>
         <div className={`flex justify-between font-extrabold text-base rounded-xl px-3 py-2.5 ${Number(invoiceData.amountReceived)>=total?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>
          <span>{Number(invoiceData.amountReceived)>=total?'✓ Fully Paid':'Balance Remaining'}</span>
          <span className="tabular-nums">{formatCurrency(Math.max(0,total-Number(invoiceData.amountReceived)))}</span>
         </div>
        </div>
       )}
      </div>
     </div>
     {}
     <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
       <div className="w-2 h-5 bg-slate-400 rounded-full"/>
       <h3 className="font-extrabold text-slate-800">Notes & Terms</h3>
      </div>
      <div className="space-y-4">
       <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Notes (visible on invoice)</label>
        <textarea rows={2} placeholder="e.g. Thank you for your business! Payment via bank transfer preferred." className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
         value={invoiceData.notes||''} onChange={e=>setInvoiceData(d=>({...d,notes:e.target.value}))}/>
       </div>
       <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Payment Terms</label>
        <input placeholder="e.g. Payment due within 30 days. Bank: HBL, Account: 1234-56789" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-violet-500 outline-none"
         value={invoiceData.terms||''} onChange={e=>setInvoiceData(d=>({...d,terms:e.target.value}))}/>
       </div>
       <div className="border-t border-slate-100 pt-3">
        <label className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
         <StickyNote size={12}/> Internal Notes (not printed on invoice)
        </label>
        <textarea rows={2} placeholder="e.g. Client said they'll pay by Friday. Follow up via email..." className="w-full border border-amber-200 bg-amber-50/50 p-3 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-400 outline-none resize-none"
         value={invoiceData.internalNotes||''} onChange={e=>setInvoiceData(d=>({...d,internalNotes:e.target.value}))}/>
       </div>
      </div>
     </div>
    </div>
    {}
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-4 self-start ${showPreview ? '' : 'hidden'}`}>
      <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-100">
       <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-500 rounded-full"/>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Preview</span>
       </div>
       <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">
        <Download size={12}/> Download
       </button>
      </div>
      {}
      <div className="overflow-y-auto max-h-[80vh]">
      <div id="invoice-preview-content">
       {}
       <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"/>
        <div className="relative z-10 flex justify-between items-start">
         <div>
          <Logo white companyName={companyProfile.name} tagline={companyProfile.tagline}/>
          {companyProfile.address && <p className="text-slate-400 text-xs mt-2 font-medium">📍 {companyProfile.address}</p>}
          {companyProfile.phone && <p className="text-slate-400 text-xs mt-0.5 font-medium">📞 {companyProfile.phone}</p>}
          {companyProfile.email && <p className="text-slate-400 text-xs mt-0.5 font-medium">✉ {companyProfile.email}</p>}
         </div>
         <div className="text-right">
          <div className="bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg mb-2">Invoice</div>
          <p className="text-white font-mono font-bold text-sm">#{invoiceNumber}</p>
          <p className="text-slate-400 text-xs mt-1">{invoiceData.date}</p>
          {invoiceData.dueDate && <p className="text-rose-400 text-xs font-bold mt-0.5">Due: {invoiceData.dueDate}</p>}
         </div>
        </div>
       </div>
       {}
       <div className="px-8 py-6 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bill To</p>
        <p className="text-lg font-extrabold text-slate-900">{invoiceData.client || <span className="text-slate-300">Select a client</span>}</p>
        {(() => { const c = clients.find(x=>x.name===invoiceData.client); return c ? (<>
         {c.address && <p className="text-sm text-slate-500 mt-0.5">📍 {c.address}</p>}
         {c.phone && <p className="text-sm text-slate-500 mt-0.5">📞 {c.phone}</p>}
         {c.email && <p className="text-sm text-slate-500 mt-0.5">✉ {c.email}</p>}
        </>) : null; })()}
       </div>
       {}
       <div className="px-8 py-5">
        <table className="w-full text-left mb-5">
         <thead>
          <tr className="border-b border-slate-100">
           <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
           <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-12">Qty</th>
           <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-24">Rate</th>
           <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-28">Amount</th>
          </tr>
         </thead>
         <tbody className="divide-y divide-slate-50">
          {invoiceData.items.filter(it=>it.desc||it.rate>0).map((it,i)=>(
           <tr key={i}>
            <td className="py-3 text-sm font-medium text-slate-700">{it.desc||'—'}</td>
            <td className="py-3 text-sm text-slate-500 text-center">{it.qty}</td>
            <td className="py-3 text-sm text-slate-500 text-right tabular-nums">{formatCurrency(parseFloat(it.rate)||0)}</td>
            <td className="py-3 text-sm font-bold text-slate-800 text-right tabular-nums">{formatCurrency((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0))}</td>
           </tr>
          ))}
         </tbody>
        </table>
        {}
        <div className="flex justify-end">
         <div className="w-56 space-y-2">
          <div className="flex justify-between text-xs text-slate-500 font-medium">
           <span>Subtotal</span><span className="tabular-nums">{formatCurrency(subtotalRaw)}</span>
          </div>
          {discountAmt > 0 && (
           <div className="flex justify-between text-xs text-emerald-600 font-medium">
            <span>Discount ({invoiceData.discount}%)</span><span className="tabular-nums">-{formatCurrency(discountAmt)}</span>
           </div>
          )}
          {Number(invoiceData.taxRate) > 0 && (
           <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Tax ({invoiceData.taxRate}%)</span><span className="tabular-nums">{formatCurrency(tax)}</span>
           </div>
          )}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-3 flex justify-between items-center mt-1">
           <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Invoice Total</span>
           <span className="text-lg font-extrabold text-white tabular-nums">{formatCurrency(total)}</span>
          </div>
          {Number(invoiceData.amountReceived) > 0 && (
           <div className="pt-2 mt-1 space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-emerald-600 border-t border-dashed border-slate-200 pt-2">
             <span>Amount Received</span>
             <span className="tabular-nums">-{formatCurrency(Number(invoiceData.amountReceived))}</span>
            </div>
            <div className={`flex justify-between text-sm font-extrabold rounded-lg px-3 py-2 ${Number(invoiceData.amountReceived)>=total?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>
             <span>{Number(invoiceData.amountReceived)>=total?'✓ PAID IN FULL':'Balance Remaining'}</span>
             <span className="tabular-nums">{formatCurrency(Math.max(0,total-Number(invoiceData.amountReceived)))}</span>
            </div>
           </div>
          )}
         </div>
        </div>
        {}
        {(invoiceData.notes || invoiceData.terms) && (
         <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
          {invoiceData.notes && (
           <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Notes</p>
            <p className="text-xs text-slate-600 font-medium">{invoiceData.notes}</p>
           </div>
          )}
          {invoiceData.terms && (
           <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Terms</p>
            <p className="text-xs text-slate-600 font-medium">{invoiceData.terms}</p>
           </div>
          )}
         </div>
        )}
        {}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-end">
         <p className="text-xs text-slate-400 italic">Computer-generated invoice. Thank you for your business.</p>
         <div className="text-right">
          <p className="text-xs font-bold text-slate-700">{companyProfile.name || ''}</p>
          {companyProfile.phone && <p className="text-xs text-slate-400">{companyProfile.phone}</p>}
          {companyProfile.email && <p className="text-xs text-slate-400">{companyProfile.email}</p>}
          {companyProfile.website && <p className="text-xs text-slate-400">{companyProfile.website}</p>}
         </div>
        </div>
       </div>
      </div>{}
      </div>{}
     </div>
   </div>
  </div>
 );
};
const SalarySlip = ({ data, onClose, companyProfile = {} }) => {
 const toast = useToast();
 if (!data) return null;
 const period = (() => {
  try { return new Date(data.date).toLocaleString('default', { month: 'long', year: 'numeric' }); }
  catch { return data.date; }
 })();
 const handleWhatsApp = () => {
  const phone = (data.phone || '').replace(/[^0-9]/g, '');
  const msg = encodeURIComponent(
   `*PAYSLIP — ${period}*\n\nDear ${data.employeeName},\n\nPlease find your salary details below:\n\n` +
   `• Basic Salary: ${formatCurrency(data.basicSalary || data.totalPayable)}\n` +
   (data.taxDeduction > 0 ? `• Tax Deducted: -${formatCurrency(data.taxDeduction)}\n` : '') +
   `• *Net Pay: ${formatCurrency(data.totalPayable)}*\n\n` +
   `Payment via: ${data.bankName || 'Cash'}${data.chequeNumber ? ` (Cheque #${data.chequeNumber})` : ''}\n\n` +
   `Thank you!\n${companyProfile.name || 'Our Company'}`
  );
  const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
  window.open(url, '_blank');
 };
 const handleDownloadPDF = async () => {
  try {
   await loadPdfLibrary();
   // constraints don't cause html2canvas to capture a zero-height element.
   const source = document.getElementById('salary-slip-printable');
   if (!source) return toast('Could not find slip content.', 'error');
   const clone = source.cloneNode(true);
   const wrapper = document.createElement('div');
   wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;';
   wrapper.appendChild(clone);
   document.body.appendChild(wrapper);
   const opt = {
    margin: [0.4, 0.4, 0.4, 0.4],
    filename: `Payslip_${data.employeeName}_${data.date}.pdf`,
    image: { type: 'jpeg', quality: 0.99 },
    html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
   };
   await window.html2pdf().set(opt).from(wrapper).save();
   document.body.removeChild(wrapper);
   toast('PDF downloaded!', 'success');
  } catch (e) {
   console.error(e);
   toast('PDF export failed. Try the Print button instead.', 'error');
  }
 };
 const handlePrint = () => {
  const source = document.getElementById('salary-slip-printable');
  if (!source) return;
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  printWindow.document.write(`<!DOCTYPE html><html><head>
   <meta charset="UTF-8"/>
   <title>Payslip — ${data.employeeName}</title>
   <script src="https://cdn.tailwindcss.com"><\/script>
   <style>
    @media print { body { margin: 0; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#fff; }
   </style>
  </head><body>${source.outerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 900);
 };
 const gross = Number(data.basicSalary || data.totalPayable) || 0;
 const tax = Number(data.taxDeduction) || 0;
 const net = Number(data.totalPayable) || (gross - tax);
 const slipNumber = `PS-${data.date ? data.date.replace(/-/g, '') : 'XXXX'}-${(data.employeeName || '').slice(0,3).toUpperCase()}`;
 return (
  <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
   <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[92vh]">
    {}
    <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-100 flex-shrink-0">
     <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Official Payslip</span>
     </div>
     <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors shadow-sm"><X size={18}/></button>
    </div>
    {}
    <div className="overflow-y-auto flex-1">
    <div id="salary-slip-printable">
     {}
     <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-10 py-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"/>
      <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"/>
      <div className="relative z-10 flex justify-between items-start">
       <div>
        <Logo white companyName={companyProfile.name} tagline={companyProfile.tagline}/>
        {companyProfile.address && <p className="text-slate-400 text-xs mt-2 font-medium">📍 {companyProfile.address}</p>}
        {companyProfile.phone && <p className="text-slate-400 text-xs mt-0.5 font-medium">📞 {companyProfile.phone}</p>}
        {companyProfile.email && <p className="text-slate-400 text-xs mt-0.5 font-medium">✉ {companyProfile.email}</p>}
       </div>
       <div className="text-right">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Slip No.</p>
        <p className="text-white font-mono text-sm font-bold">{slipNumber}</p>
        <p className="text-slate-400 text-xs mt-2 font-medium">{period}</p>
       </div>
      </div>
     </div>
     {}
     <div className="px-10 py-7 border-b border-slate-100">
      <div className="flex items-start justify-between gap-6">
       <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-100 flex-shrink-0">
         {(data.employeeName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
         <p className="text-xl font-extrabold text-slate-900">{data.employeeName}</p>
         {data.role && <p className="text-sm text-slate-500 font-medium mt-0.5">{data.role}</p>}
         {data.department && <p className="text-xs text-violet-600 font-bold mt-0.5">{data.department}</p>}
        </div>
       </div>
       <div className="text-right flex-shrink-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Date</p>
        <p className="text-sm font-bold text-slate-700">{data.date}</p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 mt-3">Status</p>
        <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full ${data.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : data.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
         {data.status || 'Unpaid'}
        </span>
       </div>
      </div>
     </div>
     {}
     <div className="px-10 py-7">
      <div className="grid grid-cols-2 gap-6 mb-6">
       {}
       <div>
        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
         <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>Earnings
        </p>
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl overflow-hidden">
         <div className="flex justify-between items-center px-4 py-3 border-b border-emerald-100">
          <span className="text-sm text-slate-600 font-medium">Basic Salary</span>
          <span className="text-sm font-extrabold text-slate-800 tabular-nums">{formatCurrency(gross)}</span>
         </div>
         <div className="flex justify-between items-center px-4 py-3 bg-emerald-50">
          <span className="text-sm font-bold text-emerald-700">Gross Earnings</span>
          <span className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatCurrency(gross)}</span>
         </div>
        </div>
       </div>
       {}
       <div>
        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
         <span className="w-2 h-2 bg-rose-500 rounded-full inline-block"></span>Deductions
        </p>
        <div className="bg-rose-50/60 border border-rose-100 rounded-2xl overflow-hidden">
         {tax > 0 ? (
          <div className="flex justify-between items-center px-4 py-3 border-b border-rose-100">
           <span className="text-sm text-slate-600 font-medium">Income Tax (WHT)</span>
           <span className="text-sm font-extrabold text-rose-700 tabular-nums">-{formatCurrency(tax)}</span>
          </div>
         ) : (
          <div className="px-4 py-3 border-b border-rose-100 text-sm text-slate-400 font-medium">No deductions</div>
         )}
         <div className="flex justify-between items-center px-4 py-3 bg-rose-50">
          <span className="text-sm font-bold text-rose-700">Total Deductions</span>
          <span className="text-sm font-extrabold text-rose-700 tabular-nums">{tax > 0 ? `-${formatCurrency(tax)}` : formatCurrency(0)}</span>
         </div>
        </div>
       </div>
      </div>
      {}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-violet-600/20 pointer-events-none"/>
       <div className="relative z-10">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Net Pay for {period}</p>
        <p className="text-white text-4xl font-extrabold tabular-nums tracking-tight">{formatCurrency(net)}</p>
       </div>
       <div className="relative z-10 text-right">
        {data.bankName && (
         <>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Paid via</p>
          <p className="text-white font-bold text-sm">{data.bankName}</p>
          {data.chequeNumber && <p className="text-slate-400 text-xs mt-0.5">Cheque #{data.chequeNumber}</p>}
         </>
        )}
        {!data.bankName && (
         <>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Method</p>
          <p className="text-white font-bold text-sm">Cash</p>
         </>
        )}
       </div>
      </div>
      {}
      {data.notes && (
       <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Notes</p>
        <p className="text-sm text-amber-900 font-medium">{data.notes}</p>
       </div>
      )}
      {}
      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-end">
       <div>
        <p className="text-xs text-slate-400 font-medium italic">This is a computer-generated payslip.</p>
        <p className="text-xs text-slate-400 mt-0.5">Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
       </div>
       <div className="text-right">
        <p className="text-sm font-extrabold text-slate-800">{companyProfile.name || 'Our Company'}</p>
        <p className="text-xs text-slate-400 mt-0.5">Authorized Signature</p>
        <div className="mt-3 border-t-2 border-slate-300 w-32 ml-auto"></div>
       </div>
      </div>
     </div>
    </div>{}
    </div>{}
    {}
    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0">
     <button onClick={handleDownloadPDF}
      className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors flex justify-center items-center gap-2 shadow-sm">
      <Printer size={16}/> Download PDF
     </button>
     <button onClick={handleWhatsApp}
      className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#20bd5a] transition-all shadow-lg shadow-green-200 flex justify-center items-center gap-2">
      <Share2 size={16}/> Send via WhatsApp
     </button>
     <button onClick={handlePrint}
      className="bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-sm">
      <Printer size={14}/> Print
     </button>
    </div>
   </div>
  </div>
 );
};
const SalariesPage = ({ salaries, currentUser, onNewSalary, onEdit, onDelete, onViewSlip }) => {
 const [search, setSearch] = useState('');
 const [empFilter, setEmpFilter] = useState('All');
 const [statusFilter, setStatusFilter] = useState('All');
 const [monthFilter, setMonthFilter] = useState('All');
 const [viewMode, setViewMode] = useState('table'); // 'table' | 'employees'
 const [sortBy, setSortBy] = useState('date');
 const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
 const today = new Date();
 const employees = useMemo(() => {
  const names = [...new Set(salaries.map(s => (s.employeeName || '').trim()).filter(Boolean))].sort();
  return names;
 }, [salaries]);
 const enriched = useMemo(() => salaries.map(s => ({
  ...s,
  gross: Number(s.basicSalary || s.totalPayable) || 0,
  tax: Number(s.taxDeduction) || 0,
  net: Number(s.totalPayable) || 0,
  monthName: (() => { try { return new Date(s.date).toLocaleString('default', { month: 'long', year: 'numeric' }); } catch { return s.date; } })(),
  monthNum: s.date ? s.date.slice(0, 7) : '',
 })), [salaries]);
 const kpis = useMemo(() => {
  const paid = enriched.filter(s => s.status === 'Paid');
  const pending = enriched.filter(s => s.status !== 'Paid');
  const uniqueEmps = new Set(enriched.map(s => s.employeeName)).size;
  const totalGross = enriched.reduce((a, s) => a + s.gross, 0);
  const totalTax = enriched.reduce((a, s) => a + s.tax, 0);
  const totalNet = enriched.reduce((a, s) => a + s.net, 0);
  const pendingAmt = pending.reduce((a, s) => a + s.net, 0);
  const curMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const thisMonthTotal = enriched.filter(s => s.monthNum === curMonth).reduce((a, s) => a + s.net, 0);
  return { totalGross, totalTax, totalNet, pendingAmt, uniqueEmps, paidCount: paid.length, thisMonthTotal };
 }, [enriched]);
 const monthlyChart = useMemo(() => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
   const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
   const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
   const label = d.toLocaleString('default', { month: 'short' });
   const total = enriched.filter(s => s.monthNum === key).reduce((a, s) => a + s.net, 0);
   const tax = enriched.filter(s => s.monthNum === key).reduce((a, s) => a + s.tax, 0);
   months.push({ name: label, 'Net Pay': total, 'Tax': tax });
  }
  return months;
 }, [enriched]);
 const employeeSummaries = useMemo(() => employees.map(name => {
  const records = enriched.filter(s => (s.employeeName || '').trim() === name);
  const totalPaid = records.filter(s => s.status === 'Paid').reduce((a, s) => a + s.net, 0);
  const totalPending = records.filter(s => s.status !== 'Paid').reduce((a, s) => a + s.net, 0);
  const avgSalary = records.length > 0 ? records.reduce((a, s) => a + s.net, 0) / records.length : 0;
  const latest = records.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const totalTax = records.reduce((a, s) => a + s.tax, 0);
  return { name, records, totalPaid, totalPending, avgSalary, latest, totalTax, count: records.length };
 }), [employees, enriched]);
 const filtered = useMemo(() => {
  let res = enriched;
  if (search) res = res.filter(s =>
   (s.employeeName || '').toLowerCase().includes(search.toLowerCase()) ||
   (s.role || '').toLowerCase().includes(search.toLowerCase()) ||
   (s.department || '').toLowerCase().includes(search.toLowerCase())
  );
  if (empFilter !== 'All') res = res.filter(s => (s.employeeName || '').trim() === empFilter);
  if (statusFilter !== 'All') res = res.filter(s => (s.status || 'Unpaid') === statusFilter);
  if (monthFilter !== 'All') res = res.filter(s => s.monthName === monthFilter);
  if (sortBy === 'date') res = [...res].sort((a, b) => new Date(b.date) - new Date(a.date));
  else if (sortBy === 'amount') res = [...res].sort((a, b) => b.net - a.net);
  else if (sortBy === 'name') res = [...res].sort((a, b) => (a.employeeName||'').localeCompare(b.employeeName||''));
  return res;
 }, [enriched, search, empFilter, statusFilter, monthFilter, sortBy]);
 const uniqueMonths = useMemo(() => [...new Set(enriched.map(s => s.monthName).filter(Boolean))].sort().reverse(), [enriched]);
 const statusColor = { Paid: 'bg-emerald-100 text-emerald-700', Pending: 'bg-amber-100 text-amber-700', Unpaid: 'bg-rose-100 text-rose-700' };
 return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
   {}
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {[
     { l: 'Team Size', v: kpis.uniqueEmps, sub: 'employees', c: 'text-slate-800', bg: 'bg-white border-slate-200', icon: Users },
     { l: 'Total Payroll', v: formatCurrency(kpis.totalNet), sub: 'net paid', c: 'text-slate-800', bg: 'bg-white border-slate-200', icon: Wallet },
     { l: 'This Month', v: formatCurrency(kpis.thisMonthTotal), sub: new Date().toLocaleString('default',{month:'long'}), c: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Calendar },
     { l: 'Tax Withheld', v: formatCurrency(kpis.totalTax), sub: 'total WHT', c: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: Percent },
     { l: 'Pending Pay', v: formatCurrency(kpis.pendingAmt), sub: `${enriched.filter(s=>s.status!=='Paid').length} slips`, c: kpis.pendingAmt > 0 ? 'text-amber-700' : 'text-emerald-700', bg: kpis.pendingAmt > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200', icon: Clock },
     { l: 'Slips Issued', v: kpis.paidCount, sub: 'paid records', c: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
    ].map((k, i) => (
     <div key={i} className={`${k.bg} border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex justify-between items-start mb-2">
       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{k.l}</p>
       <k.icon size={14} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 mt-0.5"/>
      </div>
      <p className={`text-lg font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
      <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
     </div>
    ))}
   </div>
   {}
   {enriched.length > 0 && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
     {}
     <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
       <div className="w-2 h-5 bg-indigo-500 rounded-full"></div>
       Monthly Payroll (6 Months)
      </h3>
      <ResponsiveContainer width="100%" height={180}>
       <BarChart data={monthlyChart} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fontWeight:700,fill:'#94a3b8'}}/>
        <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={v => v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
        <ChartTooltip formatter={v => formatCurrency(v)} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',padding:'10px 14px'}}/>
        <Bar dataKey="Net Pay" fill="#6366f1" radius={[5,5,0,0]}/>
        <Bar dataKey="Tax" fill="#f87171" radius={[5,5,0,0]}/>
       </BarChart>
      </ResponsiveContainer>
     </div>
     {}
     <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
       <div className="w-2 h-5 bg-violet-500 rounded-full"></div>
       Team Breakdown
      </h3>
      <div className="space-y-3">
       {employeeSummaries.slice(0, 5).map((emp, i) => {
        const pct = kpis.totalNet > 0 ? Math.round((emp.totalPaid / kpis.totalNet) * 100) : 0;
        return (
         <div key={i}>
          <div className="flex justify-between items-center mb-1">
           <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
             {emp.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <span className="text-sm font-bold text-slate-700 truncate max-w-[90px]">{emp.name.split(' ')[0]}</span>
           </div>
           <span className="text-xs font-extrabold text-slate-600 tabular-nums">{formatCurrency(emp.totalPaid)}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
           <div className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full" style={{width:`${pct}%`}}/>
          </div>
         </div>
        );
       })}
       {employeeSummaries.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">No salary data yet.</p>
       )}
      </div>
     </div>
    </div>
   )}
   {}
   <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
    <div className="flex flex-wrap gap-2 items-center">
     <div className="relative">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
      <input
       className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-48 transition-all"
       placeholder="Search employee..."
       value={search} onChange={e => setSearch(e.target.value)}
      />
     </div>
     {}
     <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="All">All Employees</option>
      {employees.map(e => <option key={e} value={e}>{e}</option>)}
     </select>
     {}
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      {['All','Paid','Pending','Unpaid'].map(s => (
       <button key={s} onClick={() => setStatusFilter(s)}
        className={`px-3 py-2 text-xs font-bold transition-all ${statusFilter===s?'bg-indigo-600 text-white':'text-slate-500 hover:text-indigo-600'}`}>
        {s}
       </button>
      ))}
     </div>
     {}
     {uniqueMonths.length > 1 && (
      <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
       className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Months</option>
       {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
     )}
     {}
     <select value={sortBy} onChange={e => setSortBy(e.target.value)}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="date">Sort: Latest First</option>
      <option value="amount">Sort: Highest Pay</option>
      <option value="name">Sort: Name A–Z</option>
     </select>
     {}
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setViewMode('table')} title="Table View"
       className={`px-3 py-2 transition-all ${viewMode==='table'?'bg-slate-800 text-white':'text-slate-400 hover:text-slate-600'}`}>
       <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="16" height="3" rx="1"/><rect x="0" y="5" width="16" height="3" rx="1"/><rect x="0" y="10" width="16" height="3" rx="1"/></svg>
      </button>
      <button onClick={() => setViewMode('employees')} title="Employee View"
       className={`px-3 py-2 transition-all ${viewMode==='employees'?'bg-slate-800 text-white':'text-slate-400 hover:text-slate-600'}`}>
       <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1.5"/><rect x="9" y="0" width="7" height="7" rx="1.5"/><rect x="0" y="9" width="7" height="7" rx="1.5"/><rect x="9" y="9" width="7" height="7" rx="1.5"/></svg>
      </button>
     </div>
    </div>
    <div className="flex gap-2 flex-shrink-0">
     <button onClick={() => exportToCSV(salaries, 'Salaries_Export')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm"><Download size={15}/> Export</button>
     <button onClick={onNewSalary}
      className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
      <Plus size={16}/> New Payslip
     </button>
    </div>
   </div>
   {(search || empFilter !== 'All' || statusFilter !== 'All' || monthFilter !== 'All') && (
    <p className="text-sm text-slate-500 font-medium -mt-2">
     Showing <span className="font-bold text-indigo-600">{filtered.length}</span> of {enriched.length} records
    </p>
   )}
   {}
   {filtered.length === 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
     <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Users className="text-slate-300" size={32}/>
     </div>
     <h3 className="text-lg font-bold text-slate-700 mb-2">{enriched.length === 0 ? 'No salary records yet' : 'No records match your filters'}</h3>
     <p className="text-sm text-slate-400 mb-6">{enriched.length === 0 ? 'Add your first payslip to start tracking team salaries.' : 'Try adjusting your search or filters.'}</p>
     {enriched.length === 0 && (
      <button onClick={onNewSalary} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
       + Add First Payslip
      </button>
     )}
    </div>
   )}
   {}
   {viewMode === 'table' && filtered.length > 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
     <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[750px]">
       <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
         {['Employee','Period','Role / Dept','Basic','Tax Deducted','Net Pay','Status',''].map((h, i) => (
          <th key={i} className={`px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${['Basic','Tax Deducted','Net Pay'].includes(h)?'text-right':''}`}>{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
        {filtered.map(item => (
         <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
          <td className="px-5 py-4">
           <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0">
             {(item.employeeName||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
             <p className="font-bold text-slate-800 text-sm">{item.employeeName}</p>
             {item.bankName && <p className="text-xs text-slate-400">{item.bankName}{item.chequeNumber ? ` #${item.chequeNumber}` : ''}</p>}
            </div>
           </div>
          </td>
          <td className="px-5 py-4">
           <p className="text-sm font-medium text-slate-700">{item.monthName}</p>
           <p className="text-xs text-slate-400">{item.date}</p>
          </td>
          <td className="px-5 py-4 text-sm text-slate-500">
           {item.role && <p className="font-medium text-slate-700">{item.role}</p>}
           {item.department && <p className="text-xs text-violet-600 font-bold">{item.department}</p>}
           {!item.role && !item.department && <span className="text-slate-300">—</span>}
          </td>
          <td className="px-5 py-4 text-right font-medium text-slate-600 tabular-nums text-sm">{formatCurrency(item.gross)}</td>
          <td className="px-5 py-4 text-right font-medium text-rose-500 tabular-nums text-sm">{item.tax > 0 ? `-${formatCurrency(item.tax)}` : <span className="text-slate-300">—</span>}</td>
          <td className="px-5 py-4 text-right font-extrabold text-slate-900 tabular-nums">{formatCurrency(item.net)}</td>
          <td className="px-5 py-4">
           <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${statusColor[item.status || 'Unpaid'] || 'bg-slate-100 text-slate-600'}`}>
            {item.status || 'Unpaid'}
           </span>
          </td>
          <td className="px-5 py-4">
           <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onViewSlip(item)} title="View Payslip"
             className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
             <Printer size={13}/>
            </button>
            {currentUser?.role === 'Admin' && (
             <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={13}/></button>
            )}
            {currentUser?.role === 'Admin' && (
             <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={13}/></button>
            )}
           </div>
          </td>
         </tr>
        ))}
       </tbody>
       <tfoot className="bg-gradient-to-r from-slate-50 to-slate-100 border-t-2 border-slate-200">
        <tr>
         <td colSpan={3} className="px-5 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">TOTALS ({filtered.length} records)</td>
         <td className="px-5 py-4 text-right font-extrabold text-slate-700 tabular-nums">{formatCurrency(filtered.reduce((a,s)=>a+s.gross,0))}</td>
         <td className="px-5 py-4 text-right font-extrabold text-rose-600 tabular-nums">-{formatCurrency(filtered.reduce((a,s)=>a+s.tax,0))}</td>
         <td className="px-5 py-4 text-right font-extrabold text-slate-900 tabular-nums">{formatCurrency(filtered.reduce((a,s)=>a+s.net,0))}</td>
         <td colSpan={2}/>
        </tr>
       </tfoot>
      </table>
     </div>
    </div>
   )}
   {}
   {viewMode === 'employees' && (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
     {employeeSummaries.filter(emp =>
      empFilter === 'All' || emp.name === empFilter
     ).map(emp => (
      <div key={emp.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
       {}
       <div className="p-5 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100">
        <div className="flex items-start gap-3">
         <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-100 flex-shrink-0">
          {emp.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
         </div>
         <div className="flex-1 min-w-0">
          <p className="font-extrabold text-slate-900 truncate">{emp.name}</p>
          {emp.latest?.role && <p className="text-xs text-slate-500 font-medium">{emp.latest.role}</p>}
          {emp.latest?.department && <p className="text-xs text-violet-600 font-bold">{emp.latest.department}</p>}
         </div>
         <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-400 font-medium">{emp.count} payslip{emp.count!==1?'s':''}</p>
          {emp.totalPending > 0 && (
           <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-1 inline-block">
            {formatCurrency(emp.totalPending)} pending
           </span>
          )}
         </div>
        </div>
       </div>
       {}
       <div className="p-5 space-y-3 flex-1">
        <div className="grid grid-cols-3 gap-2 text-center">
         <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-400 font-bold uppercase leading-tight mb-1">Avg/mo</p>
          <p className="text-sm font-extrabold text-slate-800 tabular-nums">{formatCurrency(emp.avgSalary)}</p>
         </div>
         <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-emerald-600 font-bold uppercase leading-tight mb-1">Paid</p>
          <p className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatCurrency(emp.totalPaid)}</p>
         </div>
         <div className="bg-rose-50 rounded-xl p-3">
          <p className="text-xs text-rose-600 font-bold uppercase leading-tight mb-1">Tax</p>
          <p className="text-sm font-extrabold text-rose-700 tabular-nums">{formatCurrency(emp.totalTax)}</p>
         </div>
        </div>
        {}
        <div>
         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Payslips</p>
         <div className="space-y-1.5">
          {emp.records.slice(0, 3).map((r, i) => (
           <div key={i} className="flex justify-between items-center text-xs bg-slate-50/80 rounded-xl px-3 py-2">
            <span className="text-slate-500 font-medium">{r.monthName}</span>
            <div className="flex items-center gap-2">
             <span className="font-extrabold text-slate-700 tabular-nums">{formatCurrency(r.net)}</span>
             <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor[r.status || 'Unpaid'] || 'bg-slate-100 text-slate-600'}`}>{r.status || 'Unpaid'}</span>
            </div>
           </div>
          ))}
         </div>
        </div>
       </div>
       {}
       <div className="px-4 pb-4 pt-3 border-t border-slate-100 flex gap-2">
        <button onClick={() => { setEmpFilter(emp.name); setViewMode('table'); }}
         className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5">
         <FileText size={13}/> View History
        </button>
        <button onClick={() => onViewSlip(emp.latest)}
         className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5">
         <Printer size={13}/> Last Slip
        </button>
       </div>
      </div>
     ))}
     {employeeSummaries.length === 0 && (
      <div className="col-span-3 bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 font-medium">
       No employees found.
      </div>
     )}
    </div>
   )}
  </div>
 );
};
const EXPENSE_CAT_ICONS = {
 'General':'📋','Office Rent':'🏢','Utilities':'💡','Travel':'✈️','Software':'💻',
 'Meals':'🍽️','Other':'📦','Office Supplies':'🖇️','Printing & Stationery':'🖨️',
 'Repairs & Maintenance':'🔧','Marketing':'📣','Salaries':'👥','Insurance':'🛡️',
 'Legal & Professional':'⚖️','Subscriptions':'🔁','Equipment':'🖥️','Miscellaneous':'🗂️',
};
const EXPENSE_COLORS = ['#6366f1','#f59e0b','#10b981','#f43f5e','#06b6d4','#8b5cf6','#f97316','#84cc16'];
const ExpensesPage = ({ expenses, expenseCategories, currentUser, onNewExpense, onEdit, onDelete, onGenerateRecurring, onApproveExpense, onImportExpenses }) => {
 const [search,       setSearch]       = useState('');
 const [catFilter,    setCatFilter]    = useState('All');
 const [monthFilter,  setMonthFilter]  = useState('All');
 const [yearFilter,   setYearFilter]   = useState('All');
 const [payFilter,    setPayFilter]    = useState('All');
 const [sortBy,       setSortBy]       = useState('date-desc');
 const [viewMode,     setViewMode]     = useState('table');
 const today = new Date();
 const enriched = useMemo(() => expenses.map(r => ({
  ...r,
  amt:       Number(r.amount) || 0,
  taxCredit: Number(r.taxAmount) || 0,
  monthNum:  r.date ? r.date.slice(0, 7) : '',
  monthName: (() => { try { return new Date(r.date).toLocaleString('default', { month: 'long', year: 'numeric' }); } catch { return r.date; } })(),
  year:      r.date ? r.date.slice(0, 4) : '',
  payMethod: r.bankName ? 'Bank' : 'Cash',
  cat:       r.category || 'General',
 })), [expenses]);
 const kpis = useMemo(() => {
  const total      = enriched.reduce((a, r) => a + r.amt, 0);
  const taxCredit  = enriched.reduce((a, r) => a + r.taxCredit, 0);
  const curMonth   = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const thisMonth  = enriched.filter(r => r.monthNum === curMonth).reduce((a, r) => a + r.amt, 0);
  const prevMonth  = (() => { const d = new Date(today.getFullYear(), today.getMonth()-1, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; })();
  const lastMonth  = enriched.filter(r => r.monthNum === prevMonth).reduce((a, r) => a + r.amt, 0);
  const mom        = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
  const avgMonth   = (() => {
   const months = [...new Set(enriched.map(r => r.monthNum).filter(Boolean))];
   return months.length > 0 ? total / months.length : 0;
  })();
  const bankTotal  = enriched.filter(r => r.payMethod === 'Bank').reduce((a, r) => a + r.amt, 0);
  const txCount    = enriched.length;
  return { total, taxCredit, thisMonth, lastMonth, mom, avgMonth, bankTotal, txCount };
 }, [enriched]);
 const monthlyChart = useMemo(() => Array.from({ length: 6 }, (_, i) => {
  const d   = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const lbl = d.toLocaleString('default', { month: 'short' });
  const amt = enriched.filter(r => r.monthNum === key).reduce((a, r) => a + r.amt, 0);
  const tax = enriched.filter(r => r.monthNum === key).reduce((a, r) => a + r.taxCredit, 0);
  return { name: lbl, Expenses: amt, 'Tax Credit': tax };
 }), [enriched]);
 const catBreakdown = useMemo(() => {
  const map = {};
  enriched.forEach(r => { map[r.cat] = (map[r.cat] || 0) + r.amt; });
  const total = Object.values(map).reduce((a, v) => a + v, 0);
  return Object.entries(map)
   .sort((a, b) => b[1] - a[1])
   .map(([name, value], i) => ({ name, value, pct: total > 0 ? (value/total)*100 : 0, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }));
 }, [enriched]);
 const uniqueMonths = useMemo(() => [...new Set(enriched.map(r => r.monthName).filter(Boolean))].reverse(), [enriched]);
 const uniqueYears  = useMemo(() => [...new Set(enriched.map(r => r.year).filter(Boolean))].sort().reverse(), [enriched]);
 const usedCats     = useMemo(() => [...new Set(enriched.map(r => r.cat).filter(Boolean))].sort(), [enriched]);
 const filtered = useMemo(() => {
  let res = [...enriched];
  if (search)           res = res.filter(r => (r.description||'').toLowerCase().includes(search.toLowerCase()) || r.cat.toLowerCase().includes(search.toLowerCase()) || (r.bankName||'').toLowerCase().includes(search.toLowerCase()));
  if (catFilter  !== 'All') res = res.filter(r => r.cat === catFilter);
  if (monthFilter !== 'All') res = res.filter(r => r.monthName === monthFilter);
  if (yearFilter  !== 'All') res = res.filter(r => r.year === yearFilter);
  if (payFilter   !== 'All') res = res.filter(r => r.payMethod === payFilter);
  if (sortBy === 'date-desc')   res = [...res].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sortBy === 'date-asc')    res = [...res].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sortBy === 'amount-desc') res = [...res].sort((a, b) => b.amt - a.amt);
  if (sortBy === 'amount-asc')  res = [...res].sort((a, b) => a.amt - b.amt);
  if (sortBy === 'category')    res = [...res].sort((a, b) => a.cat.localeCompare(b.cat));
  return res;
 }, [enriched, search, catFilter, monthFilter, yearFilter, payFilter, sortBy]);
 const filteredTotal    = filtered.reduce((a, r) => a + r.amt, 0);
 const filteredTaxCredit = filtered.reduce((a, r) => a + r.taxCredit, 0);
 return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
   {}
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {[
     { l:'Total Expenses',  v: formatCurrency(kpis.total),     sub: `${kpis.txCount} entries`,   c:'text-rose-700',   bg:'bg-rose-50 border-rose-200',     icon: ArrowUpRight },
     { l:'This Month',      v: formatCurrency(kpis.thisMonth),  sub: today.toLocaleString('default',{month:'long'}), c: kpis.mom > 0 ? 'text-rose-700' : 'text-emerald-700', bg: kpis.mom > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200', icon: Calendar },
     { l:'vs Last Month',   v: (kpis.mom >= 0 ? '▲ ' : '▼ ') + Math.abs(kpis.mom).toFixed(1) + '%', sub: formatCurrency(kpis.lastMonth) + ' last mo', c: kpis.mom > 0 ? 'text-rose-700' : 'text-emerald-700', bg:'bg-white border-slate-200', icon: Percent },
     { l:'Avg / Month',     v: formatCurrency(kpis.avgMonth),   sub:'monthly average',   c:'text-slate-700',   bg:'bg-white border-slate-200',      icon: FileText },
     { l:'Tax Credit (In)', v: formatCurrency(kpis.taxCredit),  sub:'input tax claimed', c:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200', icon: CheckCircle },
     { l:'Via Bank',        v: formatCurrency(kpis.bankTotal),  sub:'non-cash',          c:'text-indigo-700',  bg:'bg-indigo-50 border-indigo-200',   icon: CreditCard },
    ].map((k, i) => (
     <div key={i} className={`${k.bg} border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex justify-between items-start mb-2">
       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{k.l}</p>
       <k.icon size={13} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 mt-0.5"/>
      </div>
      <p className={`text-lg font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
      <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
     </div>
    ))}
   </div>
   {}
   {enriched.length > 0 && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
     {}
     <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
       <div className="w-2 h-5 bg-rose-400 rounded-full"/>
       Monthly Expenses (6 Months)
      </h3>
      <ResponsiveContainer width="100%" height={180}>
       <BarChart data={monthlyChart} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fontWeight:700,fill:'#94a3b8'}}/>
        <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
        <ChartTooltip formatter={v=>formatCurrency(v)} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',padding:'10px 14px'}}/>
        <Bar dataKey="Expenses"    fill="#f87171" radius={[5,5,0,0]}/>
        <Bar dataKey="Tax Credit"  fill="#34d399" radius={[5,5,0,0]}/>
       </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2">
       <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500"><span className="w-3 h-3 bg-rose-400 rounded-sm inline-block"/>Expenses</span>
       <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="w-3 h-3 bg-emerald-400 rounded-sm inline-block"/>Tax Credit</span>
      </div>
     </div>
     {}
     <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
       <div className="w-2 h-5 bg-violet-500 rounded-full"/>
       By Category
      </h3>
      <div className="space-y-2.5 overflow-y-auto max-h-52">
       {catBreakdown.length > 0 ? catBreakdown.map((cat, i) => (
        <div key={i}>
         <div className="flex justify-between items-center mb-1">
          <button onClick={() => setCatFilter(catFilter === cat.name ? 'All' : cat.name)}
           className="flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-violet-600 transition-colors">
           <span>{EXPENSE_CAT_ICONS[cat.name]||'📋'}</span>
           <span className="truncate max-w-[100px]">{cat.name}</span>
          </button>
          <div className="text-right flex-shrink-0 ml-2">
           <span className="text-xs font-extrabold text-slate-600 tabular-nums">{formatCurrency(cat.value)}</span>
           <span className="text-xs text-slate-400 ml-1">({cat.pct.toFixed(0)}%)</span>
          </div>
         </div>
         <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{width:`${cat.pct.toFixed(1)}%`, backgroundColor: cat.color}}/>
         </div>
        </div>
       )) : (
        <p className="text-sm text-slate-400 text-center py-4">No expense data yet.</p>
       )}
      </div>
     </div>
    </div>
   )}
   {}
   <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
    <div className="flex flex-wrap gap-2 items-center">
     {}
     <div className="relative">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
      <input className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-rose-400 outline-none w-48 transition-all"
       placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)}/>
     </div>
     {}
     <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="All">All Categories</option>
      {usedCats.map(c => <option key={c} value={c}>{EXPENSE_CAT_ICONS[c]||'📋'} {c}</option>)}
     </select>
     {}
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      {['All','Cash','Bank'].map(p => (
       <button key={p} onClick={() => setPayFilter(p)}
        className={`px-3 py-2 text-xs font-bold transition-all ${payFilter===p?'bg-slate-800 text-white':'text-slate-500 hover:text-slate-700'}`}>
        {p}
       </button>
      ))}
     </div>
     {}
     {uniqueMonths.length > 1 && (
      <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
       className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Months</option>
       {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
     )}
     {}
     {uniqueYears.length > 1 && (
      <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
       className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Years</option>
       {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
     )}
     {}
     <select value={sortBy} onChange={e => setSortBy(e.target.value)}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="date-desc">Newest First</option>
      <option value="date-asc">Oldest First</option>
      <option value="amount-desc">Highest Amount</option>
      <option value="amount-asc">Lowest Amount</option>
      <option value="category">Category A–Z</option>
     </select>
     {}
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setViewMode('table')} title="Table View"
       className={`px-3 py-2 transition-all ${viewMode==='table'?'bg-slate-800 text-white':'text-slate-400 hover:text-slate-600'}`}>
       <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="16" height="3" rx="1"/><rect x="0" y="5" width="16" height="3" rx="1"/><rect x="0" y="10" width="16" height="3" rx="1"/></svg>
      </button>
      <button onClick={() => setViewMode('cards')} title="Card View"
       className={`px-3 py-2 transition-all ${viewMode==='cards'?'bg-slate-800 text-white':'text-slate-400 hover:text-slate-600'}`}>
       <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1.5"/><rect x="9" y="0" width="7" height="7" rx="1.5"/><rect x="0" y="9" width="7" height="7" rx="1.5"/><rect x="9" y="9" width="7" height="7" rx="1.5"/></svg>
      </button>
     </div>
    </div>
    <div className="flex gap-2 flex-shrink-0">
     {onGenerateRecurring && expenses.some(e => e.isRecurring) && (
      <button onClick={onGenerateRecurring} className="bg-white border border-violet-200 text-violet-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-violet-50 shadow-sm transition-all" title="Auto-generate this month's recurring expenses">
       <RefreshCw size={15}/> Recurring
      </button>
     )}
     {onImportExpenses && (
      <label className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm cursor-pointer">
       <Upload size={15}/> Import
       <input type="file" className="hidden" accept=".csv" onChange={onImportExpenses}/>
      </label>
     )}
     <button onClick={() => exportToCSV(expenses, 'Expenses_Export')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm"><Download size={15}/> Export</button>
     <button onClick={onNewExpense}
      className="bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
      <Plus size={16}/> New Expense
     </button>
    </div>
   </div>
   {}
   {(search || catFilter!=='All' || monthFilter!=='All' || yearFilter!=='All' || payFilter!=='All') && (
    <div className="flex items-center gap-3 -mt-2 flex-wrap">
     <p className="text-sm text-slate-500 font-medium">
      Showing <span className="font-bold text-rose-600">{filtered.length}</span> of {enriched.length} · Total: <span className="font-bold text-slate-700">{formatCurrency(filteredTotal)}</span>
      {filteredTaxCredit > 0 && <> · Tax Credit: <span className="font-bold text-emerald-600">{formatCurrency(filteredTaxCredit)}</span></>}
     </p>
     <button onClick={() => { setSearch(''); setCatFilter('All'); setMonthFilter('All'); setYearFilter('All'); setPayFilter('All'); }}
      className="text-xs font-bold text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors">
      ✕ Clear filters
     </button>
    </div>
   )}
   {}
   {filtered.length === 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
     <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Receipt className="text-rose-300" size={32}/>
     </div>
     <h3 className="text-lg font-bold text-slate-700 mb-2">
      {enriched.length===0 ? 'No expenses recorded yet' : 'No expenses match your filters'}
     </h3>
     <p className="text-sm text-slate-400 mb-6">
      {enriched.length===0 ? 'Start tracking your business expenses.' : 'Try clearing your filters.'}
     </p>
     {enriched.length===0 && (
      <button onClick={onNewExpense} className="bg-rose-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors">
       + Add First Expense
      </button>
     )}
    </div>
   )}
   {}
   {viewMode === 'table' && filtered.length > 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
     <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[700px]">
       <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
         {['Date','Category','Description','Payment','Tax Credit','Amount',''].map((h, i) => (
          <th key={i} className={`px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${['Tax Credit','Amount'].includes(h)?'text-right':''}`}>{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
        {filtered.map(item => (
         <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
          <td className="px-5 py-3.5">
           <p className="text-sm font-medium text-slate-600">{item.date}</p>
           <p className="text-xs text-slate-400">{item.monthName}</p>
          </td>
          <td className="px-5 py-3.5">
           <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl bg-fuchsia-50 text-fuchsia-700">
            <span>{EXPENSE_CAT_ICONS[item.cat]||'📋'}</span>
            {item.cat}
           </span>
          </td>
          <td className="px-5 py-3.5">
           <p className="text-sm font-bold text-slate-800 leading-snug">{item.description || '—'}</p>
           {item.proofUrl && (
            <a href={item.proofUrl} target="_blank" rel="noreferrer"
             className="text-xs text-violet-500 hover:text-violet-700 font-medium mt-0.5 flex items-center gap-1">
             <FileText size={10}/> View Receipt
            </a>
           )}
          </td>
          <td className="px-5 py-3.5">
           {item.bankName ? (
            <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
             <CreditCard size={11}/> {item.bankName}
             {item.chequeNumber && <span className="text-slate-400">#{item.chequeNumber}</span>}
            </span>
           ) : (
            <span className="text-xs font-bold text-slate-400">Cash</span>
           )}
          </td>
          <td className="px-5 py-3.5 text-right">
           {item.taxCredit > 0
            ? <span className="text-sm font-bold text-emerald-600 tabular-nums">+{formatCurrency(item.taxCredit)}</span>
            : <span className="text-slate-200 text-sm">—</span>}
          </td>
          <td className="px-5 py-3.5 text-right">
           <p className="font-extrabold text-slate-900 tabular-nums">{formatCurrency(item.amt)}</p>
           {item.approvalStatus === 'Pending' && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full mt-1 inline-block">Pending</span>
           )}
           {item.isRecurring && (
            <span className="text-xs font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full mt-1 inline-block ml-1">↻</span>
           )}
          </td>
          <td className="px-5 py-3.5">
           <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {currentUser?.role === 'Admin' && item.approvalStatus === 'Pending' && onApproveExpense && (
             <button onClick={() => onApproveExpense(item.id)} className="p-1.5 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve"><CheckCircle size={13}/></button>
            )}
            {currentUser?.role === 'Admin' && (
             <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Edit size={13}/></button>
            )}
            {currentUser?.role === 'Admin' && (
             <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={13}/></button>
            )}
           </div>
          </td>
         </tr>
        ))}
       </tbody>
       <tfoot className="bg-gradient-to-r from-slate-50 to-rose-50/30 border-t-2 border-slate-200">
        <tr>
         <td colSpan={4} className="px-5 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
          TOTALS — {filtered.length} expense{filtered.length!==1?'s':''}
         </td>
         <td className="px-5 py-4 text-right font-extrabold text-emerald-600 tabular-nums">
          {filteredTaxCredit > 0 ? `+${formatCurrency(filteredTaxCredit)}` : '—'}
         </td>
         <td className="px-5 py-4 text-right font-extrabold text-rose-700 tabular-nums">
          {formatCurrency(filteredTotal)}
         </td>
         <td/>
        </tr>
       </tfoot>
      </table>
     </div>
    </div>
   )}
   {}
   {viewMode === 'cards' && filtered.length > 0 && (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
     {filtered.map(item => {
      const catColor = catBreakdown.find(c => c.name === item.cat)?.color || EXPENSE_COLORS[0];
      return (
       <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
        {}
        <div className="h-1 w-full" style={{backgroundColor: catColor}}/>
        <div className="p-5">
         <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
           <p className="font-extrabold text-slate-800 leading-snug truncate">{item.description || 'No description'}</p>
           <p className="text-xs text-slate-400 mt-0.5">{item.date} · {item.monthName}</p>
          </div>
          <p className="text-lg font-extrabold text-rose-600 tabular-nums ml-3 flex-shrink-0">{formatCurrency(item.amt)}</p>
         </div>
         <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{backgroundColor: catColor+'18', color: catColor}}>
           {EXPENSE_CAT_ICONS[item.cat]||'📋'} {item.cat}
          </span>
          {item.bankName ? (
           <span className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-1">
            <CreditCard size={10}/> {item.bankName}
           </span>
          ) : (
           <span className="text-xs font-bold px-2 py-1 bg-slate-50 text-slate-500 rounded-lg">Cash</span>
          )}
          {item.taxCredit > 0 && (
           <span className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg">
            Tax: +{formatCurrency(item.taxCredit)}
           </span>
          )}
         </div>
         {item.proofUrl && (
          <a href={item.proofUrl} target="_blank" rel="noreferrer"
           className="mt-3 flex items-center gap-1.5 text-xs font-bold text-violet-500 hover:text-violet-700 transition-colors">
           <FileText size={11}/> View Receipt
          </a>
         )}
        </div>
        {currentUser?.role === 'Admin' && (
         <div className="px-4 pb-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(item)} className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1"><Edit size={11}/> Edit</button>
          <button onClick={() => onDelete(item.id)} className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1"><Trash2 size={11}/> Delete</button>
         </div>
        )}
       </div>
      );
     })}
    </div>
   )}
  </div>
 );
};
const PETTY_CATEGORIES = [
 'Office Supplies', 'Meals & Entertainment', 'Travel & Transport',
 'Courier & Delivery', 'Utilities', 'Printing & Stationery',
 'Repairs & Maintenance', 'Miscellaneous', 'Advance', 'Refund / Receipt'
];
const PettyCashPage = ({ pettyCash, currentUser, canWrite, canDelete, onNewEntry, onEdit, onDelete, appSettings = {} }) => {
 const [search, setSearch]           = useState('');
 const [typeFilter, setTypeFilter]   = useState('All');
 const [catFilter, setCatFilter]     = useState('All');
 const [monthFilter, setMonthFilter] = useState('All');
 const [sortBy, setSortBy]           = useState('date-asc');
 const [viewMode, setViewMode]       = useState('ledger');
 const openingBalance = Number(appSettings.pettyCashOpeningBalance) || 0;
 const minBalance     = Number(appSettings.pettyCashMinBalance)     || 0;
 const today          = new Date();
 const enriched = useMemo(() => {
  const sorted = [...pettyCash].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = openingBalance;
  return sorted.map(r => {
   const out = Number(r.cashOut) || 0;
   const inp = Number(r.cashIn)  || 0;
   running += inp - out;
   return { ...r, out, inp, balance: running,
    monthNum:  r.date ? r.date.slice(0, 7) : '',
    monthName: (() => { try { return new Date(r.date).toLocaleString('default', { month: 'long', year: 'numeric' }); } catch { return r.date; } })(),
   };
  });
 }, [pettyCash, openingBalance]);
 const kpis = useMemo(() => {
  const totalOut  = enriched.reduce((a, r) => a + r.out, 0);
  const totalIn   = enriched.reduce((a, r) => a + r.inp, 0);
  const balance   = openingBalance + totalIn - totalOut;
  const curMonth  = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const monthOut  = enriched.filter(r => r.monthNum === curMonth).reduce((a, r) => a + r.out, 0);
  const monthIn   = enriched.filter(r => r.monthNum === curMonth).reduce((a, r) => a + r.inp, 0);
  const outTx     = enriched.filter(r => r.out > 0);
  const avgOut    = outTx.length > 0 ? totalOut / outTx.length : 0;
  const lastEntry = enriched.length > 0 ? enriched[enriched.length - 1] : null;
  return { totalOut, totalIn, balance, monthOut, monthIn, txCount: enriched.length, avgOut, lastEntry };
 }, [enriched, openingBalance]);
 const monthlyChart = useMemo(() => Array.from({ length: 6 }, (_, i) => {
  const d   = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  return { name: d.toLocaleString('default',{month:'short'}), Out: enriched.filter(r=>r.monthNum===key).reduce((a,r)=>a+r.out,0), In: enriched.filter(r=>r.monthNum===key).reduce((a,r)=>a+r.inp,0) };
 }), [enriched]);
 const categoryBreakdown = useMemo(() => {
  const map = {};
  enriched.filter(r => r.out > 0).forEach(r => { const c = r.category||'Miscellaneous'; map[c]=(map[c]||0)+r.out; });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value}));
 }, [enriched]);
 const PIE_COLORS   = ['#6366f1','#f59e0b','#10b981','#f43f5e','#06b6d4','#8b5cf6'];
 const uniqueMonths = useMemo(()=>[...new Set(enriched.map(r=>r.monthName).filter(Boolean))].reverse(),[enriched]);
 const uniqueCats   = useMemo(()=>[...new Set(enriched.map(r=>r.category).filter(Boolean))].sort(),[enriched]);
 const catIcon      = {'Office Supplies':'🖇️','Meals & Entertainment':'🍽️','Travel & Transport':'🚗','Courier & Delivery':'📦','Utilities':'💡','Printing & Stationery':'🖨️','Repairs & Maintenance':'🔧','Advance':'💵','Refund / Receipt':'↩️','Miscellaneous':'📋','Petty Replenishment':'💰'};
 const filtered = useMemo(() => {
  let res = [...enriched];
  if (search)            res = res.filter(r=>(r.description||'').toLowerCase().includes(search.toLowerCase())||(r.category||'').toLowerCase().includes(search.toLowerCase())||(r.paidTo||'').toLowerCase().includes(search.toLowerCase())||(r.refNumber||'').toLowerCase().includes(search.toLowerCase()));
  if (typeFilter==='Out')  res = res.filter(r=>r.out>0);
  if (typeFilter==='In')   res = res.filter(r=>r.inp>0);
  if (catFilter!=='All')   res = res.filter(r=>(r.category||'Miscellaneous')===catFilter);
  if (monthFilter!=='All') res = res.filter(r=>r.monthName===monthFilter);
  if (sortBy==='date-asc')  res=[...res].sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (sortBy==='date-desc') res=[...res].sort((a,b)=>new Date(b.date)-new Date(a.date));
  if (sortBy==='amount')    res=[...res].sort((a,b)=>(b.out||b.inp)-(a.out||a.inp));
  return res;
 }, [enriched, search, typeFilter, catFilter, monthFilter, sortBy]);
 const isNegative   = kpis.balance < 0;
 const isLowBalance = !isNegative && minBalance > 0 && kpis.balance <= minBalance;
 const printLedger = () => {
  const w = window.open('', '_blank');
  const rows = filtered.map(item => `
   <tr style="border-bottom:1px solid #f1f5f9">
    <td style="padding:7px 10px;font-size:12px;color:#475569">${item.date}</td>
    <td style="padding:7px 10px;font-size:12px;font-weight:600;color:#1e293b">${item.description||'—'}${item.paidTo?`<br><span style="color:#94a3b8;font-size:11px">→ ${item.paidTo}</span>`:''}</td>
    <td style="padding:7px 10px;font-size:11px;color:#64748b">${item.category||'—'}</td>
    <td style="padding:7px 10px;font-size:12px;color:#dc2626;text-align:right;font-weight:700">${item.out>0?formatCurrency(item.out):'—'}</td>
    <td style="padding:7px 10px;font-size:12px;color:#16a34a;text-align:right;font-weight:700">${item.inp>0?formatCurrency(item.inp):'—'}</td>
    <td style="padding:7px 10px;font-size:12px;text-align:right;font-weight:800;color:${item.balance<0?'#dc2626':'#1e293b'}">${formatCurrency(item.balance)}</td>
    <td style="padding:7px 10px;font-size:11px;color:#94a3b8">${item.refNumber||'—'}</td>
   </tr>`).join('');
  const ob = openingBalance > 0 ? `<tr style="background:#f5f3ff"><td style="padding:7px 10px;font-size:12px;color:#8b5cf6">—</td><td style="padding:7px 10px;font-weight:700;font-size:12px;color:#5b21b6">Opening Balance</td><td style="padding:7px 10px;font-size:11px;color:#8b5cf6">Opening</td><td style="text-align:right;color:#94a3b8;padding:7px 10px">—</td><td style="padding:7px 10px;text-align:right;font-weight:700;color:#5b21b6">${formatCurrency(openingBalance)}</td><td style="padding:7px 10px;text-align:right;font-weight:800;color:#5b21b6">${formatCurrency(openingBalance)}</td><td>—</td></tr>` : '';
  w.document.write(`<!DOCTYPE html><html><head><title>Petty Cash Ledger</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#1e293b}table{width:100%;border-collapse:collapse}th{background:#f8fafc;padding:10px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;text-align:left;border-bottom:2px solid #e2e8f0}@media print{button{display:none!important}}</style></head><body>
  <div style="display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
   <div><h1 style="font-size:22px;font-weight:800;margin:0 0 4px">Petty Cash Ledger</h1><p style="color:#94a3b8;font-size:12px;margin:0">Printed: ${new Date().toLocaleDateString()}</p></div>
   <div style="text-align:right">${openingBalance>0?`<p style="font-size:12px;color:#64748b;margin:0 0 4px">Opening: <strong>${formatCurrency(openingBalance)}</strong></p>`:''}<p style="font-size:20px;font-weight:800;color:${kpis.balance<0?'#dc2626':'#059669'};margin:0">Float: ${formatCurrency(kpis.balance)}</p></div>
  </div>
  <table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th style="text-align:right">Cash Out</th><th style="text-align:right">Cash In</th><th style="text-align:right">Balance</th><th>Ref #</th></tr></thead>
  <tbody>${ob}${rows}</tbody>
  <tfoot><tr style="background:#f8fafc;border-top:2px solid #e2e8f0"><td colspan="3" style="padding:10px;font-weight:800;font-size:12px">TOTAL (${filtered.length} entries)</td><td style="padding:10px;text-align:right;font-weight:800;color:#dc2626">${formatCurrency(filtered.reduce((a,r)=>a+r.out,0))}</td><td style="padding:10px;text-align:right;font-weight:800;color:#16a34a">${formatCurrency(filtered.reduce((a,r)=>a+r.inp,0))}</td><td style="padding:10px;text-align:right;font-weight:800">${formatCurrency(kpis.balance)}</td><td></td></tr></tfoot></table>
  <script>setTimeout(()=>window.print(),400)</script></body></html>`);
  w.document.close();
 };
 return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
   {}
   {(isNegative || isLowBalance) && (
    <div className={`rounded-2xl p-4 flex items-center gap-4 border ${isNegative?'bg-rose-50 border-rose-300':'bg-amber-50 border-amber-300'}`}>
     <div className={`p-2.5 rounded-xl flex-shrink-0 ${isNegative?'bg-rose-100':'bg-amber-100'}`}>
      <Wallet className={isNegative?'text-rose-600':'text-amber-600'} size={20}/>
     </div>
     <div className="flex-1">
      <p className={`font-extrabold text-sm ${isNegative?'text-rose-800':'text-amber-800'}`}>{isNegative?'⚠ Cash box is overdrawn!':'⚠ Cash balance is running low'}</p>
      <p className={`text-xs mt-0.5 ${isNegative?'text-rose-600':'text-amber-600'}`}>
       {isNegative?`Balance is ${formatCurrency(Math.abs(kpis.balance))} in deficit — please replenish the petty cash fund.`:`Balance ${formatCurrency(kpis.balance)} has reached the minimum threshold of ${formatCurrency(minBalance)}.`}
      </p>
     </div>
     {canWrite && <button onClick={()=>onNewEntry('in')} className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm text-white ${isNegative?'bg-rose-600 hover:bg-rose-700':'bg-amber-500 hover:bg-amber-600'} transition-colors`}>+ Top Up Cash</button>}
    </div>
   )}
   {}
   <div className={`rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border ${isNegative?'bg-gradient-to-r from-rose-600 to-red-600 border-rose-700':isLowBalance?'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-600':'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-700'}`}>
    <div>
     <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Current Cash Float</p>
     <p className="text-white text-4xl font-extrabold tracking-tight tabular-nums">{formatCurrency(kpis.balance)}</p>
     <div className="flex flex-wrap gap-3 mt-2">
      {openingBalance>0 && <span className="text-white/60 text-xs font-medium">Opening: {formatCurrency(openingBalance)}</span>}
      {minBalance>0 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLowBalance?'bg-white/30 text-white':'bg-white/15 text-white/70'}`}>Min: {formatCurrency(minBalance)}</span>}
      {kpis.lastEntry && <span className="text-white/50 text-xs">Last entry: {kpis.lastEntry.date}</span>}
     </div>
    </div>
    <div className="flex gap-2 sm:flex-col sm:items-end">
     <div className="bg-white/10 rounded-2xl px-4 py-2 text-right"><p className="text-white/60 text-xs font-bold uppercase">Total In</p><p className="text-white font-extrabold tabular-nums">{formatCurrency(kpis.totalIn)}</p></div>
     <div className="bg-white/10 rounded-2xl px-4 py-2 text-right"><p className="text-white/60 text-xs font-bold uppercase">Total Out</p><p className="text-white font-extrabold tabular-nums">{formatCurrency(kpis.totalOut)}</p></div>
    </div>
   </div>
   {}
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {[
     {l:'This Month Out', v:formatCurrency(kpis.monthOut), sub:today.toLocaleString('default',{month:'long'}), c:'text-rose-700',    bg:'bg-rose-50 border-rose-200',       icon:ArrowUpRight},
     {l:'This Month In',  v:formatCurrency(kpis.monthIn),  sub:'receipts this month',                          c:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200', icon:ArrowDownLeft},
     {l:'Total Spent',    v:formatCurrency(kpis.totalOut), sub:'all time outflows',                            c:'text-slate-700',   bg:'bg-white border-slate-200',        icon:Wallet},
     {l:'Total Received', v:formatCurrency(kpis.totalIn),  sub:'all time inflows',                             c:'text-slate-700',   bg:'bg-white border-slate-200',        icon:ArrowDownLeft},
     {l:'Avg Expense',    v:formatCurrency(kpis.avgOut),   sub:'per transaction',                              c:'text-amber-700',   bg:'bg-amber-50 border-amber-200',     icon:Percent},
     {l:'Entries',        v:kpis.txCount,                  sub:'total transactions',                           c:'text-slate-800',   bg:'bg-white border-slate-200',        icon:FileText},
    ].map((k,i)=>(
     <div key={i} className={`${k.bg} border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex justify-between items-start mb-2">
       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{k.l}</p>
       <k.icon size={14} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 mt-0.5"/>
      </div>
      <p className={`text-lg font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
      <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
     </div>
    ))}
   </div>
   {}
   {(() => {
    const totalFunds = openingBalance + kpis.totalIn;
    if (totalFunds <= 0) return null;
    const usedPct = Math.min(100, (kpis.totalOut / totalFunds) * 100);
    return (
     <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
       <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fund Utilisation</span>
       <span className={`text-xs font-extrabold px-2 py-1 rounded-full ${usedPct>90?'bg-rose-100 text-rose-700':usedPct>70?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>
        {formatCurrency(kpis.totalOut)} of {formatCurrency(totalFunds)} used ({usedPct.toFixed(0)}%)
       </span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
       <div className={`h-full rounded-full transition-all duration-700 ${usedPct>90?'bg-rose-500':usedPct>70?'bg-amber-400':'bg-emerald-500'}`} style={{width:`${usedPct.toFixed(1)}%`}}/>
      </div>
      {openingBalance>0 && <p className="text-xs text-slate-400 mt-1.5">Includes opening balance of {formatCurrency(openingBalance)}</p>}
     </div>
    );
   })()}
   {}
   {enriched.length > 0 && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
     <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2"><div className="w-2 h-5 bg-amber-400 rounded-full"/>Monthly Cash Flow (6 Months)</h3>
      <ResponsiveContainer width="100%" height={180}>
       <BarChart data={monthlyChart} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fontWeight:700,fill:'#94a3b8'}}/>
        <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
        <ChartTooltip formatter={v=>formatCurrency(v)} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',padding:'10px 14px'}}/>
        <Bar dataKey="Out" fill="#f87171" radius={[5,5,0,0]}/><Bar dataKey="In" fill="#34d399" radius={[5,5,0,0]}/>
       </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2">
       <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500"><span className="w-3 h-3 bg-rose-400 rounded-sm inline-block"/>Cash Out</span>
       <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="w-3 h-3 bg-emerald-400 rounded-sm inline-block"/>Cash In</span>
      </div>
     </div>
     <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2"><div className="w-2 h-5 bg-violet-500 rounded-full"/>Top Expense Categories</h3>
      {categoryBreakdown.length > 0 ? (
       <div className="space-y-3">
        {categoryBreakdown.map((cat,i) => {
         const pct = kpis.totalOut>0?(cat.value/kpis.totalOut)*100:0;
         return (
          <div key={i}>
           <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><span>{catIcon[cat.name]||'📋'}</span><span className="truncate max-w-[110px]">{cat.name}</span></span>
            <span className="text-xs font-extrabold text-slate-600 tabular-nums">{formatCurrency(cat.value)}</span>
           </div>
           <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct.toFixed(1)}%`,backgroundColor:PIE_COLORS[i%PIE_COLORS.length]}}/></div>
          </div>
         );
        })}
       </div>
      ) : <p className="text-sm text-slate-400 text-center py-6">No expense data yet.</p>}
     </div>
    </div>
   )}
   {}
   <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
    <div className="flex flex-wrap gap-2 items-center">
     <div className="relative">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
      <input className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-amber-400 outline-none w-48 transition-all" placeholder="Search entries..." value={search} onChange={e=>setSearch(e.target.value)}/>
     </div>
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      {['All','Out','In'].map(t=>(
       <button key={t} onClick={()=>setTypeFilter(t)} className={`px-3 py-2 text-xs font-bold transition-all ${typeFilter===t?(t==='Out'?'bg-rose-500 text-white':t==='In'?'bg-emerald-500 text-white':'bg-slate-800 text-white'):'text-slate-500 hover:text-slate-700'}`}>
        {t==='All'?'All':t==='Out'?'⬆ Out':'⬇ In'}
       </button>
      ))}
     </div>
     {uniqueCats.length>0 && (
      <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Categories</option>
       {uniqueCats.map(c=><option key={c} value={c}>{catIcon[c]||'📋'} {c}</option>)}
      </select>
     )}
     {uniqueMonths.length>1 && (
      <select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Months</option>
       {uniqueMonths.map(m=><option key={m} value={m}>{m}</option>)}
      </select>
     )}
     <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="date-asc">Oldest First</option>
      <option value="date-desc">Newest First</option>
      <option value="amount">Highest Amount</option>
     </select>
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={()=>setViewMode('ledger')} title="Ledger View" className={`px-3 py-2 transition-all ${viewMode==='ledger'?'bg-slate-800 text-white':'text-slate-400 hover:text-slate-600'}`}><svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="16" height="3" rx="1"/><rect x="0" y="5" width="16" height="3" rx="1"/><rect x="0" y="10" width="16" height="3" rx="1"/></svg></button>
      <button onClick={()=>setViewMode('cards')} title="Card View" className={`px-3 py-2 transition-all ${viewMode==='cards'?'bg-slate-800 text-white':'text-slate-400 hover:text-slate-600'}`}><svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1.5"/><rect x="9" y="0" width="7" height="7" rx="1.5"/><rect x="0" y="9" width="7" height="7" rx="1.5"/><rect x="9" y="9" width="7" height="7" rx="1.5"/></svg></button>
     </div>
    </div>
    <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
     <button onClick={printLedger} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm"><Printer size={15}/> Print</button>
     <button onClick={()=>exportToCSV(pettyCash,'PettyCash_Export')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm"><Download size={15}/> Export</button>
     {canWrite && <>
      <button onClick={()=>onNewEntry('out')} className="bg-gradient-to-r from-rose-500 to-rose-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"><ArrowUpRight size={15}/> Cash Out</button>
      <button onClick={()=>onNewEntry('in')}  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"><ArrowDownLeft size={15}/> Cash In</button>
     </>}
    </div>
   </div>
   {(search||typeFilter!=='All'||catFilter!=='All'||monthFilter!=='All') && (
    <div className="flex items-center justify-between text-sm -mt-2">
     <p className="text-slate-500 font-medium">Showing <span className="font-bold text-amber-600">{filtered.length}</span> of {enriched.length} entries{filtered.length>0&&<> · Out: <span className="font-bold text-rose-600">{formatCurrency(filtered.reduce((a,r)=>a+r.out,0))}</span> · In: <span className="font-bold text-emerald-600">{formatCurrency(filtered.reduce((a,r)=>a+r.inp,0))}</span></>}</p>
     <button onClick={()=>{setSearch('');setTypeFilter('All');setCatFilter('All');setMonthFilter('All');}} className="text-xs font-bold text-slate-400 hover:text-violet-600 bg-slate-100 hover:bg-violet-50 px-2.5 py-1 rounded-lg transition-colors">✕ Clear</button>
    </div>
   )}
   {}
   {filtered.length===0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
     <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wallet className="text-amber-300" size={32}/></div>
     <h3 className="text-lg font-bold text-slate-700 mb-2">{enriched.length===0?'No petty cash entries yet':'No entries match your filters'}</h3>
     <p className="text-sm text-slate-400 mb-6">{enriched.length===0?'Use "Cash Out" for expenses and "Cash In" to replenish the fund.':'Try clearing your filters.'}</p>
     {enriched.length===0&&canWrite&&(
      <div className="flex gap-3 justify-center">
       <button onClick={()=>onNewEntry('out')} className="bg-rose-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors flex items-center gap-2"><ArrowUpRight size={15}/> Cash Out</button>
       <button onClick={()=>onNewEntry('in')}  className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center gap-2"><ArrowDownLeft size={15}/> Cash In</button>
      </div>
     )}
    </div>
   )}
   {}
   {viewMode==='ledger'&&filtered.length>0&&(
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
     <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[780px]">
       <thead className="bg-slate-50 border-b border-slate-100">
        <tr>{['Date','Description / Paid To','Category','Cash Out','Cash In','Balance','Ref #',''].map((h,i)=>(
         <th key={i} className={`px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${['Cash Out','Cash In','Balance'].includes(h)?'text-right':''}`}>{h}</th>
        ))}</tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
        {openingBalance>0&&(
         <tr className="bg-violet-50/40 border-b border-violet-100/50">
          <td className="px-4 py-3 text-xs text-slate-400">—</td>
          <td className="px-4 py-3"><p className="text-sm font-extrabold text-violet-700">Opening Balance</p><p className="text-xs text-violet-400 mt-0.5">Starting float for this ledger</p></td>
          <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-1 bg-violet-100 text-violet-600 rounded-lg">Opening</span></td>
          <td className="px-4 py-3 text-right text-slate-200 text-sm">—</td>
          <td className="px-4 py-3 text-right font-extrabold text-violet-600 tabular-nums">{formatCurrency(openingBalance)}</td>
          <td className="px-4 py-3 text-right font-extrabold text-violet-700 tabular-nums">{formatCurrency(openingBalance)}</td>
          <td className="px-4 py-3 text-slate-300 text-xs">—</td>
          <td/>
         </tr>
        )}
        {filtered.map(item=>(
         <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors group ${item.inp>0?'bg-emerald-50/20':''} ${item.balance<0?'bg-rose-50/20':''}`}>
          <td className="px-4 py-3.5"><p className="text-sm font-medium text-slate-600">{item.date}</p><p className="text-xs text-slate-400">{item.monthName}</p></td>
          <td className="px-4 py-3.5">
           <p className="text-sm font-bold text-slate-800 leading-snug">{item.description||'—'}</p>
           {item.paidTo&&<p className="text-xs text-slate-400 mt-0.5">→ <span className="font-medium text-slate-500">{item.paidTo}</span></p>}
           {item.bankName&&!item.paidTo&&<p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><CreditCard size={10}/> {item.bankName}</p>}
          </td>
          <td className="px-4 py-3.5">{item.category?<span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg flex items-center gap-1 w-fit">{catIcon[item.category]||'📋'} {item.category}</span>:<span className="text-slate-300 text-sm">—</span>}</td>
          <td className="px-4 py-3.5 text-right">{item.out>0?<span className="font-extrabold text-rose-600 tabular-nums">{formatCurrency(item.out)}</span>:<span className="text-slate-200">—</span>}</td>
          <td className="px-4 py-3.5 text-right">{item.inp>0?<span className="font-extrabold text-emerald-600 tabular-nums">{formatCurrency(item.inp)}</span>:<span className="text-slate-200">—</span>}</td>
          <td className="px-4 py-3.5 text-right">
           <span className={`font-extrabold tabular-nums text-sm ${item.balance>=0?'text-slate-800':'text-rose-600'}`}>{formatCurrency(item.balance)}</span>
           {item.balance<0&&<p className="text-xs text-rose-400 font-bold">Overdrawn</p>}
          </td>
          <td className="px-4 py-3.5 text-xs text-slate-400 font-medium">{item.refNumber||'—'}</td>
          <td className="px-4 py-3.5">
           <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {canWrite&&<button onClick={()=>onEdit(item)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit size={13}/></button>}
            {canDelete&&<button onClick={()=>onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={13}/></button>}
           </div>
          </td>
         </tr>
        ))}
       </tbody>
       <tfoot className="bg-gradient-to-r from-slate-50 to-amber-50/40 border-t-2 border-slate-200">
        <tr>
         <td colSpan={3} className="px-4 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">TOTALS — {filtered.length} {filtered.length===1?'entry':'entries'}</td>
         <td className="px-4 py-4 text-right font-extrabold text-rose-600 tabular-nums">{formatCurrency(filtered.reduce((a,r)=>a+r.out,0))}</td>
         <td className="px-4 py-4 text-right font-extrabold text-emerald-600 tabular-nums">{formatCurrency(filtered.reduce((a,r)=>a+r.inp,0))}</td>
         <td className="px-4 py-4 text-right"><span className={`font-extrabold tabular-nums ${kpis.balance>=0?'text-slate-900':'text-rose-600'}`}>{formatCurrency(kpis.balance)}</span><p className="text-xs text-slate-400 font-medium">current float</p></td>
         <td colSpan={2}/>
        </tr>
       </tfoot>
      </table>
     </div>
    </div>
   )}
   {}
   {viewMode==='cards'&&filtered.length>0&&(
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
     {filtered.map(item=>(
      <div key={item.id} className={`rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group ${item.inp>0?'bg-emerald-50/60 border-emerald-200':'bg-white border-slate-200'}`}>
       <div className={`h-1 w-full ${item.inp>0?'bg-emerald-400':'bg-rose-400'}`}/>
       <div className="p-5">
        <div className="flex justify-between items-start mb-3">
         <div className="flex-1 min-w-0">
          <p className="font-extrabold text-slate-800 leading-snug truncate">{item.description||'No description'}</p>
          {item.paidTo&&<p className="text-xs text-slate-500 mt-0.5 font-medium">→ {item.paidTo}</p>}
          <p className="text-xs text-slate-400 mt-0.5">{item.date} · {item.monthName}</p>
         </div>
         <div className="text-right flex-shrink-0 ml-3">
          {item.out>0&&<p className="text-lg font-extrabold text-rose-600 tabular-nums">-{formatCurrency(item.out)}</p>}
          {item.inp>0&&<p className="text-lg font-extrabold text-emerald-600 tabular-nums">+{formatCurrency(item.inp)}</p>}
         </div>
        </div>
        <div className="flex flex-wrap gap-2">
         {item.category&&<span className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg">{catIcon[item.category]||'📋'} {item.category}</span>}
         {item.refNumber&&<span className="text-xs font-medium px-2 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg"># {item.refNumber}</span>}
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
         <span className="text-xs text-slate-400 font-medium">Balance after</span>
         <span className={`text-sm font-extrabold tabular-nums ${item.balance>=0?'text-slate-700':'text-rose-600'}`}>{formatCurrency(item.balance)}</span>
        </div>
       </div>
       {(canWrite||canDelete)&&(
        <div className="px-4 pb-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
         {canWrite&&<button onClick={()=>onEdit(item)} className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded-lg transition-colors flex items-center justify-center gap-1"><Edit size={11}/> Edit</button>}
         {canDelete&&<button onClick={()=>onDelete(item.id)} className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1"><Trash2 size={11}/> Delete</button>}
        </div>
       )}
      </div>
     ))}
    </div>
   )}
  </div>
 );
};
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
  const clientInvoices = invoices.filter(inv => cleanName(inv.client) === target).map(inv => ({
   id: inv.id,
   date: inv.date,
   description: `Invoice Service`,
   type: 'Invoice',
   debit: calculateTax(inv.items.reduce((a, i) => a + (i.qty * i.rate), 0), inv.taxRate).total,
   credit: 0,
   rawDate: new Date(inv.date)
  }));
  const clientBank = bankRecords.filter(r => cleanName(r.description).includes(target) && r.amount > 0).map(r => ({
   id: r.id,
   date: r.date,
   description: r.description,
   type: 'Payment (Bank)',
   debit: 0,
   credit: Number(r.amount),
   rawDate: new Date(r.date)
  }));
  const clientCash = pettyCash.filter(r => cleanName(r.description).includes(target) && Number(r.cashIn) > 0).map(r => ({
   id: r.id,
   date: r.date,
   description: r.description,
   type: 'Payment (Cash)',
   debit: 0,
   credit: Number(r.cashIn),
   rawDate: new Date(r.date)
  }));
  const allTrans = [...manualAdvance, ...clientInvoices, ...clientBank, ...clientCash].sort((a, b) => a.rawDate - b.rawDate);
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
     <div id="client-statement-printable">
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
     </div>{}
     <div className="flex justify-end gap-3">
      <button onClick={() => printDocument('client-statement-printable', `Statement — ${selectedClient}`)}
       className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
       <Printer size={16}/> Print
      </button>
      <button onClick={() => downloadElementAsPDF('client-statement-printable', `Statement_${selectedClient}.pdf`)}
       className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200">
       <Download size={16}/> Download PDF
      </button>
     </div>
    </>
   )}
  </div>
 );
};
const ClientsPage = ({
 clients, invoices, bankRecords, pettyCash,
 onViewProfile, onEdit, onDelete, onNewClient, currentUser
}) => {
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState('All');
 const [outstandingOnly, setOutstandingOnly] = useState(false);
 const [sortBy, setSortBy] = useState('outstanding');
 const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
 const today = new Date(); today.setHours(0,0,0,0);
 const enriched = useMemo(() => clients.map(client => {
  const name = (client.name || '').toLowerCase().trim();
  const clientInvs = invoices.filter(inv => (inv.client || '').toLowerCase().trim() === name);
  const totalBilled = clientInvs.reduce((a, inv) =>
   a + calculateTax((inv.items||[]).reduce((s,it)=>s+((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)),0), inv.taxRate).total, 0);
  const totalReceived = clientInvs.filter(i => i.status === 'Paid').reduce((a, inv) => {
   const r = Number(inv.amountReceived);
   const t = calculateTax((inv.items||[]).reduce((s,it)=>s+((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)),0), inv.taxRate).total;
   return a + (r > 0 ? r : t);
  }, 0) + (Number(client.advanceReceived)||0);
  const outstanding = Math.max(0, totalBilled - totalReceived);
  const overdueInvs = clientInvs.filter(i => i.status !== 'Paid' && i.dueDate && new Date(i.dueDate) < today);
  const unpaidInvs = clientInvs.filter(i => i.status !== 'Paid');
  const paidCount = clientInvs.filter(i => i.status === 'Paid').length;
  const collectionRate = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;
  return {
   ...client, totalBilled, totalReceived, outstanding,
   overdueCount: overdueInvs.length, invoiceCount: clientInvs.length,
   unpaidCount: unpaidInvs.length, paidCount, collectionRate
  };
 }), [clients, invoices]);
 const filtered = useMemo(() => {
  let res = enriched;
  if (search) res = res.filter(c =>
   (c.name||'').toLowerCase().includes(search.toLowerCase()) ||
   (c.projectName||'').toLowerCase().includes(search.toLowerCase()) ||
   (c.phone||'').includes(search) ||
   (c.email||'').toLowerCase().includes(search.toLowerCase()));
  if (statusFilter !== 'All') res = res.filter(c => (c.status || 'Ongoing') === statusFilter);
  if (outstandingOnly) res = res.filter(c => c.outstanding > 0);
  if (sortBy === 'outstanding') res = [...res].sort((a,b) => b.outstanding - a.outstanding);
  else if (sortBy === 'billed') res = [...res].sort((a,b) => b.totalBilled - a.totalBilled);
  else if (sortBy === 'overdue') res = [...res].sort((a,b) => b.overdueCount - a.overdueCount);
  else if (sortBy === 'date') res = [...res].sort((a,b) => new Date(b.date||0) - new Date(a.date||0));
  else res = [...res].sort((a,b) => (a.name||'').localeCompare(b.name||''));
  return res;
 }, [enriched, search, statusFilter, outstandingOnly, sortBy]);
 const kpis = useMemo(() => {
  const avgCollection = enriched.length > 0
   ? Math.round(enriched.reduce((a,c) => a + c.collectionRate, 0) / enriched.length)
   : 0;
  const topClient = enriched.reduce((best, c) => c.totalBilled > (best?.totalBilled || 0) ? c : best, null);
  return {
   total: enriched.length,
   totalBilled: enriched.reduce((a,c)=>a+c.totalBilled,0),
   totalReceived: enriched.reduce((a,c)=>a+c.totalReceived,0),
   totalOutstanding: enriched.reduce((a,c)=>a+c.outstanding,0),
   overdueClients: enriched.filter(c=>c.overdueCount>0).length,
   activeClients: enriched.filter(c=>(c.status||'Ongoing')!=='Completed').length,
   retainerClients: enriched.filter(c=>c.status==='Retainer').length,
   avgCollection,
   topClient,
  };
 }, [enriched]);
 const statusColors = {
  Ongoing: 'bg-amber-100 text-amber-700',
  Retainer: 'bg-violet-100 text-violet-700',
  Completed: 'bg-emerald-100 text-emerald-700'
 };
 const sendWhatsApp = (client) => {
  const phone = (client.phone||'').replace(/[^0-9]/g,'');
  if (!phone) { window._toast?.('No phone number saved for this client.', 'error'); return; }
  const msg = encodeURIComponent(
   `Dear ${client.name},\n\nThis is a gentle reminder regarding your outstanding payment of ${formatCurrency(client.outstanding)}.\n\nPlease get in touch with us at your earliest convenience.\n\nThank you!`
  );
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
 };
 const WaIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>;
 return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
  <div className="space-y-4">
   {}
   {kpis.overdueClients > 0 && (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4">
     <div className="bg-rose-100 p-2.5 rounded-xl flex-shrink-0"><Clock className="text-rose-600" size={20}/></div>
     <div className="flex-1 min-w-0">
      <p className="font-bold text-rose-800 text-sm">{kpis.overdueClients} client{kpis.overdueClients>1?'s have':' has'} overdue invoices</p>
      <p className="text-rose-600 text-xs mt-0.5">Filter by "Overdue First" to follow up quickly.</p>
     </div>
     <button onClick={() => setSortBy('overdue')} className="bg-rose-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-rose-700 transition-colors flex-shrink-0">Show Overdue</button>
    </div>
   )}
   {}
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {[
     { l: 'Total Clients', v: kpis.total, sub: `${kpis.activeClients} active`, c: 'text-slate-800', bg: 'bg-white border-slate-200', icon: Users },
     { l: 'On Retainer', v: kpis.retainerClients, sub: 'Recurring revenue', c: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: RefreshCw },
     { l: 'Total Invoiced', v: formatCurrency(kpis.totalBilled), sub: 'All time billings', c: 'text-slate-800', bg: 'bg-white border-slate-200', icon: FileText },
     { l: 'Total Collected', v: formatCurrency(kpis.totalReceived), sub: 'Revenue received', c: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: ArrowDownLeft },
     { l: 'Outstanding', v: formatCurrency(kpis.totalOutstanding), sub: 'Pending collection', c: 'text-rose-700', bg: kpis.totalOutstanding > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200', icon: Clock },
     { l: 'Avg Collection', v: `${kpis.avgCollection}%`, sub: kpis.avgCollection>=80?'Excellent health':kpis.avgCollection>=60?'Good health':'Needs attention', c: kpis.avgCollection>=80?'text-emerald-700':kpis.avgCollection>=60?'text-amber-700':'text-rose-700', bg: kpis.avgCollection>=80?'bg-emerald-50 border-emerald-200':kpis.avgCollection>=60?'bg-amber-50 border-amber-200':'bg-rose-50 border-rose-200', icon: Percent },
    ].map((k,i) => (
     <div key={i} className={`${k.bg} border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex items-start justify-between mb-2">
       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{k.l}</p>
       <k.icon size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-0.5"/>
      </div>
      <p className={`text-lg font-extrabold ${k.c} tabular-nums`}>{k.v}</p>
      <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
     </div>
    ))}
   </div>
   {}
   {kpis.totalBilled > 0 && (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
     <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Portfolio Collection Health</span>
      <span className={`text-xs font-extrabold px-2 py-1 rounded-full ${kpis.avgCollection>=80?'bg-emerald-100 text-emerald-700':kpis.avgCollection>=60?'bg-amber-100 text-amber-700':'bg-rose-100 text-rose-700'}`}>
       {formatCurrency(kpis.totalReceived)} of {formatCurrency(kpis.totalBilled)} collected
      </span>
     </div>
     <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
      <div
       className={`h-full rounded-full transition-all duration-1000 ${kpis.avgCollection>=80?'bg-gradient-to-r from-emerald-400 to-emerald-500':kpis.avgCollection>=60?'bg-gradient-to-r from-amber-400 to-amber-500':'bg-gradient-to-r from-rose-500 to-rose-400'}`}
       style={{width:`${Math.min(100,(kpis.totalBilled>0?kpis.totalReceived/kpis.totalBilled*100:0))}%`}}
      />
     </div>
     <div className="flex justify-between text-xs text-slate-400 mt-1.5">
      <span>{formatCurrency(kpis.totalReceived)} received</span>
      <span className="text-rose-500 font-medium">{formatCurrency(kpis.totalOutstanding)} outstanding</span>
     </div>
    </div>
   )}
  </div>
   {}
   <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
    <div className="flex flex-wrap gap-2 items-center">
     <div className="relative">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
      <input
       className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none w-52 transition-all"
       placeholder="Search clients..."
       value={search}
       onChange={e => setSearch(e.target.value)}
      />
     </div>
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      {['All','Ongoing','Retainer','Completed'].map(s => (
       <button key={s} onClick={() => setStatusFilter(s)}
        className={`px-3 py-2 text-xs font-bold transition-all ${statusFilter===s ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-violet-600'}`}>
        {s}
       </button>
      ))}
     </div>
     <button onClick={() => setOutstandingOnly(v=>!v)}
      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${outstandingOnly ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-slate-200 text-slate-500 hover:border-rose-400 hover:text-rose-600'}`}>
      {outstandingOnly ? '✓ ' : ''}Outstanding Only
     </button>
     <select value={sortBy} onChange={e => setSortBy(e.target.value)}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="outstanding">Sort: Outstanding ↓</option>
      <option value="billed">Sort: Most Billed</option>
      <option value="overdue">Sort: Overdue First</option>
      <option value="name">Sort: Name A–Z</option>
      <option value="date">Sort: Newest</option>
     </select>
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setViewMode('cards')} title="Card View"
       className={`px-3 py-2 transition-all ${viewMode==='cards' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
       <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1.5"/><rect x="9" y="0" width="7" height="7" rx="1.5"/><rect x="0" y="9" width="7" height="7" rx="1.5"/><rect x="9" y="9" width="7" height="7" rx="1.5"/></svg>
      </button>
      <button onClick={() => setViewMode('table')} title="Table View"
       className={`px-3 py-2 transition-all ${viewMode==='table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
       <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="16" height="3" rx="1"/><rect x="0" y="5" width="16" height="3" rx="1"/><rect x="0" y="10" width="16" height="3" rx="1"/></svg>
      </button>
     </div>
    </div>
    <button onClick={onNewClient}
     className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-violet-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex-shrink-0">
     <Plus size={16}/> New Client
    </button>
   </div>
   {(search || statusFilter !== 'All' || outstandingOnly) && (
    <p className="text-sm text-slate-500 font-medium -mt-2">
     Showing <span className="font-bold text-violet-600">{filtered.length}</span> of {enriched.length} clients
    </p>
   )}
   {}
   {filtered.length === 0 && (
    <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-100 text-center">
     <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
      <Briefcase className="text-slate-300" size={36}/>
     </div>
     <h3 className="text-lg font-bold text-slate-700 mb-2">
      {search || statusFilter !== 'All' || outstandingOnly ? 'No clients match your filters' : 'No clients yet'}
     </h3>
     <p className="text-sm text-slate-400 mb-6">
      {search || statusFilter !== 'All' || outstandingOnly ? 'Try adjusting your filters.' : 'Add your first client to start tracking projects and payments.'}
     </p>
     {!search && statusFilter === 'All' && !outstandingOnly && (
      <button onClick={onNewClient} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors">
       + Add First Client
      </button>
     )}
    </div>
   )}
   {}
   {viewMode === 'cards' && filtered.length > 0 && (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
     {filtered.map(client => {
      const collPct = Math.min(100, client.collectionRate);
      const statusColor = statusColors[client.status||'Ongoing'] || statusColors.Ongoing;
      const initials = (client.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const isOverdue = client.overdueCount > 0;
      const isCompleted = (client.status||'Ongoing') === 'Completed';
      return (
       <div key={client.id}
        className={`bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col ${isOverdue ? 'border-rose-200 shadow-rose-100/30' : isCompleted ? 'border-emerald-200' : 'border-slate-200'}`}>
        {}
        <div className={`p-5 border-b ${isOverdue ? 'bg-rose-50/40 border-rose-100' : isCompleted ? 'bg-emerald-50/40 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
         <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
           <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-md ${isCompleted ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-100' : 'bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-violet-100'}`}>
            {initials}
           </div>
           <div className="min-w-0">
            <p className="font-extrabold text-slate-900 truncate">{client.name}</p>
            {client.projectName && <p className="text-xs text-slate-400 truncate mt-0.5">{client.projectName}</p>}
            {client.phone && (
             <a href={`tel:${client.phone}`} className="text-xs text-violet-500 hover:text-violet-700 font-medium truncate mt-0.5 block">{client.phone}</a>
            )}
           </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
           <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor}`}>{client.status||'Ongoing'}</span>
           {isOverdue && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">⚠ {client.overdueCount} overdue</span>}
          </div>
         </div>
        </div>
        {}
        <div className="p-5 space-y-3 flex-1">
         <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-xl p-3">
           <p className="text-xs text-slate-400 font-bold uppercase leading-tight mb-1">Billed</p>
           <p className="text-sm font-extrabold text-slate-800 tabular-nums">{formatCurrency(client.totalBilled)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
           <p className="text-xs text-emerald-600 font-bold uppercase leading-tight mb-1">Received</p>
           <p className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatCurrency(client.totalReceived)}</p>
          </div>
          <div className={`rounded-xl p-3 ${client.outstanding > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
           <p className={`text-xs font-bold uppercase leading-tight mb-1 ${client.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Balance</p>
           <p className={`text-sm font-extrabold tabular-nums ${client.outstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {client.outstanding > 0 ? formatCurrency(client.outstanding) : '✓ Clear'}
           </p>
          </div>
         </div>
         {client.totalBilled > 0 && (
          <div>
           <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-400 font-medium">Collection Rate</span>
            <span className={`text-xs font-extrabold ${collPct >= 80 ? 'text-emerald-600' : collPct >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{collPct}%</span>
           </div>
           <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
             className={`h-full rounded-full transition-all duration-700 ${collPct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : collPct >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}
             style={{width:`${collPct}%`}}
            />
           </div>
          </div>
         )}
         <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-1">
          <span>{client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''} · {client.paidCount} paid</span>
          {client.retainerAmount > 0 && (
           <span className="bg-violet-50 text-violet-600 font-bold px-2 py-0.5 rounded-full">Retainer {formatCurrency(client.retainerAmount)}/mo</span>
          )}
         </div>
        </div>
        {}
        <div className="px-4 pb-4 flex gap-2 border-t border-slate-100 pt-3">
         <button onClick={() => onViewProfile(client)}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md">
          <Briefcase size={14}/> View Profile
         </button>
         <div className="flex gap-1">
          {client.phone && client.outstanding > 0 && (
           <button onClick={() => sendWhatsApp(client)} title="Send WhatsApp Reminder"
            className="p-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-xl transition-colors">
            <WaIcon/>
           </button>
          )}
          {client.email && (
           <a href={`mailto:${client.email}?subject=Payment Reminder — ${client.projectName||client.name}&body=Dear ${client.name},%0A%0AThis is a gentle reminder regarding your outstanding balance.%0A%0AThank you!`}
            title="Send Email"
            className="p-2 bg-sky-50 text-sky-500 hover:bg-sky-100 rounded-xl transition-colors flex items-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
           </a>
          )}
          {currentUser?.role === 'Admin' && (
           <button onClick={() => onEdit(client)} title="Edit"
            className="p-2 bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-700 rounded-xl transition-colors">
            <Edit size={14}/>
           </button>
          )}
          {currentUser?.role === 'Admin' && (
           <button onClick={() => onDelete(client.id)} title="Delete"
            className="p-2 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-colors">
            <Trash2 size={14}/>
           </button>
          )}
         </div>
        </div>
       </div>
      );
     })}
    </div>
   )}
   {}
   {viewMode === 'table' && filtered.length > 0 && (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
     <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[900px]">
       <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
         {['Client / Project','Status','Contact','Invoices','Billed','Received','Outstanding','Rate',''].map((h,i) => (
          <th key={i} className={`px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${i >= 4 && i <= 6 ? 'text-right' : ''}`}>{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
        {filtered.map(client => {
         const collPct = Math.min(100, client.collectionRate);
         const isOverdue = client.overdueCount > 0;
         return (
          <tr key={client.id} className={`hover:bg-slate-50/80 transition-colors group ${isOverdue ? 'bg-rose-50/20' : ''}`}>
           <td className="px-5 py-4">
            <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0">
              {(client.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
             </div>
             <div>
              <p className="font-bold text-slate-800 text-sm">{client.name}</p>
              {client.projectName && <p className="text-xs text-slate-400">{client.projectName}</p>}
             </div>
            </div>
           </td>
           <td className="px-5 py-4">
            <div className="flex flex-col gap-1">
             <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${statusColors[client.status||'Ongoing']||statusColors.Ongoing}`}>{client.status||'Ongoing'}</span>
             {isOverdue && <span className="text-xs font-bold text-rose-600">⚠ {client.overdueCount} overdue</span>}
            </div>
           </td>
           <td className="px-5 py-4">
            <div className="text-xs text-slate-500 space-y-0.5">
             {client.phone && <div><a href={`tel:${client.phone}`} className="text-violet-500 hover:underline">{client.phone}</a></div>}
             {client.email && <div className="truncate max-w-[130px]">{client.email}</div>}
             {!client.phone && !client.email && <span className="text-slate-300">—</span>}
            </div>
           </td>
           <td className="px-5 py-4 text-sm text-slate-500">
            {client.invoiceCount} total · {client.paidCount} paid
           </td>
           <td className="px-5 py-4 text-right font-bold text-slate-800 tabular-nums">{formatCurrency(client.totalBilled)}</td>
           <td className="px-5 py-4 text-right font-bold text-emerald-600 tabular-nums">{formatCurrency(client.totalReceived)}</td>
           <td className="px-5 py-4 text-right font-bold tabular-nums">
            {client.outstanding > 0
             ? <span className="text-rose-600">{formatCurrency(client.outstanding)}</span>
             : <span className="text-emerald-500 text-xs">✓ Clear</span>}
           </td>
           <td className="px-5 py-4">
            {client.totalBilled > 0 && (
             <div className="flex items-center gap-2">
              <div className="w-14 h-2 bg-slate-100 rounded-full overflow-hidden">
               <div className={`h-full rounded-full ${collPct >= 80 ? 'bg-emerald-500' : collPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{width:`${collPct}%`}}/>
              </div>
              <span className={`text-xs font-bold ${collPct >= 80 ? 'text-emerald-600' : collPct >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{collPct}%</span>
             </div>
            )}
           </td>
           <td className="px-5 py-4">
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={() => onViewProfile(client)}
              className="text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
              Profile →
             </button>
             {currentUser?.role === 'Admin' && (
              <button onClick={() => onEdit(client)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"><Edit size={13}/></button>
             )}
             {currentUser?.role === 'Admin' && (
              <button onClick={() => onDelete(client.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={13}/></button>
             )}
            </div>
           </td>
          </tr>
         );
        })}
       </tbody>
       <tfoot className="bg-gradient-to-r from-slate-50 to-slate-100 border-t-2 border-slate-200">
        <tr>
         <td colSpan={4} className="px-5 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">TOTALS ({filtered.length} clients)</td>
         <td className="px-5 py-4 text-right font-extrabold text-slate-900 tabular-nums">{formatCurrency(filtered.reduce((a,c)=>a+c.totalBilled,0))}</td>
         <td className="px-5 py-4 text-right font-extrabold text-emerald-700 tabular-nums">{formatCurrency(filtered.reduce((a,c)=>a+c.totalReceived,0))}</td>
         <td className="px-5 py-4 text-right font-extrabold text-rose-700 tabular-nums">{formatCurrency(filtered.reduce((a,c)=>a+c.outstanding,0))}</td>
         <td colSpan={2}/>
        </tr>
       </tfoot>
      </table>
     </div>
    </div>
   )}
  </div>
 );
};
const ClientProfile = ({ client, invoices, bankRecords, pettyCash, onBack, onCreateInvoice, onRecordPayment }) => {
 const [activeTab, setActiveTab] = useState('overview');
 const [invFilter, setInvFilter] = useState('All');
 const today = new Date(); today.setHours(0,0,0,0);
 const clientInvoices = useMemo(() => invoices.filter(inv =>
  (inv.client || '').toLowerCase().trim() === (client.name || '').toLowerCase().trim()
 ), [invoices, client]);
 const payments = useMemo(() => {
  const target = (client.name || '').toLowerCase().trim();
  const fromBank = bankRecords.filter(r =>
   (r.description || '').toLowerCase().includes(target) && Number(r.amount) > 0 &&
   !(r.description || '').toLowerCase().startsWith('inv payment:')
  ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Number(r.amount), method: 'Bank Transfer', icon: '🏦' }));
  const fromInvBank = bankRecords.filter(r =>
   (r.description || '').toLowerCase().startsWith('inv payment:') &&
   (r.description || '').toLowerCase().includes(target) && Number(r.amount) > 0
  ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Number(r.amount), method: 'Bank (Invoice)', icon: '🏦' }));
  const fromCash = pettyCash.filter(r =>
   (r.description || '').toLowerCase().includes(target) && Number(r.cashIn) > 0 &&
   !(r.description || '').toLowerCase().startsWith('inv payment:')
  ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Number(r.cashIn), method: 'Cash Receipt', icon: '💵' }));
  const fromCashInv = pettyCash.filter(r =>
   (r.description || '').toLowerCase().startsWith('inv payment:') &&
   (r.description || '').toLowerCase().includes(target) && Number(r.cashIn) > 0
  ).map(r => ({ id: r.id, date: r.date, ref: r.description, amount: Number(r.cashIn), method: 'Cash (Invoice)', icon: '💵' }));
  const all = [...fromBank, ...fromInvBank, ...fromCash, ...fromCashInv];
  const seen = new Set();
  return all.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
   .sort((a, b) => new Date(b.date) - new Date(a.date));
 }, [bankRecords, pettyCash, client]);
 const invoiceSummary = useMemo(() => clientInvoices.map(inv => {
  const subtotal = (inv.items || []).reduce((s, it) => s + ((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)), 0);
  const total = calculateTax(subtotal, inv.taxRate).total;
  const received = Number(inv.amountReceived) || 0;
  const isOverdue = inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < today;
  const outstanding = inv.status === 'Paid' ? 0 : total - received;
  const statusLabel = inv.status === 'Paid' ? 'Paid' : isOverdue ? 'Overdue' : received > 0 ? 'Partial' : (inv.status || 'Unpaid');
  return { ...inv, total, received, outstanding, isOverdue, statusLabel };
 }).sort((a,b) => new Date(b.date) - new Date(a.date)), [clientInvoices]);
 const filteredInvoices = useMemo(() => {
  if (invFilter === 'All') return invoiceSummary;
  return invoiceSummary.filter(i => i.statusLabel === invFilter);
 }, [invoiceSummary, invFilter]);
 const totalBilled = invoiceSummary.reduce((a, i) => a + i.total, 0);
 const totalReceived = invoiceSummary.reduce((a,i) => a + i.received, 0);
 const totalOutstanding = invoiceSummary.reduce((a, i) => a + i.outstanding, 0);
 const advance = Number(client.advanceReceived) || 0;
 const overdueCount = invoiceSummary.filter(i => i.isOverdue).length;
 const collectionRate = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;
 const collPct = Math.min(100, collectionRate);
 const unpaidInvoices = invoiceSummary.filter(i => i.status !== 'Paid');
 const timeline = useMemo(() => {
  const invEvents = invoiceSummary.map(i => ({
   date: i.date, type: 'invoice',
   label: `Invoice ${i.invoiceNumber || '(no number)'}`,
   detail: `${i.statusLabel} · ${formatCurrency(i.total)}`,
   color: i.status==='Paid' ? 'bg-emerald-500' : i.isOverdue ? 'bg-rose-500' : 'bg-violet-500',
  }));
  const payEvents = payments.map(p => ({
   date: p.date, type: 'payment',
   label: 'Payment Received',
   detail: `${formatCurrency(p.amount)} via ${p.method}`,
   color: 'bg-emerald-500',
  }));
  if (advance > 0) payEvents.push({ date: client.date || '', type: 'advance', label: 'Opening Advance', detail: formatCurrency(advance), color: 'bg-sky-500' });
  return [...invEvents, ...payEvents].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
 }, [invoiceSummary, payments, advance, client]);
 const statusBadge = { Paid:'bg-emerald-100 text-emerald-700', Overdue:'bg-rose-100 text-rose-700', Partial:'bg-sky-100 text-sky-700', Draft:'bg-slate-100 text-slate-600', Unpaid:'bg-amber-100 text-amber-700' };
 const sendWhatsAppReminder = () => {
  const phone = (client.phone||'').replace(/[^0-9]/g,'');
  if (!phone) { window._toast?.('No phone number saved for this client.', 'error'); return; }
  const overdueList = invoiceSummary.filter(i => i.isOverdue)
   .map(i => `  • Invoice ${i.invoiceNumber || ''} — ${formatCurrency(i.outstanding)} (Due: ${i.dueDate})`).join('\n');
  const body = overdueList
   ? `Dear ${client.name},\n\nThis is a friendly reminder that the following invoice(s) are overdue:\n\n${overdueList}\n\nTotal Outstanding: ${formatCurrency(totalOutstanding)}\n\nKindly arrange payment at your earliest convenience.\n\nThank you!`
   : `Dear ${client.name},\n\nJust a gentle reminder that you have an outstanding balance of ${formatCurrency(totalOutstanding)} with us.\n\nPlease get in touch at your earliest convenience.\n\nThank you!`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank');
 };
 
 return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
   {}
   <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-violet-600 font-bold text-sm transition-colors group">
    <ArrowDownLeft className="rotate-90 group-hover:-translate-x-0.5 transition-transform" size={16}/> Back to Clients
   </button>
   {}
   <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none"/>
    <div className="absolute bottom-0 left-0 w-56 h-56 bg-fuchsia-500/8 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4 pointer-events-none"/>
    <div className="relative z-10 space-y-6">
     {}
     <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
      <div className="flex items-start gap-4">
       <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-violet-900/40 flex-shrink-0">
        {(client.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
       </div>
       <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">{client.name}</h2>
        {client.projectName && <p className="text-slate-400 text-sm">📁 {client.projectName}</p>}
        <div className="flex flex-wrap gap-2">
         <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${client.status==='Completed' ? 'bg-emerald-500/20 text-emerald-300' : client.status==='Retainer' ? 'bg-violet-500/20 text-violet-300' : 'bg-amber-500/20 text-amber-300'}`}>
          {client.status||'Ongoing'}
         </span>
         {overdueCount > 0 && <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-300">⚠ {overdueCount} Overdue</span>}
         {advance > 0 && <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-sky-500/20 text-sky-300">Advance: {formatCurrency(advance)}</span>}
         {client.retainerAmount > 0 && <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-violet-500/20 text-violet-300">Retainer: {formatCurrency(client.retainerAmount)}/mo</span>}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
         {client.phone && <a href={`tel:${client.phone}`} className="hover:text-violet-300 transition-colors">📞 {client.phone}</a>}
         {client.email && <a href={`mailto:${client.email}`} className="hover:text-violet-300 transition-colors">✉ {client.email}</a>}
         {client.address && <span>📍 {client.address}</span>}
        </div>
       </div>
      </div>
      {}
      <div className="flex flex-wrap gap-2 flex-shrink-0">
       {onCreateInvoice && (
        <button onClick={() => onCreateInvoice(client)}
         className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-900/30 hover:scale-105 active:scale-95">
         <Plus size={14}/>New Invoice
        </button>
       )}
       {onRecordPayment && unpaidInvoices.length > 0 && (
        <button onClick={() => onRecordPayment(unpaidInvoices[0])}
         className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/30 hover:scale-105 active:scale-95">
         <DollarSign size={14}/>Record Payment
        </button>
       )}
       {totalOutstanding > 0 && (
        <button onClick={sendWhatsAppReminder}
         className="flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] px-4 py-2.5 rounded-xl font-bold text-sm transition-all border border-[#25D366]/30 hover:scale-105 active:scale-95">
         <WaIcon/>Send Reminder
        </button>
       )}
       {client.email && (
        <a href={`mailto:${client.email}`}
         className="flex items-center gap-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border border-sky-500/30 hover:scale-105 active:scale-95">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
         Email
        </a>
       )}
       <button onClick={() => printDocument('client-profile-statement-printable', `Profile — ${client.name}`)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all border border-white/10 hover:scale-105 active:scale-95">
        <Printer size={14}/>Print
       </button>
      </div>
     </div>
     {}
     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
       { l:'Total Billed', v:formatCurrency(totalBilled), sub:`${invoiceSummary.length} invoices`, c:'text-white' },
       { l:'Collected', v:formatCurrency(totalReceived), sub:`${collPct}% collection rate`, c:'text-emerald-400' },
       { l:'Outstanding', v:formatCurrency(totalOutstanding), sub:totalOutstanding>0?`${unpaidInvoices.length} unpaid invoices`:'Fully cleared', c:totalOutstanding>0?'text-rose-400':'text-emerald-400' },
       { l:'Contract Value', v:formatCurrency(client.projectTotal||0), sub:client.projectName||'Agreed value', c:'text-slate-300' },
      ].map((s,i) => (
       <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.l}</p>
        <p className={`text-xl font-extrabold ${s.c} tabular-nums`}>{s.v}</p>
        <p className="text-xs text-slate-500 mt-1 leading-tight">{s.sub}</p>
       </div>
      ))}
     </div>
     {}
     {totalBilled > 0 && (
      <div>
       <div className="flex justify-between text-xs text-slate-400 mb-2 font-bold uppercase tracking-widest">
        <span>Collection Progress</span>
        <span className={collPct>=80?'text-emerald-400':collPct>=50?'text-amber-400':'text-rose-400'}>{collPct}%</span>
       </div>
       <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${collPct>=80?'bg-gradient-to-r from-emerald-500 to-emerald-400':collPct>=50?'bg-gradient-to-r from-amber-500 to-amber-400':'bg-gradient-to-r from-rose-600 to-rose-400'}`} style={{width:`${collPct}%`}}/>
       </div>
       <div className="flex justify-between text-xs text-slate-500 mt-1.5">
        <span>{formatCurrency(totalReceived)} received</span>
        <span>{formatCurrency(totalOutstanding)} remaining</span>
       </div>
      </div>
     )}
    </div>
   </div>
   {}
   <div className={`rounded-2xl border-2 overflow-hidden ${totalOutstanding>0?'border-rose-200':'border-emerald-200'}`}>
    <div className={`px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${totalOutstanding>0?'bg-rose-50':'bg-emerald-50'}`}>
     <div>
      <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${totalOutstanding>0?'text-rose-500':'text-emerald-500'}`}>
       {totalOutstanding > 0 ? '⚠ Balance Due from Client' : '✓ Account Fully Settled'}
      </p>
      <p className={`text-4xl font-extrabold tabular-nums ${totalOutstanding>0?'text-rose-800':'text-emerald-800'}`}>{formatCurrency(totalOutstanding)}</p>
      {totalOutstanding > 0 && overdueCount > 0 && (
       <p className="text-rose-600 text-sm mt-1 font-medium">{overdueCount} invoice{overdueCount>1?'s':''} past due — follow up needed</p>
      )}
      {totalOutstanding === 0 && totalBilled > 0 && (
       <p className="text-emerald-600 text-sm mt-1 font-medium">All payments collected — great work!</p>
      )}
     </div>
     <div className="flex gap-5 flex-wrap">
      {[
       { l:'Total Invoiced', v:totalBilled },
       { l:'Total Received', v:totalReceived, green:true },
       { l:'Balance Due', v:totalOutstanding, red:totalOutstanding>0 },
      ].map((x,i) => (
       <div key={i} className="text-center">
        <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">{x.l}</p>
        <p className={`text-xl font-extrabold tabular-nums ${x.green?'text-emerald-700':x.red?'text-rose-700':'text-slate-800'}`}>{formatCurrency(x.v)}</p>
       </div>
      ))}
     </div>
    </div>
    {totalOutstanding > 0 && unpaidInvoices.length > 0 && (
     <div className="bg-white px-6 py-3 border-t border-rose-100">
      <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Outstanding per Invoice</p>
      <div className="flex flex-wrap gap-2">
       {unpaidInvoices.slice(0,8).map(inv => (
        <div key={inv.id} className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border ${inv.isOverdue?'bg-rose-50 border-rose-200 text-rose-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>
         <span>{inv.invoiceNumber||inv.id||'Inv'}</span>
         <span className="opacity-40">·</span>
         <span>{formatCurrency(inv.outstanding||inv._balance||0)}</span>
         {inv.isOverdue && <span className="bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded-full text-[10px]">Overdue</span>}
        </div>
       ))}
       {unpaidInvoices.length > 8 && <span className="text-xs text-slate-400 self-center font-medium">+{unpaidInvoices.length-8} more</span>}
      </div>
     </div>
    )}
   </div>
   {}
   <div className="flex gap-1 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm flex-wrap">
    {[
     ['overview','Overview'],
     ['invoices',`Invoices (${invoiceSummary.length})`],
     ['payments',`Payments (${payments.length})`],
     ['timeline','Activity'],
     ['statement','Statement'],
     ['notes','Info & Notes'],
    ].map(([id,label]) => (
     <button key={id} onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab===id?'bg-violet-600 text-white shadow-sm':'text-slate-500 hover:text-violet-600'}`}>
      {label}
     </button>
    ))}
   </div>
   {}
   {activeTab === 'overview' && (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
     {}
     {/* Balance Progress Card */}
     <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
       <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
        <div className="w-2 h-5 bg-violet-500 rounded-full"/>
        Balance Summary
       </h3>
       <div className="flex gap-4 text-center">
        {[{l:'Total Billed',v:totalBilled,c:'text-slate-800'},{l:'Collected',v:totalReceived,c:'text-emerald-700'},{l:'Balance Due',v:totalOutstanding,c:totalOutstanding>0?'text-rose-700':'text-emerald-700'}].map((s,i)=>(
         <div key={i}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">{s.l}</p>
          <p className={`text-xl font-extrabold tabular-nums ${s.c}`}>{formatCurrency(s.v)}</p>
         </div>
        ))}
       </div>
      </div>
      {totalBilled > 0 && (
       <div>
        <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
         <span>Collection Progress</span>
         <span>{collectionRate}% collected</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
         <div
          className={`h-full rounded-full transition-all duration-700 ${collectionRate>=100?'bg-emerald-500':collectionRate>=60?'bg-violet-500':collectionRate>=30?'bg-amber-400':'bg-rose-500'}`}
          style={{width:`${Math.min(100,collectionRate)}%`}}
         />
        </div>
        {totalOutstanding > 0 && (
         <div className="mt-3 flex flex-wrap gap-2">
          {unpaidInvoices.slice(0,6).map(inv=>(
           <div key={inv.id} className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border ${inv.isOverdue?'bg-rose-50 border-rose-200 text-rose-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <span className="font-mono">{inv.invoiceNumber||'—'}</span>
            <span className="opacity-40">·</span>
            <span>{formatCurrency(inv.outstanding)}</span>
            {inv.isOverdue&&<span className="bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded-full text-[10px]">Overdue</span>}
            {inv.received>0&&!inv.isOverdue&&<span className="bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px]">Partial</span>}
           </div>
          ))}
          {unpaidInvoices.length>6&&<span className="text-xs text-slate-400 self-center">+{unpaidInvoices.length-6} more</span>}
         </div>
        )}
       </div>
      )}
     </div>
     {}
     <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center">
       <h3 className="font-extrabold text-slate-800">Unpaid Invoices</h3>
       <button onClick={() => setActiveTab('invoices')} className="text-xs font-bold text-violet-600 hover:text-violet-800">View All →</button>
      </div>
      {unpaidInvoices.length === 0 ? (
       <div className="p-8 text-center">
        <CheckCircle className="mx-auto mb-2 text-emerald-400" size={32}/>
        <p className="text-emerald-700 font-bold text-sm">All invoices paid — great work!</p>
       </div>
      ) : (
       <div className="divide-y divide-slate-50">
        {unpaidInvoices.slice(0, 5).map(inv => (
         <div key={inv.id} className={`p-4 flex items-center justify-between gap-3 ${inv.isOverdue?'bg-rose-50/30':''}`}>
          <div className="min-w-0">
           <p className="font-bold text-slate-800 text-sm">{inv.isOverdue && '⚠ '}{inv.invoiceNumber || 'No #'}</p>
           <p className="text-xs text-slate-400 mt-0.5">
            {inv.isOverdue ? <span className="text-rose-600 font-bold">Overdue since {inv.dueDate}</span> : `Due: ${inv.dueDate || 'Not set'}`}
           </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
           <div className="text-right">
            <p className="font-extrabold text-rose-600 text-sm tabular-nums">{formatCurrency(inv.outstanding)}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBadge[inv.statusLabel]||'bg-slate-100 text-slate-600'}`}>{inv.statusLabel}</span>
           </div>
           {onRecordPayment && (
            <button onClick={() => onRecordPayment(inv)}
             className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm" title="Record Payment">
             <DollarSign size={13}/>
            </button>
           )}
          </div>
         </div>
        ))}
        {unpaidInvoices.length > 5 && (
         <div className="p-3 text-center text-xs text-slate-400 font-medium">
          +{unpaidInvoices.length - 5} more ·{' '}
          <button onClick={() => setActiveTab('invoices')} className="text-violet-600 font-bold hover:underline">View all</button>
         </div>
        )}
       </div>
      )}
     </div>
     {}
     <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center">
       <h3 className="font-extrabold text-slate-800">Recent Payments</h3>
       <button onClick={() => setActiveTab('payments')} className="text-xs font-bold text-violet-600 hover:text-violet-800">View All →</button>
      </div>
      {payments.length === 0 && advance === 0 ? (
       <div className="p-8 text-center text-slate-400 text-sm font-medium flex-1 flex items-center justify-center">No payments recorded yet.</div>
      ) : (
       <div className="divide-y divide-slate-50 flex-1">
        {advance > 0 && (
         <div className="p-4 flex items-center justify-between">
          <div>
           <p className="font-bold text-slate-700 text-sm">Opening Advance</p>
           <p className="text-xs text-slate-400">{client.date}</p>
          </div>
          <span className="font-extrabold text-sky-600 tabular-nums">{formatCurrency(advance)}</span>
         </div>
        )}
        {payments.slice(0, 5).map((p,i) => (
         <div key={i} className="p-4 flex items-center justify-between">
          <div className="min-w-0">
           <p className="font-bold text-slate-700 text-sm truncate">{p.ref}</p>
           <p className="text-xs text-slate-400">{p.date} · {p.icon} {p.method}</p>
          </div>
          <span className="font-extrabold text-emerald-600 flex-shrink-0 ml-3 tabular-nums">{formatCurrency(p.amount)}</span>
         </div>
        ))}
       </div>
      )}
      <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex justify-between items-center">
       <span className="text-sm font-bold text-emerald-800">Total Received</span>
       <span className="font-extrabold text-emerald-700 tabular-nums">{formatCurrency(totalReceived)}</span>
      </div>
     </div>
    </div>
   )}
   {}
   {activeTab === 'overview' && totalOutstanding > 0 && (() => {
    const aging = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
    const todayMs = today.getTime();
    invoiceSummary.filter(i => i.outstanding > 0).forEach(inv => {
     if (!inv.dueDate) { aging.current += inv.outstanding; return; }
     const days = Math.floor((todayMs - new Date(inv.dueDate).getTime()) / 86400000);
     if (days <= 0)       aging.current  += inv.outstanding;
     else if (days <= 30) aging.d1_30    += inv.outstanding;
     else if (days <= 60) aging.d31_60   += inv.outstanding;
     else if (days <= 90) aging.d61_90   += inv.outstanding;
     else                 aging.d90plus  += inv.outstanding;
    });
    const buckets = [
     { label: 'Current',     amount: aging.current,  color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
     { label: '1–30 Days',   amount: aging.d1_30,    color: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
     { label: '31–60 Days',  amount: aging.d31_60,   color: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50'  },
     { label: '61–90 Days',  amount: aging.d61_90,   color: 'bg-rose-500',    text: 'text-rose-700',    bg: 'bg-rose-50'    },
     { label: '90+ Days',    amount: aging.d90plus,  color: 'bg-rose-800',    text: 'text-rose-900',    bg: 'bg-rose-100'   },
    ].filter(b => b.amount > 0);
    return (
     <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mt-2">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
       <div className="w-2 h-5 bg-rose-400 rounded-full"/>
       Invoice Aging — Outstanding {formatCurrency(totalOutstanding)}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
       {buckets.map(b => (
        <div key={b.label} className={`${b.bg} rounded-2xl p-4 text-center border border-slate-100`}>
         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{b.label}</p>
         <p className={`text-lg font-extrabold tabular-nums ${b.text}`}>{formatCurrency(b.amount)}</p>
         <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div className={`h-full ${b.color} rounded-full`} style={{width:`${totalOutstanding>0?((b.amount/totalOutstanding)*100).toFixed(0):0}%`}}/>
         </div>
        </div>
       ))}
      </div>
     </div>
    );
   })()}
   {}
   {activeTab === 'invoices' && (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
     <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-extrabold text-slate-800 text-lg">All Invoices — {client.name}</h3>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
       {['All','Paid','Unpaid','Overdue','Partial'].map(f => (
        <button key={f} onClick={() => setInvFilter(f)}
         className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${invFilter===f?'bg-white text-violet-700 shadow-sm':'text-slate-500 hover:text-violet-600'}`}>
         {f}
        </button>
       ))}
      </div>
     </div>
     {filteredInvoices.length === 0 ? (
      <div className="p-12 text-center">
       <FileText className="mx-auto mb-3 text-slate-300" size={40}/>
       <p className="text-slate-400 font-medium">{invFilter==='All'?'No invoices yet for this client.':`No ${invFilter.toLowerCase()} invoices.`}</p>
       {onCreateInvoice && invFilter==='All' && (
        <button onClick={() => onCreateInvoice(client)} className="mt-4 bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors">
         + Create First Invoice
        </button>
       )}
      </div>
     ) : (
      <div className="overflow-x-auto">
       <table className="w-full text-left min-w-[760px]">
        <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
         <tr>
          <th className="px-5 py-4">Inv #</th><th className="px-5 py-4">Issued</th><th className="px-5 py-4">Due Date</th>
          <th className="px-5 py-4 text-right">Amount</th><th className="px-5 py-4 text-right">Received</th><th className="px-5 py-4 text-right">Balance</th>
          <th className="px-5 py-4 text-center">Status</th><th className="px-5 py-4 text-center">Action</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
         {filteredInvoices.map(inv => (
          <tr key={inv.id} className={`hover:bg-slate-50/50 transition-colors ${inv.isOverdue?'bg-rose-50/20':''}`}>
           <td className="px-5 py-4 font-mono text-violet-600 font-bold text-sm">{inv.invoiceNumber||'—'}</td>
           <td className="px-5 py-4 text-sm text-slate-500">{inv.date}</td>
           <td className="px-5 py-4 text-sm">{inv.dueDate?<span className={inv.isOverdue?'text-rose-600 font-bold':'text-slate-500'}>{inv.isOverdue?'⚠ ':''}{inv.dueDate}</span>:<span className="text-slate-300">Not set</span>}</td>
           <td className="px-5 py-4 text-right font-bold text-slate-800 tabular-nums">{formatCurrency(inv.total)}</td>
           <td className="px-5 py-4 text-right tabular-nums">
            {inv.received>0
             ? <div className="inline-flex flex-col items-end">
                <span className="font-bold text-emerald-600">{formatCurrency(inv.received)}</span>
                {inv.outstanding>0&&<span className="text-[10px] text-slate-400 font-medium">{Math.round((inv.received/inv.total)*100)}% of total</span>}
               </div>
             : <span className="text-slate-300">—</span>}
           </td>
           <td className="px-5 py-4 text-right tabular-nums">
            {inv.outstanding>0
             ? <div className="inline-flex flex-col items-end">
                <span className="font-extrabold text-rose-600">{formatCurrency(inv.outstanding)}</span>
                {inv.received>0&&<span className="text-[10px] text-amber-500 font-bold">Partial</span>}
               </div>
             : <span className="text-emerald-600 font-bold text-sm">✓ Cleared</span>}
           </td>
           <td className="px-5 py-4 text-center"><span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusBadge[inv.statusLabel]||'bg-slate-100 text-slate-600'}`}>{inv.statusLabel}</span></td>
           <td className="px-5 py-4 text-center">{inv.status!=='Paid'&&onRecordPayment&&<button onClick={()=>onRecordPayment(inv)} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap">Pay Now</button>}</td>
          </tr>
         ))}
        </tbody>
        <tfoot className="bg-gradient-to-r from-slate-50 to-slate-100 border-t-2 border-slate-200">
         <tr>
          <td colSpan={3} className="px-5 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">TOTALS ({filteredInvoices.length})</td>
          <td className="px-5 py-4 text-right font-extrabold text-slate-900 tabular-nums">{formatCurrency(filteredInvoices.reduce((a,i)=>a+i.total,0))}</td>
          <td className="px-5 py-4 text-right font-extrabold text-emerald-700 tabular-nums">{formatCurrency(filteredInvoices.reduce((a,i)=>a+i.received,0))}</td>
          <td className="px-5 py-4 text-right font-extrabold text-rose-700 tabular-nums">{formatCurrency(filteredInvoices.reduce((a,i)=>a+i.outstanding,0))}</td>
          <td colSpan={2}/>
         </tr>
        </tfoot>
       </table>
      </div>
     )}
    </div>
   )}
   {}
   {activeTab === 'payments' && (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
     <div className="p-5 border-b border-slate-100 flex justify-between items-center">
      <h3 className="font-extrabold text-slate-800 text-lg">Payment History</h3>
      <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl tabular-nums">Total: {formatCurrency(payments.reduce((a,p)=>a+p.amount,0)+advance)}</span>
     </div>
     {payments.length===0&&advance===0 ? (
      <div className="p-12 text-center">
       <DollarSign className="mx-auto mb-3 text-slate-300" size={40}/>
       <p className="text-slate-400 font-medium">No payments recorded yet.</p>
      </div>
     ) : (
      <table className="w-full text-left">
       <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
        <tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Reference / Description</th><th className="px-5 py-4">Method</th><th className="px-5 py-4 text-right">Amount</th></tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
        {advance > 0 && (
         <tr className="bg-sky-50/30">
          <td className="px-5 py-4 text-sm text-slate-500">{client.date||'—'}</td>
          <td className="px-5 py-4 text-sm font-medium text-slate-700">Opening Advance (from Client Record)</td>
          <td className="px-5 py-4"><span className="text-xs font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-full">Advance</span></td>
          <td className="px-5 py-4 text-right font-extrabold text-sky-600 tabular-nums">{formatCurrency(advance)}</td>
         </tr>
        )}
        {payments.map((p,i) => (
         <tr key={i} className="hover:bg-slate-50/50 transition-colors">
          <td className="px-5 py-4 text-sm text-slate-500">{p.date}</td>
          <td className="px-5 py-4 text-sm font-medium text-slate-700 max-w-xs truncate">{p.ref}</td>
          <td className="px-5 py-4"><span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">{p.icon} {p.method}</span></td>
          <td className="px-5 py-4 text-right font-extrabold text-emerald-600 tabular-nums">{formatCurrency(p.amount)}</td>
         </tr>
        ))}
       </tbody>
       <tfoot className="bg-emerald-50 border-t-2 border-emerald-200">
        <tr>
         <td colSpan={3} className="px-5 py-4 font-extrabold text-emerald-800 text-sm uppercase tracking-wide">Grand Total Received</td>
         <td className="px-5 py-4 text-right font-extrabold text-emerald-800 text-lg tabular-nums">{formatCurrency(payments.reduce((a,p)=>a+p.amount,0)+advance)}</td>
        </tr>
       </tfoot>
      </table>
     )}
    </div>
   )}
   {}
   {activeTab === 'timeline' && (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
     <h3 className="font-extrabold text-slate-800 text-lg mb-6">Activity Timeline</h3>
     {timeline.length === 0 ? (
      <div className="text-center py-8 text-slate-400 font-medium">No activity recorded yet.</div>
     ) : (
      <div className="relative">
       <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100"/>
       <div className="space-y-4">
        {timeline.map((t,i) => (
         <div key={i} className="flex gap-4 relative">
          <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center flex-shrink-0 shadow-sm z-10`}>
           {t.type==='payment'||t.type==='advance' ? <ArrowDownLeft size={15} className="text-white"/> : <FileText size={15} className="text-white"/>}
          </div>
          <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
           <div className="flex justify-between items-start gap-2">
            <p className="font-bold text-slate-800 text-sm">{t.label}</p>
            <span className="text-xs text-slate-400 flex-shrink-0">{t.date}</span>
           </div>
           <p className="text-xs text-slate-500 mt-1">{t.detail}</p>
          </div>
         </div>
        ))}
       </div>
      </div>
     )}
    </div>
   )}
   {}
   {activeTab === 'statement' && (() => {
    const ledgerRows = [];
    invoiceSummary.forEach(inv => {
     ledgerRows.push({ date: inv.date, type: 'invoice', ref: `Invoice ${inv.invoiceNumber||'#'}`, description: `Services rendered${inv.items?.length>0?' — '+inv.items[0].desc:''}`, debit: inv.total, credit: 0, color: 'text-slate-800' });
     if (inv.received > 0) {
      ledgerRows.push({ date: inv.date, type: 'payment', ref: `Payment on ${inv.invoiceNumber||'#'}`, description: 'Payment received', debit: 0, credit: inv.received, color: 'text-emerald-700' });
     }
    });
    payments.forEach(p => {
     if (!p.method.toLowerCase().includes('invoice')) {
      ledgerRows.push({ date: p.date, type: 'payment', ref: p.ref, description: `${p.method} payment received`, debit: 0, credit: p.amount, color: 'text-emerald-700' });
     }
    });
    if (advance > 0) {
     ledgerRows.push({ date: client.date||'', type: 'advance', ref: 'Opening Advance', description: 'Advance payment from client', debit: 0, credit: advance, color: 'text-sky-700' });
    }
    ledgerRows.sort((a,b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    const ledger = ledgerRows.map(r => {
     runningBalance += r.debit - r.credit;
     return { ...r, balance: runningBalance };
    });
    return (
     <div id="client-profile-statement-printable" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200">
       <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
         <h3 className="font-extrabold text-slate-800 text-xl">Account Statement</h3>
         <p className="text-slate-500 text-sm mt-1">Client: <span className="font-bold text-slate-800">{client.name}</span></p>
         {client.projectName && <p className="text-slate-400 text-sm">Project: {client.projectName}</p>}
        </div>
        <div className="text-right">
         <p className="text-xs text-slate-400 font-medium">Generated on</p>
         <p className="font-bold text-slate-700">{new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'})}</p>
         <div className={`mt-2 px-3 py-1.5 rounded-xl inline-block text-sm font-extrabold ${totalOutstanding>0?'bg-rose-100 text-rose-700':'bg-emerald-100 text-emerald-700'}`}>
          Balance Due: {formatCurrency(totalOutstanding)}
         </div>
        </div>
       </div>
      </div>
      {}
      <div className="overflow-x-auto">
       <table className="w-full text-left min-w-[700px]">
        <thead className="bg-slate-50 border-b border-slate-200">
         <tr>
          <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
          <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Reference</th>
          <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
          <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Charge (Dr)</th>
          <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Payment (Cr)</th>
          <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Balance</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
         {ledger.length === 0 ? (
          <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-medium">No transactions recorded yet.</td></tr>
         ) : ledger.map((row, i) => (
          <tr key={i} className={`hover:bg-slate-50/50 transition-colors ${row.type==='advance'?'bg-sky-50/20':row.type==='payment'?'bg-emerald-50/20':''}`}>
           <td className="px-5 py-3 text-sm text-slate-500 whitespace-nowrap">{row.date}</td>
           <td className="px-5 py-3 text-sm font-mono text-violet-600 font-bold">{row.ref}</td>
           <td className="px-5 py-3 text-sm text-slate-600 max-w-[200px] truncate">{row.description}</td>
           <td className="px-5 py-3 text-right text-sm font-bold text-slate-800 tabular-nums">{row.debit > 0 ? formatCurrency(row.debit) : <span className="text-slate-300">—</span>}</td>
           <td className="px-5 py-3 text-right text-sm font-bold text-emerald-600 tabular-nums">{row.credit > 0 ? formatCurrency(row.credit) : <span className="text-slate-300">—</span>}</td>
           <td className={`px-5 py-3 text-right text-sm font-extrabold tabular-nums ${row.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatCurrency(Math.abs(row.balance))}{row.balance > 0 ? ' Dr' : row.balance < 0 ? ' Cr' : ''}</td>
          </tr>
         ))}
        </tbody>
        <tfoot className={`border-t-2 ${totalOutstanding>0?'bg-rose-50 border-rose-200':'bg-emerald-50 border-emerald-200'}`}>
         <tr>
          <td colSpan={3} className={`px-5 py-4 font-extrabold text-sm uppercase tracking-wide ${totalOutstanding>0?'text-rose-800':'text-emerald-800'}`}>
           {totalOutstanding > 0 ? '⚠ Balance Due from Client' : '✓ Account Cleared'}
          </td>
          <td className="px-5 py-4 text-right font-extrabold text-slate-900 tabular-nums">{formatCurrency(totalBilled)}</td>
          <td className="px-5 py-4 text-right font-extrabold text-emerald-700 tabular-nums">{formatCurrency(totalReceived)}</td>
          <td className={`px-5 py-4 text-right font-extrabold text-lg tabular-nums ${totalOutstanding>0?'text-rose-800':'text-emerald-800'}`}>{formatCurrency(totalOutstanding)}</td>
         </tr>
        </tfoot>
       </table>
      </div>
      <div className="p-4 flex justify-center gap-3 border-t border-slate-100">
       <button onClick={() => printDocument('client-profile-statement-printable', `Statement — ${client.name}`)}
        className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
        <Printer size={14}/> Print
       </button>
       <button onClick={() => downloadElementAsPDF('client-profile-statement-printable', `Statement_${client.name}.pdf`)}
        className="bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors flex items-center gap-2">
        <Download size={14}/> Download PDF
       </button>
      </div>
     </div>
    );
   })()}
   {}
   {activeTab === 'notes' && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
     <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-5">
       <h3 className="font-extrabold text-slate-800 text-lg">Client Information</h3>
       <button
        onClick={() => {
         const text = [
          `Client: ${client.name}`,
          client.projectName && `Project: ${client.projectName}`,
          client.phone && `Phone: ${client.phone}`,
          client.email && `Email: ${client.email}`,
          client.address && `Address: ${client.address}`,
         ].filter(Boolean).join('\n');
         navigator.clipboard?.writeText(text);
        }}
        className="text-xs font-bold text-slate-400 hover:text-violet-600 bg-slate-50 hover:bg-violet-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
        title="Copy contact details">
        <Copy size={12}/> Copy
       </button>
      </div>
      <div className="space-y-0">
       {[
        { l:'Client / Company', v:client.name },
        { l:'Project Name', v:client.projectName||'—' },
        { l:'Status', v:client.status||'Ongoing' },
        { l:'Phone', v:client.phone||'—', link:client.phone?`tel:${client.phone}`:null },
        { l:'Email', v:client.email||'—', link:client.email?`mailto:${client.email}`:null },
        { l:'Address', v:client.address||'—' },
        { l:'Date Added', v:client.date||'—' },
        { l:'Added By', v:client.addedBy||'—' },
       ].map((row,i) => (
        <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{row.l}</span>
         {row.link
          ? <a href={row.link} className="text-sm font-bold text-violet-600 hover:underline text-right max-w-[60%] truncate">{row.v}</a>
          : <span className="text-sm font-bold text-slate-700 text-right max-w-[60%] truncate">{row.v}</span>}
        </div>
       ))}
      </div>
     </div>
     <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-extrabold text-slate-800 text-lg mb-5">Financial Summary</h3>
      <div className="space-y-0">
       {[
        { l:'Contract Value', v:formatCurrency(client.projectTotal||0), c:'text-slate-800' },
        { l:'Opening Advance', v:formatCurrency(advance), c:'text-sky-600' },
        { l:'Retainer/mo', v:client.retainerAmount>0?formatCurrency(client.retainerAmount):'None', c:'text-violet-600' },
        { l:'Total Invoiced', v:formatCurrency(totalBilled), c:'text-slate-800' },
        { l:'Total Received', v:formatCurrency(totalReceived), c:'text-emerald-600' },
        { l:'Outstanding', v:formatCurrency(totalOutstanding), c:totalOutstanding>0?'text-rose-600':'text-emerald-600' },
        { l:'Collection Rate', v:`${collPct}%`, c:collPct>=80?'text-emerald-600':collPct>=50?'text-amber-600':'text-rose-600' },
        { l:'Invoices (Paid/Total)', v:`${invoiceSummary.filter(i=>i.status==='Paid').length} / ${invoiceSummary.length}`, c:'text-slate-600' },
       ].map((row,i) => (
        <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{row.l}</span>
         <span className={`text-sm font-extrabold ${row.c} tabular-nums`}>{row.v}</span>
        </div>
       ))}
      </div>
     </div>
     {client.notes ? (
      <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-3xl p-6">
       <h4 className="font-bold text-amber-800 mb-3">📝 Notes</h4>
       <p className="text-amber-900 text-sm leading-relaxed whitespace-pre-line">{client.notes}</p>
      </div>
     ) : (
      <div className="md:col-span-2 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400">
       <p className="text-sm font-medium">No notes added for this client yet.</p>
       <p className="text-xs mt-1">Edit the client record to add internal notes.</p>
      </div>
     )}
    </div>
   )}
  </div>
 );
};
const VendorsPage = ({ vendors, vendorBills, currentUser, onNewVendor, onEdit, onDelete, onViewProfile }) => {
 const [search,      setSearch]      = useState('');
 const [typeFilter,  setTypeFilter]  = useState('All');
 const [sortBy,      setSortBy]      = useState('outstanding-desc');
 const [viewMode,    setViewMode]    = useState('cards');
 const enriched = useMemo(() => vendors.map(v => {
  const vBills    = vendorBills.filter(b => (b.vendor||'').toLowerCase().trim() === (v.name||'').toLowerCase().trim());
  const totalBills = vBills.reduce((a, b) => a + (Number(b.amount)||0), 0);
  const totalPaid  = vBills.reduce((a, b) => a + (Number(b.paidAmount)||0), 0);
  const outstanding = Math.max(0, totalBills - totalPaid);
  const billCount  = vBills.length;
  const paidBills  = vBills.filter(b => (Number(b.amount) - Number(b.paidAmount)) <= 0).length;
  const hasPending = outstanding > 0;
  const payRate    = totalBills > 0 ? (totalPaid / totalBills) * 100 : 0;
  return { ...v, totalBills, totalPaid, outstanding, billCount, paidBills, hasPending, payRate };
 }), [vendors, vendorBills]);
 const kpis = useMemo(() => {
  const totalPayable   = enriched.reduce((a, v) => a + v.outstanding, 0);
  const totalPaid      = enriched.reduce((a, v) => a + v.totalPaid, 0);
  const totalBills     = enriched.reduce((a, v) => a + v.totalBills, 0);
  const pendingVendors = enriched.filter(v => v.hasPending).length;
  const activeVendors  = enriched.filter(v => v.billCount > 0).length;
  return { totalPayable, totalPaid, totalBills, pendingVendors, activeVendors, count: vendors.length };
 }, [enriched, vendors]);
 const serviceBreakdown = useMemo(() => {
  const map = {};
  enriched.forEach(v => {
   const t = v.serviceType || 'Other';
   if (!map[t]) map[t] = { count: 0, outstanding: 0, totalBills: 0 };
   map[t].count++;
   map[t].outstanding += v.outstanding;
   map[t].totalBills  += v.totalBills;
  });
  return Object.entries(map).sort((a, b) => b[1].outstanding - a[1].outstanding);
 }, [enriched]);
 const serviceTypes = useMemo(() => [...new Set(enriched.map(v => v.serviceType).filter(Boolean))].sort(), [enriched]);
 const filtered = useMemo(() => {
  let res = [...enriched];
  if (search)            res = res.filter(v => (v.name||'').toLowerCase().includes(search.toLowerCase()) || (v.serviceType||'').toLowerCase().includes(search.toLowerCase()) || (v.contact||'').toLowerCase().includes(search.toLowerCase()));
  if (typeFilter !== 'All') res = res.filter(v => (v.serviceType||'Other') === typeFilter);
  if (sortBy === 'outstanding-desc') res = [...res].sort((a, b) => b.outstanding - a.outstanding);
  if (sortBy === 'outstanding-asc')  res = [...res].sort((a, b) => a.outstanding - b.outstanding);
  if (sortBy === 'name')             res = [...res].sort((a, b) => (a.name||'').localeCompare(b.name||''));
  if (sortBy === 'bills-desc')       res = [...res].sort((a, b) => b.billCount - a.billCount);
  if (sortBy === 'total-desc')       res = [...res].sort((a, b) => b.totalBills - a.totalBills);
  return res;
 }, [enriched, search, typeFilter, sortBy]);
 const VEN_COLORS = ['#6366f1','#f59e0b','#10b981','#f43f5e','#06b6d4','#8b5cf6'];
 return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
   {}
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {[
     { l:'Total Vendors',   v: kpis.count,                    sub:'registered',        c:'text-slate-800',  bg:'bg-white border-slate-200',      icon: Truck },
     { l:'Active Vendors',  v: kpis.activeVendors,            sub:'with bills',        c:'text-violet-700', bg:'bg-violet-50 border-violet-200',  icon: Building2 },
     { l:'Total Billed',    v: formatCurrency(kpis.totalBills),sub:'all time',         c:'text-slate-700',  bg:'bg-white border-slate-200',       icon: FileText },
     { l:'Total Paid Out',  v: formatCurrency(kpis.totalPaid), sub:'payments made',    c:'text-emerald-700',bg:'bg-emerald-50 border-emerald-200', icon: CheckCircle },
     { l:'Outstanding',     v: formatCurrency(kpis.totalPayable), sub:'amount owed',   c: kpis.totalPayable>0?'text-rose-700':'text-emerald-700', bg: kpis.totalPayable>0?'bg-rose-50 border-rose-200':'bg-emerald-50 border-emerald-200', icon: ArrowUpRight },
     { l:'Pending',         v: kpis.pendingVendors,            sub:'vendors with dues', c: kpis.pendingVendors>0?'text-amber-700':'text-emerald-700', bg: kpis.pendingVendors>0?'bg-amber-50 border-amber-200':'bg-emerald-50 border-emerald-200', icon: Clock },
    ].map((k, i) => (
     <div key={i} className={`${k.bg} border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex justify-between items-start mb-2">
       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{k.l}</p>
       <k.icon size={13} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 mt-0.5"/>
      </div>
      <p className={`text-lg font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
      <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
     </div>
    ))}
   </div>
   {}
   {serviceBreakdown.length > 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
     <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
      <div className="w-2 h-5 bg-violet-500 rounded-full"/>
      Outstanding by Service Type
     </h3>
     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {serviceBreakdown.slice(0, 6).map(([type, data], i) => (
       <button key={i} onClick={() => setTypeFilter(typeFilter === type ? 'All' : type)}
        className={`rounded-2xl p-4 border-2 text-left transition-all hover:shadow-md ${typeFilter===type?'border-violet-400 bg-violet-50':'border-slate-100 bg-slate-50 hover:border-violet-200'}`}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">{type}</p>
        <p className="text-base font-extrabold" style={{color: VEN_COLORS[i % VEN_COLORS.length]}}>{data.count} vendor{data.count!==1?'s':''}</p>
        {data.outstanding > 0 && <p className="text-xs font-bold text-rose-500 mt-0.5">{formatCurrency(data.outstanding)} due</p>}
       </button>
      ))}
     </div>
    </div>
   )}
   {}
   <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
    <div className="flex flex-wrap gap-2 items-center">
     <div className="relative">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
      <input className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none w-48 transition-all"
       placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)}/>
     </div>
     {serviceTypes.length > 0 && (
      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
       className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Types</option>
       {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
     )}
     <select value={sortBy} onChange={e => setSortBy(e.target.value)}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="outstanding-desc">Highest Outstanding</option>
      <option value="outstanding-asc">Lowest Outstanding</option>
      <option value="total-desc">Highest Billed</option>
      <option value="bills-desc">Most Bills</option>
      <option value="name">Name A–Z</option>
     </select>
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setViewMode('cards')} title="Cards"
       className={`px-3 py-2 transition-all ${viewMode==='cards'?'bg-slate-800 text-white':'text-slate-400 hover:text-slate-600'}`}>
       <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1.5"/><rect x="9" y="0" width="7" height="7" rx="1.5"/><rect x="0" y="9" width="7" height="7" rx="1.5"/><rect x="9" y="9" width="7" height="7" rx="1.5"/></svg>
      </button>
      <button onClick={() => setViewMode('table')} title="Table"
       className={`px-3 py-2 transition-all ${viewMode==='table'?'bg-slate-800 text-white':'text-slate-400 hover:text-slate-600'}`}>
       <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="16" height="3" rx="1"/><rect x="0" y="5" width="16" height="3" rx="1"/><rect x="0" y="10" width="16" height="3" rx="1"/></svg>
      </button>
     </div>
    </div>
    <div className="flex gap-2 flex-shrink-0">
     <button onClick={() => exportToCSV(vendors, 'Vendors_Export')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm"><Download size={15}/> Export</button>
     <button onClick={onNewVendor}
      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-violet-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
      <Plus size={16}/> Add Vendor
     </button>
    </div>
   </div>
   {(search || typeFilter !== 'All') && (
    <p className="text-sm text-slate-500 font-medium -mt-2">
     Showing <span className="font-bold text-violet-600">{filtered.length}</span> of {vendors.length} vendors
     {filtered.length > 0 && kpis.totalPayable > 0 && <> · Outstanding: <span className="font-bold text-rose-600">{formatCurrency(filtered.reduce((a,v)=>a+v.outstanding,0))}</span></>}
    </p>
   )}
   {}
   {filtered.length === 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
     <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Truck className="text-violet-300" size={32}/>
     </div>
     <h3 className="text-lg font-bold text-slate-700 mb-2">{vendors.length===0?'No vendors yet':'No vendors match your search'}</h3>
     <p className="text-sm text-slate-400 mb-6">{vendors.length===0?'Add your first supplier or service vendor.':'Try clearing your filters.'}</p>
     {vendors.length===0 && <button onClick={onNewVendor} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors">+ Add First Vendor</button>}
    </div>
   )}
   {}
   {viewMode === 'cards' && filtered.length > 0 && (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
     {filtered.map(v => (
      <div key={v.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group ${v.hasPending?'border-slate-200':'border-emerald-200'}`}>
       <div className={`h-1 w-full ${v.hasPending?'bg-gradient-to-r from-violet-500 to-rose-500':'bg-emerald-400'}`}/>
       <div className="p-5">
        <div className="flex justify-between items-start mb-3">
         <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
           <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${v.hasPending?'bg-rose-100':'bg-emerald-100'}`}>
            <Truck size={14} className={v.hasPending?'text-rose-600':'text-emerald-600'}/>
           </div>
           <p className="font-extrabold text-slate-900 truncate">{v.name}</p>
          </div>
          {v.serviceType && <p className="text-xs text-slate-400 font-medium ml-10">{v.serviceType}</p>}
          {v.contact && <p className="text-xs text-violet-500 font-medium ml-10 mt-0.5">{v.contact}</p>}
         </div>
         {v.hasPending
          ? <span className="text-xs font-extrabold px-2 py-1 bg-rose-50 text-rose-600 rounded-lg flex-shrink-0 ml-2">DUE</span>
          : <span className="text-xs font-extrabold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg flex-shrink-0 ml-2">CLEAR</span>}
        </div>
        {}
        {v.totalBills > 0 && (
         <div className="mb-3">
          <div className="flex justify-between text-xs font-bold mb-1">
           <span className="text-slate-400">Paid {v.payRate.toFixed(0)}%</span>
           <span className={v.hasPending?'text-rose-600':'text-emerald-600'}>{formatCurrency(v.outstanding)} {v.hasPending?'due':'settled'}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
           <div className={`h-full rounded-full transition-all duration-500 ${v.hasPending?'bg-gradient-to-r from-violet-500 to-rose-400':'bg-emerald-400'}`}
            style={{width:`${Math.min(100, v.payRate).toFixed(1)}%`}}/>
          </div>
         </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 rounded-xl p-2">
         <div><p className="text-xs text-slate-400 font-medium">Bills</p><p className="font-extrabold text-slate-700 text-sm">{v.billCount}</p></div>
         <div><p className="text-xs text-slate-400 font-medium">Paid</p><p className="font-extrabold text-emerald-700 text-sm">{formatCurrency(v.totalPaid)}</p></div>
         <div><p className="text-xs text-slate-400 font-medium">Total</p><p className="font-extrabold text-slate-700 text-sm">{formatCurrency(v.totalBills)}</p></div>
        </div>
       </div>
       <div className="px-4 pb-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onViewProfile(v)}
         className="flex-1 py-2 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors flex items-center justify-center gap-1">
         <FileText size={11}/> View Profile
        </button>
        {currentUser?.role === 'Admin' && <>
         <button onClick={() => onEdit(v)} className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-violet-600 bg-slate-50 hover:bg-violet-50 rounded-xl transition-colors"><Edit size={12}/></button>
         <button onClick={() => onDelete(v.id)} className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={12}/></button>
        </>}
       </div>
      </div>
     ))}
    </div>
   )}
   {}
   {viewMode === 'table' && filtered.length > 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
     <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[800px]">
       <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
         {['Vendor','Service Type','Contact','Bills','Total Billed','Paid','Outstanding',''].map((h,i) => (
          <th key={i} className={`px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${['Total Billed','Paid','Outstanding'].includes(h)?'text-right':''}`}>{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
        {filtered.map(v => (
         <tr key={v.id} className={`hover:bg-slate-50/80 transition-colors group ${v.hasPending&&v.outstanding>0?'bg-rose-50/20':''}`}>
          <td className="px-5 py-4">
           <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${v.hasPending?'bg-rose-100':'bg-emerald-100'}`}>
             <Truck size={12} className={v.hasPending?'text-rose-600':'text-emerald-600'}/>
            </div>
            <p className="font-bold text-slate-800 text-sm">{v.name}</p>
           </div>
          </td>
          <td className="px-5 py-4">
           {v.serviceType
            ? <span className="text-xs font-bold px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg">{v.serviceType}</span>
            : <span className="text-slate-300 text-sm">—</span>}
          </td>
          <td className="px-5 py-4 text-sm text-slate-500 font-medium">{v.contact || '—'}</td>
          <td className="px-5 py-4 text-sm text-slate-600 font-bold">{v.billCount}</td>
          <td className="px-5 py-4 text-right font-bold text-slate-700 tabular-nums">{formatCurrency(v.totalBills)}</td>
          <td className="px-5 py-4 text-right font-bold text-emerald-600 tabular-nums">{formatCurrency(v.totalPaid)}</td>
          <td className="px-5 py-4 text-right">
           <span className={`font-extrabold tabular-nums ${v.hasPending?'text-rose-600':'text-emerald-600'}`}>{formatCurrency(v.outstanding)}</span>
           {v.totalBills > 0 && (
            <div className="mt-1 h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden ml-auto">
             <div className={`h-full rounded-full ${v.hasPending?'bg-rose-400':'bg-emerald-400'}`} style={{width:`${Math.min(100,v.payRate).toFixed(0)}%`}}/>
            </div>
           )}
          </td>
          <td className="px-5 py-4">
           <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onViewProfile(v)} className="p-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-lg transition-colors" title="View Profile"><FileText size={12}/></button>
            {currentUser?.role === 'Admin' && <>
             <button onClick={() => onEdit(v)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"><Edit size={12}/></button>
             <button onClick={() => onDelete(v.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={12}/></button>
            </>}
           </div>
          </td>
         </tr>
        ))}
       </tbody>
       <tfoot className="bg-gradient-to-r from-slate-50 to-violet-50/30 border-t-2 border-slate-200">
        <tr>
         <td colSpan={4} className="px-5 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">TOTALS — {filtered.length} vendors</td>
         <td className="px-5 py-4 text-right font-extrabold text-slate-800 tabular-nums">{formatCurrency(filtered.reduce((a,v)=>a+v.totalBills,0))}</td>
         <td className="px-5 py-4 text-right font-extrabold text-emerald-600 tabular-nums">{formatCurrency(filtered.reduce((a,v)=>a+v.totalPaid,0))}</td>
         <td className="px-5 py-4 text-right font-extrabold text-rose-600 tabular-nums">{formatCurrency(filtered.reduce((a,v)=>a+v.outstanding,0))}</td>
         <td/>
        </tr>
       </tfoot>
      </table>
     </div>
    </div>
   )}
  </div>
 );
};
const VendorBillsPage = ({ vendorBills, vendors, currentUser, onNewBill, onEdit, onDelete, onPayBill }) => {
 const [search,       setSearch]       = useState('');
 const [statusFilter, setStatusFilter] = useState('All');
 const [vendorFilter, setVendorFilter] = useState('All');
 const [monthFilter,  setMonthFilter]  = useState('All');
 const [sortBy,       setSortBy]       = useState('date-desc');
 const today = new Date(); today.setHours(0,0,0,0);
 const enriched = useMemo(() => vendorBills.map(b => {
  const gross   = (Number(b.billAmount)||Number(b.amount)||0) + (Number(b.taxDeduction)||0);
  const net     = Number(b.amount) || 0;
  const wht     = Number(b.taxDeduction) || 0;
  const paid    = Number(b.paidAmount) || 0;
  const due     = Math.max(0, net - paid);
  const isPaid  = b.status === 'Paid' || due <= 0;
  const dueDate = b.dueDate ? new Date(b.dueDate) : null;
  const isOverdue = !isPaid && dueDate && dueDate < today;
  const daysOverdue = isOverdue ? Math.floor((today - dueDate) / 86400000) : 0;
  const monthNum  = b.date ? b.date.slice(0,7) : '';
  const monthName = (() => { try { return new Date(b.date).toLocaleString('default', { month: 'long', year: 'numeric' }); } catch { return b.date; } })();
  const payPct    = net > 0 ? Math.min(100, (paid / net) * 100) : 0;
  const statusLabel = isPaid ? 'Paid' : isOverdue ? 'Overdue' : paid > 0 ? 'Partial' : 'Pending';
  return { ...b, gross, net, wht, paid, due, isPaid, isOverdue, daysOverdue, monthNum, monthName, payPct, statusLabel };
 }), [vendorBills]);
 const kpis = useMemo(() => {
  const totalGross    = enriched.reduce((a, b) => a + b.gross, 0);
  const totalNet      = enriched.reduce((a, b) => a + b.net, 0);
  const totalWHT      = enriched.reduce((a, b) => a + b.wht, 0);
  const totalPaid     = enriched.reduce((a, b) => a + b.paid, 0);
  const totalDue      = enriched.reduce((a, b) => a + b.due, 0);
  const overdueAmt    = enriched.filter(b => b.isOverdue).reduce((a, b) => a + b.due, 0);
  const overdueCount  = enriched.filter(b => b.isOverdue).length;
  const pendingCount  = enriched.filter(b => !b.isPaid).length;
  const curMonth      = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const thisMonthDue  = enriched.filter(b => b.monthNum === curMonth && !b.isPaid).reduce((a, b) => a + b.due, 0);
  return { totalGross, totalNet, totalWHT, totalPaid, totalDue, overdueAmt, overdueCount, pendingCount, thisMonthDue, count: enriched.length };
 }, [enriched]);
 const monthlyChart = useMemo(() => {
  const now = new Date();
  return Array.from({length: 6}, (_, i) => {
   const d   = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
   const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
   const lbl = d.toLocaleString('default', { month: 'short' });
   const billed = enriched.filter(b => b.monthNum === key).reduce((a, b) => a + b.net, 0);
   const paid   = enriched.filter(b => b.monthNum === key && b.isPaid).reduce((a, b) => a + b.net, 0);
   return { name: lbl, Billed: billed, Paid: paid };
  });
 }, [enriched]);
 const vendorBreakdown = useMemo(() => {
  const map = {};
  enriched.filter(b => !b.isPaid).forEach(b => {
   const v = b.vendor || 'Unknown';
   map[v] = (map[v] || 0) + b.due;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
 }, [enriched]);
 const uniqueVendors = useMemo(() => [...new Set(enriched.map(b => b.vendor).filter(Boolean))].sort(), [enriched]);
 const uniqueMonths  = useMemo(() => [...new Set(enriched.map(b => b.monthName).filter(Boolean))].reverse(), [enriched]);
 const filtered = useMemo(() => {
  let res = [...enriched];
  if (search)             res = res.filter(b => (b.vendor||'').toLowerCase().includes(search.toLowerCase()) || (b.billNumber||'').toLowerCase().includes(search.toLowerCase()) || (b.description||'').toLowerCase().includes(search.toLowerCase()));
  if (statusFilter !== 'All') res = res.filter(b => b.statusLabel === statusFilter);
  if (vendorFilter !== 'All') res = res.filter(b => b.vendor === vendorFilter);
  if (monthFilter  !== 'All') res = res.filter(b => b.monthName === monthFilter);
  if (sortBy === 'date-desc')    res = [...res].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sortBy === 'date-asc')     res = [...res].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sortBy === 'amount-desc')  res = [...res].sort((a, b) => b.net - a.net);
  if (sortBy === 'due-desc')     res = [...res].sort((a, b) => b.due - a.due);
  if (sortBy === 'overdue')      res = [...res].sort((a, b) => b.daysOverdue - a.daysOverdue);
  return res;
 }, [enriched, search, statusFilter, vendorFilter, monthFilter, sortBy]);
 const statusBadge = {
  Paid:    'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Partial: 'bg-blue-100 text-blue-700',
  Overdue: 'bg-rose-100 text-rose-700',
 };
 const VB_COLORS = ['#6366f1','#f59e0b','#10b981','#f43f5e','#06b6d4','#8b5cf6'];
 return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
   {}
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {[
     { l:'Total Bills',    v: kpis.count,                      sub:`${kpis.pendingCount} pending`,  c:'text-slate-800',  bg:'bg-white border-slate-200',      icon: FileText },
     { l:'Gross Billed',   v: formatCurrency(kpis.totalGross),  sub:'before WHT',                   c:'text-slate-700',  bg:'bg-white border-slate-200',       icon: Briefcase },
     { l:'WHT Deducted',   v: formatCurrency(kpis.totalWHT),    sub:'tax withheld',                 c:'text-amber-700',  bg:'bg-amber-50 border-amber-200',    icon: Percent },
     { l:'Net Payable',    v: formatCurrency(kpis.totalNet),    sub:'after WHT',                    c:'text-slate-700',  bg:'bg-white border-slate-200',       icon: DollarSign },
     { l:'Total Paid',     v: formatCurrency(kpis.totalPaid),   sub:'settled',                      c:'text-emerald-700',bg:'bg-emerald-50 border-emerald-200', icon: CheckCircle },
     { l:'Outstanding',    v: formatCurrency(kpis.totalDue),    sub:`${kpis.overdueCount} overdue`,c: kpis.totalDue>0?'text-rose-700':'text-emerald-700', bg: kpis.totalDue>0?'bg-rose-50 border-rose-200':'bg-emerald-50 border-emerald-200', icon: ArrowUpRight },
    ].map((k, i) => (
     <div key={i} className={`${k.bg} border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex justify-between items-start mb-2">
       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{k.l}</p>
       <k.icon size={13} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 mt-0.5"/>
      </div>
      <p className={`text-lg font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
      <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
     </div>
    ))}
   </div>
   {}
   {enriched.length > 0 && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
     <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
       <div className="w-2 h-5 bg-violet-500 rounded-full"/>
       Bills vs Payments (6 Months)
      </h3>
      <ResponsiveContainer width="100%" height={180}>
       <BarChart data={monthlyChart} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fontWeight:700,fill:'#94a3b8'}}/>
        <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
        <ChartTooltip formatter={v=>formatCurrency(v)} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',padding:'10px 14px'}}/>
        <Bar dataKey="Billed" fill="#a78bfa" radius={[5,5,0,0]}/>
        <Bar dataKey="Paid"   fill="#34d399" radius={[5,5,0,0]}/>
       </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2">
       <span className="flex items-center gap-1.5 text-xs font-bold text-violet-500"><span className="w-3 h-3 bg-violet-400 rounded-sm inline-block"/>Billed</span>
       <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="w-3 h-3 bg-emerald-400 rounded-sm inline-block"/>Paid</span>
      </div>
     </div>
     <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
       <div className="w-2 h-5 bg-rose-500 rounded-full"/>
       Top Unpaid Balances
      </h3>
      {vendorBreakdown.length > 0 ? (
       <div className="space-y-3">
        {vendorBreakdown.map(([name, amt], i) => {
         const pct = kpis.totalDue > 0 ? (amt / kpis.totalDue) * 100 : 0;
         return (
          <div key={i}>
           <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{name}</span>
            <span className="text-xs font-extrabold tabular-nums" style={{color: VB_COLORS[i % VB_COLORS.length]}}>{formatCurrency(amt)}</span>
           </div>
           <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{width:`${pct.toFixed(1)}%`, backgroundColor: VB_COLORS[i % VB_COLORS.length]}}/>
           </div>
          </div>
         );
        })}
       </div>
      ) : (
       <div className="flex flex-col items-center justify-center h-32 text-center">
        <CheckCircle className="text-emerald-400 mb-2" size={32}/>
        <p className="text-sm font-bold text-emerald-600">All bills settled!</p>
       </div>
      )}
     </div>
    </div>
   )}
   {}
   <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
    <div className="flex flex-wrap gap-2 items-center">
     <div className="relative">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
      <input className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none w-48 transition-all"
       placeholder="Search bills..." value={search} onChange={e => setSearch(e.target.value)}/>
     </div>
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      {['All','Pending','Partial','Overdue','Paid'].map(s => (
       <button key={s} onClick={() => setStatusFilter(s)}
        className={`px-2.5 py-2 text-xs font-bold transition-all ${statusFilter===s?'bg-violet-600 text-white':'text-slate-500 hover:text-violet-600'}`}>{s}</button>
      ))}
     </div>
     {uniqueVendors.length > 1 && (
      <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
       className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Vendors</option>
       {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
     )}
     {uniqueMonths.length > 1 && (
      <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
       className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Months</option>
       {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
     )}
     <select value={sortBy} onChange={e => setSortBy(e.target.value)}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="date-desc">Newest First</option>
      <option value="date-asc">Oldest First</option>
      <option value="amount-desc">Highest Amount</option>
      <option value="due-desc">Highest Due</option>
      <option value="overdue">Most Overdue</option>
     </select>
    </div>
    <div className="flex gap-2 flex-shrink-0">
     <button onClick={() => exportToCSV(vendorBills, 'VendorBills_Export')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm"><Download size={15}/> Export</button>
     <button onClick={onNewBill}
      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-violet-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
      <Plus size={16}/> New Bill
     </button>
    </div>
   </div>
   {(search || statusFilter !== 'All' || vendorFilter !== 'All' || monthFilter !== 'All') && (
    <p className="text-sm text-slate-500 font-medium -mt-2">
     Showing <span className="font-bold text-violet-600">{filtered.length}</span> of {enriched.length} bills
     {filtered.length > 0 && <> · Net: <span className="font-bold text-slate-700">{formatCurrency(filtered.reduce((a,b)=>a+b.net,0))}</span> · Due: <span className="font-bold text-rose-600">{formatCurrency(filtered.reduce((a,b)=>a+b.due,0))}</span></>}
    </p>
   )}
   {}
   {filtered.length === 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
     <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <FileText className="text-violet-300" size={32}/>
     </div>
     <h3 className="text-lg font-bold text-slate-700 mb-2">{vendorBills.length===0?'No vendor bills yet':'No bills match your filters'}</h3>
     <p className="text-sm text-slate-400 mb-6">{vendorBills.length===0?'Record bills from your suppliers and track payment status.':'Try clearing your filters.'}</p>
     {vendorBills.length===0 && <button onClick={onNewBill} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors">+ Add First Bill</button>}
    </div>
   )}
   {}
   {filtered.length > 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
     <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[900px]">
       <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
         {['Bill #','Vendor','Date','Description','Gross','WHT','Net Payable','Paid','Balance','Status',''].map((h,i) => (
          <th key={i} className={`px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${['Gross','WHT','Net Payable','Paid','Balance'].includes(h)?'text-right':''}`}>{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
        {filtered.map(b => (
         <tr key={b.id} className={`hover:bg-slate-50/80 transition-colors group ${b.isOverdue?'bg-rose-50/30':''}`}>
          <td className="px-4 py-3.5">
           <p className="font-mono font-bold text-violet-600 text-sm">{b.billNumber||'—'}</p>
           {b.isOverdue && <p className="text-xs font-bold text-rose-500 mt-0.5">⚠ {b.daysOverdue}d overdue</p>}
          </td>
          <td className="px-4 py-3.5">
           <p className="font-bold text-slate-800 text-sm">{b.vendor||'—'}</p>
          </td>
          <td className="px-4 py-3.5 text-sm text-slate-500 font-medium">{b.date}</td>
          <td className="px-4 py-3.5">
           <p className="text-sm text-slate-600 font-medium max-w-[140px] truncate">{b.description||'—'}</p>
          </td>
          <td className="px-4 py-3.5 text-right font-medium text-slate-500 tabular-nums">{formatCurrency(b.gross)}</td>
          <td className="px-4 py-3.5 text-right">
           {b.wht > 0
            ? <span className="font-bold text-amber-600 tabular-nums">-{formatCurrency(b.wht)}</span>
            : <span className="text-slate-200">—</span>}
          </td>
          <td className="px-4 py-3.5 text-right font-extrabold text-slate-800 tabular-nums">{formatCurrency(b.net)}</td>
          <td className="px-4 py-3.5 text-right">
           <p className="font-bold text-emerald-600 tabular-nums">{b.paid > 0 ? formatCurrency(b.paid) : '—'}</p>
           {b.net > 0 && b.paid > 0 && !b.isPaid && (
            <div className="mt-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden ml-auto">
             <div className="h-full bg-emerald-400 rounded-full" style={{width:`${b.payPct.toFixed(0)}%`}}/>
            </div>
           )}
          </td>
          <td className="px-4 py-3.5 text-right">
           {b.isPaid
            ? <span className="text-emerald-500 font-bold text-sm">✓ Settled</span>
            : <span className="font-extrabold text-rose-600 tabular-nums">{formatCurrency(b.due)}</span>}
          </td>
          <td className="px-4 py-3.5">
           <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${statusBadge[b.statusLabel]||'bg-slate-100 text-slate-500'}`}>
            {b.statusLabel}
           </span>
          </td>
          <td className="px-4 py-3.5">
           <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {!b.isPaid && (
             <button onClick={() => onPayBill(b, b.due)}
              className="p-1.5 bg-violet-600 text-white hover:bg-violet-700 rounded-lg transition-colors shadow-sm" title="Pay Now">
              <CreditCard size={12}/>
             </button>
            )}
            {currentUser?.role === 'Admin' && <>
             <button onClick={() => onEdit(b)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"><Edit size={12}/></button>
             <button onClick={() => onDelete(b.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={12}/></button>
            </>}
           </div>
          </td>
         </tr>
        ))}
       </tbody>
       <tfoot className="bg-gradient-to-r from-slate-50 to-violet-50/30 border-t-2 border-slate-200">
        <tr>
         <td colSpan={4} className="px-4 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">TOTALS — {filtered.length} bills</td>
         <td className="px-4 py-4 text-right font-extrabold text-slate-600 tabular-nums">{formatCurrency(filtered.reduce((a,b)=>a+b.gross,0))}</td>
         <td className="px-4 py-4 text-right font-extrabold text-amber-600 tabular-nums">{filtered.reduce((a,b)=>a+b.wht,0)>0?`-${formatCurrency(filtered.reduce((a,b)=>a+b.wht,0))}`:'—'}</td>
         <td className="px-4 py-4 text-right font-extrabold text-slate-800 tabular-nums">{formatCurrency(filtered.reduce((a,b)=>a+b.net,0))}</td>
         <td className="px-4 py-4 text-right font-extrabold text-emerald-600 tabular-nums">{formatCurrency(filtered.reduce((a,b)=>a+b.paid,0))}</td>
         <td className="px-4 py-4 text-right font-extrabold text-rose-600 tabular-nums">{formatCurrency(filtered.reduce((a,b)=>a+b.due,0))}</td>
         <td colSpan={2}/>
        </tr>
       </tfoot>
      </table>
     </div>
    </div>
   )}
  </div>
 );
};
const ROLE_CONFIG = {
 Admin:  { bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500',  desc: 'Full access — can create, edit & delete all records' },
 Editor: { bg: 'bg-sky-100',     text: 'text-sky-700',     border: 'border-sky-200',     dot: 'bg-sky-500',     desc: 'Can create & edit records, cannot delete' },
 Viewer: { bg: 'bg-slate-100',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-400',   desc: 'Read-only access — can view but not modify data' },
};
const ManageUsersPage = ({ users, currentUser, onNewUser, onEdit, onDelete }) => {
 const [search,      setSearch]      = useState('');
 const [roleFilter,  setRoleFilter]  = useState('All');
 const [sortBy,      setSortBy]      = useState('createdAt-desc');
 const stats = useMemo(() => {
  const total   = users.length;
  const admins  = users.filter(u => u.role === 'Admin').length;
  const editors = users.filter(u => u.role === 'Editor').length;
  const viewers = users.filter(u => u.role === 'Viewer').length;
  return { total, admins, editors, viewers };
 }, [users]);
 const filtered = useMemo(() => {
  let res = [...users];
  if (search)           res = res.filter(u =>
   (u.username||'').toLowerCase().includes(search.toLowerCase()) ||
   (u.email||'').toLowerCase().includes(search.toLowerCase()) ||
   (u.role||'').toLowerCase().includes(search.toLowerCase())
  );
  if (roleFilter !== 'All') res = res.filter(u => u.role === roleFilter);
  if (sortBy === 'createdAt-desc') res = [...res].sort((a, b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
  if (sortBy === 'createdAt-asc')  res = [...res].sort((a, b) => new Date(a.createdAt||0) - new Date(b.createdAt||0));
  if (sortBy === 'name')           res = [...res].sort((a, b) => (a.username||'').localeCompare(b.username||''));
  if (sortBy === 'role')           res = [...res].sort((a, b) => (a.role||'').localeCompare(b.role||''));
  return res;
 }, [users, search, roleFilter, sortBy]);
 const handleDeleteClick = (user) => {
  if (user.username === currentUser?.username) return;
  onDelete(user.id);
 };
 const formatDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return '—'; }
 };
 const getInitials = (username) => (username||'?').slice(0,2).toUpperCase();
 const avatarColors = ['bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-fuchsia-500','bg-indigo-500','bg-teal-500'];
 const getAvatarColor = (username) => avatarColors[(username||'').charCodeAt(0) % avatarColors.length];
 return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
   {}
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {[
     { label: 'Total Users',    value: stats.total,   icon: Users,    bg: 'bg-white border-slate-200',         text: 'text-slate-800',  sub: 'registered accounts' },
     { label: 'Admins',         value: stats.admins,  icon: Lock,     bg: 'bg-violet-50 border-violet-200',    text: 'text-violet-700', sub: 'full access' },
     { label: 'Editors',        value: stats.editors, icon: Edit,     bg: 'bg-sky-50 border-sky-200',          text: 'text-sky-700',    sub: 'can edit records' },
     { label: 'Viewers',        value: stats.viewers, icon: FileText, bg: 'bg-slate-50 border-slate-200',      text: 'text-slate-600',  sub: 'read-only access' },
    ].map((k, i) => (
     <div key={i} className={`${k.bg} border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex justify-between items-start mb-3">
       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{k.label}</p>
       <k.icon size={14} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0"/>
      </div>
      <p className={`text-3xl font-extrabold tabular-nums ${k.text}`}>{k.value}</p>
      <p className="text-xs text-slate-400 mt-1 font-medium">{k.sub}</p>
     </div>
    ))}
   </div>
   {}
   <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
    <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2 text-sm">
     <div className="w-2 h-5 bg-violet-500 rounded-full"/>
     Role Permissions
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
     {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
      <div key={role} className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4`}>
       <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${cfg.dot}`}/>
        <span className={`font-extrabold text-sm ${cfg.text}`}>{role}</span>
       </div>
       <p className="text-xs text-slate-500 leading-relaxed">{cfg.desc}</p>
       <div className="mt-3 flex flex-wrap gap-1">
        {role === 'Admin'  && ['View','Create','Edit','Delete','Manage Users'].map(p => <span key={p} className="text-xs font-bold bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full">{p}</span>)}
        {role === 'Editor' && ['View','Create','Edit'].map(p => <span key={p} className="text-xs font-bold bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full">{p}</span>)}
        {role === 'Viewer' && ['View'].map(p => <span key={p} className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{p}</span>)}
       </div>
      </div>
     ))}
    </div>
   </div>
   {}
   <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
    <div className="flex flex-wrap gap-2 items-center">
     {}
     <div className="relative">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
      <input
       className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none w-48 transition-all"
       placeholder="Search users..."
       value={search}
       onChange={e => setSearch(e.target.value)}
      />
     </div>
     {}
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      {['All','Admin','Editor','Viewer'].map(r => (
       <button key={r} onClick={() => setRoleFilter(r)}
        className={`px-3 py-2 text-xs font-bold transition-all ${roleFilter===r ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
        {r}
       </button>
      ))}
     </div>
     {}
     <select value={sortBy} onChange={e => setSortBy(e.target.value)}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="createdAt-desc">Newest First</option>
      <option value="createdAt-asc">Oldest First</option>
      <option value="name">Name A–Z</option>
      <option value="role">Role</option>
     </select>
    </div>
    {currentUser?.role === 'Admin' && (
     <button onClick={onNewUser}
      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-violet-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex-shrink-0">
      <UserPlus size={16}/> Add User
     </button>
    )}
   </div>
   {(search || roleFilter !== 'All') && (
    <p className="text-sm text-slate-500 font-medium -mt-2">
     Showing <span className="font-bold text-violet-600">{filtered.length}</span> of {users.length} users
     <button onClick={() => { setSearch(''); setRoleFilter('All'); }}
      className="ml-3 text-xs font-bold text-slate-400 hover:text-violet-600 bg-slate-100 hover:bg-violet-50 px-2 py-0.5 rounded-lg transition-colors">
      ✕ Clear
     </button>
    </p>
   )}
   {}
   {filtered.length === 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
     <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Users className="text-violet-300" size={32}/>
     </div>
     <h3 className="text-lg font-bold text-slate-700 mb-2">
      {users.length === 0 ? 'No users yet' : 'No users match your search'}
     </h3>
     <p className="text-sm text-slate-400 mb-6">
      {users.length === 0 ? 'Add your first team member.' : 'Try clearing your filters.'}
     </p>
     {users.length === 0 && currentUser?.role === 'Admin' && (
      <button onClick={onNewUser} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors">
       + Add First User
      </button>
     )}
    </div>
   )}
   {}
   {filtered.length > 0 && (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
     {filtered.map(user => {
      const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.Viewer;
      const isSelf = user.username === currentUser?.username;
      const avatarColor = getAvatarColor(user.username);
      return (
       <div key={user.id}
        className={`bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group ${isSelf ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200'}`}>
        {}
        <div className={`h-1 w-full ${cfg.dot}`}
         style={{background: user.role==='Admin' ? 'linear-gradient(90deg,#7c3aed,#d946ef)' : user.role==='Editor' ? 'linear-gradient(90deg,#0284c7,#38bdf8)' : '#cbd5e1'}}/>
        <div className="p-5">
         {}
         <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
           <div className={`${avatarColor} w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <span className="text-white font-extrabold text-sm tracking-wider">{getInitials(user.username)}</span>
           </div>
           <div>
            <p className="font-extrabold text-slate-900 leading-tight">
             {user.username}
             {isSelf && <span className="ml-2 text-xs font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full">You</span>}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5 truncate max-w-[160px]">{user.email || '—'}</p>
           </div>
          </div>
          {}
          <span className={`${cfg.bg} ${cfg.text} ${cfg.border} border text-xs font-extrabold px-2.5 py-1 rounded-xl flex-shrink-0`}>
           {user.role || 'Viewer'}
          </span>
         </div>
         {}
         <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
           <Calendar size={11} className="flex-shrink-0"/>
           <span className="font-medium">Joined {formatDate(user.createdAt)}</span>
          </div>
          {user.addedBy && (
           <div className="flex items-center gap-2 text-xs text-slate-400">
            <UserPlus size={11} className="flex-shrink-0"/>
            <span className="font-medium">Added by <span className="text-slate-600 font-bold">{user.addedBy}</span></span>
           </div>
          )}
          {user.lastEditedBy && (
           <div className="flex items-center gap-2 text-xs text-slate-400">
            <Edit size={11} className="flex-shrink-0"/>
            <span className="font-medium">Last edited by <span className="text-slate-600 font-bold">{user.lastEditedBy}</span></span>
           </div>
          )}
         </div>
         {}
         <div className="flex flex-wrap gap-1.5">
          {user.role === 'Admin' && (
           <>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ View</span>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ Create</span>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ Edit</span>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ Delete</span>
            <span className="text-xs font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">✓ Admin</span>
           </>
          )}
          {user.role === 'Editor' && (
           <>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ View</span>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ Create</span>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ Edit</span>
            <span className="text-xs font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">✗ Delete</span>
           </>
          )}
          {(!user.role || user.role === 'Viewer') && (
           <>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ View</span>
            <span className="text-xs font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">✗ Create</span>
            <span className="text-xs font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">✗ Edit</span>
            <span className="text-xs font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">✗ Delete</span>
           </>
          )}
         </div>
        </div>
        {}
        {currentUser?.role === 'Admin' && (
         <div className="px-4 pb-4 pt-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button onClick={() => onEdit(user)}
           className="flex-1 py-2 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors flex items-center justify-center gap-1.5">
           <Edit size={11}/> Edit User
          </button>
          {!isSelf && (
           <button onClick={() => handleDeleteClick(user)}
            className="px-3 py-2 text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-1">
            <Trash2 size={11}/>
           </button>
          )}
          {isSelf && (
           <div className="px-3 py-2 text-xs font-bold text-slate-300 bg-slate-50 rounded-xl flex items-center justify-center" title="Cannot delete your own account">
            <Lock size={11}/>
           </div>
          )}
         </div>
        )}
       </div>
      );
     })}
    </div>
   )}
   {}
   <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"/>
    <div className="relative z-10">
     <div className="flex items-center gap-3 mb-4">
      <div className="bg-violet-500/20 p-2.5 rounded-xl"><Lock className="text-violet-300" size={18}/></div>
      <h3 className="font-extrabold text-white text-base">Security Guidelines</h3>
     </div>
     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[
       { icon: '🔐', title: 'Least Privilege', desc: 'Assign the minimum role needed. Use Viewer for read-only staff.' },
       { icon: '🔑', title: 'Strong Passwords', desc: 'Use unique passwords per user. Change defaults immediately.' },
       { icon: '👥', title: 'Audit Regularly', desc: 'Review user accounts periodically and remove inactive accounts.' },
      ].map((tip, i) => (
       <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-lg mb-1.5">{tip.icon}</p>
        <p className="font-bold text-white text-sm mb-1">{tip.title}</p>
        <p className="text-xs text-slate-400 leading-relaxed">{tip.desc}</p>
       </div>
      ))}
     </div>
    </div>
   </div>
  </div>
 );
};
const BANK_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#f43f5e','#8b5cf6','#06b6d4','#ec4899'];
const BankAccountsPage = ({ bankRecords, currentUser, onNewEntry, onEdit, onDelete }) => {
 const [search,       setSearch]       = useState('');
 const [bankFilter,   setBankFilter]   = useState('All');
 const [typeFilter,   setTypeFilter]   = useState('All');
 const [statusFilter, setStatusFilter] = useState('All');
 const [monthFilter,  setMonthFilter]  = useState('All');
 const [yearFilter,   setYearFilter]   = useState('All');
 const [sortBy,       setSortBy]       = useState('date-desc');
 const [activeBank,   setActiveBank]   = useState('All');
 const today = new Date(); today.setHours(0,0,0,0);
 const enriched = useMemo(() => bankRecords.map(r => {
  const amt      = Number(r.amount) || 0;
  const isCredit = amt >= 0;
  const absAmt   = Math.abs(amt);
  const monthNum  = r.date ? r.date.slice(0, 7) : '';
  const monthName = (() => { try { return new Date(r.date).toLocaleString('default', { month: 'long', year: 'numeric' }); } catch { return r.date; } })();
  const monthShort = (() => { try { return new Date(r.date).toLocaleString('default', { month: 'short' }); } catch { return ''; } })();
  const year      = r.date ? r.date.slice(0, 4) : '';
  return { ...r, amt, isCredit, absAmt, monthNum, monthName, monthShort, year };
 }), [bankRecords]);
 const uniqueBanks = useMemo(() =>
  [...new Set(enriched.map(r => r.bank).filter(Boolean))].sort()
 , [enriched]);
 const uniqueMonths = useMemo(() =>
  [...new Set(enriched.map(r => r.monthName).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a))
 , [enriched]);
 const uniqueYears = useMemo(() =>
  [...new Set(enriched.map(r => r.year).filter(Boolean))].sort((a, b) => b - a)
 , [enriched]);
 const bankSummaries = useMemo(() => {
  const map = {};
  enriched.forEach(r => {
   const b = r.bank || 'Unknown';
   if (!map[b]) map[b] = { bank: b, credits: 0, debits: 0, count: 0, cleared: 0, pending: 0 };
   if (r.isCredit) map[b].credits += r.absAmt;
   else            map[b].debits  += r.absAmt;
   map[b].count++;
   if (r.status === 'Cleared') map[b].cleared++; else map[b].pending++;
  });
  return Object.values(map).sort((a, b) => (b.credits - b.debits) - (a.credits - a.debits))
   .map((s, i) => ({ ...s, balance: s.credits - s.debits, color: BANK_COLORS[i % BANK_COLORS.length] }));
 }, [enriched]);
 const kpis = useMemo(() => {
  const totalCredits  = enriched.filter(r => r.isCredit).reduce((a, r) => a + r.absAmt, 0);
  const totalDebits   = enriched.filter(r => !r.isCredit).reduce((a, r) => a + r.absAmt, 0);
  const netBalance    = totalCredits - totalDebits;
  const pendingCount  = enriched.filter(r => r.status === 'Pending').length;
  const pendingAmt    = enriched.filter(r => r.status === 'Pending').reduce((a, r) => a + Math.abs(r.amt), 0);
  const curMonth      = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const thisMonthIn   = enriched.filter(r => r.monthNum === curMonth && r.isCredit).reduce((a, r) => a + r.absAmt, 0);
  const thisMonthOut  = enriched.filter(r => r.monthNum === curMonth && !r.isCredit).reduce((a, r) => a + r.absAmt, 0);
  return { totalCredits, totalDebits, netBalance, pendingCount, pendingAmt, thisMonthIn, thisMonthOut };
 }, [enriched]);
 const monthlyChart = useMemo(() => {
  return Array.from({ length: 6 }, (_, i) => {
   const d   = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
   const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
   const lbl = d.toLocaleString('default', { month: 'short' });
   const src = activeBank === 'All' ? enriched : enriched.filter(r => r.bank === activeBank);
   const credits = src.filter(r => r.monthNum === key && r.isCredit).reduce((a, r) => a + r.absAmt, 0);
   const debits  = src.filter(r => r.monthNum === key && !r.isCredit).reduce((a, r) => a + r.absAmt, 0);
   return { name: lbl, Credits: credits, Debits: debits };
  });
 }, [enriched, activeBank]);
 const filteredAndSorted = useMemo(() => {
  let res = [...enriched];
  if (search)             res = res.filter(r => (r.bank||'').toLowerCase().includes(search.toLowerCase()) || (r.description||'').toLowerCase().includes(search.toLowerCase()));
  if (bankFilter !== 'All')   res = res.filter(r => r.bank === bankFilter);
  if (activeBank !== 'All')   res = res.filter(r => r.bank === activeBank);
  if (typeFilter === 'Credit') res = res.filter(r => r.isCredit);
  if (typeFilter === 'Debit')  res = res.filter(r => !r.isCredit);
  if (statusFilter !== 'All')  res = res.filter(r => r.status === statusFilter);
  if (monthFilter !== 'All')   res = res.filter(r => r.monthName === monthFilter);
  if (yearFilter  !== 'All')   res = res.filter(r => r.year === yearFilter);
  res = [...res].sort((a, b) => {
   if (sortBy === 'date-desc')   return new Date(b.date) - new Date(a.date);
   if (sortBy === 'date-asc')    return new Date(a.date) - new Date(b.date);
   if (sortBy === 'amount-desc') return b.absAmt - a.absAmt;
   if (sortBy === 'amount-asc')  return a.absAmt - b.absAmt;
   return 0;
  });
  const chron = [...res].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const balMap = {};
  chron.forEach(r => { running += r.amt; balMap[r.id] = running; });
  return res.map(r => ({ ...r, runningBalance: balMap[r.id] }));
 }, [enriched, search, bankFilter, activeBank, typeFilter, statusFilter, monthFilter, yearFilter, sortBy]);
 const clearFilters = () => { setSearch(''); setBankFilter('All'); setTypeFilter('All'); setStatusFilter('All'); setMonthFilter('All'); setYearFilter('All'); };
 const hasFilters = search || bankFilter !== 'All' || typeFilter !== 'All' || statusFilter !== 'All' || monthFilter !== 'All' || yearFilter !== 'All';
 const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}); } catch { return d||'—'; } };
 return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
   {}
   <div className={`rounded-3xl p-6 flex items-center justify-between shadow-sm border ${kpis.netBalance >= 0 ? 'bg-gradient-to-r from-sky-600 to-violet-600 border-sky-700' : 'bg-gradient-to-r from-rose-600 to-red-600 border-rose-700'}`}>
    <div>
     <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">
      {activeBank === 'All' ? 'Net Bank Balance — All Accounts' : `${activeBank} — Net Balance`}
     </p>
     <p className="text-white text-4xl font-extrabold tracking-tight tabular-nums">{formatCurrency(kpis.netBalance)}</p>
     <p className="text-white/60 text-xs mt-1">{bankSummaries.length} account{bankSummaries.length !== 1 ? 's' : ''} · {enriched.length} transactions</p>
    </div>
    <div className="text-right space-y-1">
     <div className="bg-white/10 rounded-2xl px-4 py-2 text-right">
      <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Total Inflows</p>
      <p className="text-white font-extrabold tabular-nums">{formatCurrency(kpis.totalCredits)}</p>
     </div>
     <div className="bg-white/10 rounded-2xl px-4 py-2 text-right">
      <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Total Outflows</p>
      <p className="text-white font-extrabold tabular-nums">{formatCurrency(kpis.totalDebits)}</p>
     </div>
    </div>
   </div>
   {}
   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {[
     { l:'Total Inflows',    v: formatCurrency(kpis.totalCredits),  sub:`${enriched.filter(r=>r.isCredit).length} credits`, c:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200', icon: ArrowDownLeft },
     { l:'Total Outflows',   v: formatCurrency(kpis.totalDebits),   sub:`${enriched.filter(r=>!r.isCredit).length} debits`, c:'text-rose-700',    bg:'bg-rose-50 border-rose-200',       icon: ArrowUpRight },
     { l:'Net Balance',      v: formatCurrency(kpis.netBalance),    sub:'across all banks', c: kpis.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700', bg: kpis.netBalance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200', icon: Landmark },
     { l:'This Month In',    v: formatCurrency(kpis.thisMonthIn),   sub:'credits this month', c:'text-sky-700',      bg:'bg-sky-50 border-sky-200',         icon: ArrowDownLeft },
     { l:'This Month Out',   v: formatCurrency(kpis.thisMonthOut),  sub:'debits this month',  c:'text-amber-700',    bg:'bg-amber-50 border-amber-200',     icon: ArrowUpRight },
     { l:'Pending',          v: kpis.pendingCount,                  sub: formatCurrency(kpis.pendingAmt), c: kpis.pendingCount > 0 ? 'text-amber-700' : 'text-emerald-700', bg: kpis.pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200', icon: Clock },
    ].map((k, i) => (
     <div key={i} className={`${k.bg} border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex justify-between items-start mb-2">
       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{k.l}</p>
       <k.icon size={13} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 mt-0.5"/>
      </div>
      <p className={`text-lg font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
      <p className="text-xs text-slate-400 mt-0.5 font-medium">{k.sub}</p>
     </div>
    ))}
   </div>
   {}
   {bankSummaries.length > 0 && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
     {}
     <div className="space-y-3">
      <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
       <div className="w-2 h-5 bg-sky-500 rounded-full"/>
       Accounts
      </h3>
      {}
      <button onClick={() => setActiveBank('All')}
       className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${activeBank==='All' ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-200'}`}>
       <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
         <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Landmark size={16} className="text-white"/>
         </div>
         <div>
          <p className="font-extrabold text-slate-800 text-sm">All Accounts</p>
          <p className="text-xs text-slate-400">{enriched.length} transactions</p>
         </div>
        </div>
        <div className="text-right">
         <p className={`font-extrabold tabular-nums text-sm ${kpis.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(kpis.netBalance)}</p>
         <p className="text-xs text-slate-400">net</p>
        </div>
       </div>
      </button>
      {bankSummaries.map((b, i) => (
       <button key={b.bank} onClick={() => setActiveBank(b.bank)}
        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${activeBank===b.bank ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-200'}`}>
        <div className="flex justify-between items-center mb-2">
         <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-extrabold text-sm" style={{background: b.color}}>
           {b.bank.slice(0,2).toUpperCase()}
          </div>
          <div>
           <p className="font-extrabold text-slate-800 text-sm">{b.bank}</p>
           <p className="text-xs text-slate-400">{b.count} transactions</p>
          </div>
         </div>
         <div className="text-right">
          <p className={`font-extrabold tabular-nums text-sm ${b.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(b.balance)}</p>
          {b.pending > 0 && <p className="text-xs text-amber-500 font-bold">{b.pending} pending</p>}
         </div>
        </div>
        <div className="flex gap-3 text-xs">
         <span className="text-emerald-600 font-bold flex items-center gap-1"><ArrowDownLeft size={10}/> {formatCurrency(b.credits)}</span>
         <span className="text-rose-600 font-bold flex items-center gap-1"><ArrowUpRight size={10}/> {formatCurrency(b.debits)}</span>
        </div>
       </button>
      ))}
     </div>
     {}
     <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4">
       <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
        <div className="w-2 h-5 bg-violet-500 rounded-full"/>
        Cash Flow — Last 6 Months
        {activeBank !== 'All' && <span className="text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg text-xs">{activeBank}</span>}
       </h3>
      </div>
      <div className="flex-1">
       <ResponsiveContainer width="100%" height={200}>
        <BarChart data={monthlyChart} barCategoryGap="30%">
         <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fontWeight:700,fill:'#94a3b8'}}/>
         <YAxis axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
         <ChartTooltip formatter={v=>formatCurrency(v)} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.1)',padding:'10px 14px'}}/>
         <Bar dataKey="Credits" fill="#34d399" radius={[5,5,0,0]}/>
         <Bar dataKey="Debits"  fill="#fb7185" radius={[5,5,0,0]}/>
        </BarChart>
       </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2">
       <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="w-3 h-3 bg-emerald-400 rounded-sm inline-block"/>Credits</span>
       <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500"><span className="w-3 h-3 bg-rose-400 rounded-sm inline-block"/>Debits</span>
      </div>
     </div>
    </div>
   )}
   {}
   <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
    <div className="flex flex-wrap gap-2 items-center">
     <div className="relative">
      <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
      <input className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none w-48 transition-all"
       placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)}/>
     </div>
     {}
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      {['All','Credit','Debit'].map(t => (
       <button key={t} onClick={() => setTypeFilter(t)}
        className={`px-3 py-2 text-xs font-bold transition-all ${typeFilter===t
         ? t==='Credit' ? 'bg-emerald-600 text-white' : t==='Debit' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'
         : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>
      ))}
     </div>
     {}
     <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
      {['All','Cleared','Pending'].map(s => (
       <button key={s} onClick={() => setStatusFilter(s)}
        className={`px-3 py-2 text-xs font-bold transition-all ${statusFilter===s
         ? s==='Cleared' ? 'bg-emerald-600 text-white' : s==='Pending' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white'
         : 'text-slate-500 hover:text-slate-700'}`}>{s}</button>
      ))}
     </div>
     {uniqueBanks.length > 1 && (
      <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
       className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Banks</option>
       {uniqueBanks.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
     )}
     {uniqueMonths.length > 1 && (
      <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
       className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Months</option>
       {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
     )}
     {uniqueYears.length > 1 && (
      <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
       className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
       <option value="All">All Years</option>
       {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
     )}
     <select value={sortBy} onChange={e => setSortBy(e.target.value)}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 outline-none cursor-pointer">
      <option value="date-desc">Newest First</option>
      <option value="date-asc">Oldest First</option>
      <option value="amount-desc">Highest Amount</option>
      <option value="amount-asc">Lowest Amount</option>
     </select>
     {hasFilters && (
      <button onClick={clearFilters} className="text-xs font-bold text-slate-400 hover:text-violet-600 bg-slate-100 hover:bg-violet-50 px-3 py-2 rounded-xl transition-colors">
       ✕ Clear
      </button>
     )}
    </div>
    <div className="flex gap-2 flex-shrink-0">
     <button onClick={() => exportToCSV(bankRecords, 'BankRecords_Export')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm"><Download size={15}/> Export</button>
     <button onClick={onNewEntry}
      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-violet-200 hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
      <Plus size={16}/> New Entry
     </button>
    </div>
   </div>
   {hasFilters && (
    <div className="flex items-center gap-3 text-sm font-medium text-slate-500 -mt-2 flex-wrap">
     <span>Showing <span className="font-bold text-violet-600">{filteredAndSorted.length}</span> of {bankRecords.length} transactions</span>
     {filteredAndSorted.length > 0 && (
      <>
       <span className="text-slate-300">·</span>
       <span className="text-emerald-600 font-bold">In: {formatCurrency(filteredAndSorted.filter(r=>r.isCredit).reduce((a,r)=>a+r.absAmt,0))}</span>
       <span className="text-rose-600 font-bold">Out: {formatCurrency(filteredAndSorted.filter(r=>!r.isCredit).reduce((a,r)=>a+r.absAmt,0))}</span>
      </>
     )}
    </div>
   )}
   {}
   {filteredAndSorted.length === 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
     <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Landmark className="text-sky-300" size={32}/>
     </div>
     <h3 className="text-lg font-bold text-slate-700 mb-2">
      {bankRecords.length === 0 ? 'No bank transactions yet' : 'No transactions match your filters'}
     </h3>
     <p className="text-sm text-slate-400 mb-6">
      {bankRecords.length === 0
       ? 'Add bank credits and debits to track your cash flow.'
       : 'Try clearing your filters to see all transactions.'}
     </p>
     {bankRecords.length === 0 && (
      <button onClick={onNewEntry} className="bg-sky-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-sky-700 transition-colors">
       + Add First Transaction
      </button>
     )}
    </div>
   )}
   {}
   {filteredAndSorted.length > 0 && (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
     <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[820px]">
       <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
         {['Date','Bank','Description','Type','Amount','Running Balance','Status',''].map((h,i) => (
          <th key={i} className={`px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${['Amount','Running Balance'].includes(h)?'text-right':''}`}>{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
        {filteredAndSorted.map(r => (
         <tr key={r.id} className={`hover:bg-slate-50/80 transition-colors group ${r.status==='Pending'?'bg-amber-50/20':''}`}>
          <td className="px-4 py-3.5">
           <p className="text-sm font-bold text-slate-700">{fmtDate(r.date)}</p>
           <p className="text-xs text-slate-400 mt-0.5">{r.monthShort}</p>
          </td>
          <td className="px-4 py-3.5">
           <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg text-white"
            style={{background: BANK_COLORS[uniqueBanks.indexOf(r.bank) % BANK_COLORS.length] || '#6366f1'}}>
            {r.bank || '—'}
           </span>
          </td>
          <td className="px-4 py-3.5">
           <p className="text-sm text-slate-700 font-medium max-w-[200px] truncate">{r.description || '—'}</p>
          </td>
          <td className="px-4 py-3.5">
           <span className={`flex items-center gap-1 text-xs font-extrabold w-fit px-2 py-1 rounded-full ${r.isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {r.isCredit ? <ArrowDownLeft size={10}/> : <ArrowUpRight size={10}/>}
            {r.isCredit ? 'Credit' : 'Debit'}
           </span>
          </td>
          <td className="px-4 py-3.5 text-right">
           <p className={`font-extrabold tabular-nums text-base ${r.isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
            {r.isCredit ? '+' : '-'}{formatCurrency(r.absAmt)}
           </p>
          </td>
          <td className="px-4 py-3.5 text-right">
           <p className={`font-bold tabular-nums text-sm ${r.runningBalance >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>
            {formatCurrency(r.runningBalance)}
           </p>
          </td>
          <td className="px-4 py-3.5">
           <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${r.status==='Cleared' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {r.status || 'Pending'}
           </span>
          </td>
          <td className="px-4 py-3.5">
           {currentUser?.role === 'Admin' && (
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={() => onEdit(r)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"><Edit size={12}/></button>
             <button onClick={() => onDelete(r.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={12}/></button>
            </div>
           )}
          </td>
         </tr>
        ))}
       </tbody>
       <tfoot className="bg-gradient-to-r from-slate-50 to-sky-50/30 border-t-2 border-slate-200">
        <tr>
         <td colSpan={4} className="px-4 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
          TOTALS — {filteredAndSorted.length} transactions
         </td>
         <td className="px-4 py-4 text-right">
          <p className="font-extrabold text-emerald-600 tabular-nums text-sm">+{formatCurrency(filteredAndSorted.filter(r=>r.isCredit).reduce((a,r)=>a+r.absAmt,0))}</p>
          <p className="font-extrabold text-rose-600 tabular-nums text-sm">-{formatCurrency(filteredAndSorted.filter(r=>!r.isCredit).reduce((a,r)=>a+r.absAmt,0))}</p>
         </td>
         <td className="px-4 py-4 text-right">
          <p className={`font-extrabold tabular-nums ${filteredAndSorted.length > 0 && filteredAndSorted[filteredAndSorted.length-1].runningBalance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
           {filteredAndSorted.length > 0 ? formatCurrency(filteredAndSorted[filteredAndSorted.length-1].runningBalance) : '—'}
          </p>
          <p className="text-xs text-slate-400">final balance</p>
         </td>
         <td colSpan={2}/>
        </tr>
       </tfoot>
      </table>
     </div>
    </div>
   )}
  </div>
 );
};
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
   {}
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
    {}
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
    {}
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
   {}
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
const ReceivablesPayables = ({ clients, invoices, vendors, vendorBills, bankRecords, pettyCash, onViewClient, onViewVendor }) => {
 const [activeTab, setActiveTab] = useState('receivables');
 const clientSummaries = useMemo(() => clients.map(client => {
  const clientInvoices = invoices.filter(inv =>
   (inv.client || '').toLowerCase().trim() === (client.name || '').toLowerCase().trim()
  );
  const totalBilled = clientInvoices.reduce((a, inv) =>
   a + calculateTax((inv.items||[]).reduce((s,it)=>s+((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)),0), inv.taxRate).total, 0);
  const totalReceived = clientInvoices.filter(i=>i.status==='Paid').reduce((a, inv) => {
   const r = Number(inv.amountReceived);
   const t = calculateTax((inv.items||[]).reduce((s,it)=>s+((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)),0), inv.taxRate).total;
   return a + (r > 0 ? r : t);
  }, 0) + (Number(client.advanceReceived)||0);
  const outstanding = Math.max(0, totalBilled - totalReceived);
  const today = new Date(); today.setHours(0,0,0,0);
  const overdueInvs = clientInvoices.filter(i => i.status!=='Paid' && i.dueDate && new Date(i.dueDate) < today);
  const aging = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
  clientInvoices.filter(i => i.status !== 'Paid').forEach(inv => {
   const invTotal = calculateTax((inv.items||[]).reduce((s,it)=>s+((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)),0), inv.taxRate).total;
   const bal = invTotal - (Number(inv.amountReceived)||0);
   if (!inv.dueDate) { aging.current += bal; return; }
   const days = Math.floor((today - new Date(inv.dueDate)) / 86400000);
   if (days <= 0) aging.current += bal;
   else if (days <= 30) aging.d30 += bal;
   else if (days <= 60) aging.d60 += bal;
   else if (days <= 90) aging.d90 += bal;
   else aging.d90plus += bal;
  });
  return { ...client, totalBilled, totalReceived, outstanding, overdueCount: overdueInvs.length, invoiceCount: clientInvoices.length, aging };
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
 const agingTotals = clientSummaries.reduce((acc, c) => {
  acc.current += c.aging?.current || 0;
  acc.d30 += c.aging?.d30 || 0;
  acc.d60 += c.aging?.d60 || 0;
  acc.d90 += c.aging?.d90 || 0;
  acc.d90plus += c.aging?.d90plus || 0;
  return acc;
 }, { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 });
 return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
   {}
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
   {}
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
     {}
     {totalReceivables > 0 && (
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-3 items-center">
       <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mr-1">Aging:</span>
       {[
        { label: 'Current', val: agingTotals.current, color: 'bg-emerald-100 text-emerald-700' },
        { label: '1–30 days', val: agingTotals.d30, color: 'bg-amber-100 text-amber-700' },
        { label: '31–60 days', val: agingTotals.d60, color: 'bg-orange-100 text-orange-700' },
        { label: '61–90 days', val: agingTotals.d90, color: 'bg-rose-100 text-rose-700' },
        { label: '90+ days', val: agingTotals.d90plus, color: 'bg-red-200 text-red-800' },
       ].filter(b => b.val > 0).map(b => (
        <span key={b.label} className={`text-xs font-bold px-3 py-1 rounded-full ${b.color}`}>
         {b.label}: {formatCurrency(b.val)}
        </span>
       ))}
      </div>
     )}
     <table className="w-full text-left">
      <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
       <tr><th className="p-4">Client</th><th className="p-4 text-center">Invoices</th><th className="p-4 text-right">Total Billed</th><th className="p-4 text-right">Received</th><th className="p-4 text-right">Outstanding</th><th className="p-4 text-center">Aging</th><th className="p-4 text-center">Action</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
       {clientSummaries.map(c => {
        const worstAge = c.aging?.d90plus > 0 ? '90+d' : c.aging?.d90 > 0 ? '61–90d' : c.aging?.d60 > 0 ? '31–60d' : c.aging?.d30 > 0 ? '1–30d' : c.aging?.current > 0 ? 'Current' : null;
        const ageBadge = { '90+d': 'bg-red-100 text-red-700', '61–90d': 'bg-rose-100 text-rose-700', '31–60d': 'bg-orange-100 text-orange-700', '1–30d': 'bg-amber-100 text-amber-700', 'Current': 'bg-emerald-100 text-emerald-700' };
        return (
         <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${c.overdueCount > 0 ? 'bg-rose-50/20' : ''}`}>
          <td className="p-4">
           <p className="font-bold text-slate-800">{c.name}</p>
           {c.projectName && <p className="text-xs text-slate-400">{c.projectName}</p>}
          </td>
          <td className="p-4 text-center text-sm font-bold text-slate-600">{c.invoiceCount}</td>
          <td className="p-4 text-right font-bold text-slate-700">{formatCurrency(c.totalBilled)}</td>
          <td className="p-4 text-right font-bold text-emerald-600">{formatCurrency(c.totalReceived)}</td>
          <td className="p-4 text-right font-extrabold text-rose-600">{formatCurrency(c.outstanding)}</td>
          <td className="p-4 text-center">
           {worstAge ? <span className={`text-xs font-bold px-2 py-1 rounded-full ${ageBadge[worstAge]}`}>{worstAge}</span> : <span className="text-slate-300 text-xs">—</span>}
          </td>
          <td className="p-4 text-center"><button onClick={() => onViewClient(c)} className="text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors">Profile →</button></td>
         </tr>
        );
       })}
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
 const outputTax = filteredInvoices.reduce((acc, inv) => {
  const { tax } = calculateTax(inv.items.reduce((a, i) => a + (i.qty * i.rate), 0), inv.taxRate);
  return acc + tax;
 }, 0);
 const salaryWHT = filteredSalaries.reduce((acc, sal) => acc + (Number(sal.taxDeduction) || 0), 0);
 const vendorWHT = (items) => items.reduce((acc, bill) => acc + (Number(bill.taxDeduction) || 0), 0);
 const filteredBills = (bills) => {
  return bills.filter(i => {
   const d = new Date(i.date || i.createdAt);
   return (filterMonth === 'All' || d.toLocaleString('default',{month:'long'}) === filterMonth) &&
     (filterYear === 'All' || d.getFullYear().toString() === filterYear);
  });
 };
 const currentVendorBills = filteredBills(vendorBills);
 const totalWHT = salaryWHT + vendorWHT(currentVendorBills);
 const expenseTax = filteredExpenses.reduce((acc, exp) => acc + (Number(exp.taxAmount) || 0), 0);
 const clientWHT = filteredInvoices.reduce((acc, inv) => acc + (Number(inv.whtDeducted) || 0), 0);
 const totalInput = expenseTax + clientWHT;
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
const GlobalCommandPalette = ({ isOpen, onClose, invoices, clients, expenses, vendors, quotations, vendorBills, pettyCash, bankRecords, salaries, onNavigate }) => {
 const [query, setQuery] = useState('');
 const inputRef = useRef(null);
 useEffect(() => {
  if (isOpen) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }
 }, [isOpen]);
 useEffect(() => {
  const handler = (e) => { if (e.key === 'Escape') onClose(); };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
 }, [onClose]);
 const results = useMemo(() => {
  if (!query.trim() || query.length < 2) return [];
  const q = query.toLowerCase();
  const hits = [];
  const navItems = [
   { label:'Dashboard',            view:'dashboard',              icon:'🏠', type:'Page' },
   { label:'Invoices',             view:'invoices',               icon:'📄', type:'Page' },
   { label:'Quotations',           view:'quotations',             icon:'📋', type:'Page' },
   { label:'Clients',              view:'clients',                icon:'👥', type:'Page' },
   { label:'Expenses',             view:'expenses',               icon:'💸', type:'Page' },
   { label:'Petty Cash',           view:'petty-cash',             icon:'💰', type:'Page' },
   { label:'Vendors',              view:'vendors',                icon:'🚚', type:'Page' },
   { label:'Vendor Bills',         view:'vendor-bills',           icon:'🧾', type:'Page' },
   { label:'Team Salaries',        view:'salaries',               icon:'👤', type:'Page' },
   { label:'Bank Accounts',        view:'bank',                   icon:'🏦', type:'Page' },
   { label:'P&L Analytics',        view:'reports',                icon:'📊', type:'Page' },
   { label:'Tax Liability',        view:'tax-report',             icon:'📑', type:'Page' },
   { label:'Receivables & Payables',view:'receivables-payables',  icon:'⚖️', type:'Page' },
   { label:'Settings',             view:'settings',               icon:'⚙️', type:'Page' },
  ];
  navItems.filter(n => n.label.toLowerCase().includes(q)).forEach(n => hits.push(n));
  invoices.filter(i => (i.client||'').toLowerCase().includes(q) || (i.invoiceNumber||'').toLowerCase().includes(q))
   .slice(0,4).forEach(i => hits.push({ label:`${i.invoiceNumber||'Invoice'} — ${i.client}`, sub: `${i.status} · ${formatCurrency(calculateTax((i.items||[]).reduce((s,it)=>s+(it.qty||0)*(it.rate||0),0),i.taxRate).total)}`, view:'invoices', icon:'📄', type:'Invoice' }));
  clients.filter(c => (c.name||'').toLowerCase().includes(q) || (c.projectName||'').toLowerCase().includes(q))
   .slice(0,4).forEach(c => hits.push({ label:c.name, sub: c.projectName||'Client', view:'clients', icon:'👥', type:'Client', clientObj: c }));
  quotations.filter(qt => (qt.client||'').toLowerCase().includes(q) || (qt.quoteNumber||'').toLowerCase().includes(q))
   .slice(0,3).forEach(qt => hits.push({ label:`${qt.quoteNumber||'Quote'} — ${qt.client}`, sub:`${qt.status||'Pending'}`, view:'quotations', icon:'📋', type:'Quote' }));
  vendors.filter(v => (v.name||'').toLowerCase().includes(q))
   .slice(0,3).forEach(v => hits.push({ label:v.name, sub:v.serviceType||'Vendor', view:'vendors', icon:'🚚', type:'Vendor' }));
  expenses.filter(e => (e.description||'').toLowerCase().includes(q) || (e.category||'').toLowerCase().includes(q))
   .slice(0,3).forEach(e => hits.push({ label:e.description||'Expense', sub:`${e.category||''} · ${formatCurrency(Number(e.amount)||0)}`, view:'expenses', icon:'💸', type:'Expense' }));
  return hits.slice(0, 12);
 }, [query, invoices, clients, quotations, vendors, expenses]);
 if (!isOpen) return null;
 const typeColor = { Page:'bg-slate-100 text-slate-500', Invoice:'bg-violet-100 text-violet-600', Client:'bg-sky-100 text-sky-600', Quote:'bg-amber-100 text-amber-600', Vendor:'bg-emerald-100 text-emerald-600', Expense:'bg-rose-100 text-rose-600' };
 return (
  <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
   <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150" onClick={e=>e.stopPropagation()}>
    {}
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
     <Search className="text-slate-400 flex-shrink-0" size={20}/>
     <input ref={inputRef} className="flex-1 text-slate-800 font-medium text-base outline-none placeholder:text-slate-300 bg-transparent"
      placeholder="Search anything — clients, invoices, pages..." value={query} onChange={e=>setQuery(e.target.value)}/>
     <kbd className="text-xs font-bold bg-slate-100 text-slate-400 px-2 py-1 rounded-lg">ESC</kbd>
    </div>
    {}
    <div className="max-h-80 overflow-y-auto">
     {query.length < 2 ? (
      <div className="px-5 py-8 text-center">
       <p className="text-slate-400 text-sm font-medium">Type at least 2 characters to search across all modules.</p>
       <div className="flex flex-wrap gap-2 justify-center mt-4">
        {['invoices','clients','expenses','vendors','reports'].map(v=>(
         <button key={v} onClick={()=>{onNavigate(v);onClose();}} className="text-xs font-bold px-3 py-1.5 bg-slate-50 hover:bg-violet-50 hover:text-violet-600 text-slate-500 rounded-xl transition-colors capitalize">{v}</button>
        ))}
       </div>
      </div>
     ) : results.length === 0 ? (
      <div className="px-5 py-8 text-center text-slate-400 text-sm font-medium">No results for "{query}"</div>
     ) : (
      <div className="py-2">
       {results.map((r, i) => (
        <button key={i} onClick={()=>{ if(r.clientObj) onNavigate('client-profile', r.clientObj); else onNavigate(r.view); onClose(); }}
         className="w-full flex items-center gap-3 px-5 py-3 hover:bg-violet-50 transition-colors text-left group">
         <span className="text-lg flex-shrink-0">{r.icon}</span>
         <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{r.label}</p>
          {r.sub && <p className="text-xs text-slate-400 truncate">{r.sub}</p>}
         </div>
         <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${typeColor[r.type]||'bg-slate-100 text-slate-500'}`}>{r.type}</span>
         <ChevronRight size={14} className="text-slate-300 group-hover:text-violet-400 transition-colors flex-shrink-0"/>
        </button>
       ))}
      </div>
     )}
    </div>
    {}
    <div className="px-5 py-2.5 border-t border-slate-50 flex gap-4">
     <span className="text-xs text-slate-300 font-medium">↵ open</span>
     <span className="text-xs text-slate-300 font-medium">ESC close</span>
     <span className="text-xs text-slate-300 font-medium ml-auto">Results: {results.length}</span>
    </div>
   </div>
  </div>
 );
};
const FloatingActionButton = ({ onAction, canWrite }) => {
 const [open, setOpen] = useState(false);
 if (!canWrite) return null;
 const actions = [
  { label:'New Invoice',   view:'invoices',     icon:'📄', color:'bg-violet-500 hover:bg-violet-600' },
  { label:'New Expense',   view:'expenses',     icon:'💸', color:'bg-rose-500 hover:bg-rose-600' },
  { label:'Cash Out',      view:'petty-cash',   icon:'💰', color:'bg-amber-500 hover:bg-amber-600', type:'out' },
  { label:'New Quote',     view:'quotations',   icon:'📋', color:'bg-amber-400 hover:bg-amber-500' },
  { label:'New Client',    view:'clients',      icon:'👥', color:'bg-sky-500 hover:bg-sky-600' },
 ];
 return (
  <div className="fixed bottom-8 right-8 z-50 flex flex-col-reverse items-end gap-3">
   {open && actions.map((a, i) => (
    <div key={i} className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-150" style={{animationDelay:`${i*40}ms`}}>
     <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap">{a.label}</span>
     <button onClick={()=>{ onAction(a.view, a.type); setOpen(false); }}
      className={`w-12 h-12 rounded-2xl ${a.color} text-white shadow-lg flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95`}>
      {a.icon}
     </button>
    </div>
   ))}
   <button onClick={()=>setOpen(o=>!o)}
    className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${open ? 'bg-slate-700 rotate-45' : 'bg-gradient-to-br from-violet-600 to-fuchsia-600'}`}>
    <Plus size={26} className="text-white"/>
   </button>
  </div>
 );
};


function App() {
 const toast = useToast();
 const { user: currentUser, isAuthenticated, login, logout, canWrite, canDelete, authError, setAuthError, isLoading: authLoading } = useAuth();
 const {
  clients, vendors, expenses, pettyCash, salaries, bankRecords,
  invoices, quotations, vendorBills, users, appSettings, setAppSettings,
  expenseCategories, setExpenseCategories,
  setClients, setVendors, setExpenses, setPettyCash, setSalaries,
  setBankRecords, setInvoices, setQuotations, setVendorBills, setUsers,
  isInitialLoading, refresh, refreshUsers, mutations,
 } = useData();
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
 const [showPaymentModal, setShowPaymentModal] = useState(false);
 const [paymentConfig, setPaymentConfig] = useState(null);
 const [paymentAccount, setPaymentAccount] = useState('bank');
 const [clientWHT, setClientWHT] = useState('');
 const [partialAmount, setPartialAmount] = useState('');
 const [showSalarySlip, setShowSalarySlip] = useState(false);
 const [selectedClientProfile, setSelectedClientProfile] = useState(null);
 const [selectedVendorProfile, setSelectedVendorProfile] = useState(null);
 const [deleteConfirm, setDeleteConfirm] = useState(null);
 const [showCommandPalette, setShowCommandPalette] = useState(false);
 const [newInvoiceForClient, setNewInvoiceForClient] = useState(null);
 // Derive companyProfile from appSettings
 const companyProfile = appSettings.companyProfile || {};
 const setCompanyProfile = (updater) => {
  const newProfile = typeof updater === 'function' ? updater(companyProfile) : updater;
  setAppSettings(prev => ({ ...prev, companyProfile: newProfile }));
 };
 useEffect(() => {
 if (appSettings.darkMode) {
  document.documentElement.classList.add('dark');
 } else {
  document.documentElement.classList.remove('dark');
 }
 }, [appSettings.darkMode]);
 useEffect(() => {
 const handler = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowCommandPalette(p => !p); }
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && showForm) {
  e.preventDefault();
  const form = document.getElementById('main-slide-form');
  if (form) form.requestSubmit();
  }
  if (e.key === 'Escape') {
  if (showCommandPalette) setShowCommandPalette(false);
  else if (showForm) setShowForm(false);
  }
 };
 window.addEventListener('keydown', handler);
 return () => window.removeEventListener('keydown', handler);
 }, [showForm, showCommandPalette]);
 React.useEffect(() => {
 try {
  _currencyFormatter = new Intl.NumberFormat(appSettings.locale || 'en-PK', {
  style: 'currency', currency: appSettings.currency || 'PKR', maximumFractionDigits: 0
  });
 } catch(e) {  }
 }, [appSettings.currency, appSettings.locale]);
 // data from DataContext
 // data from DataContext
 // data from DataContext
 // data from DataContext
 // data from DataContext
 // data from DataContext
 // data from DataContext
 // data from DataContext
 // data from DataContext
 // users provided by DataContext
 // Default admin creation handled by server on first login
 const handleLogin = async (loginInput, password) => {
  setIsSubmitting(true);
  const result = await login(loginInput, password);
  setIsSubmitting(false);
  if (result.success) setView('dashboard');
 };
 const handleLogout = () => { logout(); setView('dashboard'); };
 // ── Delete with confirmation ─────────────────────────────────────────────────
 const handleDelete = (id, type, label = '') => {
  if (currentUser.role !== 'Admin') return toast('Access denied. Admin role required.', 'error');
  setDeleteConfirm({ id, type, label });
 };
 const confirmDelete = async () => {
  if (!deleteConfirm) return;
  const { id, type } = deleteConfirm;
  const apiMap = {
   'petty': { api: pettyCashAPI, setter: setPettyCash },
   'expense': { api: expensesAPI, setter: setExpenses },
   'salary': { api: salariesAPI, setter: setSalaries },
   'bank': { api: bankRecordsAPI, setter: setBankRecords },
   'client': { api: clientsAPI, setter: setClients },
   'vendor': { api: vendorsAPI, setter: setVendors },
   'user': { api: usersAPI, setter: setUsers },
   'invoice': { api: invoicesAPI, setter: setInvoices },
   'bill': { api: vendorBillsAPI, setter: setVendorBills },
   'quotation': { api: quotationsAPI, setter: setQuotations },
  };
  const entry = apiMap[type];
  if (entry) {
   try {
    await entry.api.delete(id);
    entry.setter(prev => prev.filter(item => item.id !== id));
    toast('Record deleted.', 'info');
   } catch (e) { toast('Delete failed.', 'error'); }
  }
  setDeleteConfirm(null);
 };
 const validateForm = () => {
 const d = formData;
 const err = (msg) => { toast(msg, 'warning'); return false; };
 if (view === 'petty-cash') {
  if (!d.date) return err('Please select a date.');
  if (!d.description?.trim()) return err('Description is required.');
  if ((!Number(d.cashIn) && !Number(d.cashOut)) || (Number(d.cashIn) < 0 || Number(d.cashOut) < 0))
  return err('Enter a valid Cash In or Cash Out amount.');
  return true;
 }
 if (view === 'expenses') {
  if (!d.date) return err('Please select a date.');
  if (!d.description?.trim()) return err('Description is required.');
  if (!Number(d.amount) || Number(d.amount) <= 0) return err('Please enter a valid amount greater than 0.');
  return true;
 }
 if (view === 'salaries') {
  if (!d.date) return err('Please select a payment date.');
  if (!d.employeeName?.trim()) return err('Employee name is required.');
  if (!Number(d.basicSalary) || Number(d.basicSalary) <= 0) return err('Please enter a valid basic salary.');
  return true;
 }
 if (view === 'bank') {
  if (!d.date) return err('Please select a date.');
  if (!d.bank?.trim()) return err('Bank name is required.');
  if (!d.amount || d.amount === '0') return err('Please enter a valid transaction amount.');
  return true;
 }
 if (view === 'clients') {
  if (!d.name?.trim()) return err('Client name is required.');
  return true;
 }
 if (view === 'vendors') {
  if (!d.name?.trim()) return err('Vendor name is required.');
  return true;
 }
 if (view === 'vendor-bills') {
  if (!d.date) return err('Please select a bill date.');
  if (!d.vendor) return err('Please select a vendor.');
  if (!Number(d.billAmount) || Number(d.billAmount) <= 0) return err('Please enter a valid bill amount.');
  return true;
 }
 if (view === 'manage-users') {
  if (!d.username?.trim()) return err('Username is required.');
  if (!d.email?.trim()) return err('Email address is required.');
  if (!isEditingUser && !d.password?.trim()) return err('Password is required for new users.');
  return true;
 }
 return true;
 };
 const handleEdit = (item) => { if (currentUser.role !== 'Admin') return toast('Access denied. Admin role required.', 'error'); setFormData({ ...item }); setIsEditingRecord(true); setShowForm(true); };
 const handleDuplicate = (item) => { const { id, createdAt, lastEditedAt, ...dataToCopy } = item; setFormData({ ...dataToCopy, date: new Date().toISOString().split('T')[0] }); setIsEditingRecord(false); setShowForm(true); };
 const handleMasterExport = async () => {
  try {
   const res = await settingsAPI.exportData();
   const jsonString = JSON.stringify(res.data, null, 2);
   const blob = new Blob([jsonString], { type: 'application/json' });
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.download = `LeanAxis_Backup_${new Date().toISOString().split('T')[0]}.json`;
   document.body.appendChild(link); link.click(); document.body.removeChild(link);
   URL.revokeObjectURL(url);
   toast('Backup downloaded!', 'success');
  } catch (e) { toast('Export failed.', 'error'); }
 };
 const handleImport = async (event) => {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
   try {
    const importedData = JSON.parse(e.target.result);
    const res = await settingsAPI.importData(importedData);
    toast(res.data.message || 'Import successful!', 'success');
    setTimeout(() => refresh(), 1000);
   } catch (error) {
    console.error("Import failed:", error);
    toast("Failed to import data. Check file format.", 'error');
   }
  };
  reader.readAsText(file);
 };
 const handleGenerateRecurring = async () => {
  try {
   const res = await invoicesAPI.generateRecurring();
   toast(res.data.message || 'Recurring invoices generated!', res.data.count > 0 ? 'success' : 'info');
   refresh();
  } catch (e) { toast('Failed to generate recurring invoices.', 'error'); }
 };
 const handleGenerateRecurringExpenses = async () => {
  try {
   const res = await settingsAPI.generateRecurringExpenses();
   toast(res.data.message || 'Recurring expenses generated!', res.data.count > 0 ? 'success' : 'info');
   refresh();
  } catch (e) { toast('Failed to generate recurring expenses.', 'error'); }
 };
 const handleConvertToInvoice = async (quote) => {
  try {
   const res = await settingsAPI.convertQuote(quote.id);
   setInvoices(prev => [res.data.invoice, ...prev]);
   setQuotations(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'Converted' } : q));
   toast('Quotation converted to Invoice!', 'success');
  } catch (e) {
   toast('Error converting quotation.', 'error');
  }
 };
 const getApiForView = (viewName) => {
  const map = {
   'manage-users': { api: usersAPI, setter: setUsers },
   'petty-cash': { api: pettyCashAPI, setter: setPettyCash },
   'expenses': { api: expensesAPI, setter: setExpenses },
   'salaries': { api: salariesAPI, setter: setSalaries },
   'bank': { api: bankRecordsAPI, setter: setBankRecords },
   'clients': { api: clientsAPI, setter: setClients },
   'vendors': { api: vendorsAPI, setter: setVendors },
   'vendor-bills': { api: vendorBillsAPI, setter: setVendorBills },
  };
  return map[viewName];
 };
 const handleAddSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  const isNew = !isEditingRecord && !isEditingUser;
  const entry = getApiForView(view);
  if (!entry) return;
  setIsSubmitting(true);
  try {
   let data = { ...formData, date: formData.date || new Date().toISOString().split('T')[0] };
   // Handle file upload if any
   if (fileToUpload && appSettings.imgbbKey) {
    try {
     const res = await settingsAPI.uploadLogo(
      await toBase64(fileToUpload),
      appSettings.imgbbKey
     );
     data.proofUrl = res.data.url;
    } catch (e) { toast('File upload failed. Record will be saved without attachment.', 'warning'); }
   }
   if (isNew) {
    const created = await entry.api.create(data);
    entry.setter(prev => [created.data, ...prev]);
    if (view === 'vendor-bills') {
     setAppSettings(prev => ({...prev, billCounter: (Number(prev.billCounter)||1) + 1}));
    }
   } else {
    const updated = await entry.api.update(data.id, data);
    entry.setter(prev => prev.map(item => item.id === data.id ? updated.data : item));
   }
   setShowForm(false); setFormData({}); setFileToUpload(null);
   setIsEditingRecord(false); setIsEditingUser(false);
   toast('Record saved successfully!', 'success');
  } catch (err) {
   toast(err.response?.data?.error || 'Error saving record. Please try again.', 'error');
  } finally { setIsSubmitting(false); }
 };
 const toBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
 });
 const initiatePayment = (item, type, amount) => { setPaymentConfig({ data: item, type, amount }); setPaymentAccount('bank'); setClientWHT(''); setPartialAmount(String(amount)); setShowPaymentModal(true); };
 const executePayment = async () => {
  if (!paymentConfig) return;
  const { data, type } = paymentConfig;
  setIsSubmitting(true);
  try {
   if (type === 'bill') {
    const paying = Number(partialAmount) || paymentConfig.amount;
    const res = await vendorBillsAPI.recordPayment(data.id, { partialAmount: paying, paymentAccount });
    setVendorBills(prev => prev.map(b => b.id === data.id
     ? { ...b, paidAmount: res.data.paidAmount, status: res.data.status }
     : b
    ));
   } else if (type === 'invoice') {
    const paying = Number(partialAmount) || paymentConfig.amount;
    const wht = Number(clientWHT) || 0;
    const res = await invoicesAPI.recordPayment(data.id, {
     partialAmount: paying, clientWHT: wht, paymentAccount
    });
    setInvoices(prev => prev.map(inv => inv.id === data.id
     ? { ...inv, status: res.data.status, amountReceived: res.data.amountReceived }
     : inv
    ));
   }
   setShowPaymentModal(false);
   toast('Payment recorded successfully!', 'success');
   refresh(); // refresh to get updated bank/petty records
  } catch (e) {
   console.error(e);
   toast(e.response?.data?.error || 'Error recording payment. Please try again.', 'error');
  } finally { setIsSubmitting(false); }
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
 const inFilter = (dateStr) => {
  if (selectedMonth === 'All' && selectedYear === 'All') return true;
  const d = new Date(dateStr);
  if (isNaN(d)) return true;
  const monthMatch = selectedMonth === 'All' || d.toLocaleString('default', { month: 'long' }) === selectedMonth;
  const yearMatch = selectedYear === 'All' || d.getFullYear().toString() === selectedYear;
  return monthMatch && yearMatch;
 };
 const paidInvoices = invoices.filter(inv => inv.status === 'Paid' && inFilter(inv.date));
 const invoiceRevenue = paidInvoices.reduce((a, inv) => {
  const received = Number(inv.amountReceived);
  const total = calculateTax(
  (inv.items || []).reduce((s, it) => s + ((it.qty || 0) * (it.rate || 0)), 0),
  inv.taxRate
  ).total;
  return a + (received > 0 ? received : total);
 }, 0);
 // Invoice payments via petty cash get description "Inv Payment: ..." — exclude those from double count
 const manualPettyCashIn = filteredPetty.filter(r =>
  !(r.description || '').toLowerCase().startsWith('inv payment:')
 ).reduce((a, c) => a + (Number(c.cashIn) || 0), 0);
 const rev = invoiceRevenue + manualPettyCashIn;
 const expenseTotal = filteredExp.reduce((a, c) => a + (Number(c.amount) || 0), 0);
 const salaryTotal = filteredSal.reduce((a, c) => a + (Number(c.totalPayable) || 0), 0);
 const pettyCashOut = filteredPetty.reduce((a, c) => a + (Number(c.cashOut) || 0), 0);
 const exp = expenseTotal + salaryTotal + pettyCashOut;
 const totalVendorBills = filteredBills.reduce((a, c) => a + (Number(c.amount) || 0), 0);
 const totalVendorPaid = filteredBills.reduce((a, c) => a + (Number(c.paidAmount) || 0), 0);
 const unpaidInvoicesTotal = invoices
  .filter(inv => inv.status !== 'Paid')
  .reduce((a, inv) => a + calculateTax(
  (inv.items || []).reduce((s, it) => s + ((it.qty || 0) * (it.rate || 0)), 0),
  inv.taxRate
  ).total, 0);
 const today = new Date(); today.setHours(0, 0, 0, 0);
 const overdueCount = invoices.filter(inv =>
  inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < today
 ).length;
 const invoiceRevenueBreakdown = invoiceRevenue;
 const pettyCashInBreakdown = manualPettyCashIn;
 return {
  revenue: rev,
  expense: exp,
  profit: rev - exp,
  vendorPending: totalVendorBills - totalVendorPaid,
  clientPending: unpaidInvoicesTotal,
  overdueCount,
  invoiceRevenueBreakdown,
  pettyCashInBreakdown,
  expenseTotal,
  salaryTotal,
  pettyCashOut,
 };
 }, [filteredPetty, filteredExp, filteredSal, invoices, filteredBills, selectedMonth, selectedYear]);
 const expenseChartData = [ { name: 'Petty', value: filteredPetty.reduce((a,c) => a+(Number(c.cashOut)||0),0) }, { name: 'Expenses', value: filteredExp.reduce((a,c) => a+(Number(c.amount)||0),0) }, { name: 'Salaries', value: filteredSal.reduce((a,c) => a+(Number(c.totalPayable)||0),0) } ].filter(d => d.value > 0);
 const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B'];
 const monthlyChartData = useMemo(() => {
 const months = [];
 for (let i = 5; i >= 0; i--) {
  const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
  const monthName = d.toLocaleString('default', { month: 'short' });
  const year = d.getFullYear();
  const mIdx = d.getMonth();
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
  const exp = [
  ...expenses.filter(r => new Date(r.date || r.createdAt).getMonth() === mIdx && new Date(r.date || r.createdAt).getFullYear() === year).map(r => Number(r.amount)||0),
  ...salaries.filter(r => new Date(r.date || r.createdAt).getMonth() === mIdx && new Date(r.date || r.createdAt).getFullYear() === year).map(r => Number(r.totalPayable)||0),
  ...pettyCash.filter(r => new Date(r.date).getMonth() === mIdx && new Date(r.date).getFullYear() === year).map(r => Number(r.cashOut)||0),
  ].reduce((a, v) => a + v, 0);
  months.push({ name: monthName, Revenue: Math.round(rev), Expenses: Math.round(exp) });
 }
 return months;
 }, [invoices, expenses, salaries, pettyCash]);
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
   {type !== 'user' && canWrite && <button onClick={() => handleDuplicate(item)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors shadow-sm" title="Duplicate"><Copy size={16} /></button>}
   {canWrite && (
   <button onClick={() => type === 'user' ? (setFormData({...item}), setIsEditingUser(true), setShowForm(true)) : handleEdit(item)} className="p-2 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors shadow-sm"><Edit size={16} /></button>
   )}
   {canDelete && (
   <button onClick={() => type === 'user' ? handleDelete(item.id, 'user', item.username) : handleDelete(item.id, type, item.name || item.employeeName || item.description || '')} className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors shadow-sm"><Trash2 size={16} /></button>
   )}
  </div>
 );
 const handleGenericImport = (event, collectionName) => {
  const file = event.target.files[0]; if (!file) return;
  (async (f, col) => {
   const Papa = (await import('papaparse')).default;
   Papa.parse(f, { header: true, complete: async (results) => {
    if (results.data.length === 0) return toast("File is empty!", 'warning');
    const validRows = results.data.filter(row => Object.values(row).some(v => v));
    try {
     const res = await settingsAPI.importData({ [col]: validRows });
     toast(res.data.message || "Import successful!", 'success');
     refresh();
    } catch(e) { toast("Import failed.", 'error'); }
   }});
  })(file, collectionName)
 };
 if (!isAuthenticated) return <LoginView onLogin={handleLogin} loading={isSubmitting} error={authError} />;
 return (
 <div className={`min-h-screen font-sans selection:bg-violet-100 selection:text-violet-900 ${appSettings.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
  {}
  <GlobalCommandPalette
  isOpen={showCommandPalette}
  onClose={() => setShowCommandPalette(false)}
  invoices={invoices} clients={clients} expenses={expenses}
  vendors={vendors} quotations={quotations} vendorBills={vendorBills}
  pettyCash={pettyCash} bankRecords={bankRecords} salaries={salaries}
  onNavigate={(v, obj) => {
   if (v === 'client-profile' && obj) { setSelectedClientProfile(obj); setView('client-profile'); }
   else setView(v);
  }}
  />
  {}
  {isAuthenticated && (
  <FloatingActionButton canWrite={canWrite} onAction={(targetView, type) => {
   setView(targetView);
   if (targetView === 'petty-cash') {
   const prefix = appSettings.billPrefix||'BILL';
   setFormData({ date: new Date().toISOString().split('T')[0], _entryType: type || 'out' });
   } else if (targetView === 'invoices') {
   } else {
   setFormData({ date: new Date().toISOString().split('T')[0] });
   setIsEditingRecord(false);
   setShowForm(true);
   }
  }}/>
  )}
  {}
  <div className="md:hidden fixed top-0 w-full bg-[#0F172A]/95 backdrop-blur-md border-b border-white/5 p-4 z-50 flex justify-between items-center shadow-lg">
  <Logo white={true} companyName={companyProfile?.name} tagline={companyProfile?.tagline} />
  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/5"><Menu size={24}/></button>
  </div>
  {}
  <aside className={`fixed inset-y-0 left-0 z-40 w-80 bg-[#0F172A] flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-2xl overflow-hidden`}>
  {}
  <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
  <div className="p-8 pb-4 relative z-10">
   <Logo white={true} className="mb-8" companyName={companyProfile?.name} tagline={companyProfile?.tagline} />
   <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-4">Main Menu</div>
  </div>
  <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto relative z-10 py-2">
   <NavButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
   <div className="pt-5 pb-1.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">Sales</div>
   <NavButton id="quotations" icon={FileCheck} label="Quotations" />
   <NavButton id="invoices" icon={FileText} label="Invoices" />
   <NavButton id="clients" icon={Briefcase} label="Clients" />
   <div className="pt-5 pb-1.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">Expenses</div>
   <NavButton id="expenses" icon={Receipt} label="Expenses" />
   <NavButton id="petty-cash" icon={Wallet} label="Petty Cash" />
   <NavButton id="vendors" icon={Truck} label="Vendors" />
   <NavButton id="vendor-bills" icon={FileText} label="Vendor Bills" />
   <div className="pt-5 pb-1.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">Finance</div>
   <NavButton id="salaries" icon={Users} label="Team Salaries" />
   <NavButton id="bank" icon={Building2} label="Bank Accounts" />
   <NavButton id="receivables-payables" icon={CreditCard} label="Receivables & Payables" />
   <div className="pt-5 pb-1.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">Reports</div>
   <NavButton id="reports" icon={FileText} label="P&L Analytics" />
   <NavButton id="tax-report" icon={Landmark} label="Tax Liability" />
   <NavButton id="statements" icon={BookOpen} label="Client Statements" />
   {currentUser.role === 'Admin' && (
    <>
    <div className="pt-5 pb-1.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">Admin</div>
    <NavButton id="manage-users" icon={UserPlus} label="User Management" />
    <NavButton id="settings" icon={Settings} label="Configuration" />
    <button onClick={handleMasterExport} className="w-full flex items-center gap-4 px-5 py-3 rounded-2xl text-emerald-400 hover:bg-emerald-500/10 transition-all font-bold text-sm tracking-wide group">
     <Database size={18} className="group-hover:scale-110 transition-transform flex-shrink-0"/> Backup Data
    </button>
    </>
   )}
  </nav>
  <div className="p-6 border-t border-slate-800 bg-[#0F172A] relative z-20">
   <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl bg-slate-800/50 text-slate-300 hover:bg-rose-600 hover:text-white transition-all font-bold text-sm shadow-lg"><Lock size={16}/> Sign Out</button>
  </div>
  </aside>
  {}
  {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/80 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>}
  {}
  <main className="md:ml-80 min-h-screen pt-24 md:pt-10 p-6 md:p-10 transition-all duration-300">
  <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
   <div>
    <h2 className="text-4xl font-extrabold text-slate-900 capitalize tracking-tight mb-1">
     {view === 'client-profile' && selectedClientProfile ? selectedClientProfile.name :
     view === 'vendor-profile' && selectedVendorProfile ? selectedVendorProfile.name :
     view === 'receivables-payables' ? 'Receivables & Payables' :
     view === 'tax-report' ? 'Tax Liability' :
     view === 'salaries' ? 'Team Salaries' :
     view === 'expenses' ? 'Expenses' :
     view === 'vendors' ? 'Vendors' :
     view === 'vendor-bills' ? 'Vendor Bills' :
     view === 'manage-users' ? 'User Management' :
     view === 'bank' ? 'Bank Accounts' :
     view === 'petty-cash' ? 'Petty Cash' :
     view.replace(/-/g, ' ')}
    </h2>
    <p className="text-slate-500 font-medium">{view === 'salaries' ? 'Payroll, payslips & employee analytics' : view === 'expenses' ? 'Business expenses, categories & tax credits' : view === 'petty-cash' ? 'Cash float, ledger & expense tracking' : view === 'vendors' ? 'Suppliers, service vendors & payables' : view === 'vendor-bills' ? 'Bills, WHT tracking & payment status' : view === 'manage-users' ? 'Team accounts, roles & access control' : view === 'bank' ? 'Transactions, cash flow & account ledger' : 'Overview & Management'}</p>
   </div>
   <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
    {!['dashboard','receivables-payables','client-profile','vendor-profile','tax-report','reports','statements','clients','salaries','petty-cash','expenses','vendors','vendor-bills','manage-users','bank'].includes(view) && <div className="relative flex-1 sm:w-72 group"><Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20}/><input className="w-full pl-12 pr-4 py-3 rounded-2xl border-none bg-white shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium text-slate-600" placeholder="Search records..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>}
    {['clients'].includes(view) && (
     <div className="flex gap-3">
      <label className="bg-white px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-violet-300 hover:text-violet-600 transition-all cursor-pointer flex items-center gap-2">
       <Upload size={18}/> <span className="hidden sm:inline">Import</span> <input type="file" className="hidden" accept=".csv" onChange={(e) => handleGenericImport(e, view === 'petty-cash' ? 'petty_cash' : view === 'vendor-bills' ? 'vendor_bills' : view)}/>
      </label>
      <button onClick={() => { const dataMap = { 'clients': filteredClients, 'vendors': filteredVendors, 'petty-cash': filteredPetty, 'expenses': filteredExp, 'salaries': filteredSal, 'bank': bankRecords, 'vendor-bills': filteredBills }; exportToCSV(dataMap[view], `${view}_Export`); }} className="bg-white px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-violet-300 hover:text-violet-600 transition-all flex items-center gap-2">
       <Download size={18}/> <span className="hidden sm:inline">Export</span>
      </button>
     </div>
    )}
    {canWrite && !['dashboard','reports','invoices','settings','statements','quotations','receivables-payables','client-profile','vendor-profile','tax-report','clients','salaries','petty-cash','expenses','vendors','vendor-bills','manage-users','bank'].includes(view) && <button onClick={()=>{setShowForm(true);setFormData({});setIsEditingUser(false);setIsEditingRecord(false);}} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 hover:scale-105 active:scale-95 transition-all"><Plus size={20}/> New Entry</button>}
   </div>
  </header>
  {view === 'dashboard' && (
   <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
    {}
    {(() => {
     const today = new Date(); today.setHours(0,0,0,0);
     const todayStr = today.toISOString().split('T')[0];
     const dueToday = invoices.filter(i => i.status !== 'Paid' && i.dueDate === todayStr).length;
     const billsDueToday = vendorBills.filter(b => b.status !== 'Paid' && b.dueDate === todayStr).length;
     const bankTotal = bankRecords.reduce((a,r) => a + (Number(r.amount)||0) * (r.type === 'credit' || Number(r.amount) > 0 ? 1 : -1), 0);
     const cashFloat = (appSettings.pettyCashOpeningBalance||0) + pettyCash.reduce((a,r) => a + (Number(r.cashIn)||0) - (Number(r.cashOut)||0), 0);
     const thisMonthExp = expenses.filter(e => e.date && e.date.startsWith(todayStr.slice(0,7))).reduce((a,e)=>a+(Number(e.amount)||0), 0);
     const lastMonthStart = new Date(today.getFullYear(), today.getMonth()-1, 1).toISOString().slice(0,7);
     const lastMonthRev = invoices.filter(i => i.status === 'Paid' && i.paidDate && i.paidDate.startsWith(lastMonthStart)).reduce((a,i)=>a+calculateTax((i.items||[]).reduce((s,it)=>s+(it.qty||0)*(it.rate||0),0),i.taxRate).total,0);
     const thisMonthRev = invoices.filter(i => i.status === 'Paid' && i.paidDate && i.paidDate.startsWith(todayStr.slice(0,7))).reduce((a,i)=>a+calculateTax((i.items||[]).reduce((s,it)=>s+(it.qty||0)*(it.rate||0),0),i.taxRate).total,0);
     const netProfit = thisMonthRev - thisMonthExp;
     const lastNetProfit = lastMonthRev - expenses.filter(e => e.date && e.date.startsWith(lastMonthStart)).reduce((a,e)=>a+(Number(e.amount)||0),0);
     const profitTrend = lastNetProfit !== 0 ? ((netProfit - lastNetProfit) / Math.abs(lastNetProfit) * 100).toFixed(0) : null;
     return (
      <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700 rounded-3xl p-6 text-white shadow-xl shadow-violet-200">
       <div className="flex items-center justify-between mb-5">
        <div>
         <p className="text-violet-200 text-xs font-bold uppercase tracking-widest">Today at a Glance</p>
         <h2 className="text-xl font-extrabold mt-0.5">{today.toLocaleDateString('en-US', {weekday:'long', day:'numeric', month:'long'})}</h2>
        </div>
        {profitTrend !== null && (
         <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${Number(profitTrend) >= 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
          {Number(profitTrend) >= 0 ? <TrendingUp size={15}/> : <TrendingDown size={15}/>}
          {Number(profitTrend) >= 0 ? '+' : ''}{profitTrend}% vs last month
         </div>
        )}
       </div>
       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
         <p className="text-violet-200 text-xs font-bold uppercase tracking-wide mb-1">Bank Balance</p>
         <p className="text-2xl font-extrabold tabular-nums">{formatCurrency(bankTotal)}</p>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
         <p className="text-violet-200 text-xs font-bold uppercase tracking-wide mb-1">Cash Float</p>
         <p className="text-2xl font-extrabold tabular-nums">{formatCurrency(cashFloat)}</p>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
         <p className="text-violet-200 text-xs font-bold uppercase tracking-wide mb-1">This Month Net</p>
         <p className={`text-2xl font-extrabold tabular-nums ${netProfit < 0 ? 'text-rose-300' : ''}`}>{formatCurrency(netProfit)}</p>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
         <p className="text-violet-200 text-xs font-bold uppercase tracking-wide mb-1">Due Today</p>
         <p className="text-2xl font-extrabold">{dueToday + billsDueToday}</p>
         <p className="text-violet-300 text-xs mt-0.5">{dueToday} inv · {billsDueToday} bills</p>
        </div>
       </div>
      </div>
     );
    })()}
    {}
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
    {}
    {(() => {
     const today = new Date(); today.setHours(0,0,0,0);
     const in7 = new Date(today); in7.setDate(today.getDate() + 7);
     const dueSoon = invoices.filter(inv => {
      if (inv.status === 'Paid') return false;
      if (!inv.dueDate) return false;
      const d = new Date(inv.dueDate);
      return d >= today && d <= in7;
     }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
     if (dueSoon.length === 0) return null;
     return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
       <div className="flex items-center gap-3 mb-3">
        <div className="bg-amber-100 p-2 rounded-xl"><Calendar className="text-amber-600" size={18}/></div>
        <p className="font-bold text-amber-800">{dueSoon.length} invoice{dueSoon.length !== 1 ? 's' : ''} due in the next 7 days</p>
       </div>
       <div className="space-y-2">
        {dueSoon.slice(0,4).map(inv => {
         const total = calculateTax((inv.items||[]).reduce((s,it)=>s+((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)),0), inv.taxRate).total;
         const balance = total - (Number(inv.amountReceived)||0);
         const daysLeft = Math.ceil((new Date(inv.dueDate) - today) / 86400000);
         return (
          <div key={inv.id} onClick={() => setView('invoices')} className="flex justify-between items-center bg-white rounded-xl px-4 py-2.5 cursor-pointer hover:bg-amber-50 transition-colors">
           <div>
            <span className="font-bold text-slate-800 text-sm">{inv.client}</span>
            {inv.invoiceNumber && <span className="text-slate-400 text-xs ml-2">#{inv.invoiceNumber}</span>}
           </div>
           <div className="flex items-center gap-3">
            <span className="font-extrabold text-amber-700 text-sm">{formatCurrency(balance)}</span>
            <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{daysLeft === 0 ? 'Today' : `${daysLeft}d`}</span>
           </div>
          </div>
         );
        })}
       </div>
      </div>
     );
    })()}
    {}
    {(() => {
     const today = new Date(); today.setHours(0,0,0,0);
     const in7 = new Date(today); in7.setDate(today.getDate() + 7);
     const dueSoon = vendorBills.filter(b => {
      if (b.status === 'Paid') return false;
      if (!b.dueDate) return false;
      const d = new Date(b.dueDate);
      return d >= today && d <= in7;
     }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
     if (dueSoon.length === 0) return null;
     return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
       <div className="flex items-center gap-3 mb-3">
        <div className="bg-rose-100 p-2 rounded-xl"><Truck className="text-rose-600" size={18}/></div>
        <p className="font-bold text-rose-800">{dueSoon.length} vendor bill{dueSoon.length !== 1 ? 's' : ''} due in the next 7 days</p>
       </div>
       <div className="space-y-2">
        {dueSoon.slice(0,4).map(b => {
         const due = (Number(b.amount)||0) - (Number(b.paidAmount)||0);
         const daysLeft = Math.ceil((new Date(b.dueDate) - today) / 86400000);
         return (
          <div key={b.id} onClick={() => setView('vendor-bills')} className="flex justify-between items-center bg-white rounded-xl px-4 py-2.5 cursor-pointer hover:bg-rose-50 transition-colors">
           <div>
            <span className="font-bold text-slate-800 text-sm">{b.vendor}</span>
            {b.billNumber && <span className="text-slate-400 text-xs ml-2">#{b.billNumber}</span>}
           </div>
           <div className="flex items-center gap-3">
            <span className="font-extrabold text-rose-700 text-sm">{formatCurrency(due)}</span>
            <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">{daysLeft === 0 ? 'Today' : `${daysLeft}d`}</span>
           </div>
          </div>
         );
        })}
       </div>
      </div>
     );
    })()}
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
    {}
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
        const outstanding = invoices.filter(inv => (inv.client||'').toLowerCase().trim() === (c.name||'').toLowerCase().trim() && inv.status !== 'Paid').reduce((a, inv) => a + calculateTax((inv.items||[]).reduce((s,it)=>s+((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)),0), inv.taxRate).total, 0);
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
    {}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
     {}
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
     {}
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
  {view === 'reports' && (() => {
   const months = [];
   const now = new Date();
   for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const inFilter = (ds) => { if (!ds) return false; const dt = new Date(ds); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}` === key; };
    const mRevenue = invoices.filter(inv => inv.status==='Paid' && inFilter(inv.paidDate||inv.date)).reduce((a,inv) => {
     const r = Number(inv.amountReceived); const t = calculateTax((inv.items||[]).reduce((s,it)=>s+((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)),0),inv.taxRate).total;
     return a + (r > 0 ? r : t);
    }, 0) + pettyCash.filter(r => inFilter(r.date) && !(r.description||'').toLowerCase().startsWith('inv payment:')).reduce((a,r)=>a+(Number(r.cashIn)||0),0);
    const mExpenses = expenses.filter(e => inFilter(e.date)).reduce((a,e)=>a+(Number(e.amount)||0),0);
    const mSalaries = salaries.filter(s => inFilter(s.date)).reduce((a,s)=>a+(Number(s.totalPayable)||0),0);
    const mPettyCash = pettyCash.filter(r => inFilter(r.date)).reduce((a,r)=>a+(Number(r.cashOut)||0),0);
    const mTotal = mExpenses + mSalaries + mPettyCash;
    const mProfit = mRevenue - mTotal;
    months.push({ key, label, revenue: mRevenue, expenses: mExpenses, salaries: mSalaries, petty: mPettyCash, total: mTotal, profit: mProfit });
   }
   const ytdRevenue = months.reduce((a,m)=>a+m.revenue,0);
   const ytdExpenses = months.reduce((a,m)=>a+m.total,0);
   const ytdProfit = ytdRevenue - ytdExpenses;
   return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
     {}
     <div className="flex justify-between items-center">
      <div>
       <h2 className="text-2xl font-extrabold text-slate-900">Profit & Loss Report</h2>
       <p className="text-slate-500 text-sm font-medium mt-0.5">12-month rolling view · {selectedMonth !== 'All' || selectedYear !== 'All' ? `Filtered: ${selectedMonth !== 'All' ? selectedMonth : ''} ${selectedYear !== 'All' ? selectedYear : ''}` : 'All time'}</p>
      </div>
      <button onClick={() => printDocument('pl-report-printable', 'P&L Report')} className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors shadow-lg">
       <Printer size={16}/> Print / PDF
      </button>
     </div>
     {}
     <div className="grid grid-cols-3 gap-4">
      <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl">
       <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">12-Month Revenue</p>
       <p className="text-2xl font-extrabold text-emerald-800">{formatCurrency(ytdRevenue)}</p>
      </div>
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-3xl">
       <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">12-Month Expenses</p>
       <p className="text-2xl font-extrabold text-rose-800">{formatCurrency(ytdExpenses)}</p>
      </div>
      <div className={`border p-6 rounded-3xl ${ytdProfit >= 0 ? 'bg-violet-50 border-violet-200' : 'bg-amber-50 border-amber-200'}`}>
       <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${ytdProfit >= 0 ? 'text-violet-600' : 'text-amber-600'}`}>Net Profit</p>
       <p className={`text-2xl font-extrabold ${ytdProfit >= 0 ? 'text-violet-800' : 'text-rose-700'}`}>{formatCurrency(ytdProfit)}</p>
      </div>
     </div>
     {}
     <div id="pl-report-printable" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
       <h3 className="font-extrabold text-slate-800">Month-by-Month Breakdown</h3>
       <button onClick={() => exportToCSV(months.map(m=>({Month:m.label,Revenue:m.revenue,Expenses:m.expenses,Salaries:m.salaries,'Petty Cash':m.petty,'Total Costs':m.total,'Net Profit':m.profit})), 'PL_Report')} className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-800 bg-violet-50 px-3 py-1.5 rounded-lg transition-colors">
        <Download size={13}/> CSV
       </button>
      </div>
      <div className="overflow-x-auto">
       <table className="w-full text-left min-w-[700px]">
        <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
         <tr>
          <th className="px-5 py-3.5">Month</th>
          <th className="px-5 py-3.5 text-right text-emerald-600">Revenue</th>
          <th className="px-5 py-3.5 text-right text-rose-500">Expenses</th>
          <th className="px-5 py-3.5 text-right text-rose-500">Salaries</th>
          <th className="px-5 py-3.5 text-right text-rose-500">Petty Cash</th>
          <th className="px-5 py-3.5 text-right text-slate-500">Total Costs</th>
          <th className="px-5 py-3.5 text-right">Net Profit</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
         {months.map(m => (
          <tr key={m.key} className="hover:bg-slate-50/60 transition-colors">
           <td className="px-5 py-3.5 font-bold text-slate-700">{m.label}</td>
           <td className="px-5 py-3.5 text-right font-bold text-emerald-600 tabular-nums">{m.revenue > 0 ? formatCurrency(m.revenue) : <span className="text-slate-200">—</span>}</td>
           <td className="px-5 py-3.5 text-right text-slate-500 tabular-nums">{m.expenses > 0 ? formatCurrency(m.expenses) : <span className="text-slate-200">—</span>}</td>
           <td className="px-5 py-3.5 text-right text-slate-500 tabular-nums">{m.salaries > 0 ? formatCurrency(m.salaries) : <span className="text-slate-200">—</span>}</td>
           <td className="px-5 py-3.5 text-right text-slate-500 tabular-nums">{m.petty > 0 ? formatCurrency(m.petty) : <span className="text-slate-200">—</span>}</td>
           <td className="px-5 py-3.5 text-right font-bold text-slate-600 tabular-nums">{m.total > 0 ? formatCurrency(m.total) : <span className="text-slate-200">—</span>}</td>
           <td className={`px-5 py-3.5 text-right font-extrabold tabular-nums ${m.profit > 0 ? 'text-emerald-600' : m.profit < 0 ? 'text-rose-600' : 'text-slate-300'}`}>
            {m.profit !== 0 ? formatCurrency(m.profit) : '—'}
           </td>
          </tr>
         ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-200 bg-slate-50">
         <tr>
          <td className="px-5 py-4 font-extrabold text-slate-800 uppercase text-xs tracking-wider">12-Month Total</td>
          <td className="px-5 py-4 text-right font-extrabold text-emerald-700 tabular-nums">{formatCurrency(ytdRevenue)}</td>
          <td className="px-5 py-4 text-right font-extrabold text-rose-600 tabular-nums">{formatCurrency(months.reduce((a,m)=>a+m.expenses,0))}</td>
          <td className="px-5 py-4 text-right font-extrabold text-rose-600 tabular-nums">{formatCurrency(months.reduce((a,m)=>a+m.salaries,0))}</td>
          <td className="px-5 py-4 text-right font-extrabold text-rose-600 tabular-nums">{formatCurrency(months.reduce((a,m)=>a+m.petty,0))}</td>
          <td className="px-5 py-4 text-right font-extrabold text-slate-700 tabular-nums">{formatCurrency(ytdExpenses)}</td>
          <td className={`px-5 py-4 text-right font-extrabold text-xl tabular-nums ${ytdProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(ytdProfit)}</td>
         </tr>
        </tfoot>
       </table>
      </div>
     </div>
     {}
     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100">
       <h3 className="font-bold text-emerald-700 mb-5 flex items-center gap-3"><div className="p-2 bg-emerald-100 rounded-lg"><ArrowDownLeft size={20}/></div> Income Sources</h3>
       <div className="space-y-3">
        {[{l:'Invoice Payments',v:totals.invoiceRevenueBreakdown},{l:'Petty Cash Receipts',v:totals.pettyCashInBreakdown}].map((item,k)=>(
         <div key={k} className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
          <span className="text-emerald-900 font-bold text-sm">{item.l}</span>
          <span className="font-extrabold text-emerald-600">{formatCurrency(item.v)}</span>
         </div>
        ))}
        <div className="flex justify-between items-center p-4 bg-emerald-100 rounded-2xl border border-emerald-200">
         <span className="text-emerald-900 font-extrabold">Total Revenue</span>
         <span className="font-extrabold text-emerald-700 text-lg">{formatCurrency(totals.revenue)}</span>
        </div>
       </div>
      </div>
      <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100">
       <h3 className="font-bold text-rose-700 mb-5 flex items-center gap-3"><div className="p-2 bg-rose-100 rounded-lg"><ArrowUpRight size={20}/></div> Expense Breakdown</h3>
       <div className="space-y-3">
        {[{l:'General Expenses',v:totals.expenseTotal},{l:'Team Salaries',v:totals.salaryTotal},{l:'Petty Cash Outflows',v:totals.pettyCashOut}].map((item,k)=>(
         <div key={k} className="flex justify-between items-center p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
          <span className="text-rose-900 font-bold text-sm">{item.l}</span>
          <span className="font-extrabold text-rose-600">{formatCurrency(item.v)}</span>
         </div>
        ))}
        <div className="flex justify-between items-center p-4 bg-rose-100 rounded-2xl border border-rose-200">
         <span className="text-rose-900 font-extrabold">Total Expenses</span>
         <span className="font-extrabold text-rose-700 text-lg">{formatCurrency(totals.expense)}</span>
        </div>
       </div>
      </div>
     </div>
    </div>
   );
  })()}
  {view === 'statements' && <ClientStatement clients={clients} invoices={invoices} bankRecords={bankRecords} pettyCash={pettyCash} />}
  {view === 'receivables-payables' && <ReceivablesPayables clients={clients} invoices={invoices} vendors={vendors} vendorBills={vendorBills} bankRecords={bankRecords} pettyCash={pettyCash} onViewClient={(c) => { setSelectedClientProfile(c); setView('client-profile'); }} onViewVendor={(v) => { setSelectedVendorProfile(v); setView('vendor-profile'); }} />}
  {view === 'clients' && <ClientsPage clients={clients} invoices={invoices} bankRecords={bankRecords} pettyCash={pettyCash} currentUser={currentUser} canWrite={canWrite} canDelete={canDelete} onViewProfile={(c) => { setSelectedClientProfile(c); setView('client-profile'); }} onEdit={(c) => { if(!canWrite) return; setFormData({...c}); setIsEditingRecord(true); setShowForm(true); }} onDelete={(id) => { const r = clients.find(x=>x.id===id); handleDelete(id, 'client', r?.name||''); }} onNewClient={() => { if(!canWrite) return; setFormData({ date: new Date().toISOString().split('T')[0] }); setIsEditingRecord(false); setShowForm(true); }} />}
  {view === 'client-profile' && selectedClientProfile && <ClientProfile client={selectedClientProfile} invoices={invoices} bankRecords={bankRecords} pettyCash={pettyCash} onBack={() => setView('clients')} onCreateInvoice={(client) => { setNewInvoiceForClient(client); setView('invoices'); }} onRecordPayment={(inv) => initiatePayment(inv, 'invoice', calculateTax((inv.items||[]).reduce((s,it)=>s+((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)),0), inv.taxRate).total - (Number(inv.amountReceived)||0))} />}
  {view === 'vendor-profile' && selectedVendorProfile && <VendorProfile vendor={selectedVendorProfile} vendorBills={vendorBills} bankRecords={bankRecords} pettyCash={pettyCash} onBack={() => setView('vendors')} />}
  {view === 'expenses' && <ExpensesPage expenses={expenses} expenseCategories={expenseCategories} currentUser={currentUser} canWrite={canWrite} canDelete={canDelete} onGenerateRecurring={handleGenerateRecurringExpenses} onApproveExpense={async (id) => { try { const res = await expensesAPI.update(id, { approvalStatus: 'Approved' }); setExpenses(prev => prev.map(e => e.id === id ? {...e, approvalStatus: 'Approved'} : e)); toast('Expense approved!', 'success'); } catch(e) { toast('Failed to approve.', 'error'); } }} onImportExpenses={(e) => handleGenericImport(e, 'expenses')} onNewExpense={() => { if(!canWrite) return; setFormData({ date: new Date().toISOString().split('T')[0] }); setIsEditingRecord(false); setShowForm(true); }} onEdit={(r) => { if(!canWrite) return; setFormData({...r}); setIsEditingRecord(true); setShowForm(true); }} onDelete={(id) => { const r = expenses.find(x=>x.id===id); handleDelete(id, 'expense', r?.description||''); }} />}
  {view === 'petty-cash' && <PettyCashPage pettyCash={pettyCash} currentUser={currentUser} canWrite={canWrite} canDelete={canDelete} appSettings={appSettings} onNewEntry={(type) => { if(!canWrite) return; setFormData({ date: new Date().toISOString().split('T')[0], _entryType: type || 'out' }); setIsEditingRecord(false); setShowForm(true); }} onEdit={(r) => { if(!canWrite) return; setFormData({...r}); setIsEditingRecord(true); setShowForm(true); }} onDelete={(id) => { const r = pettyCash.find(x=>x.id===id); handleDelete(id, 'petty', r?.description||''); }} />}
  {view === 'salaries' && <SalariesPage salaries={salaries} currentUser={currentUser} canWrite={canWrite} canDelete={canDelete} onNewSalary={() => { if(!canWrite) return; setFormData({ date: new Date().toISOString().split('T')[0] }); setIsEditingRecord(false); setShowForm(true); }} onEdit={(s) => { if(!canWrite) return; setFormData({...s}); setIsEditingRecord(true); setShowForm(true); }} onDelete={(id) => { const r = salaries.find(x=>x.id===id); handleDelete(id, 'salary', r?.employeeName||''); }} onViewSlip={(s) => { if (s) { setFormData(s); setShowSalarySlip(true); } }} />}
  {view === 'quotations' && <QuotationGenerator clients={clients} onSave={(q) => saveToFirebase('quotations', q, q.id)} savedQuotations={quotations} onDeleteQuotation={(id) => { const r = quotations.find(x=>x.id===id); handleDelete(id, 'quotation', r?.client||''); }} onConvertToInvoice={handleConvertToInvoice} companyProfile={companyProfile} appSettings={appSettings} onUpdateSettings={setAppSettings} canWrite={canWrite} />}
  {view === 'invoices' && <InvoiceGenerator clients={clients} onSave={(inv) => saveToFirebase('invoices', inv, inv.id)} savedInvoices={invoices} onDeleteInvoice={(id) => { const r = invoices.find(x=>x.id===id); handleDelete(id, 'invoice', r?.client ? `Invoice #${r.invoiceNumber} — ${r.client}` : ''); }} onGenerateRecurring={handleGenerateRecurring} onReceivePayment={(inv, amt) => initiatePayment(inv, 'invoice', amt)} companyProfile={companyProfile} appSettings={appSettings} onUpdateSettings={setAppSettings} canWrite={canWrite} pendingClient={newInvoiceForClient} onClearPendingClient={() => setNewInvoiceForClient(null)} />}
  {view === 'vendors' && <VendorsPage vendors={vendors} vendorBills={vendorBills} currentUser={currentUser} canWrite={canWrite} canDelete={canDelete} onNewVendor={() => { if(!canWrite) return; setFormData({ date: new Date().toISOString().split('T')[0] }); setIsEditingRecord(false); setShowForm(true); }} onEdit={(v) => { if(!canWrite) return; setFormData({...v}); setIsEditingRecord(true); setShowForm(true); }} onDelete={(id) => { const r = vendors.find(x=>x.id===id); handleDelete(id, 'vendor', r?.name||''); }} onViewProfile={(v) => { setSelectedVendorProfile(v); setView('vendor-profile'); }} />}
  {view === 'vendor-bills' && <VendorBillsPage vendorBills={vendorBills} vendors={vendors} currentUser={currentUser} canWrite={canWrite} canDelete={canDelete} onNewBill={() => { if(!canWrite) return; const prefix = appSettings.billPrefix||'BILL'; const num = `${prefix}-${String(Number(appSettings.billCounter||1)).padStart(3,'0')}`; setFormData({ date: new Date().toISOString().split('T')[0], billNumber: num }); setIsEditingRecord(false); setShowForm(true); }} onEdit={(b) => { if(!canWrite) return; setFormData({...b}); setIsEditingRecord(true); setShowForm(true); }} onDelete={(id) => { const r = vendorBills.find(x=>x.id===id); handleDelete(id, 'bill', r?.vendor ? `${r.vendor} — ${r.billNumber||r.description||''}` : ''); }} onPayBill={(b, amt) => initiatePayment(b, 'bill', amt)} />}
  {view === 'manage-users' && <ManageUsersPage
   users={users}
   currentUser={currentUser}
   onNewUser={() => { setFormData({}); setIsEditingUser(false); setIsEditingRecord(false); setShowForm(true); }}
   onEdit={(u) => { setFormData({...u}); setIsEditingUser(true); setShowForm(true); }}
   onDelete={(id) => { const r = users.find(x=>x.id===id); handleDelete(id, 'user', r?.username||''); }}
  />}
  {view === 'bank' && <BankAccountsPage
   bankRecords={bankRecords}
   currentUser={currentUser}
   onNewEntry={() => { setFormData({ date: new Date().toISOString().split('T')[0], status: 'Cleared' }); setIsEditingRecord(false); setShowForm(true); }}
   onEdit={(r) => { setFormData({...r}); setIsEditingRecord(true); setShowForm(true); }}
   onDelete={(id) => { const r = bankRecords.find(x=>x.id===id); handleDelete(id, 'bank', r?.description||r?.bank||''); }}
  />}
  {view === 'settings' && (
   <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
    {}
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
     <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className="p-2 bg-violet-100 rounded-xl text-violet-600"><Briefcase size={20}/></div>
      Company Profile
     </h3>
     <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
       <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Company Name *</label>
        <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500" value={companyProfile.name||''} onChange={e=>setCompanyProfile(p=>({...p,name:e.target.value}))} placeholder="e.g. LeanAxis" />
       </div>
       <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tagline</label>
        <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500" value={companyProfile.tagline||''} onChange={e=>setCompanyProfile(p=>({...p,tagline:e.target.value}))} placeholder="e.g. Creative Agency & Solutions" />
       </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
       <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phone</label>
        <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500" value={companyProfile.phone||''} onChange={e=>setCompanyProfile(p=>({...p,phone:e.target.value}))} placeholder="+92 300 0000000" />
       </div>
       <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
        <input type="email" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500" value={companyProfile.email||''} onChange={e=>setCompanyProfile(p=>({...p,email:e.target.value}))} placeholder="hello@company.com" />
       </div>
      </div>
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Address</label>
       <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500" value={companyProfile.address||''} onChange={e=>setCompanyProfile(p=>({...p,address:e.target.value}))} placeholder="Office address" />
      </div>
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs font-medium text-emerald-700 flex items-center gap-2">
       <CheckCircle size={14}/> Company name and tagline appear on all invoices, quotations, and salary slips.
      </div>
     </div>
    </div>
    {}
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
     <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><DollarSign size={20}/></div>
      Currency & Locale
     </h3>
     <div className="grid grid-cols-2 gap-4">
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Currency Code</label>
       <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500 appearance-none" value={appSettings.currency||'PKR'} onChange={e=>{
        const cur = e.target.value;
        const localeMap = {PKR:'en-PK', USD:'en-US', AED:'ar-AE', GBP:'en-GB', EUR:'en-DE', SAR:'ar-SA', INR:'en-IN'};
        setAppSettings(p=>({...p, currency: cur, locale: localeMap[cur]||'en-US'}));
       }}>
        {['PKR','USD','AED','GBP','EUR','SAR','INR'].map(c=><option key={c} value={c}>{c}</option>)}
       </select>
      </div>
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Preview</label>
       <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700">{formatCurrency(1234567)}</div>
      </div>
     </div>
    </div>
    {}
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
     <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className="p-2 bg-sky-100 rounded-xl text-sky-600"><FileText size={20}/></div>
      Invoice Settings
     </h3>
     <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
       <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Invoice Prefix</label>
        <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500" value={appSettings.invoicePrefix||'INV'} onChange={e=>setAppSettings(p=>({...p,invoicePrefix:e.target.value}))} placeholder="INV" />
       </div>
       <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Next Number</label>
        <input type="number" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500" value={appSettings.invoiceCounter||1} onChange={e=>setAppSettings(p=>({...p,invoiceCounter:Number(e.target.value)}))} min="1" />
       </div>
       <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Default Tax %</label>
        <input type="number" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500" value={appSettings.defaultTaxRate||0} onChange={e=>setAppSettings(p=>({...p,defaultTaxRate:Number(e.target.value)}))} min="0" max="100" />
       </div>
      </div>
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Default Payment Terms</label>
       <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500" value={appSettings.defaultPaymentTerms||''} onChange={e=>setAppSettings(p=>({...p,defaultPaymentTerms:e.target.value}))} placeholder="e.g. Payment due within 30 days." />
      </div>
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs font-medium text-sky-700">
       Next invoice will be numbered: <span className="font-extrabold">{appSettings.invoicePrefix||'INV'}-{String(appSettings.invoiceCounter||1).padStart(3,'0')}</span>
      </div>
     </div>
    </div>
    {}
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
     <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><FileText size={20}/></div>
      Quotation Numbering
     </h3>
     <div className="grid grid-cols-2 gap-4">
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Quotation Prefix</label>
       <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400"
        value={appSettings.quotePrefix||'QT'} onChange={e=>setAppSettings(p=>({...p,quotePrefix:e.target.value}))} placeholder="QT"/>
      </div>
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Next Number</label>
       <input type="number" min="1" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400"
        value={appSettings.quoteCounter||1} onChange={e=>setAppSettings(p=>({...p,quoteCounter:Number(e.target.value)}))}/>
      </div>
     </div>
     <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs font-medium text-amber-700">
      Next quotation will be numbered: <span className="font-extrabold">{appSettings.quotePrefix||'QT'}-{String(appSettings.quoteCounter||1).padStart(3,'0')}</span>
     </div>
    </div>
    {}
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
     <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><Receipt size={20}/></div>
      Vendor Bill Numbering
     </h3>
     <div className="grid grid-cols-2 gap-4">
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bill Prefix</label>
       <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-400"
        value={appSettings.billPrefix||'BILL'} onChange={e=>setAppSettings(p=>({...p,billPrefix:e.target.value}))} placeholder="BILL"/>
      </div>
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Next Number</label>
       <input type="number" min="1" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-400"
        value={appSettings.billCounter||1} onChange={e=>setAppSettings(p=>({...p,billCounter:Number(e.target.value)}))}/>
      </div>
     </div>
     <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-medium text-rose-700">
      Next vendor bill will be numbered: <span className="font-extrabold">{appSettings.billPrefix||'BILL'}-{String(appSettings.billCounter||1).padStart(3,'0')}</span>
     </div>
    </div>
    {}
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
     <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><Wallet size={20}/></div>
      Petty Cash Settings
     </h3>
     <div className="grid grid-cols-2 gap-6">
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Opening Balance</label>
       <input type="number" min="0" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400"
        value={appSettings.pettyCashOpeningBalance||0}
        onChange={e=>setAppSettings(p=>({...p,pettyCashOpeningBalance:Number(e.target.value)}))}
        placeholder="0"/>
       <p className="text-xs text-slate-400 mt-1.5">The cash amount already in the box before any entries were recorded.</p>
      </div>
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Low Balance Alert Threshold</label>
       <input type="number" min="0" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400"
        value={appSettings.pettyCashMinBalance||0}
        onChange={e=>setAppSettings(p=>({...p,pettyCashMinBalance:Number(e.target.value)}))}
        placeholder="0"/>
       <p className="text-xs text-slate-400 mt-1.5">Show a warning when cash float falls to this amount. Set 0 to disable.</p>
      </div>
     </div>
     {(appSettings.pettyCashOpeningBalance>0||appSettings.pettyCashMinBalance>0) && (
      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs font-medium text-amber-700">
       Opening balance: <span className="font-extrabold">{formatCurrency(appSettings.pettyCashOpeningBalance||0)}</span>
       {appSettings.pettyCashMinBalance>0 && <> · Alert when below: <span className="font-extrabold">{formatCurrency(appSettings.pettyCashMinBalance)}</span></>}
      </div>
     )}
    </div>
    {}
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
     <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><Receipt size={20}/></div>
      Expense Categories
     </h3>
     <div className="flex flex-wrap gap-2 mb-4">{expenseCategories.map(cat => (<span key={cat} className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">{cat} <button onClick={() => setExpenseCategories(expenseCategories.filter(c => c !== cat))} className="hover:text-rose-500 transition-colors"><X size={14}/></button></span>))}</div>
     <div className="relative"><Plus size={18} className="absolute left-4 top-4 text-slate-400"/><input className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none transition-all" placeholder="Add new category... (Press Enter)" onKeyDown={e => { if(e.key === 'Enter' && e.target.value) { setExpenseCategories([...expenseCategories, e.target.value]); e.target.value = ''; } }}/></div>
    </div>
    {}
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
     <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className="p-2 bg-slate-100 rounded-xl text-slate-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg></div>
      Appearance & Shortcuts
     </h3>
     <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
       <div>
        <p className="font-bold text-slate-800 text-sm">Dark Mode</p>
        <p className="text-xs text-slate-400 mt-0.5">Switch to a dark theme for low-light environments</p>
       </div>
       <button onClick={()=>setAppSettings(p=>({...p,darkMode:!p.darkMode}))}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${appSettings.darkMode?'bg-violet-600':'bg-slate-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${appSettings.darkMode?'translate-x-6':'translate-x-0'}`}/>
       </button>
      </div>
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
       <p className="font-bold text-slate-700 text-sm mb-3">Keyboard Shortcuts</p>
       <div className="grid grid-cols-2 gap-2">
        {[['Ctrl + K','Open command search'],['Ctrl + S','Save current form'],['Escape','Close panels / modals'],['Enter','Submit forms']].map(([key,desc])=>(
         <div key={key} className="flex items-center gap-2">
          <kbd className="text-xs font-bold bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg shadow-sm whitespace-nowrap">{key}</kbd>
          <span className="text-xs text-slate-500">{desc}</span>
         </div>
        ))}
       </div>
      </div>
     </div>
    </div>
    {}
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
     <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><Database size={20}/></div>
      System & Data
     </h3>
     <div className="space-y-5">
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ImgBB API Key (Receipt Uploads)</label>
       <div className="flex gap-3"><input type="password" className="flex-1 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none" value={imgbbKey} onChange={e => setImgbbKey(e.target.value)} placeholder="Enter API key..." /><a href="https://api.imgbb.com/" target="_blank" className="bg-slate-100 text-slate-600 px-5 py-3.5 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Get Key</a></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
       <button onClick={handleMasterExport} className="bg-violet-50 text-violet-700 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-violet-100 transition-colors"><Download size={20} /> Backup Data</button>
       <label className="bg-slate-50 text-slate-700 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"><Upload size={20} /> Restore Data <input type="file" accept=".json" onChange={handleImport} className="hidden" /></label>
      </div>
     </div>
    </div>
   </div>
  )}
  {}
  {showPaymentModal && paymentConfig && (
   <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
    <div className="bg-white p-10 rounded-3xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95">
     <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">{paymentConfig.type === 'bill' ? 'Pay Bill' : 'Receive Payment'}</h3>
     <div className="bg-slate-50 p-6 rounded-2xl text-center mb-6 border border-slate-100">
      <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">{paymentConfig.data.vendor || paymentConfig.data.client}</p>
      <p className="text-4xl font-extrabold text-slate-800">{formatCurrency(paymentConfig.amount)}</p>
      <p className="text-xs text-slate-400 mt-1">Outstanding balance</p>
     </div>
     <div className="space-y-5">
      <div>
       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount to Pay Now *</label>
       <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-lg outline-none focus:ring-2 focus:ring-violet-500" value={partialAmount} onChange={e => setPartialAmount(e.target.value)} />
       {Number(partialAmount) < paymentConfig.amount && Number(partialAmount) > 0 && (
        <p className="text-xs text-amber-600 font-bold mt-1.5">Partial payment — {formatCurrency(paymentConfig.amount - Number(partialAmount))} will remain outstanding</p>
       )}
      </div>
      {paymentConfig.type === 'invoice' && (
       <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tax Deducted by Client (WHT)</label>
        <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-rose-600 outline-none focus:ring-2 focus:ring-rose-500" placeholder="0" value={clientWHT} onChange={e => setClientWHT(e.target.value)} />
        <div className="flex justify-between mt-2 px-1 text-sm font-medium">
         <span className="text-slate-500">Net Receiving:</span>
         <span className="text-emerald-600 font-bold">{formatCurrency((Number(partialAmount)||paymentConfig.amount) - (Number(clientWHT) || 0))}</span>
        </div>
       </div>
      )}
      <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Method</label><div className="flex gap-3"><button onClick={() => setPaymentAccount('bank')} className={`flex-1 py-4 rounded-xl font-bold text-sm border-2 transition-all ${paymentAccount === 'bank' ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>Bank Transfer</button><button onClick={() => setPaymentAccount('cash')} className={`flex-1 py-4 rounded-xl font-bold text-sm border-2 transition-all ${paymentAccount === 'cash' ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>Petty Cash</button></div></div>
      <div className="flex gap-4 pt-2"><button onClick={() => setShowPaymentModal(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button><button onClick={executePayment} className="flex-1 py-4 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all flex justify-center items-center gap-2">Confirm Payment</button></div>
     </div>
    </div>
   </div>
  )}
  {showForm && (
   <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-stretch justify-end z-50" onClick={e=>{if(e.target===e.currentTarget)setShowForm(false);}}>
    <div className={`bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ${['clients','vendor-bills','salaries','manage-users'].includes(view)?'w-full max-w-xl':'w-full max-w-md'}`}>
     {}
     <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 flex-shrink-0">
      <div>
       <h3 className="text-xl font-extrabold text-slate-800">{view==='clients' ? (isEditingRecord ? 'Edit Client' : 'New Client') : view==='salaries' ? (isEditingRecord ? 'Edit Payslip' : 'New Payslip') : view==='petty-cash' ? (isEditingRecord ? 'Edit Entry' : 'New Cash Entry') : view==='expenses' ? (isEditingRecord ? 'Edit Expense' : 'New Expense') : view==='vendors' ? (isEditingRecord ? 'Edit Vendor' : 'New Vendor') : view==='vendor-bills' ? (isEditingRecord ? 'Edit Bill' : 'New Vendor Bill') : view==='manage-users' ? (isEditingUser ? 'Edit User' : 'Add New User') : view==='bank' ? (isEditingRecord ? 'Edit Transaction' : 'New Bank Entry') : 'Record Details'}</h3>
       <p className="text-xs text-slate-400 mt-0.5 font-medium">{view==='clients'?'Fill in client details below':view==='expenses'?'Record a new business expense':view==='vendor-bills'?'Enter bill details and amounts':view==='salaries'?'Record salary payment':view==='bank'?'Add bank transaction':'Fill in the details below'}</p>
      </div>
      <button onClick={()=>setShowForm(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors flex-shrink-0"><X size={20}/></button>
     </div>
     {}
     <div className="flex-1 overflow-y-auto px-8 py-6">
     <form id="main-slide-form" onSubmit={handleAddSubmit} className="space-y-5">
      {}
      {view==='manage-users' && (
       <div className="space-y-4">
        <div className="pb-2 border-b border-slate-100">
         <p className="text-xs font-extrabold text-violet-600 uppercase tracking-widest">Account Details</p>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Username *</label>
         <input required placeholder="e.g. ahmed.khan" className="form-input" value={formData.username||''} onChange={e=>setFormData({...formData,username:e.target.value})}/>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Email Address *</label>
         <input type="email" required placeholder="user@company.com" className="form-input" value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
          Password {isEditingUser && <span className="text-slate-300 normal-case font-medium">(leave blank to keep current)</span>}
         </label>
         <input type="password" placeholder={isEditingUser ? "Leave blank to keep current" : "Set a strong password"} className="form-input" value={formData.password||''} onChange={e=>setFormData({...formData,password:e.target.value})}/>
        </div>
        <div className="pb-2 border-b border-slate-100 pt-1">
         <p className="text-xs font-extrabold text-violet-600 uppercase tracking-widest">Role & Access</p>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Assign Role *</label>
         <div className="space-y-2">
          {['Admin','Editor','Viewer'].map(role => {
           const roleCfg = {Admin:{bg:'bg-violet-50',border:'border-violet-300',text:'text-violet-700',dot:'bg-violet-600',desc:'Full access — create, edit & delete everything'},Editor:{bg:'bg-sky-50',border:'border-sky-300',text:'text-sky-700',dot:'bg-sky-600',desc:'Can create & edit records, cannot delete'},Viewer:{bg:'bg-slate-50',border:'border-slate-300',text:'text-slate-600',dot:'bg-slate-500',desc:'Read-only — can view but not modify data'}}[role];
           const isSelected = (formData.role||'Viewer') === role;
           return (
            <div key={role} onClick={() => setFormData({...formData, role})}
             className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? roleCfg.bg + ' ' + roleCfg.border : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
             <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? roleCfg.border : 'border-slate-300'}`}>
              {isSelected && <div className={`w-2 h-2 rounded-full ${roleCfg.dot}`}/>}
             </div>
             <div>
              <p className={`text-sm font-extrabold ${isSelected ? roleCfg.text : 'text-slate-600'}`}>{role}</p>
              <p className="text-xs text-slate-400">{roleCfg.desc}</p>
             </div>
            </div>
           );
          })}
         </div>
        </div>
       </div>
      )}
      {view==='clients' && (
       <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
         <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Date Added</label><input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/></div>
         <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label><select className="form-select" value={formData.status||'Ongoing'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Ongoing</option><option>Retainer</option><option>Completed</option><option>Lead</option></select></div>
        </div>
        <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Client / Company Name *</label><input required placeholder="e.g. ABC Corp" className="form-input" value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/></div>
        <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Project / Service Name</label><input placeholder="e.g. Brand Identity 2025" className="form-input" value={formData.projectName||''} onChange={e=>setFormData({...formData,projectName:e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-4">
         <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Phone</label><input type="tel" placeholder="+92 300 0000000" className="form-input" value={formData.phone||''} onChange={e=>setFormData({...formData,phone:e.target.value})}/></div>
         <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Email</label><input type="email" placeholder="client@email.com" className="form-input" value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/></div>
        </div>
        <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Address / City</label><input placeholder="e.g. Lahore, Pakistan" className="form-input" value={formData.address||''} onChange={e=>setFormData({...formData,address:e.target.value})}/></div>
        <div className="pt-1 pb-1 border-t border-slate-100">
         <p className="text-xs font-extrabold text-violet-600 uppercase tracking-widest mb-4">Financial Details</p>
         <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Contract Value</label><input type="number" placeholder="0" className="form-input" value={formData.projectTotal||''} onChange={e=>setFormData({...formData,projectTotal:e.target.value})}/></div>
          <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Opening Advance</label><input type="number" placeholder="0" className="form-input" value={formData.advanceReceived||''} onChange={e=>setFormData({...formData,advanceReceived:e.target.value})}/></div>
         </div>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
         <p className="text-xs font-extrabold text-violet-700 uppercase tracking-widest mb-1">Monthly Retainer</p>
         <p className="text-xs text-violet-500 mb-3">If this client pays a fixed amount every month, enter it here. It will auto-fill when you create an invoice from their profile.</p>
         <input type="number" placeholder="0 — leave blank if not a retainer client" className="form-input bg-white" value={formData.retainerAmount||''} onChange={e=>setFormData({...formData,retainerAmount:e.target.value})}/>
         {Number(formData.retainerAmount) > 0 && (
          <p className="text-xs font-bold text-violet-600 mt-2">✓ Invoice will pre-fill: Monthly Retainer — {new Date().toLocaleString('default',{month:'long',year:'numeric'})} × {formatCurrency(Number(formData.retainerAmount))}</p>
         )}
        </div>
        <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Internal Notes</label><textarea rows={2} placeholder="Notes about this client (not shown to client)" className="form-input resize-none" value={formData.notes||''} onChange={e=>setFormData({...formData,notes:e.target.value})}/></div>
       </div>
      )}
      {!['manage-users','clients','vendor-bills','salaries','vendors','petty-cash','bank','expenses'].includes(view) && <><input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input placeholder="Description/Name" className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/><input type="number" placeholder="Amount" className="form-input" value={formData.amount||''} onChange={e=>setFormData({...formData,amount:e.target.value})}/></>}
      {view==='bank' && (
       <div className="space-y-4">
        <div className="pb-2 border-b border-slate-100">
         <p className="text-xs font-extrabold text-sky-600 uppercase tracking-widest">Transaction Details</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Date *</label>
          <input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/>
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
          <select className="form-select" value={formData.status||'Cleared'} onChange={e=>setFormData({...formData,status:e.target.value})}>
           <option>Cleared</option>
           <option>Pending</option>
          </select>
         </div>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Bank Name *</label>
         <input required placeholder="e.g. HBL, Meezan, UBL" className="form-input" value={formData.bank||''} onChange={e=>setFormData({...formData,bank:e.target.value})}/>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Description / Reference</label>
         <input placeholder="e.g. Client payment, Salary transfer, Utility bill" className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/>
        </div>
        <div className="pb-2 border-b border-slate-100 pt-1">
         <p className="text-xs font-extrabold text-sky-600 uppercase tracking-widest">Amount</p>
        </div>
        <div className="flex gap-3">
         {['Credit','Debit'].map(t => (
          <button key={t} type="button"
           onClick={() => setFormData({...formData, _txType: t, amount: t==='Debit' && Number(formData.amount) > 0 ? -Number(formData.amount) : t==='Credit' && Number(formData.amount) < 0 ? Math.abs(Number(formData.amount)) : formData.amount })}
           className={`flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-1.5 ${(formData._txType||'Credit')===t ? t==='Credit' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-rose-50 border-rose-400 text-rose-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
           {t === 'Credit' ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>} {t}
          </button>
         ))}
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Amount *</label>
         <input type="number" required placeholder="0" className="form-input" value={formData.amount !== undefined ? Math.abs(Number(formData.amount)||0)||'' : ''} onChange={e => {
          const raw = Number(e.target.value)||0;
          const signed = (formData._txType||'Credit') === 'Debit' ? -raw : raw;
          setFormData({...formData, amount: e.target.value === '' ? '' : signed});
         }}/>
         <p className="text-xs text-slate-400 mt-1">Select Credit / Debit above to set direction</p>
        </div>
        {(Number(formData.amount) !== 0 && formData.amount !== '') && (
         <div className={`p-3 rounded-xl flex items-center justify-between border ${Number(formData.amount) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{Number(formData.amount) >= 0 ? 'Credit (In)' : 'Debit (Out)'}</span>
          <span className={`text-xl font-extrabold tabular-nums ${Number(formData.amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
           {Number(formData.amount) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(Number(formData.amount)))}
          </span>
         </div>
        )}
       </div>
      )}
      {view==='petty-cash' && (
       <div className="space-y-4">
        {}
        <div className="grid grid-cols-2 gap-2">
         <button type="button"
          onClick={()=>setFormData({...formData,_entryType:'out',cashIn:''})}
          className={`py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 border-2 transition-all ${(formData._entryType||'out')==='out'?'bg-rose-50 border-rose-500 text-rose-700':'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}>
          <ArrowUpRight size={16}/> Cash Out (Expense)
         </button>
         <button type="button"
          onClick={()=>setFormData({...formData,_entryType:'in',cashOut:''})}
          className={`py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 border-2 transition-all ${(formData._entryType||'out')==='in'?'bg-emerald-50 border-emerald-500 text-emerald-700':'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}>
          <ArrowDownLeft size={16}/> Cash In (Receipt)
         </button>
        </div>
        <div className="pb-2 border-b border-slate-100">
         <p className={`text-xs font-extrabold uppercase tracking-widest ${(formData._entryType||'out')==='in'?'text-emerald-600':'text-rose-500'}`}>
          {(formData._entryType||'out')==='in' ? '💰 Cash In — Replenishment / Receipt' : '💸 Cash Out — Expense'}
         </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Date *</label>
          <input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/>
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Category</label>
          <select className="form-select" value={formData.category||'Miscellaneous'} onChange={e=>setFormData({...formData,category:e.target.value})}>
           {(formData._entryType||'out')==='in'
            ? ['Petty Replenishment','Refund / Receipt','Advance Recovery'].map(c=><option key={c} value={c}>{c}</option>)
            : ['Office Supplies','Meals & Entertainment','Travel & Transport','Courier & Delivery','Utilities','Printing & Stationery','Repairs & Maintenance','Advance','Miscellaneous'].map(c=><option key={c} value={c}>{c}</option>)
           }
          </select>
         </div>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Description *</label>
         <input required placeholder={(formData._entryType||'out')==='in'?'e.g. Cash replenishment from accounts...':'e.g. Stationery purchase, Lunch meeting...'} className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/>
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
           {(formData._entryType||'out')==='in'?'Received From':'Paid To'} (optional)
          </label>
          <input placeholder={(formData._entryType||'out')==='in'?'e.g. Accounts Dept':'e.g. Ali Stationery'} className="form-input" value={formData.paidTo||''} onChange={e=>setFormData({...formData,paidTo:e.target.value})}/>
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Ref / Receipt # (optional)</label>
          <input placeholder="e.g. RCP-001" className="form-input" value={formData.refNumber||''} onChange={e=>setFormData({...formData,refNumber:e.target.value})}/>
         </div>
        </div>
        <div className="pb-1 border-b border-slate-100">
         <p className="text-xs font-extrabold text-amber-600 uppercase tracking-widest">Amount *</p>
        </div>
        {(formData._entryType||'out')==='out' ? (
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
           <span className="w-2 h-2 bg-rose-500 rounded-full inline-block"/>Cash Out Amount
          </label>
          <input type="number" required placeholder="0.00" className="form-input text-rose-700 font-bold" value={formData.cashOut||''} onChange={e=>setFormData({...formData,cashOut:e.target.value,cashIn:''})}/>
         </div>
        ) : (
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
           <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"/>Cash In Amount
          </label>
          <input type="number" required placeholder="0.00" className="form-input text-emerald-700 font-bold" value={formData.cashIn||''} onChange={e=>setFormData({...formData,cashIn:e.target.value,cashOut:''})}/>
         </div>
        )}
        {(Number(formData.cashOut)>0||Number(formData.cashIn)>0)&&(
         <div className={`p-3 rounded-xl flex items-center justify-between border ${Number(formData.cashIn)>0?'bg-emerald-50 border-emerald-200':'bg-rose-50 border-rose-200'}`}>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{Number(formData.cashIn)>0?'Receiving':'Paying out'}</span>
          <span className={`text-2xl font-extrabold tabular-nums ${Number(formData.cashIn)>0?'text-emerald-700':'text-rose-700'}`}>
           {Number(formData.cashIn)>0?'+':'-'}{formatCurrency(Number(formData.cashIn)||Number(formData.cashOut)||0)}
          </span>
         </div>
        )}
       </div>
      )}
      {view==='vendors' && (
       <div className="space-y-4">
        <div className="pb-2 border-b border-slate-100"><p className="text-xs font-extrabold text-violet-600 uppercase tracking-widest">Vendor Details</p></div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Vendor / Supplier Name *</label>
         <input required placeholder="e.g. Ali Printers, MediaEdge" className="form-input" value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/>
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Service Type</label>
          <input placeholder="e.g. Printing, Media, IT" className="form-input" value={formData.serviceType||''} onChange={e=>setFormData({...formData,serviceType:e.target.value})}/>
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Contact / Phone</label>
          <input placeholder="e.g. 0300-1234567" className="form-input" value={formData.contact||''} onChange={e=>setFormData({...formData,contact:e.target.value})}/>
         </div>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Email (optional)</label>
         <input type="email" placeholder="vendor@email.com" className="form-input" value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/>
        </div>
        <div className="pb-2 border-b border-slate-100 pt-1"><p className="text-xs font-extrabold text-violet-600 uppercase tracking-widest">Financials (optional)</p></div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Total Amount Payable</label>
          <input type="number" placeholder="0" className="form-input" value={formData.amountPayable||''} onChange={e=>setFormData({...formData,amountPayable:e.target.value})}/>
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Amount Paid So Far</label>
          <input type="number" placeholder="0" className="form-input" value={formData.amountPaid||''} onChange={e=>setFormData({...formData,amountPaid:e.target.value})}/>
         </div>
        </div>
        {(Number(formData.amountPayable) > 0) && (
         <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Outstanding Balance</span>
          <span className="text-xl font-extrabold text-rose-600 tabular-nums">{formatCurrency(Math.max(0,(Number(formData.amountPayable)||0)-(Number(formData.amountPaid)||0)))}</span>
         </div>
        )}
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
         <textarea rows={2} placeholder="Any additional notes about this vendor..." className="form-input resize-none" value={formData.notes||''} onChange={e=>setFormData({...formData,notes:e.target.value})}/>
        </div>
       </div>
      )}}
      {view === 'salaries' && (
       <>
        {}
        <div className="pb-2 border-b border-slate-100">
         <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest">Employee Info</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Payment Date *</label>
          <input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})} />
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
          <select className="form-select" value={formData.status||'Unpaid'} onChange={e=>setFormData({...formData,status:e.target.value})}>
           <option>Unpaid</option><option>Pending</option><option>Paid</option>
          </select>
         </div>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Employee Name *</label>
         <input required placeholder="e.g. Ahmed Khan" className="form-input" value={formData.employeeName||''} onChange={e=>setFormData({...formData,employeeName:e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Job Title / Role</label>
          <input placeholder="e.g. Designer, Dev" className="form-input" value={formData.role||''} onChange={e=>setFormData({...formData,role:e.target.value})} />
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Department</label>
          <input placeholder="e.g. Creative, Tech" className="form-input" value={formData.department||''} onChange={e=>setFormData({...formData,department:e.target.value})} />
         </div>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Phone (for WhatsApp slip)</label>
         <input type="tel" placeholder="+92 300 0000000" className="form-input" value={formData.phone||''} onChange={e=>setFormData({...formData,phone:e.target.value})} />
        </div>
        {}
        <div className="pb-2 border-b border-slate-100 pt-2">
         <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest">Salary Breakdown</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Basic Salary (PKR)</label>
          <input type="number" placeholder="0" className="form-input" value={formData.basicSalary || ''} onChange={e => {
           const basic = Number(e.target.value);
           const tax = Number(formData.taxDeduction || 0);
           setFormData({ ...formData, basicSalary: basic, totalPayable: basic - tax });
          }} />
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Tax / WHT Deducted</label>
          <input type="number" placeholder="0" className="form-input" value={formData.taxDeduction || ''} onChange={e => {
           const tax = Number(e.target.value);
           const basic = Number(formData.basicSalary || 0);
           setFormData({ ...formData, taxDeduction: tax, totalPayable: basic - tax });
          }} />
         </div>
        </div>
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-4 rounded-2xl flex justify-between items-center border border-indigo-100">
         <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Net Payable</p>
          <p className="text-2xl font-extrabold text-indigo-700 tabular-nums mt-0.5">{formatCurrency(formData.totalPayable || 0)}</p>
         </div>
         {formData.taxDeduction > 0 && (
          <div className="text-right">
           <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Tax Saved</p>
           <p className="text-sm font-extrabold text-rose-600">-{formatCurrency(formData.taxDeduction || 0)}</p>
          </div>
         )}
        </div>
        {}
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
         <textarea rows={2} placeholder="e.g. Includes overtime, Advance deducted..." className="form-input resize-none" value={formData.notes||''} onChange={e=>setFormData({...formData,notes:e.target.value})}/>
        </div>
       </>
      )}
      {view === 'vendor-bills' && (
       <div className="space-y-4">
        <div className="pb-2 border-b border-slate-100"><p className="text-xs font-extrabold text-rose-600 uppercase tracking-widest">Bill Details</p></div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Bill Date *</label>
          <input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})} />
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Due Date</label>
          <input type="date" className="form-input" value={formData.dueDate||''} onChange={e=>setFormData({...formData,dueDate:e.target.value})} />
         </div>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Vendor *</label>
         <select className="form-select" value={formData.vendor||''} onChange={e=>setFormData({...formData,vendor:e.target.value})}>
          <option value="">Select Vendor</option>
          {vendors.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}
         </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Bill # / Ref</label>
          <div className="relative">
           <input className="form-input pr-16" value={formData.billNumber||''} onChange={e=>setFormData({...formData,billNumber:e.target.value})} placeholder="Auto-generated"/>
           {!isEditingRecord && formData.billNumber && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">Auto</span>
           )}
          </div>
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
          <select className="form-select" value={formData.status||'Pending'} onChange={e=>setFormData({...formData,status:e.target.value})}>
           <option>Pending</option><option>Partial</option><option>Paid</option>
          </select>
         </div>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Description</label>
         <input placeholder="e.g. Printing charges for Q1 campaign" className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})} />
        </div>
        <div className="pb-2 border-b border-slate-100 pt-1"><p className="text-xs font-extrabold text-rose-600 uppercase tracking-widest">Amounts</p></div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Gross Bill Amount *</label>
          <input type="number" placeholder="0" className="form-input" value={formData.billAmount||''} onChange={e=>{
           const amt = Number(e.target.value);
           const tax = Number(formData.taxDeduction||0);
           setFormData({...formData, billAmount: amt, amount: amt - tax});
          }} />
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
           <span className="w-2 h-2 bg-amber-400 rounded-full inline-block"/>WHT Deducted
          </label>
          <input type="number" placeholder="0" className="form-input" value={formData.taxDeduction||''} onChange={e=>{
           const tax = Number(e.target.value);
           const amt = Number(formData.billAmount||0);
           setFormData({...formData, taxDeduction: tax, amount: amt - tax});
          }} />
         </div>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex justify-between items-center">
         <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Net Payable</p>
          <p className="text-2xl font-extrabold text-violet-700 tabular-nums">{formatCurrency(Number(formData.amount)||0)}</p>
         </div>
         {Number(formData.taxDeduction)>0 && (
          <div className="text-right">
           <p className="text-xs font-bold text-amber-500 uppercase">WHT Saved</p>
           <p className="text-sm font-extrabold text-amber-600 tabular-nums">{formatCurrency(Number(formData.taxDeduction)||0)}</p>
          </div>
         )}
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Amount Paid So Far</label>
         <input type="number" placeholder="0" className="form-input" value={formData.paidAmount||''} onChange={e=>setFormData({...formData,paidAmount:e.target.value})} />
        </div>
        {Number(formData.amount)>0 && Number(formData.paidAmount)>0 && (
         <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <div className="flex justify-between items-center mb-1.5">
           <span className="text-xs font-bold text-slate-500 uppercase">Payment Progress</span>
           <span className="text-xs font-extrabold text-emerald-600">{Math.min(100,((Number(formData.paidAmount)||0)/(Number(formData.amount)||1)*100)).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
           <div className="h-full bg-emerald-400 rounded-full" style={{width:`${Math.min(100,((Number(formData.paidAmount)||0)/(Number(formData.amount)||1)*100)).toFixed(0)}%`}}/>
          </div>
          <p className="text-xs text-rose-600 font-bold mt-1.5">Balance: {formatCurrency(Math.max(0,(Number(formData.amount)||0)-(Number(formData.paidAmount)||0)))}</p>
         </div>
        )}
       </div>
      )}
      {view === 'expenses' && (
       <div className="space-y-4">
        <div className="pb-2 border-b border-slate-100">
         <p className="text-xs font-extrabold text-rose-500 uppercase tracking-widest">Expense Details</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Date *</label>
          <input type="date" required className="form-input" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})} />
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Category</label>
          <select className="form-select" value={formData.category||'General'} onChange={e=>setFormData({...formData,category:e.target.value})}>
           {expenseCategories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
         </div>
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Description *</label>
         <input required placeholder="e.g. Monthly office rent, Software subscription..." className="form-input" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})} />
        </div>
        <div>
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Vendor / Supplier (optional)</label>
         <input placeholder="e.g. PTCL, Adobe, Mall of Lahore..." className="form-input" value={formData.vendor||''} onChange={e=>setFormData({...formData,vendor:e.target.value})} />
        </div>
        <div className="pb-2 border-b border-slate-100 pt-1">
         <p className="text-xs font-extrabold text-rose-500 uppercase tracking-widest">Amount</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Total Amount *</label>
          <input type="number" required placeholder="0" className="form-input" value={formData.amount||''} onChange={e=>setFormData({...formData,amount:e.target.value})} />
         </div>
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
           <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"/>Tax Credit (Input)
          </label>
          <input type="number" placeholder="0" className="form-input" value={formData.taxAmount||''} onChange={e=>setFormData({...formData,taxAmount:e.target.value})} />
         </div>
        </div>
        {Number(formData.amount) > 0 && (
         <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Expense Amount</span>
          <span className="text-xl font-extrabold text-rose-700 tabular-nums">{formatCurrency(Number(formData.amount)||0)}</span>
         </div>
        )}
        <div className="flex items-center justify-between p-3 bg-violet-50 border border-violet-100 rounded-xl cursor-pointer" onClick={()=>setFormData({...formData, isRecurring: !formData.isRecurring})}>
         <div>
          <p className="text-sm font-bold text-violet-800">Monthly Recurring</p>
          <p className="text-xs text-violet-500 mt-0.5">Auto-generate this expense every month</p>
         </div>
         <div className={`w-10 h-5 rounded-full transition-colors duration-200 flex items-center ${formData.isRecurring ? 'bg-violet-600' : 'bg-slate-300'}`}>
          <span className={`w-4 h-4 bg-white rounded-full shadow mx-0.5 transition-transform duration-200 ${formData.isRecurring ? 'translate-x-5' : 'translate-x-0'}`}/>
         </div>
        </div>
        {!isEditingRecord && (
         <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Approval Status</label>
          <select className="form-select" value={formData.approvalStatus||'Pending'} onChange={e=>setFormData({...formData,approvalStatus:e.target.value})}>
           <option value="Pending">Pending Approval</option>
           <option value="Approved">Approved</option>
          </select>
         </div>
        )}
       </div>
      )}
      {view==='salaries' && <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Details (Optional)</label><div className="grid grid-cols-2 gap-4"><input placeholder="Bank Name" className="form-input bg-white" value={formData.bankName||''} onChange={e=>setFormData({...formData,bankName:e.target.value})} /><input placeholder="Cheque #" className="form-input bg-white" value={formData.chequeNumber||''} onChange={e=>setFormData({...formData,chequeNumber:e.target.value})} /></div></div>}{view==='expenses' && <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Method (Optional)</label><div className="grid grid-cols-2 gap-4"><input placeholder="Bank Name" className="form-input bg-white" value={formData.bankName||''} onChange={e=>setFormData({...formData,bankName:e.target.value})} /><input placeholder="Cheque / Ref #" className="form-input bg-white" value={formData.chequeNumber||''} onChange={e=>setFormData({...formData,chequeNumber:e.target.value})} /></div></div>}{view==='petty-cash' && <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Details (Optional)</label><div className="grid grid-cols-2 gap-4"><input placeholder="Bank Name" className="form-input bg-white" value={formData.bankName||''} onChange={e=>setFormData({...formData,bankName:e.target.value})} /><input placeholder="Ref / Receipt #" className="form-input bg-white" value={formData.chequeNumber||''} onChange={e=>setFormData({...formData,chequeNumber:e.target.value})} /></div></div>}
      <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-5 rounded-2xl hover:bg-violet-50 transition-colors border-2 border-dashed border-slate-200 hover:border-violet-300 group"><div className="p-2 bg-white rounded-full text-slate-400 group-hover:text-violet-500 shadow-sm"><Upload size={20}/></div><span className="text-sm font-bold text-slate-500 group-hover:text-violet-600">{fileToUpload?fileToUpload.name:"Attach Receipt / Proof"}</span><input type="file" className="hidden" onChange={e=>setFileToUpload(e.target.files[0])}/></label>
      <button disabled={isSubmitting} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all transform hover:scale-[1.01] active:scale-95 flex justify-center items-center gap-2">{isSubmitting?<RefreshCw className="animate-spin" size={20}/>:<CheckCircle size={20}/>} {isSubmitting?'Saving...':'Save Record'}</button>
     </form>
     <style>{`.form-input { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; background: #F8FAFC; outline: none; transition: all; font-weight: 500; font-size: 0.95rem; } .form-input:focus { background: white; border-color: #8B5CF6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); } .form-select { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; background: white; outline: none; font-weight: 500; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }`}</style>
     </div>{}
    </div>{}
   </div>
  )}
  {}
  {deleteConfirm && (
   <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
     <div className="flex items-center justify-center w-16 h-16 bg-rose-100 rounded-2xl mx-auto mb-5">
      <Trash2 className="text-rose-600" size={28}/>
     </div>
     <h3 className="text-xl font-extrabold text-slate-800 text-center mb-2">Delete Record?</h3>
     {deleteConfirm.label ? (
      <p className="text-slate-500 text-center text-sm mb-6">
       You are about to permanently delete <span className="font-bold text-slate-800">"{deleteConfirm.label}"</span>. This cannot be undone.
      </p>
     ) : (
      <p className="text-slate-500 text-center text-sm mb-6">This record will be permanently deleted and cannot be recovered.</p>
     )}
     <div className="flex gap-3">
      <button onClick={() => setDeleteConfirm(null)}
       className="flex-1 py-3 rounded-2xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
       Cancel
      </button>
      <button onClick={confirmDelete}
       className="flex-1 py-3 rounded-2xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">
       Yes, Delete
      </button>
     </div>
    </div>
   </div>
  )}
  {}
  {showSalarySlip && formData && <SalarySlip data={formData} onClose={() => setShowSalarySlip(false)} companyProfile={companyProfile} />}
  </main>
 </div>
 );
}


export default App;
