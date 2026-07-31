// src/components/PayrollRun.jsx
// Bulk monthly payroll — generates draft payslips for every active employee
// using the salary structure that was in force for the selected month.

import React, { useState, useMemo } from 'react';
import { X, Users, Loader2, CheckCircle, AlertTriangle, Wallet, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { computePayroll, withTotals } from '../utils/payroll';
import {
  activeForPeriod, draftSalaryFor, lastDayOf, periodLabelOf, structureFor,
} from '../utils/employees';

const PayrollRun = ({
  employees = [], salaries = [], companyProfile = {},
  onClose, onGenerate, toast = () => {},
}) => {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(thisMonth);
  const [paymentDate, setPaymentDate] = useState(lastDayOf(thisMonth));
  const [excluded, setExcluded] = useState({});
  const [busy, setBusy] = useState(false);

  // Everyone eligible for this month, split into those already paid and those not.
  const { pending, alreadyPaid, noStructure } = useMemo(() => {
    const eligible = activeForPeriod(employees, period);
    const paidKeys = new Set(
      salaries
        .filter((s) => (s.payPeriod || String(s.date || '').slice(0, 7)) === period)
        .flatMap((s) => [
          s.employeeRef && `ref:${s.employeeRef}`,
          `name:${String(s.employeeName || '').trim().toLowerCase()}`,
        ].filter(Boolean))
    );

    const isPaid = (e) =>
      paidKeys.has(`ref:${e.id}`) ||
      paidKeys.has(`name:${String(e.name || '').trim().toLowerCase()}`);

    return {
      pending: eligible.filter((e) => !isPaid(e)),
      alreadyPaid: eligible.filter(isPaid),
      noStructure: employees.filter(
        (e) => (e.status || 'Active') === 'Active' && !structureFor(e, period)
      ),
    };
  }, [employees, salaries, period]);

  const selected = pending.filter((e) => !excluded[e.id]);

  const drafts = useMemo(
    () => selected.map((e) => withTotals(draftSalaryFor(e, period, paymentDate))),
    [selected, period, paymentDate]
  );

  const totals = useMemo(() => {
    return drafts.reduce((acc, d) => {
      const p = computePayroll(d);
      acc.gross += p.gross; acc.deductions += p.totalDeductions; acc.net += p.net;
      return acc;
    }, { gross: 0, deductions: 0, net: 0 });
  }, [drafts]);

  const toggle = (id) => setExcluded((x) => ({ ...x, [id]: !x[id] }));

  const run = async () => {
    if (drafts.length === 0) return toast('Select at least one employee.', 'warning');
    setBusy(true);
    try {
      await onGenerate(drafts, period);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl my-4 flex flex-col overflow-hidden max-h-[94vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bulk Payroll</p>
            <p className="text-sm font-extrabold text-slate-800">
              Run payroll for {periodLabelOf(period)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close payroll run"
            className="p-2 bg-white rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 shadow-sm">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Period controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Salary Month</label>
              <input type="month" className="form-input" value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setPaymentDate(lastDayOf(e.target.value));
                  setExcluded({});
                }} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Payment Date</label>
              <input type="date" className="form-input" value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { l: 'Employees', v: drafts.length, sub: `${pending.length} eligible`, icon: Users, c: 'text-slate-800', bg: 'bg-white border-slate-200' },
              { l: 'Gross Payroll', v: formatCurrency(totals.gross), sub: `less ${formatCurrency(totals.deductions)}`, icon: Wallet, c: 'text-slate-800', bg: 'bg-white border-slate-200' },
              { l: 'Net Payable', v: formatCurrency(totals.net), sub: 'total to disburse', icon: Calendar, c: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
            ].map((k, i) => (
              <div key={i} className={`${k.bg} border rounded-2xl p-4`}>
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{k.l}</p>
                  <k.icon size={13} className="text-slate-300" />
                </div>
                <p className={`text-lg font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {alreadyPaid.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex gap-2 items-start">
              <CheckCircle size={15} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium text-emerald-800">
                <strong>{alreadyPaid.length}</strong> employee{alreadyPaid.length !== 1 ? 's' : ''} already
                {' '}{alreadyPaid.length !== 1 ? 'have' : 'has'} a payslip for {periodLabelOf(period)} and
                {' '}{alreadyPaid.length !== 1 ? 'were' : 'was'} skipped:{' '}
                {alreadyPaid.map((e) => e.name).join(', ')}.
              </p>
            </div>
          )}
          {noStructure.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex gap-2 items-start">
              <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium text-amber-900">
                <strong>{noStructure.length}</strong> active employee{noStructure.length !== 1 ? 's have' : ' has'} no
                salary structure for this month and cannot be included:{' '}
                {noStructure.map((e) => e.name).join(', ')}. Set a salary on their record first.
              </p>
            </div>
          )}

          {/* Employee list */}
          {pending.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
              <Users className="text-slate-300 mx-auto mb-3" size={32} />
              <p className="text-sm font-bold text-slate-600">Nothing to generate</p>
              <p className="text-xs text-slate-400 mt-1">
                {employees.length === 0
                  ? 'Add employees first — Team → Employees.'
                  : `Every eligible employee already has a payslip for ${periodLabelOf(period)}.`}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                  Include in this run
                </p>
                <button onClick={() => setExcluded(
                  selected.length === pending.length
                    ? Object.fromEntries(pending.map((e) => [e.id, true]))
                    : {}
                )} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                  {selected.length === pending.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {pending.map((e) => {
                  const draft = withTotals(draftSalaryFor(e, period, paymentDate));
                  const p = computePayroll(draft);
                  const on = !excluded[e.id];
                  return (
                    <label key={e.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${on ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/70 opacity-60'}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(e.id)}
                        className="w-4 h-4 rounded accent-indigo-600 flex-shrink-0" />
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0">
                        {String(e.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{e.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {[e.employeeId, e.designation].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-extrabold text-slate-900 tabular-nums">{formatCurrency(p.net)}</p>
                        <p className="text-xs text-slate-400 tabular-nums">
                          gross {formatCurrency(p.gross)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Payslips are created with status <strong>Unpaid</strong>. Review each one, add any
            bonus, overtime or loan deduction, then mark them paid.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-100">
            Cancel
          </button>
          <button onClick={run} disabled={busy || drafts.length === 0}
            className="flex-[2] bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
            {busy
              ? `Generating ${drafts.length}…`
              : `Generate ${drafts.length} Payslip${drafts.length !== 1 ? 's' : ''} · ${formatCurrency(totals.net)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollRun;
