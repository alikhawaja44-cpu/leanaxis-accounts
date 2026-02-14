import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Wallet, Receipt, Users, Building2, Briefcase, Truck,
  Plus, Download, Trash2, ArrowUpRight, ArrowDownLeft, Calendar, LogIn, Lock, 
  UserPlus, Edit, Menu, X, CheckCircle, Clock, Upload, Link as LinkIcon, 
  Copy, RefreshCw, FileInput, Settings, FileDown, Search, Filter, FileText // Added FileText
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount) => {
  const val = Number(amount);
  if (isNaN(val)) return 'Rs 0';
  return new Intl.NumberFormat('en-PK', { 
    style: 'currency', 
    currency: 'PKR', 
    maximumFractionDigits: 0 
  }).format(val).replace('PKR', 'Rs');
};

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

// --- CUSTOM HOOKS ---
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

// --- COMPONENTS ---
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
      <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 relative z-10">
        <h2 className="text-3xl font-bold text-center text-white mb-8">LeanAxis Login</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input 
            type="text" 
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white" 
            placeholder="Username or Email"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            required
          />
          <input 
            type="password" 
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useStickyState(false, 'leanaxis_auth');
  const [currentUser, setCurrentUser] = useStickyState(null, 'leanaxis_current_user');
  const [view, setView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [imgbbKey] = useStickyState('', 'leanaxis_imgbb_key');
  
  const [users, usersLoading] = useFirebaseSync('users');
  const [pettyCash] = useFirebaseSync('petty_cash');
  const [expenses] = useFirebaseSync('expenses');
  const [salaries] = useFirebaseSync('salaries');
  const [bankRecords] = useFirebaseSync('bank_records');
  const [clients] = useFirebaseSync('clients');
  const [vendors] = useFirebaseSync('vendors');

  const handleLogin = async (loginInput, password) => {
      const inputHash = await hashPassword(password);
      
      // Initial Admin check
      if (users.length === 0 && loginInput === 'admin' && password === 'admin123') {
          setIsAuthenticated(true);
          setCurrentUser({ username: 'admin', role: 'Admin' });
          return;
      }

      const user = users.find(u => u.username === loginInput || u.email === loginInput);
      if (user && (user.password === password || user.password === inputHash)) {
          setIsAuthenticated(true);
          setCurrentUser(user);
          if (user.password === password) {
              updateDoc(doc(db, 'users', user.id), { password: inputHash }).catch(console.error);
          }
      } else {
          alert('Invalid credentials');
      }
  };

  const totals = useMemo(() => {
      const revenue = clients.reduce((acc, curr) => acc + (Number(curr.advanceReceived) || 0), 0);
      const spending = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) + 
                       salaries.reduce((acc, curr) => acc + (Number(curr.totalPayable) || 0), 0);
      return { revenue, spending, profit: revenue - spending };
  }, [clients, expenses, salaries]);

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 transform transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-40`}>
        <div className="p-6 text-white font-bold text-2xl border-b border-slate-800">LeanAxis</div>
        <nav className="p-4 space-y-2">
            <button onClick={() => setView('dashboard')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${view === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                <LayoutDashboard size={20} /> Dashboard
            </button>
            <button onClick={() => setView('clients')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${view === 'clients' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                <Briefcase size={20} /> Clients
            </button>
            <button onClick={() => setIsAuthenticated(false)} className="w-full text-left p-3 text-red-400 flex items-center gap-3 mt-10">
                <Lock size={20} /> Logout
            </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 overflow-auto p-8">
        <header className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800 capitalize">{view}</h2>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 bg-white rounded-lg"><Menu /></button>
        </header>

        {view === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500">
                    <p className="text-slate-500 text-sm">Revenue</p>
                    <h3 className="text-2xl font-bold">{formatCurrency(totals.revenue)}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-rose-500">
                    <p className="text-slate-500 text-sm">Spending</p>
                    <h3 className="text-2xl font-bold">{formatCurrency(totals.spending)}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-indigo-500">
                    <p className="text-slate-500 text-sm">Net Profit</p>
                    <h3 className="text-2xl font-bold">{formatCurrency(totals.profit)}</h3>
                </div>
            </div>
        )}

        {/* Other views would be implemented similarly here */}
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);