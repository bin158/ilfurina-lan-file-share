import express from 'express';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import multer from 'multer';
import { fileURLToPath } from 'url';
import db, { getSharedStoragePath } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Multer setup for file uploads
const uploadTmpDir = path.join(__dirname, '../data/uploads_tmp');
if (!fs.existsSync(uploadTmpDir)) {
  fs.mkdirSync(uploadTmpDir, { recursive: true });
}

const upload = multer({ 
  dest: uploadTmpDir, 
  limits: { fileSize: 50 * 1024 * 1024 * 1024 } // 50GB limit
});

// Helper: Normalize subpath and verify safety against dynamic root
function getSafePath(subPath = '') {
  const root = getSharedStoragePath();
  const normalized = path.normalize(subPath).replace(/^(\.\.[\/\\])+/, '');
  const absolute = path.resolve(root, normalized);
  if (!absolute.startsWith(root)) {
    throw new Error('Access denied: Path outside storage root');
  }
  return { absolute, relative: path.relative(root, absolute), root };
}

// Helper: Get unique path for auto-rename when duplicate file/folder exists
function getUniquePath(filePath) {
  if (!fs.existsSync(filePath)) return filePath;

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);

  let counter = 1;
  let newPath = path.join(dir, `${name} (${counter})${ext}`);

  while (fs.existsSync(newPath)) {
    counter++;
    newPath = path.join(dir, `${name} (${counter})${ext}`);
  }

  return newPath;
}

// Check user allowed path permission
function isPathAllowed(user, relativePath) {
  if (user.role === 'admin' || user.allowed_paths === '*') return true;
  const allowed = user.allowed_paths.split(',').map(p => p.trim());
  return allowed.some(p => relativePath === p || relativePath.startsWith(p + '/'));
}

// LIST FILES / DIRECTORY
router.get('/list', authenticateToken, (req, res) => {
  try {
    const subPath = req.query.path || '';
    const { absolute, relative, root } = getSafePath(subPath);

    if (!isPathAllowed(req.user, relative)) {
      return res.status(403).json({ error: 'You do not have permission to access this directory' });
    }

    if (!fs.existsSync(absolute)) {
      return res.status(404).json({ error: 'Directory or file does not exist' });
    }

    const stat = fs.statSync(absolute);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Target path is not a directory' });
    }

    const items = fs.readdirSync(absolute).map(filename => {
      const itemPath = path.join(absolute, filename);
      const itemRelative = path.relative(root, itemPath);
      let itemStat;
      try {
        itemStat = fs.statSync(itemPath);
      } catch (err) {
        return null;
      }

      const isDir = itemStat.isDirectory();
      const mimeType = isDir ? 'directory' : (mime.lookup(filename) || 'application/octet-stream');

      return {
        name: filename,
        path: itemRelative.replace(/\\/g, '/'),
        isDirectory: isDir,
        size: isDir ? 0 : itemStat.size,
        modifiedAt: itemStat.mtime,
        mimeType
      };
    }).filter(Boolean);

    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    res.json({
      currentPath: relative.replace(/\\/g, '/'),
      storageRoot: root,
      items
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DOWNLOAD FILE (and record download log)
router.get('/download', authenticateToken, (req, res) => {
  try {
    if (!req.user.can_download) {
      return res.status(403).json({ error: 'Download permission denied for your account' });
    }

    const subPath = req.query.path || '';
    const { absolute, relative } = getSafePath(subPath);

    if (!isPathAllowed(req.user, relative)) {
      return res.status(403).json({ error: 'Access denied to this file' });
    }

    if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileStat = fs.statSync(absolute);
    const fileName = path.basename(absolute);

    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (clientIp.includes('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    db.prepare(`
      INSERT INTO download_logs (user_id, username, file_path, file_name, file_size, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      req.user.username,
      relative.replace(/\\/g, '/'),
      fileName,
      fileStat.size,
      clientIp,
      req.headers['user-agent'] || 'Browser'
    );

    res.download(absolute, fileName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PREVIEW FILE
router.get('/preview', authenticateToken, (req, res) => {
  try {
    const subPath = req.query.path || '';
    const { absolute, relative } = getSafePath(subPath);

    if (!isPathAllowed(req.user, relative)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(absolute);
    const fileSize = stat.size;
    const contentType = mime.lookup(absolute) || 'application/octet-stream';

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(absolute, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Content-Disposition': 'inline'
      };
      res.writeHead(200, head);
      fs.createReadStream(absolute).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

import AdmZip from 'adm-zip';

// CHECK CONFLICTS BEFORE UPLOAD
router.post('/check-conflicts', authenticateToken, (req, res) => {
  try {
    const baseSubPath = req.query.path || req.body.path || '';
    const files = req.body.files || [];
    const autoUnzip = req.body.autoUnzip === true;

    const conflicts = [];

    if (autoUnzip) {
      for (const fileName of files) {
        const targetSub = path.join(baseSubPath, fileName);
        const { absolute } = getSafePath(targetSub);
        if (fs.existsSync(absolute)) {
          conflicts.push(fileName);
        }
      }
    } else {
      for (const relPath of files) {
        const targetSub = path.join(baseSubPath, relPath);
        const { absolute } = getSafePath(targetSub);
        if (fs.existsSync(absolute)) {
          conflicts.push(relPath);
        }
      }
    }

    res.json({ hasConflict: conflicts.length > 0, conflicts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPLOAD FILES AND FOLDERS (supporting directory tree & mobile zip extraction!)
router.post('/upload', authenticateToken, (req, res) => {
  if (!req.user.can_upload) {
    return res.status(403).json({ error: 'Upload permission denied for your account' });
  }

  upload.array('files')(req, res, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    try {
      const baseSubPath = req.query.path || '';
      const autoUnzip = req.body.autoUnzip === 'true' || req.query.unzip === 'true';
      const conflictAction = req.body.conflictAction || req.query.conflictAction || 'replace'; // 'replace' or 'rename'
      let relativePaths = [];

      if (req.body.relativePathsJson) {
        try {
          relativePaths = JSON.parse(req.body.relativePathsJson);
        } catch (e) {}
      } else if (req.body.relativePaths) {
        relativePaths = Array.isArray(req.body.relativePaths) ? req.body.relativePaths : [req.body.relativePaths];
      }

      const files = req.files || [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (autoUnzip && (file.originalname.endsWith('.zip') || file.mimetype.includes('zip'))) {
          // Unzip folder directly into target directory for mobile users
          const { absolute: targetAbsDir } = getSafePath(baseSubPath);
          const zip = new AdmZip(file.path);
          if (conflictAction === 'rename') {
            const zipEntries = zip.getEntries();
            zipEntries.forEach(entry => {
              let entryTargetPath = path.join(targetAbsDir, entry.entryName);
              if (!entry.isDirectory) {
                entryTargetPath = getUniquePath(entryTargetPath);
                const entryDir = path.dirname(entryTargetPath);
                if (!fs.existsSync(entryDir)) {
                  fs.mkdirSync(entryDir, { recursive: true });
                }
                fs.writeFileSync(entryTargetPath, entry.getData());
              } else {
                if (!fs.existsSync(entryTargetPath)) {
                  fs.mkdirSync(entryTargetPath, { recursive: true });
                }
              }
            });
          } else {
            zip.extractAllTo(targetAbsDir, true);
          }
          try { fs.unlinkSync(file.path); } catch (e) {}
          continue;
        }

        const relPath = (relativePaths && relativePaths[i]) ? relativePaths[i] : file.originalname;
        const targetSub = path.join(baseSubPath, relPath);
        let { absolute } = getSafePath(targetSub);

        if (conflictAction === 'rename') {
          absolute = getUniquePath(absolute);
        }

        const targetDir = path.dirname(absolute);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Copy then remove to safely handle cross-device / cross-volume moves in Docker & Linux
        fs.copyFileSync(file.path, absolute);
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {}
      }

      res.json({ message: 'Upload completed successfully', count: files.length });
    } catch (uploadErr) {
      res.status(500).json({ error: uploadErr.message });
    }
  });
});

// CREATE DIRECTORY
router.post('/mkdir', authenticateToken, (req, res) => {
  if (!req.user.can_upload) {
    return res.status(403).json({ error: 'Upload/create permission denied' });
  }

  const { path: subPath, folderName } = req.body;
  if (!folderName) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  try {
    const { absolute } = getSafePath(path.join(subPath || '', folderName));
    if (fs.existsSync(absolute)) {
      return res.status(400).json({ error: 'Folder already exists' });
    }
    fs.mkdirSync(absolute, { recursive: true });
    res.json({ message: 'Folder created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE FILE / DIRECTORY
router.delete('/', authenticateToken, (req, res) => {
  if (!req.user.can_delete) {
    return res.status(403).json({ error: 'Delete permission denied for your account' });
  }

  const subPath = req.query.path || '';
  if (!subPath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  try {
    const { absolute, relative } = getSafePath(subPath);

    if (!isPathAllowed(req.user, relative)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(absolute)) {
      return res.status(404).json({ error: 'File or directory not found' });
    }

    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      fs.rmSync(absolute, { recursive: true, force: true });
    } else {
      fs.unlinkSync(absolute);
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
