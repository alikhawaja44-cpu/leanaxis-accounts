// server/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { firestoreHelpers } = require('../config/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const VALID_ROLES = ['Admin', 'Editor', 'Viewer'];

/**
 * Rejects weak passwords. An accounting system holding payroll and CNICs
 * should not accept "123".
 */
function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    return 'Password must contain at least one letter and one number.';
  }
  if (/^(password|admin|12345678|qwerty)/i.test(pw)) {
    return 'That password is too easily guessed. Please choose another.';
  }
  return null;
}

const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ''));

/**
 * Guards against removing the final Admin. Without this an administrator can
 * demote or delete themselves and permanently lock every user out of the
 * system — there is no recovery path short of editing the database by hand.
 */
async function wouldRemoveLastAdmin(targetId, newRole) {
  const users = await firestoreHelpers.getAll('users');
  const admins = users.filter((u) => u.role === 'Admin');
  const targetIsAdmin = admins.some((u) => u.id === targetId);
  if (!targetIsAdmin) return false;
  if (newRole === 'Admin') return false;
  return admins.length <= 1;
}

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
    if (!isEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

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

    if (data.email && !isEmail(data.email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (data.role && !VALID_ROLES.includes(data.role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    if (data.role && await wouldRemoveLastAdmin(req.params.id, data.role)) {
      return res.status(400).json({
        error: 'This is the only Admin account. Promote another user to Admin before changing this role.',
      });
    }

    if (data.password) {
      const pwError = validatePassword(data.password);
      if (pwError) return res.status(400).json({ error: pwError });
      data.password = await bcrypt.hash(data.password, 12);
    } else {
      delete data.password;
    }

    data.lastEditedBy = req.user.username;
    const user = await firestoreHelpers.update('users', req.params.id, data);
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    if (await wouldRemoveLastAdmin(req.params.id, null)) {
      return res.status(400).json({
        error: 'This is the only Admin account and cannot be deleted. Promote another user to Admin first.',
      });
    }
    await firestoreHelpers.delete('users', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete user' }); }
});

module.exports = router;
