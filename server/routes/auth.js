import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// User Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (user.is_active !== 1) {
    return res.status(403).json({ error: 'Account has been disabled by admin' });
  }

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      can_download: Boolean(user.can_download),
      can_upload: Boolean(user.can_upload),
      can_delete: Boolean(user.can_delete),
      allowed_paths: user.allowed_paths
    }
  });
});

// Get Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      can_download: Boolean(req.user.can_download),
      can_upload: Boolean(req.user.can_upload),
      can_delete: Boolean(req.user.can_delete),
      allowed_paths: req.user.allowed_paths
    }
  });
});

// Change Password
router.post('/change-password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

  res.json({ message: 'Password updated successfully' });
});

export default router;
