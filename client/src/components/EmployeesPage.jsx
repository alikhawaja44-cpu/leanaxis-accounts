// src/components/EmployeesPage.jsx
// Employee master records — the source of truth for payroll.
// Includes the salary revision (increment) workflow and history timeline.

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Plus, Search, Edit, Trash2, X, TrendingUp, TrendingDown,
  Calendar, Briefcase, ChevronRight, Wallet, CheckCircle, Download,
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import {
  STRUCTURE_EARNINGS, STRUCTURE_DEDUCTIONS, EMPLOYEE_STATUSES,
  pickStructure, structureGross, structureFor, currentStructure,
  sortedHistory, revisionDelta, validateEmployee, periodLabelOf,
} from '../utils/employees';
import { PAYMENT_MODES } from '../utils/payroll';

const FIELD_LABELS = {
  basicSalary: 'Basic Salary',
  houseRent: 'House Rent',
  conveyance: 'Conveyance',
  medicalAllowance: 'Medical',
  specialAllowance: 'Special Allowance',
  eobi: 'EOBI',
  providentFund: 'Provident Fund',
};

const STATUS_STYLES = {
  Active: 'bg-emerald-100 text-emerald-700',
  'On Leave': 'bg-amber-100 text-amber-700',
  Resigned: 'bg-slate-100 text-slate-500',
  Terminated: 'bg-rose-100 text-rose-700',
};

const fmtDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime())
    ? String(d)
    : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const initials = (n) =>
  String(n || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// ── Salary revision modal ───────────────────────────────────────────────────
const RevisionModal = ({ employee, onClose, onSave, toast }) => {
  const latest = currentStructure(employee) || pickStructure({});
  const [form, setForm] = useState({
    ...latest,
    effectiveFrom: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const delta = revisionDelta(form, latest);
  const set = (patch) => setForm((p) => ({ ...p, ...patch }));

  const money = (key) => (
    <div key={key}>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
        {FIELD_LABELS[key]}
      </label>
      <input
        type="number" min="0" step="0.01" className="form-input"
        value={form[key] ?? ''}
        onChange={(e) => set({ [key]: e.target.value === '' ? '' : Number(e.target.value) })}
      />
    </div>
  );

  const submit = (e) => {
    e.preventDefault();
    if (!form.effectiveFrom) return toast('Choose the date this revision takes effect.', 'warning');
    if (structureGross(form) <= 0) return toast('Basic salary must be greater than 0.', 'warning');
    onSave({ ...pickStructure(form), effectiveFrom: form.effectiveFrom, reason: form.reason.trim() });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={submit} className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Salary Revision</p>
            <p className="text-sm font-extrabold text-slate-800">{employee.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-rose-500 shadow-sm" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Effective From *</label>
              <input type="date" required className="form-input" value={form.effectiveFrom}
                onChange={(e) => set({ effectiveFrom: e.target.value })} />
              <p className="text-xs text-slate-400 mt-1">Payslips from this month onward use the new figures.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Reason</label>
              <input className="form-input" placeholder="e.g. Annual increment, Promotion"
                value={form.reason} onChange={(e) => set({ reason: e.target.value })} />
            </div>
          </div>

          <div className="pb-2 border-b border-slate-100 pt-1">
            <p className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest">New Earnings</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{STRUCTURE_EARNINGS.slice(0, 2).map(money)}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{STRUCTURE_EARNINGS.slice(2).map(money)}</div>

          <div className="pb-2 border-b border-slate-100 pt-1">
            <p className="text-xs font-extrabold text-rose-600 uppercase tracking-widest">Recurring Deductions</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{STRUCTURE_DEDUCTIONS.map(money)}</div>

          <div className={`rounded-2xl p-5 flex justify-between items-center ${
            delta.amount > 0 ? 'bg-emerald-50 border border-emerald-200'
            : delta.amount < 0 ? 'bg-rose-50 border border-rose-200'
            : 'bg-slate-50 border border-slate-200'}`}>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Gross</p>
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{formatCurrency(delta.gross)}</p>
              {!delta.isFirst && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  was {formatCurrency(delta.previousGross)}
                </p>
              )}
            </div>
            {!delta.isFirst && delta.amount !== 0 && (
              <div className={`text-right ${delta.amount > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                <div className="flex items-center gap-1 justify-end">
                  {delta.amount > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="text-xl font-extrabold tabular-nums">
                    {delta.percent > 0 ? '+' : ''}{delta.percent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm font-bold tabular-nums">
                  {delta.amount > 0 ? '+' : ''}{formatCurrency(delta.amount)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-xl">
            Save Revision
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Employee profile drawer, with revision timeline ─────────────────────────
const EmployeeProfile = ({ employee, salaries, onBack, onEdit, onRevise, canWrite }) => {
  const history = sortedHistory(employee);
  const current = currentStructure(employee) || {};
  const paid = useMemo(
    () => salaries.filter((s) => (s.employeeRef && s.employeeRef === employee.id)
      || String(s.employeeName || '').trim().toLowerCase() === String(employee.name || '').trim().toLowerCase()),
    [salaries, employee]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button onClick={onBack} className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1">
        <ChevronRight size={15} className="rotate-180" /> Back to employees
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-100">
              {initials(employee.name)}
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{employee.name}</p>
              <p className="text-sm text-slate-500 font-medium">
                {[employee.designation, employee.department].filter(Boolean).join(' · ') || '—'}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-bold text-slate-400">{employee.employeeId}</span>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[employee.status] || STATUS_STYLES.Active}`}>
                  {employee.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
          {canWrite && (
            <div className="flex gap-2">
              <button onClick={() => onEdit(employee)}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 flex items-center gap-2">
                <Edit size={14} /> Edit
              </button>
              <button onClick={() => onRevise(employee)}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2">
                <TrendingUp size={14} /> Revise Salary
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { l: 'Current Gross', v: formatCurrency(structureGross(current)), icon: Wallet },
            { l: 'Date of Joining', v: fmtDate(employee.joiningDate), icon: Calendar },
            { l: 'Payslips Issued', v: paid.length, icon: CheckCircle },
            { l: 'Revisions', v: history.length, icon: TrendingUp },
          ].map((k, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex justify-between items-start mb-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{k.l}</p>
                <k.icon size={13} className="text-slate-300" />
              </div>
              <p className="text-lg font-extrabold text-slate-800 tabular-nums">{k.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Details */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-5 bg-indigo-500 rounded-full" /> Details
          </h3>
          <dl className="space-y-2.5">
            {[
              ['CNIC', employee.cnic], ['Phone', employee.phone], ['Email', employee.email],
              ['Payment Mode', employee.paymentMode], ['Bank', employee.bankName],
              ['Account / IBAN', employee.accountNumber],
              ['Exit Date', employee.exitDate ? fmtDate(employee.exitDate) : null],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 text-sm border-b border-slate-50 pb-2">
                <dt className="text-slate-400 font-bold text-xs uppercase tracking-wide">{k}</dt>
                <dd className="text-slate-800 font-semibold text-right break-all">{v}</dd>
              </div>
            ))}
          </dl>

          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mt-6 mb-3">
            Current Structure
          </h4>
          <div className="space-y-1.5">
            {[...STRUCTURE_EARNINGS, ...STRUCTURE_DEDUCTIONS]
              .filter((k) => Number(current[k]) > 0)
              .map((k) => (
                <div key={k} className="flex justify-between text-sm bg-slate-50 rounded-xl px-3 py-2">
                  <span className="text-slate-600 font-medium">{FIELD_LABELS[k]}</span>
                  <span className={`font-extrabold tabular-nums ${STRUCTURE_DEDUCTIONS.includes(k) ? 'text-rose-600' : 'text-slate-800'}`}>
                    {STRUCTURE_DEDUCTIONS.includes(k) ? '-' : ''}{formatCurrency(current[k])}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Revision timeline */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-5 bg-violet-500 rounded-full" /> Salary History
          </h3>
          {history.length === 0 && (
            <p className="text-sm text-slate-400 py-6 text-center">
              No revisions recorded yet. Use <strong>Revise Salary</strong> to log an increment.
            </p>
          )}
          <ol className="relative border-l-2 border-slate-100 ml-2 space-y-5">
            {history.map((h, i) => {
              const prev = history[i + 1] ? pickStructure(history[i + 1]) : null;
              const d = revisionDelta(h, prev);
              return (
                <li key={i} className="ml-5">
                  <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white ${
                    i === 0 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                  <div className="flex justify-between items-baseline gap-3 flex-wrap">
                    <p className="text-sm font-extrabold text-slate-800">
                      {fmtDate(h.effectiveFrom)}
                      {i === 0 && <span className="ml-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Current</span>}
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 tabular-nums">{formatCurrency(d.gross)}</p>
                  </div>
                  {h.reason && <p className="text-xs text-slate-500 font-medium mt-0.5">{h.reason}</p>}
                  {!d.isFirst && d.amount !== 0 && (
                    <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${d.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {d.amount > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {d.amount > 0 ? '+' : ''}{formatCurrency(d.amount)} ({d.percent > 0 ? '+' : ''}{d.percent.toFixed(1)}%)
                    </p>
                  )}
                  {h.revisedBy && <p className="text-xs text-slate-300 mt-0.5">by {h.revisedBy}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Payslip history */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800">Payslips ({paid.length})</h3>
        </div>
        {paid.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No payslips issued for this employee yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Period', 'Payment Date', 'Net Pay', 'Status'].map((h) => (
                <th key={h} className={`px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider ${h === 'Net Pay' ? 'text-right' : ''}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paid.slice(0, 12).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3 text-sm font-bold text-slate-700">{periodLabelOf(s.payPeriod || String(s.date || '').slice(0, 7))}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">{fmtDate(s.date)}</td>
                  <td className="px-5 py-3 text-sm text-right font-extrabold text-slate-900 tabular-nums">{formatCurrency(s.totalPayable)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                      s.status === 'Paid' ? 'bg-emerald-100 text-emerald-700'
                      : s.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {s.status || 'Unpaid'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ── Main page ───────────────────────────────────────────────────────────────
const EmployeesPage = ({
  employees = [], salaries = [], canWrite,
  onNew, onEdit, onDelete, onRevise, onImport, toast = () => {},
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [selected, setSelected] = useState(null);
  const [revising, setRevising] = useState(null);

  const enriched = useMemo(() => employees.map((e) => {
    const st = currentStructure(e) || {};
    return { ...e, gross: structureGross(st), revisions: (e.salaryHistory || []).length };
  }), [employees]);

  const filtered = useMemo(() => {
    let r = enriched;
    if (statusFilter !== 'All') r = r.filter((e) => (e.status || 'Active') === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((e) =>
        [e.name, e.employeeId, e.designation, e.department, e.cnic]
          .some((v) => String(v || '').toLowerCase().includes(q)));
    }
    return [...r].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [enriched, search, statusFilter]);

  const kpis = useMemo(() => {
    const active = enriched.filter((e) => (e.status || 'Active') === 'Active');
    return {
      total: enriched.length,
      active: active.length,
      monthly: active.reduce((a, e) => a + e.gross, 0),
      avg: active.length ? active.reduce((a, e) => a + e.gross, 0) / active.length : 0,
    };
  }, [enriched]);

  // Keep the open profile in sync when the underlying record changes, and close
  // it if the employee was deleted elsewhere.
  const selectedLive = selected ? employees.find((e) => e.id === selected.id) : null;
  useEffect(() => {
    if (selected && !selectedLive) setSelected(null);
  }, [selected, selectedLive]);

  if (selectedLive) {
    return (
      <>
        <EmployeeProfile
          employee={selectedLive} salaries={salaries} canWrite={canWrite}
          onBack={() => setSelected(null)} onEdit={onEdit} onRevise={setRevising}
        />
        {revising && (
          <RevisionModal employee={revising} toast={toast}
            onClose={() => setRevising(null)}
            onSave={(rev) => { onRevise(revising, rev); setRevising(null); }} />
        )}
      </>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Total Employees', v: kpis.total, sub: 'on record', icon: Users, bg: 'bg-white border-slate-200', c: 'text-slate-800' },
          { l: 'Active', v: kpis.active, sub: 'currently employed', icon: CheckCircle, bg: 'bg-emerald-50 border-emerald-200', c: 'text-emerald-700' },
          { l: 'Monthly Payroll', v: formatCurrency(kpis.monthly), sub: 'gross, active staff', icon: Wallet, bg: 'bg-indigo-50 border-indigo-200', c: 'text-indigo-700' },
          { l: 'Average Salary', v: formatCurrency(kpis.avg), sub: 'gross per head', icon: Briefcase, bg: 'bg-white border-slate-200', c: 'text-slate-800' },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} border p-4 rounded-2xl shadow-sm`}>
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{k.l}</p>
              <k.icon size={14} className="text-slate-300 flex-shrink-0" />
            </div>
            <p className={`text-lg font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-56"
              placeholder="Search name, ID, CNIC..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
            {['Active', 'All', ...EMPLOYEE_STATUSES.filter((s) => s !== 'Active')].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs font-bold transition-all ${statusFilter === s ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-indigo-600'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        {canWrite && (
          <div className="flex gap-2 flex-wrap">
            {onImport && salaries.length > 0 && (
              <button onClick={onImport}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                <Download size={15} /> Import from Payslips
              </button>
            )}
            <button onClick={onNew}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all">
              <Plus size={16} /> New Employee
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            {employees.length === 0 ? 'No employees yet' : 'No employees match your filters'}
          </h3>
          <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
            {employees.length === 0
              ? (salaries.length > 0
                  ? 'You already have payslips on file — their names, salaries and bank details can be turned into employee profiles automatically.'
                  : 'Add your team once, then generate payslips without retyping their details each month.')
              : 'Try a different search or status filter.'}
          </p>
          {employees.length === 0 && canWrite && (
            <div className="flex gap-3 justify-center flex-wrap">
              {onImport && salaries.length > 0 && (
                <button onClick={onImport}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2">
                  <Download size={16} /> Import from Payslips
                </button>
              )}
              <button onClick={onNew}
                className={`px-6 py-3 rounded-xl font-bold text-sm ${onImport && salaries.length > 0
                  ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                + Add Manually
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['Employee', 'Designation', 'Joined', 'Payment', 'Gross Salary', 'Status', ''].map((h) => (
                  <th key={h} className={`px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${h === 'Gross Salary' ? 'text-right' : ''}`}>{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 group cursor-pointer" onClick={() => setSelected(e)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0">
                          {initials(e.name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{e.name}</p>
                          <p className="text-xs text-slate-400">{e.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <p className="text-slate-700 font-medium">{e.designation || '—'}</p>
                      {e.department && <p className="text-xs text-violet-600 font-bold">{e.department}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{fmtDate(e.joiningDate)}</td>
                    <td className="px-5 py-4 text-sm">
                      <p className="text-slate-600 font-medium text-xs">{e.paymentMode || 'Bank Transfer'}</p>
                      {e.bankName && <p className="text-xs text-slate-400">{e.bankName}</p>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-extrabold text-slate-900 tabular-nums">{formatCurrency(e.gross)}</p>
                      {e.revisions > 0 && (
                        <p className="text-xs text-slate-400">{e.revisions} revision{e.revisions !== 1 ? 's' : ''}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${STATUS_STYLES[e.status] || STATUS_STYLES.Active}`}>
                        {e.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-4" onClick={(ev) => ev.stopPropagation()}>
                      {canWrite && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setRevising(e)} title="Revise salary" aria-label={`Revise salary for ${e.name}`}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg"><TrendingUp size={13} /></button>
                          <button onClick={() => onEdit(e)} title="Edit" aria-label={`Edit ${e.name}`}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit size={13} /></button>
                          <button onClick={() => onDelete(e)} title="Delete" aria-label={`Delete ${e.name}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {revising && (
        <RevisionModal employee={revising} toast={toast}
          onClose={() => setRevising(null)}
          onSave={(rev) => { onRevise(revising, rev); setRevising(null); }} />
      )}
    </div>
  );
};

export default EmployeesPage;
export { RevisionModal, FIELD_LABELS };
