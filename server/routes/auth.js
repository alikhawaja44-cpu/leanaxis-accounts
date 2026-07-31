// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { firestoreHelpers } = require('../config/firebase');
const { generateToken, requireAuth } = require('../middleware/auth');

// Hash a password
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// Verify a password (supports both bcrypt and legacy SHA-256)
async function verifyPassword(input, stored) {
  if (typeof stored !== 'string' || !stored) return false;

  // Current scheme: bcrypt
  if (stored.startsWith('$2')) {
    try { return await bcrypt.compare(input, stored); } catch (e) { return false; }
  }

  // Legacy scheme: SHA-256 hex from the pre-2.0 client. Only accepted when the
  // stored value actually looks like a SHA-256 digest — the previous
  // `input === stored` fallback meant a plaintext password in the database
  // would authenticate as-is.
  if (/^[0-9a-f]{64}$/i.test(stored)) {
    const hexHash = require('crypto').createHash('sha256').update(input, 'utf8').digest('hex');
    // Constant-time compare to avoid leaking the digest byte by byte.
    const a = Buffer.from(hexHash, 'utf8');
    const b = Buffer.from(stored.toLowerCase(), 'utf8');
    return a.length === b.length && require('crypto').timingSafeEqual(a, b);
  }

  return false;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const loginLower = login.trim().toLowerCase();
    
    // Find user by username or email
    const users = await firestoreHelpers.getAll('users');
    const user = users.find(u =>
      (u.username || '').toLowerCase() === loginLower ||
      (u.email || '').toLowerCase() === loginLower
    );

    // Handle first-time setup (no users in DB)
    if (!user && users.length === 0 && login === 'admin' && password === 'admin123') {
      const hashedPwd = await hashPassword('admin123');
      const newAdmin = await firestoreHelpers.create('users', {
        username: 'admin',
        password: hashedPwd,
        email: 'admin@leanaxis.com',
        role: 'Admin',
      });
      const token = generateToken(newAdmin);
      return res.json({ 
        token, 
        user: { id: newAdmin.id, username: newAdmin.username, email: newAdmin.email, role: newAdmin.role }
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Upgrade legacy SHA-256 password to bcrypt
    if (user.password && !user.password.startsWith('$2')) {
      const upgraded = await hashPassword(password);
      await firestoreHelpers.update('users', user.id, { password: upgraded });
    }

    const token = generateToken(user);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// POST /api/auth/logout (client-side only, but here for completeness)
router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me - get current user info
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await firestoreHelpers.getById('users', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8
        || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters and contain a letter and a number.',
      });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from the current one.' });
    }

    // A token can outlive the account it belongs to; without this the next line
    // dereferenced null and returned a 500.
    const user = await firestoreHelpers.getById('users', req.user.id);
    if (!user) return res.status(404).json({ error: 'Account no longer exists. Please log in again.' });

    const isValid = await verifyPassword(currentPassword, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await hashPassword(newPassword);
    await firestoreHelpers.update('users', req.user.id, { password: hashed });
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
