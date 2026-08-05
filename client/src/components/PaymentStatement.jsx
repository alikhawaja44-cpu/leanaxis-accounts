// src/components/PaymentStatement.jsx
// Salary Payment Statement — a printable, landscape A4 register of every salary
// payment, designed to be reconciled line-by-line against a bank statement.
//
// Each row carries the payment mode, the bank the payment was drawn on, the
// beneficiary account and the cheque number, so a cheque payment can be traced
// from the payslip to the bank statement and back.

import React, { useMemo } from 'react';
import { Printer, CreditCard } from 'lucide-react';
import { formatCurrency, parseLocalDate } from '../utils/helpers';
import { computePayroll, payPeriodLabel, payPeriodKey } from '../utils/payroll';
import FitToWidth from './FitToWidth';

const A4_LANDSCAPE_PX = 1123; // 297mm @ 96dpi

export const STATEMENT_CSS = `
.st-doc{width:${A4_LANDSCAPE_PX}px;box-sizing:border-box;background:#fff;color:#111827;
  font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;
  font-size:10.5px;line-height:1.4;padding:30px 34px;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
.st-doc *{box-sizing:border-box;}
.st-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;}
.st-co{font-size:16px;font-weight:800;color:#0f172a;margin:0;}
.st-co-line{font-size:9.5px;color:#475569;margin:1px 0;}
.st-title{font-size:17px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;
  color:#0f172a;margin:0;text-align:right;}
.st-title-sub{font-size:9.5px;font-weight:700;color:#475569;margin:3px 0 0;text-align:right;}
.st-rule{height:3px;background:#0f172a;margin:12px 0 14px;}
.st-cards{display:flex;gap:10px;margin-bottom:14px;}
.st-card{flex:1;border:1px solid #cbd5e1;padding:8px 11px;background:#f8fafc;}
.st-card b{display:block;font-size:8px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;
  color:#64748b;margin-bottom:3px;}
.st-card span{font-size:13px;font-weight:800;color:#0f172a;font-variant-numeric:tabular-nums;}
.st-card small{display:block;font-size:8.5px;color:#94a3b8;margin-top:1px;font-weight:600;}
.st-tbl{width:100%;border-collapse:collapse;}
.st-tbl th{background:#0f172a;color:#fff;font-size:8px;font-weight:800;letter-spacing:1px;
  text-transform:uppercase;padding:7px 7px;text-align:left;border:1px solid #0f172a;}
.st-tbl th.amt,.st-tbl td.amt{text-align:right;}
.st-tbl th.ctr,.st-tbl td.ctr{text-align:center;}
.st-tbl td{border:1px solid #e2e8f0;padding:5px 7px;font-size:9.5px;color:#334155;
  vertical-align:top;}
.st-tbl tr.zebra td{background:#fafafa;}
.st-tbl td.amt{font-variant-numeric:tabular-nums;font-weight:700;color:#0f172a;white-space:nowrap;}
.st-tbl td.mono{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;
  font-weight:700;color:#0f172a;}
.st-tbl td .sub{display:block;color:#94a3b8;font-size:8.5px;font-weight:600;}
.st-tbl tfoot td{background:#e2e8f0;border:1px solid #cbd5e1;font-weight:800;color:#0f172a;
  font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding:8px 7px;}
.st-tbl tfoot td.amt{font-size:12px;letter-spacing:0;}
.st-pill{display:inline-block;font-size:8px;font-weight:800;letter-spacing:.6px;
  text-transform:uppercase;padding:2px 6px;border:1px solid;border-radius:2px;white-space:nowrap;}
.st-pill.paid{color:#166534;border-color:#86efac;background:#f0fdf4;}
.st-pill.pending{color:#92400e;border-color:#fcd34d;background:#fffbeb;}
.st-pill.unpaid{color:#9f1239;border-color:#fda4af;background:#fff1f2;}
.st-pill.dup{color:#92400e;border-color:#92400e;background:#fef3c7;margin-top:2px;}
.st-flag{margin-top:12px;border:1.5px solid #b45309;background:#fffbeb;padding:8px 12px;
  font-size:9.5px;color:#78350f;}
.st-flag b{font-size:8.5px;letter-spacing:1.1px;text-transform:uppercase;display:block;margin-bottom:2px;}
.st-signs{display:flex;justify-content:center;margin-top:44px;}
.st-sign{width:260px;text-align:center;}
.st-sign-line{border-top:1px solid #0f172a;margin-bottom:5px;}
.st-sign-l{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#0f172a;}
.st-sign-s{font-size:8.5px;font-weight:600;color:#64748b;margin-top:2px;}
.st-sign-co{font-size:8px;color:#94a3b8;margin-top:1px;}
.st-foot{margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;
  justify-content:space-between;font-size:8.5px;color:#94a3b8;}
@media print{
  html,body{margin:0;padding:0;background:#fff;}
  .st-doc{width:100%;padding:0;}
  .st-tbl{page-break-inside:auto;}
  .st-tbl tr{page-break-inside:avoid;}
  .st-tbl thead{display:table-header-group;}
  @page{size:A4 landscape;margin:10mm;}
}
`;

const fmtDate = (d) => {
  if (!d) return '—';
  const x = parseLocalDate(d);
  return x
    ? x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : String(d);
};

/** Adds payment metadata and duplicate-cheque flags to a list of salary records. */
export function buildStatementRows(salariesInput) {
  const salaries = (Array.isArray(salariesInput) ? salariesInput : []).filter(Boolean);
  const counts = salaries.reduce((acc, s) => {
    const c = String(s.chequeNumber || '').trim().toLowerCase();
    if (c) acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});

  return salaries
    .map((s) => {
      const p = computePayroll(s);
      const key = String(s.chequeNumber || '').trim().toLowerCase();
      const mode = s.paymentMode || (s.chequeNumber ? 'Cheque' : s.bankName ? 'Bank Transfer' : 'Cash');
      return {
        ...s,
        mode,
        isCheque: mode === 'Cheque',
        // Resolved identically to the payslip: an explicit cheque date if one was
        // recorded, otherwise the payment date.
        effectiveChequeDate: mode === 'Cheque' ? (s.chequeDate || s.date || '') : '',
        net: p.net,
        period: payPeriodLabel(s),
        periodKey: payPeriodKey(s),
        duplicateCheque: !!key && counts[key] > 1,
        missingCheque: mode === 'Cheque' && !String(s.chequeNumber || '').trim(),
      };
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

/** The printable statement document. */
export const PaymentStatementDocument = ({
  rows = [],
  companyProfile = {},
  periodLabel = 'All periods',
}) => {
  const totals = useMemo(() => {
    const by = (m) => rows.filter((r) => r.mode === m).reduce((a, r) => a + r.net, 0);
    return {
      total: rows.reduce((a, r) => a + r.net, 0),
      cheque: by('Cheque'),
      chequeCount: rows.filter((r) => r.isCheque).length,
      transfer: by('Bank Transfer'),
      cash: by('Cash'),
      paid: rows.filter((r) => r.status === 'Paid').reduce((a, r) => a + r.net, 0),
      outstanding: rows.filter((r) => r.status !== 'Paid').reduce((a, r) => a + r.net, 0),
    };
  }, [rows]);

  const issues = rows.filter((r) => r.duplicateCheque || r.missingCheque);

  return (
    <div className="st-doc" id="salary-statement-printable">
      <div className="st-head">
        <div>
          <p className="st-co">{companyProfile.name || 'Company Name'}</p>
          {companyProfile.address && <p className="st-co-line">{companyProfile.address}</p>}
          <p className="st-co-line">
            {[companyProfile.phone, companyProfile.email, companyProfile.website]
              .filter(Boolean).join('  ·  ')}
          </p>
          {companyProfile.ntn && <p className="st-co-line">NTN: {companyProfile.ntn}</p>}
        </div>
        <div>
          <p className="st-title">Salary Payment Statement</p>
          <p className="st-title-sub">{periodLabel} · {rows.length} payment{rows.length === 1 ? '' : 's'}</p>
          <p className="st-title-sub">
            Generated {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="st-rule" />

      <div className="st-cards">
        <div className="st-card"><b>Total Disbursed</b><span>{formatCurrency(totals.total)}</span><small>{rows.length} payments</small></div>
        <div className="st-card"><b>By Cheque</b><span>{formatCurrency(totals.cheque)}</span><small>{totals.chequeCount} cheques</small></div>
        <div className="st-card"><b>By Bank Transfer</b><span>{formatCurrency(totals.transfer)}</span><small>online / IBFT</small></div>
        <div className="st-card"><b>By Cash</b><span>{formatCurrency(totals.cash)}</span><small>counter payments</small></div>
        <div className="st-card"><b>Cleared</b><span>{formatCurrency(totals.paid)}</span><small>marked paid</small></div>
        <div className="st-card"><b>Outstanding</b><span>{formatCurrency(totals.outstanding)}</span><small>pending / unpaid</small></div>
      </div>

      <table className="st-tbl">
        <thead>
          <tr>
            <th style={{ width: '3%' }} className="ctr">#</th>
            <th style={{ width: '9%' }}>Payment Date</th>
            <th style={{ width: '9%' }}>Pay Period</th>
            <th style={{ width: '16%' }}>Employee</th>
            <th style={{ width: '10%' }}>Mode</th>
            <th style={{ width: '13%' }}>Bank / Drawn On</th>
            <th style={{ width: '11%' }}>Cheque No.</th>
            <th style={{ width: '15%' }}>Credited to A/C</th>
            <th style={{ width: '8%' }} className="amt">Net Amount</th>
            <th style={{ width: '6%' }} className="ctr">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={10} style={{ textAlign: 'center', padding: '22px', color: '#94a3b8' }}>
              No salary payments recorded for this period.
            </td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={r.id || i} className={i % 2 === 1 ? 'zebra' : undefined}>
              <td className="ctr">{i + 1}</td>
              <td>{fmtDate(r.date)}</td>
              <td>{r.period}</td>
              <td>
                {r.employeeName || '—'}
                <span className="sub">
                  {[r.employeeId, r.role].filter(Boolean).join(' · ') || ' '}
                </span>
              </td>
              <td>{r.mode}</td>
              <td>{r.bankName || '—'}</td>
              <td className={r.chequeNumber ? 'mono' : undefined}>
                {r.chequeNumber || (r.isCheque ? '— missing —' : '—')}
                {r.effectiveChequeDate && <span className="sub">{fmtDate(r.effectiveChequeDate)}</span>}
                {r.duplicateCheque && <span className="st-pill dup">Duplicate</span>}
              </td>
              <td className={r.accountNumber ? 'mono' : undefined} style={{ fontSize: '8.5px' }}>
                {r.accountNumber || '—'}
              </td>
              <td className="amt">{formatCurrency(r.net)}</td>
              <td className="ctr">
                <span className={`st-pill ${String(r.status || 'unpaid').toLowerCase()}`}>
                  {r.status || 'Unpaid'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={8}>Total — {rows.length} payment{rows.length === 1 ? '' : 's'}</td>
            <td className="amt">{formatCurrency(totals.total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>

      {issues.length > 0 && (
        <div className="st-flag">
          <b>Requires attention — {issues.length} record{issues.length === 1 ? '' : 's'}</b>
          {issues.map((r, i) => (
            <div key={i}>
              {r.employeeName} ({fmtDate(r.date)}):{' '}
              {r.missingCheque
                ? 'marked as a cheque payment but no cheque number was recorded.'
                : `cheque no. ${r.chequeNumber} appears on more than one salary record.`}
            </div>
          ))}
        </div>
      )}

      <div className="st-signs">
        <div className="st-sign">
          <div className="st-sign-line" />
          <p className="st-sign-l">Authorised Signatory</p>
          {companyProfile.signatoryName ? (
            <>
              <p className="st-sign-s">{companyProfile.signatoryName}</p>
              <p className="st-sign-co">
                {[companyProfile.signatoryTitle, companyProfile.name].filter(Boolean).join(' · ')}
              </p>
            </>
          ) : (
            <p className="st-sign-s">HR &amp; Accounts Department</p>
          )}
        </div>
      </div>

      <div className="st-foot">
        <span>Reconcile each cheque number above against the corresponding entry on the bank statement.</span>
        <span>{companyProfile.name || ''}</span>
      </div>
    </div>
  );
};

/** In-app wrapper: scrollable preview + print button. */
const PaymentStatement = ({ rows = [], companyProfile = {}, periodLabel, toast = () => {} }) => {
  const handlePrint = () => {
    const source = document.getElementById('salary-statement-printable');
    if (!source) return toast('Statement content not found.', 'error');
    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) return toast('Please allow pop-ups to print the statement.', 'warning');
    win.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/>` +
        `<title>Salary Payment Statement — ${periodLabel || ''}</title>` +
        `<style>${STATEMENT_CSS}</style><style>body{margin:0;display:flex;justify-content:center;}</style>` +
        `</head><body>${source.outerHTML}</body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => { try { win.print(); } catch (e) { /* cancelled */ } }, 250);
  };

  return (
    <div className="space-y-4">
      <style>{STATEMENT_CSS}</style>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 sm:px-5 py-4">
        <div className="flex items-center gap-2 text-slate-600">
          <CreditCard size={16} className="text-indigo-500" />
          <p className="text-sm font-bold">
            Reconcile cheque numbers against your bank statement
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Printer size={15} /> Print Statement
        </button>
      </div>
      <div className="bg-slate-100 rounded-2xl p-3 sm:p-5 overflow-hidden">
        <FitToWidth width={A4_LANDSCAPE_PX}>
          <div style={{ boxShadow: '0 4px 24px rgba(15,23,42,.14)' }}>
            <PaymentStatementDocument rows={rows} companyProfile={companyProfile} periodLabel={periodLabel} />
          </div>
        </FitToWidth>
      </div>
    </div>
  );
};

export default PaymentStatement;
