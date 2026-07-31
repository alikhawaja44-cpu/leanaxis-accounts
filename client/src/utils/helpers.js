// src/utils/helpers.js

// Currency formatter (dynamic, updates with settings)
let _currencyFormatter = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0,
});

export function updateCurrencyFormatter(locale, currency) {
  try {
    _currencyFormatter = new Intl.NumberFormat(locale || 'en-PK', {
      style: 'currency',
      currency: currency || 'PKR',
      maximumFractionDigits: 0,
    });
  } catch (e) {
    console.warn('Invalid locale/currency', e);
  }
}

export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return _currencyFormatter.format(0);
  }
  return _currencyFormatter.format(amount);
}

// Tax calculation
export function calculateTax(amount, taxRate = 0) {
  const numAmount = Number(amount) || 0;
  const tax = numAmount * ((Number(taxRate) || 0) / 100);
  return { subtotal: numAmount, tax, total: numAmount + tax };
}

// Invoice total calculation
export function calcInvoiceTotal(items = [], taxRate = 0, discount = 0) {
  // Guard each line item: a null entry in the array used to throw.
  const subtotal = (Array.isArray(items) ? items : []).reduce(
    (s, it) => s + ((parseFloat(it?.qty) || 0) * (parseFloat(it?.rate) || 0)),
    0
  );
  // Clamp to 0–100: the live preview already capped the discount, but the stored
  // calculation did not, so a mistyped 150% produced a negative invoice.
  const pct = Math.min(100, Math.max(0, parseFloat(discount) || 0));
  const discounted = subtotal - (subtotal * (pct / 100));
  const { tax, total } = calculateTax(discounted, taxRate);
  return { subtotal, discounted, tax, total, discountAmount: subtotal - discounted };
}

/**
 * The single source of truth for an invoice's money.
 *
 * This used to be recomputed inline in 24 different places across the app, and
 * they disagreed with each other:
 *   - 13 of them ignored `discount` entirely, over-stating the total on every
 *     discounted invoice (client statements, receivables, dashboard revenue,
 *     the command palette and the "record payment" amount were all affected).
 *   - every one of them ignored `whtDeducted`, so an invoice whose client
 *     withheld tax could never reach a zero balance and stayed on the books
 *     as a phantom receivable forever.
 *
 * `settled` is what actually clears the invoice: cash received plus any tax the
 * client withheld at source (which you never receive but are credited for).
 */
export function invoiceTotals(inv = {}) {
  const { subtotal, discounted, tax, total } = calcInvoiceTotal(
    inv?.items || [], inv?.taxRate, inv?.discount
  );
  const received = Number(inv?.amountReceived) || 0;
  const wht = Number(inv?.whtDeducted) || 0;
  const settled = received + wht;
  const balance = Math.max(0, total - settled);
  // A cent of tolerance so floating-point noise never leaves an invoice "unpaid".
  const isPaid = inv?.status === 'Paid' || (total > 0 && balance <= 0.01);
  return { subtotal, discounted, tax, total, received, wht, settled, balance, isPaid };
}

/**
 * Does a free-text ledger description refer to this client/vendor?
 *
 * Client and vendor statements matched with a bare `description.includes(name)`.
 * That is a substring test, so a client called "Ali" matched "Quality", "Salient"
 * and "Alignment"; a vendor called "AL" matched almost everything. Unrelated
 * transactions were pulled into their statements and their balances came out wrong.
 *
 * This requires the name to appear as a whole word (or whole phrase), and
 * refuses to match on names shorter than two characters.
 */
export function descriptionMatchesParty(description, partyName) {
  const desc = String(description || '').toLowerCase();
  const name = String(partyName || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (name.length < 2 || !desc) return false;

  // Escape regex metacharacters — names legitimately contain . & ( ) + etc.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // \b does not fire next to non-word characters (e.g. a trailing "."), so
  // anchor on "start or non-word" / "end or non-word" instead.
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(desc);
}

/**
 * Escapes text before it is interpolated into a hand-built HTML string.
 *
 * The petty-cash ledger printer wrote descriptions, categories and reference
 * numbers straight into a template literal. A description containing "<" broke
 * the printed table, and any markup in a record was executed in the print window.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Convenience: just the invoice total. */
export const invoiceTotal = (inv) => invoiceTotals(inv).total;
/** Convenience: what is still owed on an invoice. */
export const invoiceBalance = (inv) => invoiceTotals(inv).balance;

// Hash password (client side, for legacy compat)
export async function hashPassword(password) {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// CSV export
export function exportToCSV(data, filename) {
  if (!data || !data.length) return;
  const cleanData = data.map(item => {
    const row = { ...item };
    if (row.items && Array.isArray(row.items)) {
      row.items = row.items.map(i => `${i.desc} (${i.qty}x${i.rate})`).join('; ');
    }
    return row;
  });

  import('papaparse').then((mod) => {
    const Papa = mod.default || mod;
    const csv = Papa.unparse(cleanData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

// Print helper
export function printDocument(elementId, title) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; }
          @media print { body { padding: 0; } }
        </style>
        ${Array.from(document.styleSheets)
          .map(ss => {
            try {
              return Array.from(ss.cssRules).map(r => r.cssText).join('\n');
            } catch (e) { return ''; }
          })
          .filter(Boolean)
          .map(css => `<style>${css}</style>`)
          .join('')}
      </head>
      <body>${el.innerHTML}</body>
    </html>
  `);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); win.close(); }, 500);
}

// PDF download helper
export async function downloadElementAsPDF(elementId, filename) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`downloadElementAsPDF: #${elementId} not found`);
    return false;
  }
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    // Must be awaited — otherwise callers resolve before the file is written
    // and always report failure.
    await html2pdf().set({
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save();
    return true;
  } catch (err) {
    console.error('PDF export failed:', err);
    return false;
  }
}

// Date helpers
export function today() {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
