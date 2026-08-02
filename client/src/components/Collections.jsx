// src/components/Collections.jsx
// The daily chase list: who owes money, how late, and one tap to remind them.

import React, { useMemo, useState } from 'react';
import {
  Share2, Clock, AlertTriangle, CheckCircle, Phone, Loader2, FileText, Search,
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { buildCollections, reminderMessage } from '../utils/cashflow';

const SEVERITY = {
  critical: { label: '60+ days', pill: 'bg-rose-100 text-rose-700 border-rose-300', bar: 'bg-rose-500' },
  high:     { label: '30+ days', pill: 'bg-orange-100 text-orange-700 border-orange-300', bar: 'bg-orange-500' },
  due:      { label: 'Overdue',  pill: 'bg-amber-100 text-amber-800 border-amber-300', bar: 'bg-amber-500' },
  soon:     { label: 'Due soon', pill: 'bg-sky-100 text-sky-700 border-sky-300', bar: 'bg-sky-400' },
};

const Collections = ({
  invoices = [], clients = [], companyProfile = {},
  onRecordReminder, onOpenInvoice, canWrite, toast = () => {},
}) => {
  const [search, setSearch] = useState('');
  const [band, setBand] = useState('All');
  const [sending, setSending] = useState(null);

  const { rows, totals } = useMemo(
    () => buildCollections({ invoices, clients }),
    [invoices, clients]
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (band === 'Overdue') r = r.filter((x) => x.isOverdue);
    if (band === 'Due soon') r = r.filter((x) => !x.isOverdue);
    if (band === 'Never chased') r = r.filter((x) => !x.everReminded);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((x) => `${x.client} ${x.invoiceNumber}`.toLowerCase().includes(q));
    }
    return r;
  }, [rows, band, search]);

  const chase = async (row) => {
    const phone = String(row.phone || '').replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      reminderMessage(row, companyProfile, formatCurrency)
    );
    window.open(
      phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`,
      '_blank'
    );
    if (!phone) {
      toast(`No phone number on file for ${row.client} — opened WhatsApp without a recipient.`, 'warning');
    }
    // Record that a reminder went out, so the queue reorders next time.
    if (onRecordReminder && canWrite) {
      setSending(row.id);
      try { await onRecordReminder(row); } finally { setSending(null); }
    }
  };

  const kpis = [
    { l: 'To chase', v: totals.count, sub: 'invoices', icon: FileText,
      bg: 'bg-white border-slate-200', c: 'text-slate-800' },
    { l: 'Total owed', v: formatCurrency(totals.balance), sub: 'incl. due soon', icon: Clock,
      bg: 'bg-white border-slate-200', c: 'text-slate-800' },
    { l: 'Overdue', v: formatCurrency(totals.overdueBalance), sub: `${totals.overdueCount} invoice${totals.overdueCount !== 1 ? 's' : ''}`,
      icon: AlertTriangle, bg: totals.overdueBalance > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200',
      c: totals.overdueBalance > 0 ? 'text-rose-700' : 'text-emerald-700' },
    { l: 'Never chased', v: totals.neverChased, sub: 'no reminder sent', icon: Share2,
      bg: totals.neverChased > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200',
      c: totals.neverChased > 0 ? 'text-amber-700' : 'text-slate-800' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
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

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
            placeholder="Search client or invoice..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden w-max">
          {['All', 'Overdue', 'Due soon', 'Never chased'].map((b) => (
            <button key={b} onClick={() => setBand(b)}
              className={`px-3 py-2 text-xs font-bold transition-all whitespace-nowrap ${band === b ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-indigo-600'}`}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-emerald-400" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            {rows.length === 0 ? 'Nothing to chase' : 'Nothing matches that filter'}
          </h3>
          <p className="text-sm text-slate-400">
            {rows.length === 0
              ? 'No invoice is overdue or falling due in the next week. '
              : 'Try a different filter or search term.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const sev = SEVERITY[row.severity] || SEVERITY.due;
            return (
              <div key={row.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex">
                <div className={`w-1.5 flex-shrink-0 ${sev.bar}`} />
                <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-slate-800">{row.client}</p>
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border ${sev.pill}`}>
                        {row.isOverdue ? `${row.daysOverdue} day${row.daysOverdue !== 1 ? 's' : ''} overdue` : sev.label}
                      </span>
                      {!row.everReminded && (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          Never chased
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {[row.invoiceNumber, row.dueDate && `due ${row.dueDate}`]
                        .filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {row.everReminded
                        ? `Last reminded ${row.lastRemindedAt}${row.remindersSent > 1 ? ` · ${row.remindersSent} reminders sent` : ''}`
                        : 'No reminder sent yet'}
                      {!row.phone && ' · no phone on file'}
                    </p>
                  </div>

                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-lg font-extrabold text-slate-900 tabular-nums">
                      {formatCurrency(row.balance)}
                    </p>
                    {row.settled > 0 && (
                      <p className="text-xs text-slate-400">
                        of {formatCurrency(row.total)} · {formatCurrency(row.settled)} received
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {onOpenInvoice && (
                      <button onClick={() => onOpenInvoice(row.invoice)}
                        className="bg-white border border-slate-300 text-slate-600 px-3 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50"
                        title="Open invoice" aria-label={`Open invoice ${row.invoiceNumber}`}>
                        <FileText size={15} />
                      </button>
                    )}
                    <button onClick={() => chase(row)} disabled={sending === row.id}
                      className="bg-[#25D366] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#20bd5a] transition-all shadow-sm flex items-center gap-2 disabled:opacity-60">
                      {sending === row.id ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
                      Remind
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 flex items-start gap-2">
        <Phone size={13} className="mt-0.5 flex-shrink-0" />
        The list is ordered by how much attention each invoice needs — oldest and largest
        first, with anything never chased pushed up. Sending a reminder records the date, so
        an invoice you chased today drops down the list until it goes quiet again.
      </p>
    </div>
  );
};

export default Collections;
