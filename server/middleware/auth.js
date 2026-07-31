// server/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Never fall back to a hardcoded secret in production: anyone who has read the
// source could forge an admin token.
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET is not set. Refusing to start in production.');
    process.exit(1);
  }
  console.warn('WARNING: JWT_SECRET is not set — using an ephemeral development secret. All sessions end on restart.');
}

const SECRET = JWT_SECRET || require('crypto').randomBytes(48).toString('hex');

// Generate a JWT token for a user
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
  
  return jwt.sign(payload, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Middleware: verify JWT and attach user to request
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please include a valid Bearer token' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', message: 'Please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token', message: 'Authentication failed' });
  }
}

// Middleware: require Admin role
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Admin role required for this action' 
    });
  }
  next();
}

// Middleware: require Admin or Editor role
function requireWrite(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!['Admin', 'Editor'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Write permission required' 
    });
  }
  next();
}

module.exports = { generateToken, requireAuth, requireAdmin, requireWrite };
