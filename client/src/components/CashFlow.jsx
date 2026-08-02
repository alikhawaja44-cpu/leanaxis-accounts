// src/components/CashFlow.jsx
// Forward cash position: what is due in, what is due out, and whether the
// balance survives it.

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, Wallet, Printer, ArrowDownLeft,
  ArrowUpRight, Landmark, Info,
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { buildForecast } from '../utils/cashflow';

const TYPE_STYLE = {
  Invoice: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Vendor Bill': 'bg-rose-50 text-rose-700 border-rose-200',
  Salary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Recurring: 'bg-amber-50 text-amber-700 border-amber-200',
};

const fmtDate = (d) =>
  d instanceof Date && !isNaN(d.getTime())
    ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const CashFlow = ({
  invoices = [], vendorBills = [], salaries = [], expenses = [],
  bankRecords = [], pettyCash = [], appSettings = {}, companyProfile = {},
  toast = () => {},
}) => {
  const [horizon, setHorizon] = useState(90);
  const [filter, setFilter] = useState('All');

  const f = useMemo(() => buildForecast({
    invoices, vendorBills, salaries, expenses,
    bankRecords, pettyCash, appSettings, horizonDays: horizon,
  }), [invoices, vendorBills, salaries, expenses, bankRecords, pettyCash, appSettings, horizon]);

  const chart = f.periods.map((p) => ({
    name: p.label, In: p.in, Out: -p.out, Balance: p.closing,
  }));

  const rows = useMemo(() => {
    if (filter === 'All') return f.movements;
    if (filter === 'In') return f.movements.filter((m) => m.kind === 'in');
    if (filter === 'Out') return f.movements.filter((m) => m.kind === 'out');
    return f.movements.filter((m) => m.type === filter);
  }, [f.movements, filter]);

  const printForecast = () => {
    const el = document.getElementById('cashflow-printable');
    if (!el) return toast('Nothing to print.', 'error');
    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) return toast('Please allow pop-ups to print.', 'warning');
    win.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Cash Flow Forecast</title>` +
      `<style>body{font-family:"Segoe UI",system-ui,sans-serif;padding:24px;color:#0f172a}` +
      `h1{font-size:20px;margin:0 0 4px}h2{font-size:12px;color:#64748b;margin:0 0 18px;font-weight:600}` +
      `table{width:100%;border-collapse:collapse;font-size:11px}` +
      `th{background:#0f172a;color:#fff;text-align:left;padding:7px;font-size:9px;text-transform:uppercase;letter-spacing:1px}` +
      `td{border:1px solid #e2e8f0;padding:5px 7px}.r{text-align:right;font-variant-numeric:tabular-nums}` +
      `@page{size:A4 portrait;margin:12mm}</style></head><body>` +
      `<h1>Cash Flow Forecast — ${companyProfile.name || ''}</h1>` +
      `<h2>Next ${horizon} days · prepared ${new Date().toLocaleDateString('en-GB')}</h2>` +
      el.innerHTML + `</body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => { try { win.print(); } catch (e) { /* cancelled */ } }, 250);
  };

  const kpis = [
    { l: 'Cash on hand', v: formatCurrency(f.opening.total),
      sub: `bank ${formatCurrency(f.opening.bank)} · float ${formatCurrency(f.opening.float)}`,
      icon: Wallet, bg: 'bg-white border-slate-200', c: 'text-slate-800' },
    { l: 'Expected in', v: formatCurrency(f.totalIn), sub: `over ${horizon} days`,
      icon: ArrowDownLeft, bg: 'bg-emerald-50 border-emerald-200', c: 'text-emerald-700' },
    { l: 'Expected out', v: formatCurrency(f.totalOut), sub: 'bills, payroll, recurring',
      icon: ArrowUpRight, bg: 'bg-rose-50 border-rose-200', c: 'text-rose-700' },
    { l: 'Projected balance', v: formatCurrency(f.closing),
      sub: f.closing >= 0 ? 'after all movements' : 'shortfall',
      icon: f.closing >= 0 ? TrendingUp : TrendingDown,
      bg: f.closing >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-rose-50 border-rose-300',
      c: f.closing >= 0 ? 'text-indigo-700' : 'text-rose-700' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Shortfall warning — the reason this page exists */}
      {f.shortfall && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 flex gap-3 items-start">
          <div className="p-2 bg-rose-100 rounded-xl flex-shrink-0">
            <AlertTriangle className="text-rose-600" size={20} />
          </div>
          <div>
            <p className="font-extrabold text-rose-800 text-sm">
              Projected shortfall in “{f.shortfall.label}”
            </p>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              On current commitments the balance falls to{' '}
              <strong className="tabular-nums">{formatCurrency(f.shortfall.closing)}</strong> by the end
              of that period. Either bring receipts forward, or delay something on the outgoing side.
            </p>
          </div>
        </div>
      )}

      {f.opening.bank === 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex gap-2 items-start">
          <Info size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs font-medium text-amber-900">
            Your bank ledger shows a zero balance, so this forecast is starting from petty cash
            alone. If bank transactions aren't being recorded in <strong>Bank Accounts</strong>,
            the opening position — and the projected balance — will read lower than reality.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className={`${k.bg} border p-4 rounded-2xl shadow-sm`}>
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{k.l}</p>
              <k.icon size={14} className="text-slate-300 flex-shrink-0" />
            </div>
            <p className={`text-lg font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden w-max">
          {[30, 60, 90].map((h) => (
            <button key={h} onClick={() => setHorizon(h)}
              className={`px-4 py-2 text-xs font-bold transition-all ${horizon === h ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-indigo-600'}`}>
              {h} days
            </button>
          ))}
        </div>
        <button onClick={printForecast}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 shadow-sm w-max">
          <Printer size={15} /> Print Forecast
        </button>
      </div>

      <div id="cashflow-printable" className="space-y-5">
        {/* Period summary */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-800">Projected position</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Opening {formatCurrency(f.opening.total)} · carried forward period to period
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[560px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['Period', 'Money in', 'Money out', 'Net', 'Projected balance'].map((h) => (
                  <th key={h} className={`px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider ${h !== 'Period' ? 'text-right r' : ''}`}>{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {f.periods.map((p) => (
                  <tr key={p.key} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-bold text-slate-700 text-sm">
                      {p.label}
                      <span className="block text-xs font-medium text-slate-400">
                        {p.items.length} item{p.items.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-bold text-emerald-600 tabular-nums r">
                      {p.in > 0 ? formatCurrency(p.in) : <span className="text-slate-200">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-bold text-rose-600 tabular-nums r">
                      {p.out > 0 ? `-${formatCurrency(p.out)}` : <span className="text-slate-200">—</span>}
                    </td>
                    <td className={`px-5 py-3.5 text-right text-sm font-bold tabular-nums r ${p.net >= 0 ? 'text-slate-600' : 'text-rose-600'}`}>
                      {formatCurrency(p.net)}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-extrabold tabular-nums r ${p.closing < 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-900'}`}>
                      {formatCurrency(p.closing)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart */}
        {chart.some((c) => c.In || c.Out) && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6">
            <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-5 bg-indigo-500 rounded-full" /> In and out by period
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <ChartTooltip formatter={(v) => formatCurrency(Math.abs(v))}
                  contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.1)' }} />
                <Bar dataKey="In" fill="#10b981" radius={[5, 5, 0, 0]} />
                <Bar dataKey="Out" fill="#f43f5e" radius={[0, 0, 5, 5]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Movement detail */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="font-extrabold text-slate-800">
              Everything due ({rows.length})
            </h3>
            <div className="flex gap-1.5 flex-wrap">
              {['All', 'In', 'Out', 'Invoice', 'Vendor Bill', 'Salary', 'Recurring'].map((t) => (
                <button key={t} onClick={() => setFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filter === t ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-800'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-400">
              Nothing outstanding in this window.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[620px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Date', 'Type', 'Detail', 'Amount'].map((h) => (
                    <th key={h} className={`px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider ${h === 'Amount' ? 'text-right r' : ''}`}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((m, i) => (
                    <tr key={`${m.id}-${i}`} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {fmtDate(m.date)}
                        {m.overdue && (
                          <span className="block text-xs font-bold text-rose-600">
                            {m.daysOverdue}d overdue
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border whitespace-nowrap ${TYPE_STYLE[m.type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {m.type}
                        </span>
                        {m.projected && (
                          <span className="block text-xs text-slate-400 mt-0.5">projected</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-700">{m.label}</td>
                      <td className={`px-5 py-3 text-right font-extrabold tabular-nums r ${m.kind === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.kind === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 flex items-start gap-2">
        <Landmark size={13} className="mt-0.5 flex-shrink-0" />
        Receipts are assumed on the invoice due date and payments on the bill due date.
        Recurring expenses are projected forward monthly from their last entry. This is a
        projection, not a guarantee — a client paying late moves the whole line.
      </p>
    </div>
  );
};

export default CashFlow;
