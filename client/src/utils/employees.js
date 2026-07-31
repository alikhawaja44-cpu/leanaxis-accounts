// src/utils/employees.js
// Employee master records and effective-dated salary structures.
//
// An employee holds a `salaryHistory` array — one entry per revision, each with
// an `effectiveFrom` date. The structure that applies to a given pay period is
// the most recent entry effective on or before that period. This means a payslip
// re-opened months later still shows the figures that were correct at the time.

import { EARNING_FIELDS, DEDUCTION_FIELDS, payPeriodKey } from './payroll';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Components that live on a salary structure (recurring, not one-off). */
export const STRUCTURE_EARNINGS = [
  'basicSalary', 'houseRent', 'conveyance', 'medicalAllowance', 'specialAllowance',
];
export const STRUCTURE_DEDUCTIONS = ['eobi', 'providentFund'];
export const STRUCTURE_FIELDS = [...STRUCTURE_EARNINGS, ...STRUCTURE_DEDUCTIONS];

export const EMPLOYEE_STATUSES = ['Active', 'On Leave', 'Resigned', 'Terminated'];

/** Pulls just the structure fields out of any object. */
export function pickStructure(src) {
  const o = src || {};
  return STRUCTURE_FIELDS.reduce((acc, k) => {
    acc[k] = num(o[k]);
    return acc;
  }, {});
}

/** Gross of a structure (earnings only). */
export function structureGross(st) {
  const o = st || {};
  return STRUCTURE_EARNINGS.reduce((a, k) => a + num(o[k]), 0);
}

/** Sorted revision history, newest first. */
export function sortedHistory(employee) {
  const e = employee || {};
  return (Array.isArray(e.salaryHistory) ? [...e.salaryHistory] : [])
    .filter((h) => h && h.effectiveFrom)
    .sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)));
}

/**
 * The salary structure in force for a given pay period.
 *
 * @param {object} employee
 * @param {string} periodKey  "YYYY-MM"; defaults to the current month
 * @returns {object|null} structure fields, or null if the employee has no history
 */
export function structureFor(employee, periodKey) {
  const e = employee || {};
  const key = periodKey || new Date().toISOString().slice(0, 7);
  // Compare against the last day of the pay month so a revision effective
  // mid-month still applies to that month's payslip.
  const cutoff = `${key}-31`;

  const applicable = sortedHistory(e).find(
    (h) => String(h.effectiveFrom) <= cutoff
  );
  if (applicable) return pickStructure(applicable);

  // No history yet — fall back to any structure stored on the record itself.
  const flat = pickStructure(e);
  return STRUCTURE_FIELDS.some((k) => flat[k] !== 0) ? flat : null;
}

/** The current (latest) structure, regardless of period. */
export const currentStructure = (employee) =>
  structureFor(employee, '9999-12');

/**
 * Builds a draft salary record for an employee for a pay period, ready to be
 * saved as a payslip.
 */
export function draftSalaryFor(employeeInput, periodKey, paymentDate) {
  const employee = employeeInput || {};
  const st = structureFor(employee, periodKey) || {};
  const date = paymentDate || lastDayOf(periodKey);
  return {
    employeeRef: employee.id || null,
    employeeId: employee.employeeId || '',
    employeeName: employee.name || '',
    role: employee.designation || '',
    department: employee.department || '',
    cnic: employee.cnic || '',
    joiningDate: employee.joiningDate || '',
    phone: employee.phone || '',
    payPeriod: periodKey,
    date,
    status: 'Unpaid',
    paymentMode: employee.paymentMode || 'Bank Transfer',
    bankName: employee.bankName || '',
    accountNumber: employee.accountNumber || '',
    ...st,
  };
}

/** Last calendar day of a "YYYY-MM" period, as an ISO date string. */
export function lastDayOf(periodKey) {
  const key = periodKey || new Date().toISOString().slice(0, 7);
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return new Date().toISOString().split('T')[0];
  return new Date(Date.UTC(y, m, 0)).toISOString().split('T')[0];
}

/** Human label for a "YYYY-MM" period. */
export function periodLabelOf(periodKey) {
  if (!periodKey) return '—';
  const d = new Date(`${periodKey}-01T00:00:00Z`);
  if (isNaN(d.getTime())) return periodKey;
  return d.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Compares two structures and returns the change between them.
 * Used to render "increased by 12.5%" on the revision timeline.
 */
export function revisionDelta(newerInput, older = null) {
  const newer = newerInput || {};
  const newGross = structureGross(newer);
  if (!older) return { amount: 0, percent: 0, isFirst: true, gross: newGross };
  const oldGross = structureGross(older);
  const amount = newGross - oldGross;
  const percent = oldGross > 0 ? (amount / oldGross) * 100 : 0;
  return { amount, percent, isFirst: false, gross: newGross, previousGross: oldGross };
}

/** Validates an employee record before save. Returns an error string or null. */
export function validateEmployee(input, allEmployeesInput) {
  const e = input || {};
  const allEmployees = Array.isArray(allEmployeesInput) ? allEmployeesInput : [];
  if (!String(e.name || '').trim()) return 'Employee name is required.';
  if (!String(e.employeeId || '').trim()) return 'Employee ID is required.';

  const id = String(e.employeeId).trim().toLowerCase();
  const clash = allEmployees.find(
    (x) => x.id !== e.id && String(x.employeeId || '').trim().toLowerCase() === id
  );
  if (clash) return `Employee ID "${e.employeeId}" is already used by ${clash.name}.`;

  if (e.cnic && !/^\d{5}-?\d{7}-?\d$/.test(String(e.cnic).replace(/\s/g, ''))) {
    return 'CNIC must be in the format 42101-1234567-8.';
  }
  const negative = STRUCTURE_FIELDS.find((k) => num(e[k]) < 0);
  if (negative) return 'Salary components cannot be negative.';
  if (structureGross(e) <= 0) return 'Enter a basic salary greater than 0.';
  return null;
}

/** Employees who should appear in a payroll run for the given period. */
export function activeForPeriod(employees, periodKey) {
  const cutoff = `${periodKey}-31`;
  return (Array.isArray(employees) ? employees : []).filter((raw) => {
    const e = raw || {};
    if (e.status && e.status !== 'Active' && e.status !== 'On Leave') return false;
    if (e.joiningDate && String(e.joiningDate) > cutoff) return false;
    if (e.exitDate && String(e.exitDate) < `${periodKey}-01`) return false;
    return !!structureFor(e, periodKey);
  });
}

export { EARNING_FIELDS, DEDUCTION_FIELDS };

// ── Deriving employee records from existing payslips ────────────────────────

/** Most recent non-empty value for a field, scanning newest payslip first. */
function latestValue(slipsNewestFirst, field) {
  for (const s of slipsNewestFirst) {
    const v = s && s[field];
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/** True when two salary structures are materially the same. */
function sameStructure(a, b) {
  if (!a || !b) return false;
  return STRUCTURE_FIELDS.every((k) => num(a[k]) === num(b[k]));
}

/**
 * Builds employee master records out of payslips that already exist.
 *
 * Everything an employee record needs — name, ID, designation, CNIC, bank
 * details, salary structure — has already been typed onto payslips. Rather than
 * re-entering it all by hand, this reconstructs the profiles from that history.
 *
 * The salary history is rebuilt too: walking the payslips oldest to newest, a
 * revision entry is created every time the structure actually changes, dated to
 * the first day of that pay period. So an employee paid 100k for six months and
 * 150k after gets two history entries, not eight.
 *
 * @param {Array} salaries       existing salary records
 * @param {Array} existing       employees already on file (these are skipped)
 * @returns {Array} draft employee records, ready to create
 */
export function deriveEmployeesFromSalaries(salaries, existing) {
  const slips = (Array.isArray(salaries) ? salaries : []).filter(Boolean);
  const already = (Array.isArray(existing) ? existing : []).filter(Boolean);

  const takenIds = new Set(
    already.map((e) => String(e.employeeId || '').trim().toLowerCase()).filter(Boolean)
  );
  const takenNames = new Set(
    already.map((e) => String(e.name || '').trim().toLowerCase()).filter(Boolean)
  );

  // Group payslips per person. Prefer an explicit link, fall back to the name.
  const groups = new Map();
  for (const s of slips) {
    const name = String(s.employeeName || '').trim();
    if (!name) continue;
    const key = s.employeeRef ? `ref:${s.employeeRef}` : `name:${name.toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  const drafts = [];
  let generatedSeq = 1;

  for (const [, list] of groups) {
    const oldestFirst = [...list].sort((a, b) =>
      String(payPeriodKey(a)).localeCompare(String(payPeriodKey(b)))
    );
    const newestFirst = [...oldestFirst].reverse();

    const name = latestValue(newestFirst, 'employeeName');
    if (!name || takenNames.has(name.toLowerCase())) continue;

    // Keep the employee's own ID if it was ever recorded; otherwise mint one
    // that does not clash with anything already taken.
    let employeeId = latestValue(newestFirst, 'employeeId');
    if (!employeeId || takenIds.has(employeeId.toLowerCase())) {
      do {
        employeeId = `EMP-${String(generatedSeq).padStart(3, '0')}`;
        generatedSeq += 1;
      } while (takenIds.has(employeeId.toLowerCase()));
    }
    takenIds.add(employeeId.toLowerCase());
    takenNames.add(name.toLowerCase());

    // Rebuild the revision history: one entry per genuine change.
    const salaryHistory = [];
    let previous = null;
    for (const slip of oldestFirst) {
      const st = pickStructure(slip);
      if (structureGross(st) <= 0) continue;
      if (sameStructure(st, previous)) continue;
      const key = payPeriodKey(slip);
      salaryHistory.push({
        ...st,
        effectiveFrom: key ? `${key}-01` : (slip.date || ''),
        reason: previous ? 'Rate change (from payslip history)' : 'Initial salary (from payslip)',
        revisedBy: 'Imported',
      });
      previous = st;
    }

    const current = salaryHistory.length
      ? pickStructure(salaryHistory[salaryHistory.length - 1])
      : pickStructure({});

    drafts.push({
      name,
      employeeId,
      designation: latestValue(newestFirst, 'role'),
      department: latestValue(newestFirst, 'department'),
      cnic: latestValue(newestFirst, 'cnic'),
      joiningDate: latestValue(newestFirst, 'joiningDate'),
      phone: latestValue(newestFirst, 'phone'),
      email: latestValue(newestFirst, 'email'),
      status: 'Active',
      paymentMode: latestValue(newestFirst, 'paymentMode') || 'Bank Transfer',
      bankName: latestValue(newestFirst, 'bankName'),
      accountNumber: latestValue(newestFirst, 'accountNumber'),
      notes: 'Profile created from existing payslips.',
      ...current,
      salaryHistory,
      // Not persisted — used by the review screen only.
      _payslipCount: oldestFirst.length,
      _firstPeriod: payPeriodKey(oldestFirst[0]),
      _lastPeriod: payPeriodKey(newestFirst[0]),
      _missing: [
        !latestValue(newestFirst, 'cnic') && 'CNIC',
        !latestValue(newestFirst, 'joiningDate') && 'Date of joining',
        !latestValue(newestFirst, 'phone') && 'Phone',
        !latestValue(newestFirst, 'accountNumber') && 'Account / IBAN',
        !latestValue(newestFirst, 'department') && 'Department',
      ].filter(Boolean),
    });
  }

  return drafts.sort((a, b) => a.name.localeCompare(b.name));
}

/** Strips the review-only fields before saving. */
export function stripDraftMeta(draft) {
  const clean = { ...(draft || {}) };
  Object.keys(clean).forEach((k) => { if (k.startsWith('_')) delete clean[k]; });
  return clean;
}
