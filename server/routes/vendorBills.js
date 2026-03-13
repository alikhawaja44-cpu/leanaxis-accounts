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

// POST /:id/payment
router.post('/:id/payment', requireAuth, requireWrite, async (req, res) => {
  try {
    const { partialAmount, paymentAccount } = req.body;
    const bill = await firestoreHelpers.getById('vendor_bills', req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const paying = parseFloat(partialAmount) || 0;
    const alreadyPaid = parseFloat(bill.paidAmount) || 0;
    const newPaid = alreadyPaid + paying;
    const billNet = parseFloat(bill.amount) || 0;
    const newStatus = newPaid >= billNet ? 'Paid' : 'Partial';
    const date = new Date().toISOString().split('T')[0];

    const ops = [
      {
        type: 'update',
        collection: 'vendor_bills',
        id: bill.id,
        data: { paidAmount: newPaid, status: newStatus, lastEditedBy: req.user.username, lastEditedAt: new Date().toISOString() }
      }
    ];

    const recordData = {
      date,
      description: `Bill Payment: ${bill.vendor} (#${bill.billNumber || bill.id})`,
      addedBy: req.user.username,
      createdAt: new Date().toISOString(),
    };

    if (paymentAccount === 'bank') {
      ops.push({
        type: 'set',
        collection: 'bank_records',
        data: { ...recordData, amount: -paying, bank: 'Linked Payment', status: 'Cleared' }
      });
    } else {
      ops.push({
        type: 'set',
        collection: 'petty_cash',
        data: { ...recordData, cashOut: paying, cashIn: 0 }
      });
    }

    await firestoreHelpers.batchWrite(ops);
    res.json({ success: true, status: newStatus, paidAmount: newPaid });
  } catch (e) {
    console.error('Bill payment error:', e);
    res.status(500).json({ error: 'Failed to record bill payment' });
  }
});

module.exports = router;
