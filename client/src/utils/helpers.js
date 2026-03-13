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
  const subtotal = (items || []).reduce(
    (s, it) => s + ((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)),
    0
  );
  const discounted = subtotal - (subtotal * ((parseFloat(discount) || 0) / 100));
  const { tax, total } = calculateTax(discounted, taxRate);
  return { subtotal, discounted, tax, total };
}

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
  const Papa = window.Papa;
  if (!Papa) { console.error('PapaParse not loaded'); return; }
  
  const cleanData = data.map(item => {
    const row = { ...item };
    if (row.items && Array.isArray(row.items)) {
      row.items = row.items.map(i => `${i.desc} (${i.qty}x${i.rate})`).join('; ');
    }
    return row;
  });

  import('papaparse').then(({ default: Papa }) => {
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
  if (!el) return;
  const html2pdf = (await import('html2pdf.js')).default;
  html2pdf().set({
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(el).save();
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
