import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Wallet, Receipt, Users, Building2, 
  Plus, Download, Search, Trash2, ArrowUpRight, ArrowDownLeft
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
const INITIAL_PETTY_CASH = [
  { id: 1, date: '2025-12-02', description: 'Mr Ayaz Medicines', head: 'Office Expenses', cashOut: 366, cashIn: 0 },
  { id: 2, date: '2025-12-02', description: 'Yasir Tea Items', head: 'Meals & Entertainment', cashOut: 2653, cashIn: 0 },
  { id: 3, date: '2025-12-09', description: 'LeanAxis CHQ Received', head: 'Cheque Received', cashOut: 0, cashIn: 5000 },
];

const INITIAL_EXPENSES = [
  { id: 1, bill: 'Rent of 4th Floor', amount: 80000, dueDate: '2024-10-10', status: 'Paid' },
  { id: 2, bill: 'Electricity Bill', amount: 51419, dueDate: '2024-10-14', status: 'Paid' },
  { id: 3, bill: 'Petty Expense', amount: 50000, dueDate: 'Approx', status: 'Paid' },
];

const INITIAL_SALARIES = [
  { id: 1, name: 'Bilal Khattak', designation: 'CEO', salary: 50000, status: 'Unpaid' },
  { id: 2, name: 'Alizay Irfan', designation: 'Managing Director', salary: 50000, status: 'Paid' },
  { id: 3, name: 'Talha Mumtaz', designation: 'Video Dept Head', salary: 40000, status: 'Paid' },
];

const INITIAL_BANK = [
  { id: 1, date: '2024-11-01', bank: 'Sonari Bank', cheque: 'CA 75812934', amount: 300000, description: 'Luxe Home event payment', type: 'Withdrawal' },
  { id: 2, date: '2024-11-01', bank: 'Sonari Bank', cheque: 'CA 75812937', amount: 20000, description: 'Online Transfer Bilal', type: 'Withdrawal' },
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

// --- MAIN APP COMPONENT ---
function App() {
  const [view, setView] = useState('dashboard');
  
  // State for Data (Persisted to Local Storage)
  const [pettyCash, setPettyCash] = useStickyState(INITIAL_PETTY_CASH, 'leanaxis_petty');
  const [expenses, setExpenses] = useStickyState(INITIAL_EXPENSES, 'leanaxis_expenses');
  const [salaries, setSalaries] = useStickyState(INITIAL_SALARIES, 'leanaxis_salaries');
  const [bankRecords, setBankRecords] = useStickyState(INITIAL_BANK, 'leanaxis_bank');

  // Forms State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});

  // Dashboard Calculations
  const totals = useMemo(() => {
    const totalPettyCashOut = pettyCash.reduce((acc, curr) => acc + (Number(curr.cashOut) || 0), 0);
    const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.status === 'Paid' ? Number(curr.amount) : 0), 0);
    const totalSalaries = salaries.reduce((acc, curr) => acc + (curr.status === 'Paid' ? Number(curr.salary) : 0), 0);
    const totalBankWithdrawals = bankRecords.filter(r => r.type === 'Withdrawal').reduce((acc, curr) => acc + Number(curr.amount), 0);
    
    return {
      expense: totalPettyCashOut + totalExpenses + totalSalaries + totalBankWithdrawals,
      pettyBalance: pettyCash.reduce((acc, curr) => acc + (Number(curr.cashIn) || 0) - (Number(curr.cashOut) || 0), 0)
    };
  }, [pettyCash, expenses, salaries, bankRecords]);

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
    const id = Date.now();
    const newItem = { ...formData, id };
    
    if (view === 'petty-cash') setPettyCash([newItem, ...pettyCash]);
    if (view === 'expenses') setExpenses([newItem, ...expenses]);
    if (view === 'salaries') setSalaries([newItem, ...salaries]);
    if (view === 'bank') setBankRecords([newItem, ...bankRecords]);
    
    setShowForm(false);
    setFormData({});
  };

  const handleExport = () => {
    if (view === 'petty-cash') exportToCSV(pettyCash, 'leanaxis_petty_cash.csv');
    if (view === 'expenses') exportToCSV(expenses, 'leanaxis_expenses.csv');
    if (view === 'salaries') exportToCSV(salaries, 'leanaxis_salaries.csv');
    if (view === 'bank') exportToCSV(bankRecords, 'leanaxis_bank_records.csv');
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
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-100 p-4 rounded-lg">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Petty Cash Balance</p>
            <p className={`text-xl font-bold ${totals.pettyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.pettyBalance)}
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto p-8">
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 capitalize">
              {view.replace('-', ' ')}
            </h2>
            <p className="text-slate-500">Manage your business finances</p>
          </div>
          
          {view !== 'dashboard' && (
            <div className="flex gap-3">
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition-colors text-slate-700">
                <Download size={18} /> Export Excel
              </button>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <Plus size={18} /> Add New
              </button>
            </div>
          )}
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
              <p className="text-sm text-slate-500 mt-2">Combined outflow this month</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Wallet size={24} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase">Petty Cash In Hand</span>
              </div>
              <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(totals.pettyBalance)}</h3>
              <p className="text-sm text-slate-500 mt-2">Current liquid cash</p>
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

        {/* DATA TABLES */}
        {view !== 'dashboard' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-sm border-b border-slate-200">
                  <tr>
                    {view === 'petty-cash' && <><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4">Head</th><th className="p-4 text-right">Cash Out</th><th className="p-4 text-right">Cash In</th></>}
                    {view === 'expenses' && <><th className="p-4">Bill Name</th><th className="p-4">Due Date</th><th className="p-4">Status</th><th className="p-4 text-right">Amount</th></>}
                    {view === 'salaries' && <><th className="p-4">Employee Name</th><th className="p-4">Designation</th><th className="p-4">Status</th><th className="p-4 text-right">Net Salary</th></>}
                    {view === 'bank' && <><th className="p-4">Date</th><th className="p-4">Bank</th><th className="p-4">Cheque #</th><th className="p-4">Description</th><th className="p-4 text-right">Amount</th></>}
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {view === 'petty-cash' && pettyCash.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4">{item.date}</td>
                      <td className="p-4 font-medium">{item.description}</td>
                      <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{item.head}</span></td>
                      <td className="p-4 text-right text-red-600">{item.cashOut ? formatCurrency(item.cashOut) : '-'}</td>
                      <td className="p-4 text-right text-green-600">{item.cashIn ? formatCurrency(item.cashIn) : '-'}</td>
                      <td className="p-4 text-center"><button onClick={() => handleDelete(item.id, 'petty')} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                  
                  {view === 'expenses' && expenses.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium">{item.bill}</td>
                      <td className="p-4">{item.dueDate}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.status}</span></td>
                      <td className="p-4 text-right font-bold">{formatCurrency(item.amount)}</td>
                      <td className="p-4 text-center"><button onClick={() => handleDelete(item.id, 'expense')} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}

                  {view === 'salaries' && salaries.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4 text-slate-500">{item.designation}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{item.status}</span></td>
                      <td className="p-4 text-right font-bold">{formatCurrency(item.salary)}</td>
                      <td className="p-4 text-center"><button onClick={() => handleDelete(item.id, 'salary')} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}

                  {view === 'bank' && bankRecords.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4">{item.date}</td>
                      <td className="p-4 text-blue-600 font-medium">{item.bank}</td>
                      <td className="p-4 font-mono text-xs">{item.cheque}</td>
                      <td className="p-4 text-slate-600">{item.description}</td>
                      <td className="p-4 text-right font-bold">{formatCurrency(item.amount)}</td>
                      <td className="p-4 text-center"><button onClick={() => handleDelete(item.id, 'bank')} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL FORM */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold mb-4">Add Record</h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                
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