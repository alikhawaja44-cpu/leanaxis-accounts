// server/routes/vendorBills.js
const express = require('express');
const router = express.Router();
const { firestoreHelpers } = require('../config/firebase');
const { requireAuth, requireWrite, requireAdmin } = require('../middleware/auth');

// GET /
router.get('/', requireAuth, async (req, res) => {
  try {
    const bills = await firestoreHelpers.getAll('vendor_bills');
    res.json(bills);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch bills' }); }
});

// POST /
router.post('/', requireAuth, requireWrite, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    data.addedBy = req.user.username;
    const bill = await firestoreHelpers.create('vendor_bills', data);
    res.status(201).json(bill);
  } catch (e) { res.status(500).json({ error: 'Failed to create bill' }); }
});

// PUT /:id
router.put('/:id', requireAuth, requireWrite, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id; delete data.createdAt; delete data.addedBy;
    data.lastEditedBy = req.user.username;
    const bill = await firestoreHelpers.update('vendor_bills', req.params.id, data);
    res.json(bill);
  } catch (e) { res.status(500).json({ error: 'Failed to update bill' }); }
});

// DELETE /:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await firestoreHelpers.delete('vendor_bills', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete bill' }); }
});

// POST /:id/payment - record a payment against a bill, transactionally.
router.post('/:id/payment', requireAuth, requireWrite, async (req, res) => {
  const paying = parseFloat(req.body.partialAmount);
  const { paymentAccount } = req.body;

  if (!Number.isFinite(paying) || paying <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than 0.' });
  }

  try {
    const out = await firestoreHelpers.transactUpdate('vendor_bills', req.params.id, (bill) => {
      // `amount` is the net payable (bill amount less WHT). Fall back to the
      // gross figure for older records that only stored billAmount.
      const billNet = parseFloat(bill.amount);
      const net = Number.isFinite(billNet) && billNet > 0
        ? billNet
        : (parseFloat(bill.billAmount) || 0) - (parseFloat(bill.taxDeduction) || 0);

      const alreadyPaid = parseFloat(bill.paidAmount) || 0;
      const outstanding = net - alreadyPaid;

      if (!(net > 0)) {
        const err = new Error('This bill has no payable amount recorded.');
        err.code = 'NO_AMOUNT';
        throw err;
      }
      if (outstanding <= 0.01) {
        const err = new Error('This bill is already settled in full.');
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

      const newPaid = alreadyPaid + paying;
      const newStatus = newPaid >= net - 0.01 ? 'Paid' : 'Partial';
      const date = new Date().toISOString().split('T')[0];

      const recordData = {
        date,
        description: `Bill Payment: ${bill.vendor} (#${bill.billNumber || bill.id})`,
        addedBy: req.user.username,
        createdAt: new Date().toISOString(),
      };

      return {
        update: {
          paidAmount: newPaid,
          status: newStatus,
          lastEditedBy: req.user.username,
          lastEditedAt: new Date().toISOString(),
        },
        creates: [
          paymentAccount === 'bank'
            ? { collection: 'bank_records', data: { ...recordData, amount: -paying, bank: 'Linked Payment', status: 'Cleared' } }
            : { collection: 'petty_cash', data: { ...recordData, cashOut: paying, cashIn: 0 } },
        ],
        result: { status: newStatus, paidAmount: newPaid },
      };
    });

    res.json({ success: true, ...out });
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Bill not found' });
    if (['OVERPAYMENT', 'ALREADY_SETTLED', 'NO_AMOUNT'].includes(e.code)) {
      return res.status(400).json({ error: e.message });
    }
    console.error('Bill payment error:', e);
    res.status(500).json({ error: 'Failed to record bill payment' });
  }
});

module.exports = router;
