// src/utils/payroll.js
// Payroll engine — earnings/deductions schema, computation and formatting helpers.
//
// Backwards compatible with the v1 salary record shape:
//   { basicSalary, taxDeduction, totalPayable }
// New records additionally carry allowances, statutory deductions and
// payment details. `computePayroll()` is the single source of truth for
// gross / total deductions / net across the whole application.

import { parseLocalDate } from './helpers';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Earnings components, in the order they appear on the payslip. */
export const EARNING_FIELDS = [
  { key: 'basicSalary',      label: 'Basic Salary' },
  { key: 'houseRent',        label: 'House Rent Allowance' },
  { key: 'conveyance',       label: 'Conveyance Allowance' },
  { key: 'medicalAllowance', label: 'Medical Allowance' },
  { key: 'specialAllowance', label: 'Special Allowance' },
  { key: 'overtimeAmount',   label: 'Overtime' },
  { key: 'bonus',            label: 'Bonus / Commission' },
  { key: 'arrears',          label: 'Arrears' },
  { key: 'otherEarning',     label: 'Other Earnings', labelKey: 'otherEarningLabel' },
];

/** Deduction components, in the order they appear on the payslip. */
export const DEDUCTION_FIELDS = [
  { key: 'taxDeduction',     label: 'Income Tax (WHT)' },
  { key: 'eobi',             label: 'EOBI Contribution' },
  { key: 'providentFund',    label: 'Provident Fund' },
  { key: 'loanDeduction',    label: 'Loan / Advance Recovery' },
  { key: 'absenceDeduction', label: 'Absence / Late Deduction' },
  { key: 'otherDeduction',   label: 'Other Deductions', labelKey: 'otherDeductionLabel' },
];

export const PAYMENT_MODES = ['Bank Transfer', 'Cheque', 'Cash', 'Online / Mobile Wallet'];

/**
 * Computes the full payroll breakdown for a salary record.
 *
 * Legacy records (only `basicSalary` + `taxDeduction`) resolve identically to
 * the old `net = basic - tax` formula, so historical figures never shift.
 *
 * @param {object} s raw salary record
 * @returns {{earnings, deductions, gross, totalDeductions, net, hasBreakdown}}
 */
export function computePayroll(input) {
  const s = input || {};
  const build = (fields) =>
    fields.map((f) => ({
      key: f.key,
      label: (f.labelKey && String(s[f.labelKey] || '').trim()) || f.label,
      amount: num(s[f.key]),
    }));

  const earnings = build(EARNING_FIELDS);
  const deductions = build(DEDUCTION_FIELDS);

  const totalDeductions = deductions.reduce((a, d) => a + d.amount, 0);
  let gross = earnings.reduce((a, e) => a + e.amount, 0);

  // Legacy fallback: record stored only a net figure.
  if (gross === 0 && num(s.totalPayable) !== 0) {
    gross = num(s.totalPayable) + totalDeductions;
    earnings[0] = { ...earnings[0], amount: gross };
  }

  return {
    earnings,
    deductions,
    gross,
    totalDeductions,
    net: gross - totalDeductions,
    // true once the record uses more than just a basic salary
    hasBreakdown:
      earnings.filter((e) => e.amount !== 0).length > 1 ||
      deductions.filter((d) => d.amount !== 0).length > 1,
  };
}

/** Convenience wrappers used by list views and reports. */
export const grossOf = (s) => computePayroll(s).gross;
export const netOf = (s) => computePayroll(s).net;
export const deductionsOf = (s) => computePayroll(s).totalDeductions;

/**
 * Recomputes and returns the persisted totals for a record, so that
 * `grossSalary`, `totalDeductions` and `totalPayable` are always stored
 * in sync with the component fields.
 */
export function withTotals(input) {
  const s = input || {};
  const { gross, totalDeductions, net } = computePayroll(s);
  return { ...s, grossSalary: gross, totalDeductions, totalPayable: net };
}

/**
 * Derives the pay period label. Prefers an explicit `payPeriod` (YYYY-MM),
 * falling back to the payment date.
 */
export function payPeriodLabel(input) {
  const s = input || {};
  const src = s.payPeriod ? `${s.payPeriod}-01` : s.date;
  if (!src) return '—';
  // Parsed as a local calendar date; a raw `new Date('2026-07-01')` is UTC
  // midnight and renders as June in any timezone behind UTC.
  const d = parseLocalDate(src);
  if (!d) return String(src);
  return d.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

/** Sortable YYYY-MM key for a record's pay period. */
export function payPeriodKey(input) {
  const s = input || {};
  if (s.payPeriod) return String(s.payPeriod).slice(0, 7);
  if (!s.date) return '';
  const d = parseLocalDate(s.date);
  if (!d) return String(s.date).slice(0, 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Stable, human-readable payslip reference number. */
export function payslipNumber(input) {
  const s = input || {};
  const period = (payPeriodKey(s) || '000000').replace('-', '');
  const emp =
    (s.employeeId && String(s.employeeId).replace(/\s+/g, '').toUpperCase()) ||
    String(s.employeeName || 'EMP')
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase() ||
    'EMP';
  return `PS-${period}-${emp}`;
}

// ── Amount in words (Pakistani/South-Asian numbering: crore, lakh) ───────────
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

function threeDigits(n) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/**
 * Converts a number to words using crore/lakh grouping.
 * e.g. 12,34,567.50 -> "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and 50/100"
 */
export function amountInWords(amount, currencyName = 'Rupees') {
  const value = num(amount);
  const negative = value < 0;
  const abs = Math.abs(value);
  const whole = Math.floor(abs);
  const paisa = Math.round((abs - whole) * 100);

  if (whole === 0 && paisa === 0) return `${currencyName} Zero Only`;

  const groups = [
    { div: 10000000, name: 'Crore' },
    { div: 100000, name: 'Lakh' },
    { div: 1000, name: 'Thousand' },
  ];

  let remainder = whole;
  const words = [];
  for (const g of groups) {
    const q = Math.floor(remainder / g.div);
    if (q > 0) {
      words.push(`${threeDigits(q)} ${g.name}`);
      remainder %= g.div;
    }
  }
  if (remainder > 0) words.push(threeDigits(remainder));

  let out = `${currencyName} ${words.join(' ')}`.replace(/\s+/g, ' ').trim();
  if (paisa > 0) out += ` and ${String(paisa).padStart(2, '0')}/100`;
  if (negative) out = `Minus ${out}`;
  return `${out} Only`;
}

/**
 * Fiscal-year-to-date totals for one employee.
 * Pakistan's tax year runs 1 July – 30 June.
 */
export function fiscalYearToDate(allSalaries = [], record = {}) {
  const key = payPeriodKey(record);
  if (!key) return null;
  const [y, m] = key.split('-').map(Number);
  const fyStart = m >= 7 ? y : y - 1;
  const name = String(record.employeeName || '').trim().toLowerCase();

  const inFY = allSalaries.filter((s) => {
    if (String(s.employeeName || '').trim().toLowerCase() !== name) return false;
    const k = payPeriodKey(s);
    if (!k || k > key) return false;
    const [sy, sm] = k.split('-').map(Number);
    const sFy = sm >= 7 ? sy : sy - 1;
    return sFy === fyStart;
  });

  const totals = inFY.reduce(
    (acc, s) => {
      const p = computePayroll(s);
      acc.gross += p.gross;
      acc.deductions += p.totalDeductions;
      acc.tax += num(s.taxDeduction);
      acc.net += p.net;
      return acc;
    },
    { gross: 0, deductions: 0, tax: 0, net: 0 }
  );

  return { ...totals, months: inFY.length, label: `${fyStart}–${fyStart + 1}` };
}
