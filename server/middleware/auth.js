import jwt from 'jsonwebtoken';
import db from '../db.js';

export const JWT_SECRET = 'lan-share-secret-key-super-safe-2026';

export function authenticateToken(req, res, next) {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user data from DB
    const user = db.prepare('SELECT id, username, role, can_download, can_upload, can_delete, allowed_paths, is_active FROM users WHERE id = ?').get(decoded.id);

    if (!user || user.is_active !== 1) {
      return res.status(403).json({ error: 'Account disabled or user non-existent' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permission required' });
  }
  next();
}
