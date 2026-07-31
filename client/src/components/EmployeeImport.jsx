// src/components/EmployeeImport.jsx
//
// Creates employee master records from payslips that already exist.
//
// Everything an employee profile needs has already been typed onto payslips over
// the months. This reviews what can be reconstructed, shows exactly what will be
// created and what is still missing, then writes the records.

import React, { useState, useMemo } from 'react';
import { X, Users, Loader2, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import {
  deriveEmployeesFromSalaries, stripDraftMeta, structureGross, periodLabelOf,
} from '../utils/employees';

const initials = (n) =>
  String(n || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const EmployeeImport = ({
  salaries = [], employees = [], onClose, onImport, toast = () => {},
}) => {
  const drafts = useMemo(
    () => deriveEmployeesFromSalaries(salaries, employees),
    [salaries, employees]
  );
  const [excluded, setExcluded] = useState({});
  const [busy, setBusy] = useState(false);

  const selected = drafts.filter((d) => !excluded[d.employeeId]);
  const monthly = selected.reduce((a, d) => a + structureGross(d), 0);
  const withGaps = selected.filter((d) => d._missing.length > 0).length;

  const toggle = (id) => setExcluded((x) => ({ ...x, [id]: !x[id] }));

  const run = async () => {
    if (!selected.length) return toast('Select at least one employee.', 'warning');
    setBusy(true);
    try {
      await onImport(selected.map(stripDraftMeta));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-start justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-none sm:rounded-3xl w-full max-w-3xl shadow-2xl my-0 sm:my-4 flex flex-col overflow-hidden min-h-screen sm:min-h-0 sm:max-h-[94vh]">
        <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Import</p>
            <p className="text-sm font-extrabold text-slate-800">Build employees from payslips</p>
          </div>
          <button onClick={onClose} aria-label="Close import"
            className="p-2 bg-white rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 shadow-sm">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {drafts.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
              <Users className="text-slate-300 mx-auto mb-3" size={32} />
              <p className="text-sm font-bold text-slate-600">Nothing to import</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {salaries.length === 0
                  ? 'There are no payslips to build profiles from yet. Create a payslip first, or add employees manually.'
                  : 'Everyone who appears on a payslip already has an employee record.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Found <strong className="text-slate-900">{drafts.length}</strong>{' '}
                {drafts.length === 1 ? 'person' : 'people'} on your payslips without an employee
                record. Their details and salary history can be rebuilt from those payslips.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { l: 'To create', v: selected.length, sub: `of ${drafts.length} found` },
                  { l: 'Monthly gross', v: formatCurrency(monthly), sub: 'combined' },
                  { l: 'Needs your input', v: withGaps, sub: 'missing some details' },
                ].map((k, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{k.l}</p>
                    <p className="text-lg font-extrabold text-slate-800 tabular-nums">{k.v}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>

              {withGaps > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex gap-2 items-start">
                  <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-medium text-amber-900">
                    Some details were never entered on a payslip, so they can't be recovered —
                    they're listed per person below. Import anyway and fill them in on each
                    profile afterwards; nothing here blocks payroll from running.
                  </p>
                </div>
              )}

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                  <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                    Review before creating
                  </p>
                  <button
                    onClick={() => setExcluded(
                      selected.length === drafts.length
                        ? Object.fromEntries(drafts.map((d) => [d.employeeId, true]))
                        : {}
                    )}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                    {selected.length === drafts.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {drafts.map((d) => {
                    const on = !excluded[d.employeeId];
                    return (
                      <label key={d.employeeId}
                        className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${on ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/70 opacity-60'}`}>
                        <input type="checkbox" checked={on} onChange={() => toggle(d.employeeId)}
                          className="w-4 h-4 rounded accent-indigo-600 flex-shrink-0 mt-1" />
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0">
                          {initials(d.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-3 items-baseline flex-wrap">
                            <p className="text-sm font-bold text-slate-800">{d.name}</p>
                            <p className="text-sm font-extrabold text-slate-900 tabular-nums">
                              {formatCurrency(structureGross(d))}
                              <span className="text-xs font-medium text-slate-400"> /mo</span>
                            </p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {[d.employeeId, d.designation, d.department].filter(Boolean).join(' · ')}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {d._payslipCount} payslip{d._payslipCount !== 1 ? 's' : ''}
                            {d._firstPeriod && ` · ${periodLabelOf(d._firstPeriod)} – ${periodLabelOf(d._lastPeriod)}`}
                          </p>
                          {d.salaryHistory.length > 0 && (
                            <p className="text-xs font-bold text-indigo-600 mt-1 flex items-center gap-1">
                              <TrendingUp size={11} />
                              {d.salaryHistory.length} salary revision{d.salaryHistory.length !== 1 ? 's' : ''} reconstructed
                            </p>
                          )}
                          {d._missing.length > 0 && (
                            <p className="text-xs font-medium text-amber-700 mt-1">
                              You'll need to add: {d._missing.join(', ')}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Existing payslips are not modified. Employee records are created fresh, and you
                can edit or delete any of them afterwards.
              </p>
            </>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-100">
            {drafts.length === 0 ? 'Close' : 'Cancel'}
          </button>
          {drafts.length > 0 && (
            <button onClick={run} disabled={busy || selected.length === 0}
              className="flex-[2] bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {busy ? `Creating ${selected.length}…` : `Create ${selected.length} Employee${selected.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeImport;
