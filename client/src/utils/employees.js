// src/utils/employees.js
// Employee master records and effective-dated salary structures.
//
// An employee holds a `salaryHistory` array — one entry per revision, each with
// an `effectiveFrom` date. The structure that applies to a given pay period is
// the most recent entry effective on or before that period. This means a payslip
// re-opened months later still shows the figures that were correct at the time.

import { EARNING_FIELDS, DEDUCTION_FIELDS } from './payroll';

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
export function pickStructure(src = {}) {
  return STRUCTURE_FIELDS.reduce((acc, k) => {
    acc[k] = num(src[k]);
    return acc;
  }, {});
}

/** Gross of a structure (earnings only). */
export function structureGross(st = {}) {
  return STRUCTURE_EARNINGS.reduce((a, k) => a + num(st[k]), 0);
}

/** Sorted revision history, newest first. */
export function sortedHistory(employee = {}) {
  return [...(employee.salaryHistory || [])]
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
export function structureFor(employee = {}, periodKey) {
  const key = periodKey || new Date().toISOString().slice(0, 7);
  // Compare against the last day of the pay month so a revision effective
  // mid-month still applies to that month's payslip.
  const cutoff = `${key}-31`;

  const applicable = sortedHistory(employee).find(
    (h) => String(h.effectiveFrom) <= cutoff
  );
  if (applicable) return pickStructure(applicable);

  // No history yet — fall back to any structure stored on the record itself.
  const flat = pickStructure(employee);
  return STRUCTURE_FIELDS.some((k) => flat[k] !== 0) ? flat : null;
}

/** The current (latest) structure, regardless of period. */
export const currentStructure = (employee) =>
  structureFor(employee, '9999-12');

/**
 * Builds a draft salary record for an employee for a pay period, ready to be
 * saved as a payslip.
 */
export function draftSalaryFor(employee = {}, periodKey, paymentDate) {
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
export function revisionDelta(newer = {}, older = null) {
  const newGross = structureGross(newer);
  if (!older) return { amount: 0, percent: 0, isFirst: true, gross: newGross };
  const oldGross = structureGross(older);
  const amount = newGross - oldGross;
  const percent = oldGross > 0 ? (amount / oldGross) * 100 : 0;
  return { amount, percent, isFirst: false, gross: newGross, previousGross: oldGross };
}

/** Validates an employee record before save. Returns an error string or null. */
export function validateEmployee(e = {}, allEmployees = []) {
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
export function activeForPeriod(employees = [], periodKey) {
  const cutoff = `${periodKey}-31`;
  return employees.filter((e) => {
    if (e.status && e.status !== 'Active' && e.status !== 'On Leave') return false;
    if (e.joiningDate && String(e.joiningDate) > cutoff) return false;
    if (e.exitDate && String(e.exitDate) < `${periodKey}-01`) return false;
    return !!structureFor(e, periodKey);
  });
}

export { EARNING_FIELDS, DEDUCTION_FIELDS };
