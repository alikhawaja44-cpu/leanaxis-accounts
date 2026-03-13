// server/routes/settings.js
const express = require('express');
const router = express.Router();
const { firestoreHelpers, getDb } = require('../config/firebase');
const { requireAuth, requireAdmin, requireWrite } = require('../middleware/auth');
const axios = require('axios');

const SETTINGS_DOC_ID = 'app_settings';
const SETTINGS_COLLECTION = 'settings';

// GET /settings - get app settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const doc = await firestoreHelpers.getById(SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    res.json(doc || {});
  } catch (e) { res.status(500).json({ error: 'Failed to fetch settings' }); }
});

// PUT /settings - update settings
router.put('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const data = { ...req.body };
    delete data.id;
    data.lastEditedBy = req.user.username;
    data.lastEditedAt = new Date().toISOString();

    await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).set(data, { merge: true });
    const updated = await firestoreHelpers.getById(SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    res.json(updated || data);
  } catch (e) { res.status(500).json({ error: 'Failed to update settings' }); }
});

// POST /settings/upload-logo - upload logo via ImgBB
router.post('/upload-logo', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { base64Image, imgbbKey } = req.body;
    if (!base64Image) return res.status(400).json({ error: 'No image data provided' });

    const apiKey = imgbbKey || process.env.IMGBB_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'ImgBB API key not configured' });

    const FormData = require('form-data');
    const form = new FormData();
    form.append('image', base64Image.replace(/^data:image\/[a-z]+;base64,/, ''));

    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      form,
      { headers: form.getHeaders() }
    );

    if (response.data.success) {
      res.json({ url: response.data.data.url });
    } else {
      res.status(400).json({ error: 'Upload failed' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Logo upload failed' });
  }
});

// GET /data/export - export all data as JSON backup
router.get('/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const collections = ['clients', 'vendors', 'petty_cash', 'expenses', 'salaries',
      'bank_records', 'invoices', 'quotations', 'vendor_bills'];
    
    const data = {};
    await Promise.all(collections.map(async (col) => {
      data[col] = await firestoreHelpers.getAll(col);
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 
      `attachment; filename="LeanAxis_Backup_${new Date().toISOString().split('T')[0]}.json"`
    );
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Export failed' }); }
});

// POST /data/import - import JSON backup
router.post('/import', requireAuth, requireAdmin, async (req, res) => {
  try {
    const importedData = req.body;
    const db = getDb();
    const batch = db.batch();
    let count = 0;

    const collections = {
      'clients': 'clients', 'vendors': 'vendors', 'petty_cash': 'petty_cash',
      'expenses': 'expenses', 'salaries': 'salaries', 'bank_records': 'bank_records',
      'invoices': 'invoices', 'quotations': 'quotations', 'vendor_bills': 'vendor_bills'
    };

    for (const [key, colName] of Object.entries(collections)) {
      const items = importedData[key] || importedData[colName];
      if (items && Array.isArray(items)) {
        items.forEach(item => {
          const { id, ...data } = item;
          const ref = db.collection(colName).doc();
          batch.set(ref, { ...data, importedAt: new Date().toISOString() });
          count++;
        });
      }
    }

    await batch.commit();
    res.json({ success: true, count, message: `Imported ${count} records successfully` });
  } catch (e) {
    console.error('Import error:', e);
    res.status(500).json({ error: 'Import failed. Check file format.' });
  }
});

// POST /generate-recurring-expenses
router.post('/generate-recurring-expenses', requireAuth, requireWrite, async (req, res) => {
  try {
    const expenses = await firestoreHelpers.getAll('expenses');
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const recurringExpenses = expenses.filter(e => e.isRecurring);
    let count = 0;

    for (const exp of recurringExpenses) {
      const alreadyGenerated = expenses.some(e =>
        e.description === exp.description && e.isRecurring &&
        e.date && e.date.startsWith(currentMonthKey) && e.id !== exp.id
      );
      if (!alreadyGenerated) {
        await firestoreHelpers.create('expenses', {
          ...exp, id: undefined, date: `${currentMonthKey}-01`,
          status: undefined, addedBy: req.user.username,
        });
        count++;
      }
    }
    res.json({ count, message: `Generated ${count} recurring expense${count !== 1 ? 's' : ''}` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate recurring expenses' });
  }
});

// POST /convert-quote - convert quotation to invoice
router.post('/convert-quote/:id', requireAuth, requireWrite, async (req, res) => {
  try {
    const quote = await firestoreHelpers.getById('quotations', req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quotation not found' });

    const { id, status, createdAt, ...invoiceData } = quote;
    const inv = await firestoreHelpers.create('invoices', {
      ...invoiceData, status: 'Draft', addedBy: req.user.username,
    });
    await firestoreHelpers.update('quotations', quote.id, { status: 'Converted' });

    res.json({ invoice: inv, message: 'Quotation converted to invoice successfully' });
  } catch (e) { res.status(500).json({ error: 'Conversion failed' }); }
});

module.exports = router;
