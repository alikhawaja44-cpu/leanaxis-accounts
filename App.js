import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Wallet, Receipt, Users, Building2, 
  Plus, Download, Search, Trash2, ArrowUpRight, ArrowDownLeft, Calendar, LogIn, Lock, UserPlus, Settings, Edit
} from 'lucide-react';

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(amount);
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

// --- MOCK DATA ---
const INITIAL_USERS = [
    { username: 'admin', password: 'admin123', email: 'admin@leanaxis.com', role: 'Admin' }
];

const INITIAL_PETTY_CASH = [
  { id: 1, date: '2025-12-02', description: 'Mr Ayaz Medicines', head: 'Office Expenses', cashOut: 366, cashIn: 0, addedBy: 'admin' },
  { id: 2, date: '2025-12-02', description: 'Yasir Tea Items', head: 'Meals & Entertainment', cashOut: 2653, cashIn: 0, addedBy: 'admin' },
  { id: 3, date: '2025-12-09', description: 'LeanAxis CHQ Received', head: 'Cheque Received', cashOut: 0, cashIn: 5000, addedBy: 'admin' },
];

const INITIAL_EXPENSES = [
  { id: 1, bill: 'Rent of 4th Floor', amount: 80000, dueDate: '2024-10-10', status: 'Paid', addedBy: 'admin' },
  { id: 2, bill: 'Electricity Bill', amount: 51419, dueDate: '2024-10-14', status: 'Paid', addedBy: 'admin' },
  { id: 3, bill: 'Petty Expense', amount: 50000, dueDate: 'Approx', status: 'Paid', addedBy: 'admin' },
];

const INITIAL_SALARIES = [
  { id: 1, name: 'Bilal Khattak', designation: 'CEO', salary: 50000, status: 'Unpaid', date: '2024-10-01', addedBy: 'admin' },
  { id: 2, name: 'Alizay Irfan', designation: 'Managing Director', salary: 50000, status: 'Paid', date: '2024-10-01', addedBy: 'admin' },
  { id: 3, name: 'Talha Mumtaz', designation: 'Video Dept Head', salary: 40000, status: 'Paid', date: '2024-10-01', addedBy: 'admin' },
];

const INITIAL_BANK = [
  { id: 1, date: '2024-11-01', bank: 'Sonari Bank', cheque: 'CA 75812934', amount: 300000, description: 'Luxe Home event payment', type: 'Withdrawal', addedBy: 'admin' },
  { id: 2, date: '2024-11-01', bank: 'Sonari Bank', cheque: 'CA 75812937', amount: 20000, description: 'Online Transfer Bilal', type: 'Withdrawal', addedBy: 'admin' },
];

// --- HOOK FOR LOCAL STORAGE ---
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
  const [loginInput, setLoginInput] = useState(''); // Changed to loginInput (can be email or username)
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(loginInput, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200">
        <div className="flex justify-center mb-6">
           <div className="bg-blue-600 p-3 rounded-lg text-white font-bold text-2xl">LA</div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">LeanAxis Accounts</h2>
        <p className="text-center text-slate-500 mb-8">Secure Login</p>
        
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
  const [users, setUsers] = useStickyState(INITIAL_USERS, 'leanaxis_users'); 
  const [authError, setAuthError] = useState(null);

  const handleLogin = (loginInput, password) => {
      // Find user by username OR email
      const user = users.find(u => (u.username === loginInput || u.email === loginInput) && u.password === password);
      if (user) { 
          setIsAuthenticated(true);
          setCurrentUser(user); 
          setAuthError(null);
      } else {
          setAuthError('Invalid username/email or password');
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setView('dashboard'); 
  };

  const [view, setView] = useState('dashboard');
  
  // State for Data
  const [pettyCash, setPettyCash] = useStickyState(INITIAL_PETTY_CASH, 'leanaxis_petty');
  const [expenses, setExpenses] = useStickyState(INITIAL_EXPENSES, 'leanaxis_expenses');
  const [salaries, setSalaries] = useStickyState(INITIAL_SALARIES, 'leanaxis_salaries');
  const [bankRecords, setBankRecords] = useStickyState(INITIAL_BANK, 'leanaxis_bank');

  // Filter State
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');

  // Forms State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [isEditingUser, setIsEditingUser] = useState(false); 

  // Filter Helper
  const filterByDate = (items) => {
    if (selectedMonth === 'All' && selectedYear === 'All') return items;
    return items.filter(item => {
      const dateStr = item.date || item.dueDate; 
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

  // Dashboard Calculations
  const totals = useMemo(() => {
    const totalPettyCashOut = filteredPettyCash.reduce((acc, curr) => acc + (Number(curr.cashOut) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + (curr.status === 'Paid' ? Number(curr.amount) : 0), 0);
    const totalSalaries = filteredSalaries.reduce((acc, curr) => acc + (curr.status === 'Paid' ? Number(curr.salary) : 0), 0);
    const totalBankWithdrawals = filteredBankRecords.filter(r => r.type === 'Withdrawal').reduce((acc, curr) => acc + Number(curr.amount), 0);
    
    return {
      expense: totalPettyCashOut + totalExpenses + totalSalaries + totalBankWithdrawals,
      pettyBalance: pettyCash.reduce((acc, curr) => acc + (Number(curr.cashIn) || 0) - (Number(curr.cashOut) || 0), 0)
    };
  }, [filteredPettyCash, filteredExpenses, filteredSalaries, filteredBankRecords, pettyCash]); 

  // --- HANDLERS ---
  const handleDelete = (id, type) => {
    if(!confirm('Delete this record?')) return;
    if (type === 'petty') setPettyCash(pettyCash.filter(i => i.id !== id));
    if (type === 'expense') setExpenses(expenses.filter(i => i.id !== id));
    if (type === 'salary') setSalaries(salaries.filter(i => i.id !== id));
    if (type === 'bank') setBankRecords(bankRecords.filter(i => i.id !== id));
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    
    if (view === 'manage-users') {
        if (isEditingUser) {
            // Update existing user
            setUsers(users.map(u => u.username === formData.originalUsername ? { ...formData, originalUsername: undefined } : u));
            alert("User updated successfully!");
        } else {
            // Add new user
            if (users.some(u => u.username === formData.username)) {
                alert("Username already exists!");
                return;
            }
            setUsers([...users, formData]);
            alert("User added successfully!");
        }
        setShowForm(false);
        setFormData({});
        setIsEditingUser(false);
        return;
    }

    // Normal Record Logic
    const id = Date.now();
    const newItem = { ...formData, id, addedBy: currentUser.username }; 
    
    if (view === 'petty-cash') setPettyCash([newItem, ...pettyCash]);
    if (view === 'expenses') setExpenses([newItem, ...expenses]);
    if (view === 'salaries') setSalaries([newItem, ...salaries]);
    if (view === 'bank') setBankRecords([newItem, ...bankRecords]);
    
    setShowForm(false);
    setFormData({});
  };
  
  const handleEditUser = (user) => {
      setFormData({ ...user, originalUsername: user.username }); // Keep track of original for ID
      setIsEditingUser(true);
      setShowForm(true);
  };

  const handleDeleteUser = (username) => {
      if (username === 'admin') { alert("Cannot delete main admin!"); return; }
      if (!confirm("Delete user?")) return;
      setUsers(users.filter(u => u.username !== username));
  };

  const handleExport = () => {
    if (view === 'petty-cash') exportToCSV(filteredPettyCash, 'leanaxis_petty_cash.csv');
    if (view === 'expenses') exportToCSV(filteredExpenses, 'leanaxis_expenses.csv');
    if (view === 'salaries') exportToCSV(filteredSalaries, 'leanaxis_salaries.csv');
    if (view === 'bank') exportToCSV(filteredBankRecords, 'leanaxis_bank_records.csv');
  };

  // --- RENDER HELPERS ---
  const NavButton = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setView(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  if (!isAuthenticated) {
      return <LoginView onLogin={handleLogin} error={authError} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white font-bold">LA</div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">LeanAxis</h1>
              <p className="text-xs text-slate-500">Accounts Manager</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavButton id="petty-cash" icon={Wallet} label="Petty Cash" />
          <NavButton id="expenses" icon={Receipt} label="Expense Sheet" />
          <NavButton id="salaries" icon={Users} label="Salary Register" />
          <NavButton id="bank" icon={Building2} label="Bank Records" />
          
          {currentUser.role === 'Admin' && (
             <div className="mt-8 pt-4 border-t border-slate-100">
                <NavButton id="manage-users" icon={UserPlus} label="Manage Users" />
             </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <div className="mb-4 px-2 text-xs text-slate-500 text-center">Logged in as: <span className="font-bold text-slate-700">{currentUser.username}</span></div>
          <div className="bg-slate-100 p-4 rounded-lg mb-4">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Petty Cash Balance</p>
            <p className={`text-xl font-bold ${totals.pettyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.pettyBalance)}
            </p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm">
             <Lock size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto p-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 capitalize">
              {view.replace('-', ' ')}
            </h2>
            <p className="text-slate-500">Manage your business finances</p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
             {/* DATE FILTERS (Hide on User Management) */}
            {view !== 'manage-users' && (
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-sm">
                    <Calendar size={18} className="text-slate-400" />
                    <select className="bg-transparent outline-none text-sm text-slate-700" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
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
                <>
                  {view !== 'manage-users' && (
                      <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition-colors text-slate-700 bg-white shadow-sm">
                        <Download size={18} /> Export
                      </button>
                  )}
                  <button onClick={() => { setShowForm(true); setIsEditingUser(false); setFormData({}); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                    <Plus size={18} /> {view === 'manage-users' ? 'Add User' : 'Add New'}
                  </button>
                </>
            )}
          </div>
        </header>

        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-50 rounded-lg text-red-600"><ArrowUpRight size={24} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase">Total Expenses</span>
              </div>
              <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(totals.expense)}</h3>
              <p className="text-sm text-slate-500 mt-2">Filtered outflow</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Wallet size={24} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase">Petty Cash In Hand</span>
              </div>
              <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(totals.pettyBalance)}</h3>
              <p className="text-sm text-slate-500 mt-2">Current liquid cash (Total)</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><Users size={24} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase">Staff Count</span>
              </div>
              <h3 className="text-3xl font-bold text-slate-800">{salaries.length}</h3>
              <p className="text-sm text-slate-500 mt-2">Active employees</p>
            </div>
          </div>
        )}

        {/* USER MANAGEMENT VIEW */}
        {view === 'manage-users' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
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
                                    <td className="p-4">{u.email}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                                    <td className="p-4 font-mono text-slate-400">••••••</td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleEditUser(u)} className="text-slate-400 hover:text-blue-500 mr-2"><Edit size={16}/></button>
                                        <button onClick={() => handleDeleteUser(u.username)} className={`text-slate-400 ${u.username === 'admin' ? 'cursor-not-allowed opacity-50' : 'hover:text-red-500'}`} disabled={u.username === 'admin'}><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* DATA TABLES */}
        {view !== 'dashboard' && view !== 'manage-users' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-sm border-b border-slate-200">
                  <tr>
                    {view === 'petty-cash' && <><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4">Head</th><th className="p-4 text-right">Cash Out</th><th className="p-4 text-right">Cash In</th><th className="p-4 text-xs text-slate-400">Added By</th></>}
                    {view === 'expenses' && <><th className="p-4">Bill Name</th><th className="p-4">Due Date</th><th className="p-4">Status</th><th className="p-4 text-right">Amount</th><th className="p-4 text-xs text-slate-400">Added By</th></>}
                    {view === 'salaries' && <><th className="p-4">Employee Name</th><th className="p-4">Designation</th><th className="p-4">Date</th><th className="p-4">Status</th><th className="p-4 text-right">Net Salary</th><th className="p-4 text-xs text-slate-400">Added By</th></>}
                    {view === 'bank' && <><th className="p-4">Date</th><th className="p-4">Bank</th><th className="p-4">Cheque #</th><th className="p-4">Description</th><th className="p-4 text-right">Amount</th><th className="p-4 text-xs text-slate-400">Added By</th></>}
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {view === 'petty-cash' && filteredPettyCash.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4">{item.date}</td>
                      <td className="p-4 font-medium">{item.description}</td>
                      <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{item.head}</span></td>
                      <td className="p-4 text-right text-red-600">{item.cashOut ? formatCurrency(item.cashOut) : '-'}</td>
                      <td className="p-4 text-right text-green-600">{item.cashIn ? formatCurrency(item.cashIn) : '-'}</td>
                      <td className="p-4 text-xs text-slate-400 uppercase">{item.addedBy || 'system'}</td>
                      <td className="p-4 text-center"><button onClick={() => handleDelete(item.id, 'petty')} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                  
                  {view === 'expenses' && filteredExpenses.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium">{item.bill}</td>
                      <td className="p-4">{item.dueDate}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.status}</span></td>
                      <td className="p-4 text-right font-bold">{formatCurrency(item.amount)}</td>
                      <td className="p-4 text-xs text-slate-400 uppercase">{item.addedBy || 'system'}</td>
                      <td className="p-4 text-center"><button onClick={() => handleDelete(item.id, 'expense')} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}

                  {view === 'salaries' && filteredSalaries.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4 text-slate-500">{item.designation}</td>
                      <td className="p-4 text-slate-500">{item.date || '-'}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{item.status}</span></td>
                      <td className="p-4 text-right font-bold">{formatCurrency(item.salary)}</td>
                      <td className="p-4 text-xs text-slate-400 uppercase">{item.addedBy || 'system'}</td>
                      <td className="p-4 text-center"><button onClick={() => handleDelete(item.id, 'salary')} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}

                  {view === 'bank' && filteredBankRecords.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4">{item.date}</td>
                      <td className="p-4 text-blue-600 font-medium">{item.bank}</td>
                      <td className="p-4 font-mono text-xs">{item.cheque}</td>
                      <td className="p-4 text-slate-600">{item.description}</td>
                      <td className="p-4 text-right font-bold">{formatCurrency(item.amount)}</td>
                      <td className="p-4 text-xs text-slate-400 uppercase">{item.addedBy || 'system'}</td>
                      <td className="p-4 text-center"><button onClick={() => handleDelete(item.id, 'bank')} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {((view === 'petty-cash' && filteredPettyCash.length === 0) || 
                (view === 'expenses' && filteredExpenses.length === 0) || 
                (view === 'salaries' && filteredSalaries.length === 0) || 
                (view === 'bank' && filteredBankRecords.length === 0)) && (
                  <div className="p-8 text-center text-slate-400">No records found for selected period.</div>
              )}
            </div>
          </div>
        )}

        {/* MODAL FORM */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold mb-4">{view === 'manage-users' ? (isEditingUser ? 'Edit User' : 'Add New User') : 'Add Record'}</h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                
                {view === 'manage-users' && (
                    <>
                        <input required placeholder="Username" className="w-full border p-2 rounded" value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} />
                        <input required type="email" placeholder="Email" className="w-full border p-2 rounded" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                        <input required={!isEditingUser} type="password" placeholder="Password" className="w-full border p-2 rounded" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <select className="w-full border p-2 rounded" value={formData.role || 'Staff'} onChange={e => setFormData({...formData, role: e.target.value})}>
                            <option value="Staff">Staff</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </>
                )}

                {view === 'petty-cash' && (
                  <>
                    <input required type="date" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, date: e.target.value})} />
                    <input required placeholder="Description" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, description: e.target.value})} />
                    <select className="w-full border p-2 rounded" onChange={e => setFormData({...formData, head: e.target.value})}>
                      <option>Office Expenses</option><option>Meals & Entertainment</option><option>Traveling</option><option>Cheque Received</option>
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="Cash Out" className="border p-2 rounded" onChange={e => setFormData({...formData, cashOut: e.target.value})} />
                      <input type="number" placeholder="Cash In" className="border p-2 rounded" onChange={e => setFormData({...formData, cashIn: e.target.value})} />
                    </div>
                  </>
                )}

                {view === 'expenses' && (
                  <>
                    <input required placeholder="Bill Name" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, bill: e.target.value})} />
                    <input required type="date" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                    <input required type="number" placeholder="Amount" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, amount: e.target.value})} />
                    <select className="w-full border p-2 rounded" onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Unpaid">Unpaid</option><option value="Paid">Paid</option>
                    </select>
                  </>
                )}

                {view === 'salaries' && (
                  <>
                    <input required placeholder="Employee Name" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input required placeholder="Designation" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, designation: e.target.value})} />
                    <input required type="date" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, date: e.target.value})} />
                    <input required type="number" placeholder="Salary" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, salary: e.target.value})} />
                    <select className="w-full border p-2 rounded" onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Unpaid">Unpaid</option><option value="Paid">Paid</option>
                    </select>
                  </>
                )}

                {view === 'bank' && (
                  <>
                    <input required type="date" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, date: e.target.value})} />
                    <input required placeholder="Bank Name" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, bank: e.target.value})} />
                    <input required placeholder="Cheque #" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, cheque: e.target.value})} />
                    <input required placeholder="Description" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, description: e.target.value})} />
                    <input required type="number" placeholder="Amount" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </>
                )}

                <div className="flex gap-3 justify-end mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
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