// src/utils/cashflow.js
//
// Cash flow forecasting and the collections chase list.
//
// Both answer questions the app could not previously answer:
//   - "will there be enough in the account to cover salaries on the 1st?"
//   - "who do I need to chase today, and for how much?"
//
// Everything is derived from dates already recorded — nothing new to enter.

import { invoiceTotals, parseLocalDate, startOfDay, daysBetween, todayISO } from './helpers';
import { computePayroll, payPeriodKey } from './payroll';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Midnight today, in local time — the reference point for all age maths. */
export const startOfToday = (now) => startOfDay(now ? new Date(now) : undefined);

/**
 * Parses a stored date as a local calendar date.
 * See `parseLocalDate` in helpers.js for why this matters at UTC+5.
 */
export const parseDate = parseLocalDate;

const dayDiff = (a, b) => daysBetween(a, b);
const iso = (d) => todayISO(d);

/**
 * Money currently held: bank ledger balance plus the petty cash float.
 *
 * Note this is only as accurate as the bank records that have been entered. If
 * bank transactions are not being recorded the opening position will read low,
 * and the forecast inherits that.
 */
export function openingPosition(input) {
  const { bankRecords, pettyCash, appSettings } = input || {};
  const bank = (Array.isArray(bankRecords) ? bankRecords : [])
    .reduce((a, r) => a + num(r && r.amount), 0);

  const float = (Array.isArray(pettyCash) ? pettyCash : [])
    .reduce((a, r) => a + num(r && r.cashIn) - num(r && r.cashOut),
      num(appSettings && appSettings.pettyCashOpeningBalance));

  return { bank, float, total: bank + float };
}

/**
 * Every expected movement of money, dated.
 *
 * Inflows  — unpaid or part-paid invoices, at their due date (or invoice date).
 * Outflows — unpaid vendor bills, unpaid payslips, and recurring expenses
 *            projected forward on a monthly cycle.
 */
export function buildMovements(input) {
  const {
    invoices, vendorBills, salaries, expenses, horizonDays = 90, now,
  } = input || {};
  const today = startOfToday(now);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + horizonDays);

  const movements = [];

  // ── Receivables ───────────────────────────────────────────────────────────
  for (const inv of (Array.isArray(invoices) ? invoices : [])) {
    if (!inv || inv.status === 'Paid') continue;
    const { balance } = invoiceTotals(inv);
    if (balance <= 0.01) continue;
    const due = parseDate(inv.dueDate) || parseDate(inv.date);
    if (!due) continue;
    movements.push({
      kind: 'in',
      type: 'Invoice',
      label: `${inv.client || 'Client'}${inv.invoiceNumber ? ` · ${inv.invoiceNumber}` : ''}`,
      amount: balance,
      date: due,
      overdue: due < today,
      daysOverdue: due < today ? dayDiff(today, due) : 0,
      id: inv.id,
    });
  }

  // ── Vendor bills ──────────────────────────────────────────────────────────
  for (const b of (Array.isArray(vendorBills) ? vendorBills : [])) {
    if (!b || b.status === 'Paid') continue;
    const net = num(b.amount) || (num(b.billAmount) - num(b.taxDeduction));
    const due = Math.max(0, net - num(b.paidAmount));
    if (due <= 0.01) continue;
    const when = parseDate(b.dueDate) || parseDate(b.date);
    if (!when) continue;
    movements.push({
      kind: 'out',
      type: 'Vendor Bill',
      label: `${b.vendor || 'Vendor'}${b.billNumber ? ` · ${b.billNumber}` : ''}`,
      amount: due,
      date: when,
      overdue: when < today,
      daysOverdue: when < today ? dayDiff(today, when) : 0,
      id: b.id,
    });
  }

  // ── Payroll ───────────────────────────────────────────────────────────────
  for (const s of (Array.isArray(salaries) ? salaries : [])) {
    if (!s || s.status === 'Paid') continue;
    const net = computePayroll(s).net;
    if (net <= 0.01) continue;
    const when = parseDate(s.date);
    if (!when) continue;
    movements.push({
      kind: 'out',
      type: 'Salary',
      label: `${s.employeeName || 'Employee'} · ${payPeriodKey(s) || ''}`.trim(),
      amount: net,
      date: when,
      overdue: when < today,
      daysOverdue: when < today ? dayDiff(today, when) : 0,
      id: s.id,
    });
  }

  // ── Recurring expenses, projected forward ────────────────────────────────
  // Rent, subscriptions and the like repeat monthly. Project the next
  // occurrences so a forecast is not blind to predictable costs.
  for (const e of (Array.isArray(expenses) ? expenses : [])) {
    if (!e || !e.isRecurring) continue;
    const amount = num(e.amount);
    if (amount <= 0) continue;
    const last = parseDate(e.date);
    if (!last) continue;

    const next = new Date(last);
    // Advance month by month until we pass today, then emit until the horizon.
    let guard = 0;
    while (next <= horizon && guard < 400) {
      guard += 1;
      next.setMonth(next.getMonth() + 1);
      if (next > today && next <= horizon) {
        movements.push({
          kind: 'out',
          type: 'Recurring',
          label: e.description || e.category || 'Recurring expense',
          amount,
          date: new Date(next),
          overdue: false,
          daysOverdue: 0,
          projected: true,
          id: `${e.id}-${iso(next)}`,
        });
      }
    }
  }

  return movements
    .filter((m) => m.date <= horizon)
    .sort((a, b) => a.date - b.date);
}

const BUCKETS = [
  { key: 'overdue', label: 'Overdue', from: -Infinity, to: -1 },
  { key: 'd30', label: 'Next 30 days', from: 0, to: 30 },
  { key: 'd60', label: '31 – 60 days', from: 31, to: 60 },
  { key: 'd90', label: '61 – 90 days', from: 61, to: 90 },
];

/**
 * The full forecast: opening position, movements grouped into periods, and the
 * projected closing balance after each one.
 */
export function buildForecast(input) {
  const data = input || {};
  const today = startOfToday(data.now);
  const opening = openingPosition(data);
  const movements = buildMovements(data);

  const horizonDays = data.horizonDays || 90;
  const buckets = BUCKETS
    .filter((b) => b.from < horizonDays)
    .map((b) => ({ ...b, in: 0, out: 0, items: [] }));

  for (const m of movements) {
    const offset = dayDiff(m.date, today);
    const bucket = buckets.find((b) => offset >= b.from && offset <= b.to)
      || buckets[buckets.length - 1];
    if (!bucket) continue;
    bucket.items.push(m);
    if (m.kind === 'in') bucket.in += m.amount;
    else bucket.out += m.amount;
  }

  // Running projected balance, carried period to period.
  let running = opening.total;
  const periods = buckets.map((b) => {
    const net = b.in - b.out;
    running += net;
    return { ...b, net, closing: running };
  });

  const totalIn = periods.reduce((a, p) => a + p.in, 0);
  const totalOut = periods.reduce((a, p) => a + p.out, 0);
  // The first period at which the projection dips below zero.
  const shortfall = periods.find((p) => p.closing < 0) || null;

  return {
    today,
    opening,
    periods,
    movements,
    totalIn,
    totalOut,
    net: totalIn - totalOut,
    closing: running,
    shortfall,
  };
}

// ── Collections ─────────────────────────────────────────────────────────────

/** How urgently an invoice needs chasing. Higher sorts first. */
function chaseScore({ daysOverdue, balance, daysSinceReminder, everReminded }) {
  let score = 0;
  score += Math.max(0, daysOverdue) * 10;          // age dominates
  score += Math.min(balance / 1000, 500);           // then size, capped
  if (!everReminded) score += 40;                   // never chased at all
  else score += Math.min(daysSinceReminder, 60);    // gone quiet since last chase
  return score;
}

/**
 * The chase list: every invoice still owing, prioritised, with how long it has
 * been overdue and when it was last chased.
 *
 * `dueSoonDays` also surfaces invoices about to fall due, so a reminder can go
 * out before they become late.
 */
export function buildCollections(input) {
  const { invoices, clients, now, dueSoonDays = 7 } = input || {};
  const today = startOfToday(now);
  const clientList = Array.isArray(clients) ? clients : [];

  const rows = [];
  for (const inv of (Array.isArray(invoices) ? invoices : [])) {
    if (!inv || inv.status === 'Paid' || inv.status === 'Draft') continue;
    const { total, settled, balance } = invoiceTotals(inv);
    if (balance <= 0.01) continue;

    const due = parseDate(inv.dueDate);
    const issued = parseDate(inv.date);
    const daysOverdue = due ? Math.max(0, dayDiff(today, due)) : 0;
    const daysUntilDue = due ? dayDiff(due, today) : null;

    const reminded = parseDate(inv.lastRemindedAt);
    const daysSinceReminder = reminded ? dayDiff(today, reminded) : Infinity;

    const client = clientList.find(
      (c) => String(c.name || '').trim().toLowerCase()
        === String(inv.client || '').trim().toLowerCase()
    );

    // Only chase what is late, or about to be.
    const isOverdue = daysOverdue > 0;
    const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= dueSoonDays;
    if (!isOverdue && !isDueSoon) continue;

    rows.push({
      id: inv.id,
      invoice: inv,
      invoiceNumber: inv.invoiceNumber || '',
      client: inv.client || 'Unknown client',
      clientRecord: client || null,
      phone: (client && (client.phone || client.contact)) || '',
      total,
      settled,
      balance,
      dueDate: due ? iso(due) : '',
      issuedDate: issued ? iso(issued) : '',
      daysOverdue,
      daysUntilDue,
      isOverdue,
      isDueSoon,
      lastRemindedAt: reminded ? iso(reminded) : '',
      remindersSent: num(inv.remindersSent),
      everReminded: !!reminded,
      daysSinceReminder: reminded ? daysSinceReminder : null,
      severity: daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'high'
        : daysOverdue > 0 ? 'due' : 'soon',
      score: chaseScore({
        daysOverdue, balance, daysSinceReminder, everReminded: !!reminded,
      }),
    });
  }

  rows.sort((a, b) => b.score - a.score);

  const totals = rows.reduce((acc, r) => {
    acc.count += 1;
    acc.balance += r.balance;
    if (r.isOverdue) { acc.overdueCount += 1; acc.overdueBalance += r.balance; }
    if (r.severity === 'critical') acc.criticalCount += 1;
    if (!r.everReminded) acc.neverChased += 1;
    return acc;
  }, {
    count: 0, balance: 0, overdueCount: 0, overdueBalance: 0,
    criticalCount: 0, neverChased: 0,
  });

  return { rows, totals, today };
}

/** The reminder message sent over WhatsApp. */
export function reminderMessage(rowInput, profileInput, formatMoney = String) {
  const row = rowInput || {};
  const companyProfile = profileInput || {};
  const co = companyProfile.name || 'our company';
  const lines = [
    `*Payment Reminder — ${row.invoiceNumber || 'Invoice'}*`,
    '',
    `Dear ${row.client},`,
    '',
    row.isOverdue
      ? `This is a gentle reminder that invoice ${row.invoiceNumber || ''} for ${formatMoney(row.balance)} was due on ${row.dueDate} and is now ${row.daysOverdue} day${row.daysOverdue === 1 ? '' : 's'} overdue.`
      : `This is a courtesy reminder that invoice ${row.invoiceNumber || ''} for ${formatMoney(row.balance)} falls due on ${row.dueDate}.`,
  ];

  if (row.settled > 0) {
    lines.push('', `Invoice total: ${formatMoney(row.total)}`, `Received so far: ${formatMoney(row.settled)}`, `*Balance due: ${formatMoney(row.balance)}*`);
  }

  lines.push(
    '',
    'If payment has already been sent, please ignore this message and accept our thanks.',
    '',
    co,
    companyProfile.phone || '',
  );

  return lines.filter((l) => l !== undefined).join('\n').replace(/\n{3,}/g, '\n\n');
}
