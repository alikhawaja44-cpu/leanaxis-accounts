// server/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { firestoreHelpers } = require('../config/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET / - list users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await firestoreHelpers.getAll('users');
    const safe = users.map(({ password, ...u }) => u);
    res.json(safe);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

// POST / - create user (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check duplicate
    const users = await firestoreHelpers.getAll('users');
    const exists = users.find(u =>
      u.username?.toLowerCase() === username.toLowerCase() ||
      u.email?.toLowerCase() === email.toLowerCase()
    );
    if (exists) return res.status(409).json({ error: 'Username or email already exists' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await firestoreHelpers.create('users', {
      username, email, role: role || 'Viewer',
      password: hashed,
      addedBy: req.user.username,
    });

    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (e) { res.status(500).json({ error: 'Failed to create user' }); }
});

// PUT /:id - update user
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id; delete data.createdAt; delete data.addedBy;

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    } else {
      delete data.password;
    }

    data.lastEditedBy = req.user.username;
    const user = await firestoreHelpers.update('users', req.params.id, data);
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (e) { res.status(500).json({ error: 'Failed to update user' }); }
});

// DELETE /:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await firestoreHelpers.delete('users', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete user' }); }
});

module.exports = router;
