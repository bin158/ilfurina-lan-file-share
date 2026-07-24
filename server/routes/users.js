import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Require Admin for all user management routes
router.use(authenticateToken, requireAdmin);

// List all users with download counts
router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, u.can_download, u.can_upload, u.can_delete, u.allowed_paths, u.is_active, u.created_at,
           COUNT(d.id) as download_count
    FROM users u
    LEFT JOIN download_logs d ON u.id = d.user_id
    GROUP BY u.id
    ORDER BY u.id ASC
  `).all().map(u => ({
    ...u,
    can_download: Boolean(u.can_download),
    can_upload: Boolean(u.can_upload),
    can_delete: Boolean(u.can_delete),
    is_active: Boolean(u.is_active)
  }));

  res.json(users);
});

// Add new user
router.post('/', (req, res) => {
  const { username, password, role, can_download, can_upload, can_delete, allowed_paths } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, can_download, can_upload, can_delete, allowed_paths)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    username,
    password_hash,
    role || 'user',
    can_download !== false ? 1 : 0,
    can_upload ? 1 : 0,
    can_delete ? 1 : 0,
    allowed_paths || '*'
  );

  res.status(201).json({ message: 'User created successfully', id: result.lastInsertRowid });
});

// Update user settings / permissions
router.put('/:id', (req, res) => {
  const userId = req.params.id;
  const { username, password, role, can_download, can_upload, can_delete, allowed_paths, is_active } = req.body;

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  let password_hash = targetUser.password_hash;
  if (password && password.trim() !== '') {
    password_hash = bcrypt.hashSync(password, 10);
  }

  db.prepare(`
    UPDATE users
    SET username = ?, password_hash = ?, role = ?, can_download = ?, can_upload = ?, can_delete = ?, allowed_paths = ?, is_active = ?
    WHERE id = ?
  `).run(
    username || targetUser.username,
    password_hash,
    role || targetUser.role,
    can_download !== undefined ? (can_download ? 1 : 0) : targetUser.can_download,
    can_upload !== undefined ? (can_upload ? 1 : 0) : targetUser.can_upload,
    can_delete !== undefined ? (can_delete ? 1 : 0) : targetUser.can_delete,
    allowed_paths || targetUser.allowed_paths,
    is_active !== undefined ? (is_active ? 1 : 0) : targetUser.is_active,
    userId
  );

  res.json({ message: 'User updated successfully' });
});

// Delete user
router.delete('/:id', (req, res) => {
  const userId = parseInt(req.params.id);

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ message: 'User deleted successfully' });
});

export default router;
