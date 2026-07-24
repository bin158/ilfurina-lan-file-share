import express from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import db, { getSharedStoragePath, setSharedStoragePath, getSystemAlert, setSystemAlert } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to get local IPv4 addresses
function getLanIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          ip: iface.address
        });
      }
    }
  }

  if (addresses.length === 0) {
    addresses.push({ interface: 'Localhost', ip: '127.0.0.1' });
  }

  return addresses;
}

// Calculate directory total size
function getFolderSize(dirPath) {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getFolderSize(filePath);
      } else {
        size += stat.size;
      }
    }
  } catch (e) {}
  return size;
}

// GET System & LAN Info
router.get('/lan-info', authenticateToken, async (req, res) => {
  try {
    const lanIps = getLanIps();
    const port = process.env.PORT || 3000;
    const primaryIp = lanIps[0]?.ip || '127.0.0.1';
    const accessUrl = `http://${primaryIp}:${port}`;
    const sharedPath = getSharedStoragePath();
    const systemAlert = getSystemAlert();

    // Generate QR Code for fast mobile pairing
    const qrCodeDataUrl = await QRCode.toDataURL(accessUrl, { margin: 1, width: 220 });

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const storageSize = getFolderSize(sharedPath);

    res.json({
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      lanIps,
      port,
      primaryIp,
      primaryUrl: accessUrl,
      qrCodeDataUrl,
      totalUsers,
      sharedStoragePath: sharedPath,
      storageSizeBytes: storageSize,
      uptimeSeconds: Math.floor(os.uptime()),
      systemAlert
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Shared Storage Directory (Admin only)
router.post('/config', authenticateToken, requireAdmin, (req, res) => {
  const { sharedStoragePath } = req.body;
  if (!sharedStoragePath) {
    return res.status(400).json({ error: 'sharedStoragePath is required' });
  }

  try {
    const success = setSharedStoragePath(sharedStoragePath);
    if (success) {
      res.json({ message: 'Shared storage path updated successfully', newPath: getSharedStoragePath() });
    } else {
      res.status(400).json({ error: 'Failed to set shared storage path' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post System Alert / Broadcast Notification (Admin only)
router.post('/alert', authenticateToken, requireAdmin, (req, res) => {
  const { message, type } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Alert message is required' });
  }

  const alertObj = {
    id: Date.now(),
    message: message.trim(),
    type: type || 'info', // 'info', 'warning', 'danger'
    createdAt: new Date().toISOString()
  };

  setSystemAlert(alertObj);
  res.json({ message: 'System alert broadcasted successfully', alert: alertObj });
});

// Clear System Alert (Admin only)
router.delete('/alert', authenticateToken, requireAdmin, (req, res) => {
  setSystemAlert(null);
  res.json({ message: 'System alert cleared successfully' });
});

export default router;
