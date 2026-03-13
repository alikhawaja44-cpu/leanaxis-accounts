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
  } catch (e) { res.status(500).json({ error: 'Failed to update invoice' }); }
});

// DELETE /:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await firestoreHelpers.delete('invoices', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete invoice' }); }
});

// POST /:id/payment - record payment (updates invoice + creates bank/petty entry)
router.post('/:id/payment', requireAuth, requireWrite, async (req, res) => {
  try {
    const { partialAmount, clientWHT, paymentAccount } = req.body;
    const inv = await firestoreHelpers.getById('invoices', req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const { total } = calcTotal(inv.items, inv.taxRate, inv.discount);
    const paying = parseFloat(partialAmount) || 0;
    const wht = parseFloat(clientWHT) || 0;
    const netReceived = paying - wht;
    const alreadyReceived = parseFloat(inv.amountReceived) || 0;
    const totalReceived = alreadyReceived + netReceived;
    const newStatus = totalReceived >= total ? 'Paid' : 'Partial';
    const date = new Date().toISOString().split('T')[0];

    const ops = [
      {
        type: 'update',
        collection: 'invoices',
        id: inv.id,
        data: {
          status: newStatus,
          whtDeducted: (parseFloat(inv.whtDeducted) || 0) + wht,
          amountReceived: totalReceived,
          paidDate: newStatus === 'Paid' ? date : (inv.paidDate || null),
          lastEditedBy: req.user.username,
          lastEditedAt: new Date().toISOString(),
        }
      }
    ];

    const recordData = {
      date,
      description: `Inv Payment: ${inv.client} (#${inv.invoiceNumber || inv.id})`,
      addedBy: req.user.username,
      createdAt: new Date().toISOString(),
    };

    const newDocRef = () => ({ type: 'set', id: undefined });

    if (paymentAccount === 'bank') {
      ops.push({
        type: 'set',
        collection: 'bank_records',
        data: { ...recordData, amount: netReceived, bank: 'Linked Payment', status: 'Cleared' }
      });
    } else {
      ops.push({
        type: 'set',
        collection: 'petty_cash',
        data: { ...recordData, cashIn: netReceived, cashOut: 0 }
      });
    }

    await firestoreHelpers.batchWrite(ops);
    res.json({ success: true, status: newStatus, amountReceived: totalReceived });
  } catch (e) {
    console.error('Payment error:', e);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// POST /generate-recurring - generate recurring invoices
router.post('/generate-recurring', requireAuth, requireWrite, async (req, res) => {
  try {
    const [clients, invoices] = await Promise.all([
      firestoreHelpers.getAll('clients'),
      firestoreHelpers.getAll('invoices'),
    ]);
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    let count = 0;

    for (const client of clients) {
      if (parseFloat(client.retainerAmount) > 0) {
        const exists = invoices.some(inv =>
          inv.client === client.name &&
          new Date(inv.date).toLocaleString('default', { month: 'long', year: 'numeric' }) === currentMonth
        );
        if (!exists) {
          await firestoreHelpers.create('invoices', {
            client: client.name,
            date: new Date().toISOString().split('T')[0],
            items: [{ desc: `Monthly Retainer - ${currentMonth}`, qty: 1, rate: parseFloat(client.retainerAmount) }],
            taxRate: 0, status: 'Draft',
            addedBy: req.user.username,
          });
          count++;
        }
      }
    }
    res.json({ count, message: `Generated ${count} recurring invoice${count !== 1 ? 's' : ''}` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate recurring invoices' });
  }
});

module.exports = router;
