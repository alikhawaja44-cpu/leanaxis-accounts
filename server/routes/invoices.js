// server/routes/invoices.js
const express = require('express');
const router = express.Router();
const { firestoreHelpers, getDb } = require('../config/firebase');
const { requireAuth, requireWrite, requireAdmin } = require('../middleware/auth');

// Calculate invoice total
function calcTotal(items = [], taxRate = 0, discount = 0) {
  const subtotal = items.reduce((s, it) => s + ((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)), 0);
  const discounted = subtotal - (subtotal * (parseFloat(discount) || 0) / 100);
  const tax = discounted * ((parseFloat(taxRate) || 0) / 100);
  return { subtotal, discounted, tax, total: discounted + tax };
}

// GET / - all invoices
router.get('/', requireAuth, async (req, res) => {
  try {
    const invoices = await firestoreHelpers.getAll('invoices');
    res.json(invoices);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch invoices' }); }
});

// GET /:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const inv = await firestoreHelpers.getById('invoices', req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    res.json(inv);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch invoice' }); }
});

// POST / - create invoice
router.post('/', requireAuth, requireWrite, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    data.addedBy = req.user.username;
    const inv = await firestoreHelpers.create('invoices', data);
    res.status(201).json(inv);
  } catch (e) { res.status(500).json({ error: 'Failed to create invoice' }); }
});

// PUT /:id - update invoice
router.put('/:id', requireAuth, requireWrite, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id; delete data.createdAt; delete data.addedBy;
    data.lastEditedBy = req.user.username;
    const inv = await firestoreHelpers.update('invoices', req.params.id, data);
    res.json(inv);
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Invoice not found' });
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// DELETE /:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await firestoreHelpers.delete('invoices', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete invoice' }); }
});

// POST /:id/payment - record payment (updates invoice + creates bank/petty entry)
// Runs inside a transaction so two payments recorded at the same moment cannot
// overwrite each other's balance.
router.post('/:id/payment', requireAuth, requireWrite, async (req, res) => {
  const paying = parseFloat(req.body.partialAmount);
  const wht = parseFloat(req.body.clientWHT) || 0;
  const { paymentAccount } = req.body;

  if (!Number.isFinite(paying) || paying <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than 0.' });
  }
  if (wht < 0) {
    return res.status(400).json({ error: 'Withholding tax cannot be negative.' });
  }
  if (wht > paying) {
    return res.status(400).json({ error: 'Withholding tax cannot exceed the payment amount.' });
  }

  try {
    const out = await firestoreHelpers.transactUpdate('invoices', req.params.id, (inv) => {
      const { total } = calcTotal(inv.items, inv.taxRate, inv.discount);
      const alreadyReceived = parseFloat(inv.amountReceived) || 0;
      const alreadyWht = parseFloat(inv.whtDeducted) || 0;
      const outstanding = total - alreadyReceived - alreadyWht;

      // Allow a small rounding tolerance, but block genuine over-payment.
      if (outstanding <= 0.01) {
        const err = new Error('This invoice is already settled in full.');
        err.code = 'ALREADY_SETTLED';
        throw err;
      }
      if (paying - outstanding > 0.01) {
        const err = new Error(
          `Payment exceeds the outstanding balance of ${outstanding.toFixed(2)}.`
        );
        err.code = 'OVERPAYMENT';
        throw err;
      }

      const netReceived = paying - wht;
      const totalReceived = alreadyReceived + netReceived;
      const totalWht = alreadyWht + wht;
      const newStatus = totalReceived + totalWht >= total - 0.01 ? 'Paid' : 'Partial';
      const date = new Date().toISOString().split('T')[0];

      const recordData = {
        date,
        description: `Inv Payment: ${inv.client} (#${inv.invoiceNumber || inv.id})`,
        addedBy: req.user.username,
        createdAt: new Date().toISOString(),
      };

      return {
        update: {
          status: newStatus,
          whtDeducted: totalWht,
          amountReceived: totalReceived,
          paidDate: newStatus === 'Paid' ? date : (inv.paidDate || null),
          lastEditedBy: req.user.username,
          lastEditedAt: new Date().toISOString(),
        },
        creates: [
          paymentAccount === 'bank'
            ? { collection: 'bank_records', data: { ...recordData, amount: netReceived, bank: 'Linked Payment', status: 'Cleared' } }
            : { collection: 'petty_cash', data: { ...recordData, cashIn: netReceived, cashOut: 0 } },
        ],
        result: { status: newStatus, amountReceived: totalReceived, whtDeducted: totalWht },
      };
    });

    res.json({ success: true, ...out });
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Invoice not found' });
    if (e.code === 'OVERPAYMENT' || e.code === 'ALREADY_SETTLED') {
      return res.status(400).json({ error: e.message });
    }
    console.error('Payment error:', e);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// POST /generate-recurring - generate recurring invoices
router.post('/generate-recurring', requireAuth, requireWrite, async (req, res) => {
  try {
    const [clients, invoices, settingsDoc] = await Promise.all([
      firestoreHelpers.getAll('clients'),
      firestoreHelpers.getAll('invoices'),
      firestoreHelpers.getById('settings', 'app_settings'),
    ]);

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonth = now.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    const settings = settingsDoc || {};
    const prefix = settings.invoicePrefix || 'INV';
    let counter = Number(settings.invoiceCounter) || 1;

    // Compare on a YYYY-MM key rather than a formatted label; an unparseable
    // date used to render "Invalid Date", which never matched and produced
    // duplicate retainer invoices every time this ran.
    const periodOf = (d) => {
      const x = new Date(d);
      return isNaN(x.getTime())
        ? ''
        : `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
    };

    const created = [];
    for (const client of clients) {
      const retainer = parseFloat(client.retainerAmount);
      if (!(retainer > 0)) continue;

      const exists = invoices.some(
        (inv) => inv.client === client.name && periodOf(inv.date) === monthKey
      );
      if (exists) continue;

      const inv = await firestoreHelpers.create('invoices', {
        client: client.name,
        invoiceNumber: `${prefix}-${String(counter).padStart(3, '0')}`,
        date: now.toISOString().split('T')[0],
        items: [{ desc: `Monthly Retainer - ${currentMonth}`, qty: 1, rate: retainer }],
        taxRate: Number(settings.defaultTaxRate) || 0,
        discount: 0,
        status: 'Draft',
        isRecurring: true,
        addedBy: req.user.username,
      });
      created.push(inv);
      counter += 1;
    }

    // Persist the advanced counter so the next manual invoice does not collide.
    if (created.length) {
      await getDb().collection('settings').doc('app_settings')
        .set({ invoiceCounter: counter }, { merge: true });
    }

    res.json({
      count: created.length,
      invoices: created,
      message: `Generated ${created.length} recurring invoice${created.length !== 1 ? 's' : ''}`,
    });
  } catch (e) {
    console.error('Recurring invoice error:', e);
    res.status(500).json({ error: 'Failed to generate recurring invoices' });
  }
});

module.exports = router;
