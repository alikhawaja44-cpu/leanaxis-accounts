// src/components/Payslip.jsx
// Formal A4 salary slip document + viewer modal.
//
// The document is rendered with its own self-contained stylesheet
// (PAYSLIP_CSS) rather than utility classes, so that the on-screen view,
// the printed page and the exported PDF are pixel-identical and do not
// depend on any external CDN being reachable at print time.

import React, { useMemo, useState } from 'react';
import { X, Printer, Download, Share2, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import {
  computePayroll,
  payPeriodLabel,
  payslipNumber,
  amountInWords,
} from '../utils/payroll';

const A4_WIDTH_PX = 794; // 210mm @ 96dpi

export const PAYSLIP_CSS = `
.ps-doc{width:${A4_WIDTH_PX}px;min-height:1123px;box-sizing:border-box;background:#fff;color:#111827;
  font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;
  font-size:11px;line-height:1.4;padding:26px 34px 22px;display:flex;flex-direction:column;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
.ps-doc *{box-sizing:border-box;}
.ps-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;}
.ps-brand{display:flex;gap:12px;align-items:flex-start;max-width:58%;}
.ps-logo{height:46px;width:auto;max-width:150px;object-fit:contain;}
.ps-co-name{font-size:17px;font-weight:800;letter-spacing:-.2px;color:#0f172a;margin:0;}
.ps-co-tag{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;color:#64748b;margin:2px 0 6px;}
.ps-co-line{font-size:9.5px;color:#475569;margin:1px 0;}
.ps-title-box{text-align:right;flex-shrink:0;}
.ps-title{font-size:19px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#0f172a;margin:0;}
.ps-title-sub{font-size:10px;font-weight:700;color:#475569;letter-spacing:.6px;margin:3px 0 8px;}
.ps-ref{display:inline-block;font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;
  font-size:9.5px;font-weight:700;color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;
  padding:3px 8px;border-radius:3px;}
.ps-stamp{display:inline-block;margin-top:7px;font-size:9px;font-weight:800;letter-spacing:1.3px;
  text-transform:uppercase;padding:4px 10px;border-radius:3px;border:1.5px solid;}
.ps-stamp.paid{color:#166534;border-color:#166534;background:#f0fdf4;}
.ps-stamp.pending{color:#92400e;border-color:#92400e;background:#fffbeb;}
.ps-stamp.unpaid{color:#9f1239;border-color:#9f1239;background:#fff1f2;}
.ps-rule{height:3px;background:#0f172a;margin:11px 0 0;}
.ps-rule-thin{height:1px;background:#cbd5e1;margin:0 0 12px;}
.ps-sec{font-size:9.5px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#0f172a;
  background:#f1f5f9;border-left:3px solid #0f172a;padding:4px 9px;margin:0 0 7px;}
.ps-meta{width:100%;border-collapse:collapse;margin-bottom:12px;table-layout:fixed;}
.ps-meta td{border:1px solid #e2e8f0;padding:4px 9px;vertical-align:top;font-size:10px;}
.ps-meta td.k{width:17%;background:#f8fafc;color:#64748b;font-weight:700;text-transform:uppercase;
  letter-spacing:.5px;font-size:8.5px;}
.ps-meta td.v{width:33%;color:#0f172a;font-weight:600;word-break:break-word;}
.ps-split{display:flex;gap:14px;align-items:stretch;}
.ps-col{flex:1 1 0;display:flex;flex-direction:column;min-width:0;}
.ps-tbl{width:100%;border-collapse:collapse;flex:1;}
.ps-tbl th{background:#0f172a;color:#fff;font-size:8.5px;font-weight:800;letter-spacing:1.2px;
  text-transform:uppercase;padding:7px 9px;text-align:left;border:1px solid #0f172a;}
.ps-tbl th.amt{text-align:right;width:40%;}
.ps-tbl td{border:1px solid #e2e8f0;padding:4.5px 9px;font-size:10px;color:#334155;}
.ps-tbl td.amt{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#0f172a;white-space:nowrap;}
.ps-tbl tr.zebra td{background:#fafafa;}
.ps-tbl tr.empty td{height:19px;}
.ps-tbl tfoot td{background:#e2e8f0;border:1px solid #cbd5e1;font-weight:800;color:#0f172a;
  font-size:10px;text-transform:uppercase;letter-spacing:.6px;padding:7px 9px;}
.ps-tbl tfoot td.amt{text-align:right;font-size:11.5px;letter-spacing:0;}
.ps-net{margin-top:11px;border:2px solid #0f172a;display:flex;justify-content:space-between;
  align-items:center;background:#0f172a;color:#fff;padding:9px 16px;}
.ps-net-l{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;}
.ps-net-l small{display:block;font-size:8.5px;font-weight:600;letter-spacing:.5px;
  text-transform:none;color:#94a3b8;margin-top:2px;}
.ps-net-v{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.5px;}
.ps-words{border:1px solid #cbd5e1;border-top:none;background:#f8fafc;padding:6px 16px;
  font-size:10px;color:#334155;}
.ps-words b{text-transform:uppercase;font-size:8.5px;letter-spacing:1.2px;
  display:block;margin-bottom:2px;color:#64748b;}
.ps-verify{margin-top:9px;border:1.5px solid #0f172a;background:#f8fafc;padding:7px 12px;
  display:flex;align-items:baseline;gap:10px;}
.ps-verify b{font-size:8.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;
  color:#0f172a;white-space:nowrap;}
.ps-verify span{font-size:10px;color:#334155;}
.ps-verify .cno{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;
  font-weight:800;color:#0f172a;}
.ps-notes{margin-top:10px;border:1px solid #e2e8f0;border-left:3px solid #94a3b8;background:#f8fafc;
  padding:7px 11px;font-size:10px;color:#334155;}
.ps-notes b{display:block;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;
  color:#64748b;margin-bottom:2px;}
.ps-spacer{flex:1;min-height:14px;}
.ps-signs{display:flex;justify-content:center;margin-top:26px;}
.ps-sign{width:260px;text-align:center;}
.ps-sign-line{border-top:1px solid #0f172a;margin-bottom:5px;}
.ps-sign-l{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#0f172a;}
.ps-sign-s{font-size:8.5px;font-weight:600;color:#64748b;margin-top:2px;letter-spacing:.3px;}
.ps-sign-co{font-size:8.5px;color:#94a3b8;margin-top:1px;}
.ps-foot{margin-top:14px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;
  justify-content:space-between;font-size:8.5px;color:#94a3b8;}
@media print{
  html,body{margin:0;padding:0;background:#fff;}
  .ps-doc{width:100%;min-height:auto;border:none;padding:0;page-break-inside:avoid;}
  @page{size:A4 portrait;margin:12mm;}
}
`;

const Row = ({ label, value, zebra }) => (
  <tr className={zebra ? 'zebra' : undefined}>
    <td>{label}</td>
    <td className="amt">{formatCurrency(value)}</td>
  </tr>
);

/** The A4 document itself — used on screen, for print and for PDF export. */
export const PayslipDocument = ({ data = {}, companyProfile = {}, appSettings = {} }) => {
  const pay = useMemo(() => computePayroll(data), [data]);
  const period = payPeriodLabel(data);
  const ref = payslipNumber(data);

  const earnings = pay.earnings.filter((e) => e.amount !== 0);
  const deductions = pay.deductions.filter((d) => d.amount !== 0);
  if (earnings.length === 0) earnings.push({ key: 'basicSalary', label: 'Basic Salary', amount: 0 });

  // Pad the shorter column so both tables' footers line up.
  const rows = Math.max(earnings.length, deductions.length, 3);
  const padE = rows - earnings.length;
  const padD = rows - deductions.length;

  const status = String(data.status || 'Unpaid').toLowerCase();
  const currencyName = appSettings.currencyName || (appSettings.currency === 'PKR' ? 'Rupees' : appSettings.currency || 'Rupees');

  const logoSrc = useMemo(() => {
    try { return new URL('logo.png', document.baseURI).href; } catch { return './logo.png'; }
  }, []);

  const fmtDate = (d) => {
    if (!d) return '—';
    const x = new Date(d);
    return isNaN(x.getTime())
      ? String(d)
      : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const paymentMode =
    data.paymentMode || (data.chequeNumber ? 'Cheque' : data.bankName ? 'Bank Transfer' : 'Cash');
  const isCheque = paymentMode === 'Cheque';

  return (
    <div className="ps-doc" id="salary-slip-printable">
      {/* ── Letterhead ─────────────────────────────────────────────── */}
      <div className="ps-head">
        <div className="ps-brand">
          <img
            className="ps-logo"
            src={logoSrc}
            alt=""
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <p className="ps-co-name">{companyProfile.name || 'Company Name'}</p>
            {companyProfile.tagline && <p className="ps-co-tag">{companyProfile.tagline}</p>}
            {companyProfile.address && <p className="ps-co-line">{companyProfile.address}</p>}
            <p className="ps-co-line">
              {[companyProfile.phone, companyProfile.email].filter(Boolean).join('  ·  ')}
            </p>
            {(companyProfile.ntn || companyProfile.strn) && (
              <p className="ps-co-line">
                {[
                  companyProfile.ntn && `NTN: ${companyProfile.ntn}`,
                  companyProfile.strn && `STRN: ${companyProfile.strn}`,
                ].filter(Boolean).join('  ·  ')}
              </p>
            )}
          </div>
        </div>
        <div className="ps-title-box">
          <p className="ps-title">Salary Slip</p>
          <p className="ps-title-sub">Pay Period: {period}</p>
          <span className="ps-ref">{ref}</span>
          <br />
          <span className={`ps-stamp ${status === 'paid' ? 'paid' : status === 'pending' ? 'pending' : 'unpaid'}`}>
            {data.status || 'Unpaid'}
          </span>
        </div>
      </div>
      <div className="ps-rule" />
      <div className="ps-rule-thin" />

      {/* ── Employee details ───────────────────────────────────────── */}
      <p className="ps-sec">Employee Details</p>
      <table className="ps-meta">
        <tbody>
          <tr>
            <td className="k">Employee Name</td>
            <td className="v">{data.employeeName || '—'}</td>
            <td className="k">Employee ID</td>
            <td className="v">{data.employeeId || '—'}</td>
          </tr>
          <tr>
            <td className="k">Designation</td>
            <td className="v">{data.role || '—'}</td>
            <td className="k">Department</td>
            <td className="v">{data.department || '—'}</td>
          </tr>
          <tr>
            <td className="k">CNIC</td>
            <td className="v">{data.cnic || '—'}</td>
            <td className="k">Date of Joining</td>
            <td className="v">{data.joiningDate ? fmtDate(data.joiningDate) : '—'}</td>
          </tr>
          <tr>
            <td className="k">Pay Period</td>
            <td className="v">{period}</td>
            <td className="k">Payment Date</td>
            <td className="v">{fmtDate(data.date)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Earnings / Deductions ──────────────────────────────────── */}
      <p className="ps-sec">Salary Breakdown</p>
      <div className="ps-split">
        <div className="ps-col">
          <table className="ps-tbl">
            <thead>
              <tr>
                <th>Earnings</th>
                <th className="amt">Amount</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e, i) => (
                <Row key={e.key} label={e.label} value={e.amount} zebra={i % 2 === 1} />
              ))}
              {Array.from({ length: padE }).map((_, i) => (
                <tr className="empty" key={`pe${i}`}><td>&nbsp;</td><td className="amt" /></tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Gross Earnings</td>
                <td className="amt">{formatCurrency(pay.gross)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="ps-col">
          <table className="ps-tbl">
            <thead>
              <tr>
                <th>Deductions</th>
                <th className="amt">Amount</th>
              </tr>
            </thead>
            <tbody>
              {deductions.length === 0 && (
                <tr><td>No deductions applied</td><td className="amt">{formatCurrency(0)}</td></tr>
              )}
              {deductions.map((d, i) => (
                <Row key={d.key} label={d.label} value={d.amount} zebra={i % 2 === 1} />
              ))}
              {Array.from({ length: deductions.length === 0 ? rows - 1 : padD }).map((_, i) => (
                <tr className="empty" key={`pd${i}`}><td>&nbsp;</td><td className="amt" /></tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total Deductions</td>
                <td className="amt">{formatCurrency(pay.totalDeductions)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Net pay ────────────────────────────────────────────────── */}
      <div className="ps-net">
        <div className="ps-net-l">
          Net Pay
          <small>Gross {formatCurrency(pay.gross)} − Deductions {formatCurrency(pay.totalDeductions)}</small>
        </div>
        <div className="ps-net-v">{formatCurrency(pay.net)}</div>
      </div>
      <div className="ps-words">
        <b>Amount in words</b>
        {amountInWords(pay.net, currencyName)}
      </div>

      {/* ── Payment details ────────────────────────────────────────── */}
      <p className="ps-sec" style={{ marginTop: 12 }}>Payment Details</p>
      <table className="ps-meta">
        <tbody>
          <tr>
            <td className="k">Payment Mode</td>
            <td className="v">{paymentMode}</td>
            <td className="k">{isCheque ? 'Drawn On' : 'Bank'}</td>
            <td className="v">{data.bankName || '—'}</td>
          </tr>
          <tr>
            <td className="k">Credited to A/C</td>
            <td className="v">{data.accountNumber || '—'}</td>
            <td className="k">{isCheque ? 'Cheque No.' : 'Reference'}</td>
            <td className="v">{data.chequeNumber || data.transactionRef || '—'}</td>
          </tr>
          {isCheque && (
            <tr>
              <td className="k">Cheque Date</td>
              <td className="v">{data.chequeDate ? fmtDate(data.chequeDate) : fmtDate(data.date)}</td>
              <td className="k">Payment Status</td>
              <td className="v">{data.status || 'Unpaid'}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Cheque payments carry an explicit verification line so the slip can be
          reconciled against the bank statement. */}
      {isCheque && (
        <div className="ps-verify">
          <b>Payment Verification</b>
          <span>
            Paid by Cheque No. <span className="cno">{data.chequeNumber || '—'}</span>
            {data.chequeDate || data.date ? ` dated ${fmtDate(data.chequeDate || data.date)}` : ''}
            {data.bankName ? `, drawn on ${data.bankName}` : ''}
            {data.accountNumber ? `, credited to A/C ${data.accountNumber}` : ''}
            {' '}for {formatCurrency(pay.net)}.
          </span>
        </div>
      )}

      {data.notes && (
        <div className="ps-notes">
          <b>Remarks</b>
          {data.notes}
        </div>
      )}

      <div className="ps-spacer" />

      {/* ── Signatures ─────────────────────────────────────────────── */}
      <div className="ps-signs">
        <div className="ps-sign">
          <div className="ps-sign-line" />
          <p className="ps-sign-l">Authorised Signatory</p>
          <p className="ps-sign-s">HR &amp; Accounts Department</p>
          {companyProfile.name && <p className="ps-sign-co">{companyProfile.name}</p>}
        </div>
      </div>

      <div className="ps-foot">
        <span>
          This is a computer-generated payslip and is valid without a physical signature.
          Please treat it as confidential.
        </span>
        <span>
          Generated{' '}
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
};

/** Modal wrapper with Print / PDF / WhatsApp actions. */
const PayslipModal = ({ data, onClose, companyProfile = {}, appSettings = {}, toast = () => {} }) => {
  const [busy, setBusy] = useState(false);
  if (!data) return null;

  const pay = computePayroll(data);
  const period = payPeriodLabel(data);
  const filename = `Payslip_${String(data.employeeName || 'Employee').replace(/[^\w-]+/g, '_')}_${
    (data.payPeriod || data.date || '').slice(0, 7)
  }.pdf`;

  const handleDownloadPDF = async () => {
    setBusy(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const source = document.getElementById('salary-slip-printable');
      if (!source) throw new Error('Payslip content not found.');

      // Render an off-screen clone at true A4 width so the capture is not
      // affected by the modal's scroll container or responsive scaling.
      const wrapper = document.createElement('div');
      wrapper.style.cssText =
        `position:fixed;left:-10000px;top:0;width:${A4_WIDTH_PX}px;background:#fff;z-index:-1;`;
      const style = document.createElement('style');
      style.textContent = PAYSLIP_CSS;
      wrapper.appendChild(style);
      wrapper.appendChild(source.cloneNode(true));
      document.body.appendChild(wrapper);

      try {
        await html2pdf()
          .set({
            margin: [8, 8, 8, 8],
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: A4_WIDTH_PX },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css'] },
          })
          .from(wrapper)
          .save();
        toast('Payslip PDF downloaded.', 'success');
      } finally {
        document.body.removeChild(wrapper);
      }
    } catch (err) {
      console.error('Payslip PDF export failed:', err);
      toast('PDF export failed. Use Print → Save as PDF instead.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    const source = document.getElementById('salary-slip-printable');
    if (!source) return toast('Payslip content not found.', 'error');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return toast('Please allow pop-ups to print the payslip.', 'warning');
    win.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/>` +
        `<title>Payslip — ${data.employeeName || ''} — ${period}</title>` +
        `<style>${PAYSLIP_CSS}</style>` +
        `<style>body{margin:0;display:flex;justify-content:center;background:#fff;}</style>` +
        `</head><body>${source.outerHTML}</body></html>`
    );
    win.document.close();
    win.focus();
    // Wait for the logo to decode before invoking the print dialog.
    const go = () => { try { win.print(); } catch (e) { /* user cancelled */ } };
    if (win.document.images.length) {
      const img = win.document.images[0];
      img.complete ? setTimeout(go, 150) : (img.onload = img.onerror = () => setTimeout(go, 150));
      setTimeout(go, 2500); // safety net
    } else {
      setTimeout(go, 200);
    }
  };

  const handleWhatsApp = () => {
    const phone = String(data.phone || '').replace(/[^0-9]/g, '');
    const lines = [
      `*SALARY SLIP — ${period}*`,
      '',
      `Dear ${data.employeeName || 'Colleague'},`,
      '',
      `Reference: ${payslipNumber(data)}`,
      `Gross Earnings: ${formatCurrency(pay.gross)}`,
      ...pay.deductions.filter((d) => d.amount !== 0).map((d) => `  ${d.label}: -${formatCurrency(d.amount)}`),
      `Total Deductions: ${formatCurrency(pay.totalDeductions)}`,
      '',
      `*Net Pay: ${formatCurrency(pay.net)}*`,
      `Paid via: ${data.paymentMode || (data.bankName ? `Bank Transfer (${data.bankName})` : 'Cash')}`,
      ...(data.paymentMode === 'Cheque' && data.chequeNumber
        ? [`Cheque No: ${data.chequeNumber}${data.bankName ? ` (${data.bankName})` : ''}`]
        : []),
      '',
      'The detailed payslip PDF follows separately.',
      companyProfile.name || '',
    ];
    const msg = encodeURIComponent(lines.filter((l) => l !== undefined).join('\n'));
    window.open(phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <style>{PAYSLIP_CSS}</style>
      <div className="bg-white rounded-2xl w-full max-w-[860px] shadow-2xl my-4 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Payslip</p>
            <p className="text-sm font-extrabold text-slate-800">
              {data.employeeName} · {period}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors shadow-sm"
            aria-label="Close payslip"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-auto bg-slate-100 p-5 flex justify-center">
          <div style={{ boxShadow: '0 4px 24px rgba(15,23,42,.14)' }}>
            <PayslipDocument data={data} companyProfile={companyProfile} appSettings={appSettings} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-3 flex-shrink-0">
          <button
            onClick={handleDownloadPDF}
            disabled={busy}
            className="flex-1 min-w-[150px] bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-60 transition-colors flex justify-center items-center gap-2 shadow-sm"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {busy ? 'Preparing…' : 'Download PDF'}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 min-w-[120px] bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors flex justify-center items-center gap-2 shadow-sm"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 min-w-[150px] bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#20bd5a] transition-all shadow-sm flex justify-center items-center gap-2"
          >
            <Share2 size={16} /> Send via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayslipModal;
