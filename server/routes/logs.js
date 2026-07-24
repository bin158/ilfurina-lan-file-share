import express from 'express';
import db from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Require login for viewing logs
router.use(authenticateToken);

// Get download logs with filters and pagination
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const username = req.query.username;
  const search = req.query.search;

  let whereClauses = [];
  let params = [];

  // Non-admin users can only view their own download logs
  if (req.user.role !== 'admin') {
    whereClauses.push('user_id = ?');
    params.push(req.user.id);
  } else if (username) {
    whereClauses.push('username = ?');
    params.push(username);
  }

  if (search) {
    whereClauses.push('(file_name LIKE ? OR file_path LIKE ? OR ip_address LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const totalRes = db.prepare(`SELECT COUNT(*) as count FROM download_logs ${whereSql}`).get(...params);
  const totalCount = totalRes?.count || 0;

  const logs = db.prepare(`
    SELECT id, user_id, username, file_path, file_name, file_size, ip_address, user_agent, downloaded_at
    FROM download_logs
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) || [];

  res.json({
    page,
    limit,
    totalCount,
    totalPages: Math.ceil(totalCount / limit) || 1,
    logs
  });
});

// Download statistics & summary dashboard (Admin only or user summary)
router.get('/stats', (req, res) => {
  let userFilter = req.user.role !== 'admin' ? `WHERE user_id = ${req.user.id}` : '';

  const totalDownloadsRes = db.prepare(`SELECT COUNT(*) as count FROM download_logs ${userFilter}`).get();
  const totalDownloads = totalDownloadsRes?.count || 0;

  const totalVolumeRes = db.prepare(`SELECT COALESCE(SUM(file_size), 0) as total FROM download_logs ${userFilter}`).get();
  const totalVolume = totalVolumeRes?.total || 0;

  // Top 5 downloaded files
  const topFiles = db.prepare(`
    SELECT file_name, file_path, COUNT(*) as count, SUM(file_size) as total_bytes
    FROM download_logs
    ${userFilter}
    GROUP BY file_path
    ORDER BY count DESC
    LIMIT 5
  `).all() || [];

  // Top 5 downloaders (Admin view)
  let topUsers = [];
  if (req.user.role === 'admin') {
    topUsers = db.prepare(`
      SELECT username, COUNT(*) as count, SUM(file_size) as total_bytes
      FROM download_logs
      GROUP BY username
      ORDER BY count DESC
      LIMIT 5
    `).all() || [];
  }

  res.json({
    totalDownloads,
    totalVolume,
    topFiles,
    topUsers
  });
});

// Clear logs (Admin only)
router.delete('/', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM download_logs').run();
  res.json({ message: 'Download logs cleared successfully' });
});

export default router;
