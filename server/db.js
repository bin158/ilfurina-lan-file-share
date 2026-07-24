import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbFilePath = path.join(dbDir, 'db.json');

const defaultStorageDir = path.resolve(__dirname, 'storage');
if (!fs.existsSync(defaultStorageDir)) {
  fs.mkdirSync(defaultStorageDir, { recursive: true });
}

// In-memory data store with atomic file sync
let data = {
  users: [],
  download_logs: [],
  config: {
    shared_storage_path: defaultStorageDir,
    system_alert: null
  },
  userAutoInc: 1,
  logAutoInc: 1
};

// Load database from JSON if exists
if (fs.existsSync(dbFilePath)) {
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf8');
    const loaded = JSON.parse(raw);
    data = { ...data, ...loaded };
    if (!data.config) {
      data.config = { shared_storage_path: defaultStorageDir, system_alert: null };
    }
  } catch (e) {
    console.error('Failed to load db.json, creating new DB', e);
  }
}

function saveDb() {
  try {
    const tempPath = dbFilePath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, dbFilePath);
  } catch (err) {
    console.error('Error saving DB to disk:', err);
  }
}

export function initDb() {
  // Seed default admin and guest users if no users exist
  if (data.users.length === 0) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    data.users.push({
      id: data.userAutoInc++,
      username: 'admin',
      password_hash: adminHash,
      role: 'admin',
      can_download: 1,
      can_upload: 1,
      can_delete: 1,
      allowed_paths: '*',
      is_active: 1,
      created_at: new Date().toISOString()
    });

    const guestHash = bcrypt.hashSync('guest123', 10);
    data.users.push({
      id: data.userAutoInc++,
      username: 'guest',
      password_hash: guestHash,
      role: 'user',
      can_download: 1,
      can_upload: 0,
      can_delete: 0,
      allowed_paths: '*',
      is_active: 1,
      created_at: new Date().toISOString()
    });

    saveDb();
    console.log('✅ Database initialized with default accounts (admin/admin123, guest/guest123)');
  }
}

export function getSharedStoragePath() {
  let target = data.config?.shared_storage_path || defaultStorageDir;
  if (!fs.existsSync(target)) {
    try {
      fs.mkdirSync(target, { recursive: true });
    } catch (e) {
      target = defaultStorageDir;
    }
  }
  return path.resolve(target);
}

export function setSharedStoragePath(newPath) {
  if (!newPath) return false;
  const absPath = path.resolve(newPath);
  if (!fs.existsSync(absPath)) {
    fs.mkdirSync(absPath, { recursive: true });
  }
  data.config.shared_storage_path = absPath;
  saveDb();
  return true;
}

export function getSystemAlert() {
  return data.config?.system_alert || null;
}

export function setSystemAlert(alertObj) {
  data.config.system_alert = alertObj;
  saveDb();
}

// Emulated SQL query helper
const db = {
  exec(sql) {},

  prepare(sql) {
    const sqlTrimmed = sql.trim();

    return {
      get(...args) {
        if (sqlTrimmed.includes('SELECT COUNT(*) as count FROM users')) {
          if (sqlTrimmed.includes('WHERE')) {
            const activeOnly = sqlTrimmed.includes('is_active');
            const count = data.users.filter(u => !activeOnly || u.is_active === 1).length;
            return { count };
          }
          return { count: data.users.length };
        }

        if (sqlTrimmed.includes('FROM users WHERE username = ?')) {
          const username = args[0];
          return data.users.find(u => u.username === username) || null;
        }

        if (sqlTrimmed.includes('FROM users WHERE id = ?')) {
          const id = parseInt(args[0]);
          return data.users.find(u => u.id === id) || null;
        }

        if (sqlTrimmed.includes('COUNT(*) as count FROM download_logs')) {
          let filtered = [...data.download_logs];
          if (sqlTrimmed.includes('WHERE user_id =')) {
            const userId = parseInt(sqlTrimmed.split('WHERE user_id =')[1].trim());
            filtered = filtered.filter(l => l.user_id === userId);
          } else if (args.length > 0) {
            let argIdx = 0;
            if (sqlTrimmed.includes('user_id = ?')) {
              const uid = args[argIdx++];
              filtered = filtered.filter(l => l.user_id === uid);
            }
            if (sqlTrimmed.includes('username = ?')) {
              const uname = args[argIdx++];
              filtered = filtered.filter(l => l.username === uname);
            }
            if (sqlTrimmed.includes('LIKE')) {
              const term = args[argIdx++].replace(/%/g, '').toLowerCase();
              filtered = filtered.filter(l => 
                l.file_name.toLowerCase().includes(term) || 
                l.file_path.toLowerCase().includes(term) || 
                (l.ip_address && l.ip_address.toLowerCase().includes(term))
              );
            }
          }
          return { count: filtered.length };
        }

        if (sqlTrimmed.includes('SUM(file_size) as total FROM download_logs')) {
          let filtered = [...data.download_logs];
          if (sqlTrimmed.includes('WHERE user_id =')) {
            const userId = parseInt(sqlTrimmed.split('WHERE user_id =')[1].trim());
            filtered = filtered.filter(l => l.user_id === userId);
          }
          const total = filtered.reduce((acc, curr) => acc + (curr.file_size || 0), 0);
          return { total };
        }

        return null;
      },

      all(...args) {
        if (sqlTrimmed.includes('FROM users')) {
          return data.users.map(u => {
            const downloads = data.download_logs.filter(d => d.user_id === u.id).length;
            return {
              ...u,
              download_count: downloads
            };
          });
        }

        if (sqlTrimmed.includes('GROUP BY file_path') && sqlTrimmed.includes('ORDER BY count DESC')) {
          const map = {};
          data.download_logs.forEach(l => {
            if (!map[l.file_path]) {
              map[l.file_path] = { file_name: l.file_name, file_path: l.file_path, count: 0, total_bytes: 0 };
            }
            map[l.file_path].count++;
            map[l.file_path].total_bytes += (l.file_size || 0);
          });
          return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
        }

        if (sqlTrimmed.includes('GROUP BY username') && sqlTrimmed.includes('ORDER BY count DESC')) {
          const map = {};
          data.download_logs.forEach(l => {
            if (!map[l.username]) {
              map[l.username] = { username: l.username, count: 0, total_bytes: 0 };
            }
            map[l.username].count++;
            map[l.username].total_bytes += (l.file_size || 0);
          });
          return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
        }

        if (sqlTrimmed.includes('FROM download_logs')) {
          let list = [...data.download_logs];
          let argIdx = 0;

          if (sqlTrimmed.includes('user_id = ?')) {
            const uid = args[argIdx++];
            list = list.filter(l => l.user_id === uid);
          } else if (sqlTrimmed.includes('username = ?')) {
            const uname = args[argIdx++];
            list = list.filter(l => l.username === uname);
          }

          if (sqlTrimmed.includes('LIKE')) {
            const term = args[argIdx++].replace(/%/g, '').toLowerCase();
            argIdx += 2;
            list = list.filter(l => 
              l.file_name.toLowerCase().includes(term) || 
              l.file_path.toLowerCase().includes(term) || 
              (l.ip_address && l.ip_address.toLowerCase().includes(term))
            );
          }

          list.sort((a, b) => b.id - a.id);

          const limit = args[args.length - 2] || 20;
          const offset = args[args.length - 1] || 0;

          return list.slice(offset, offset + limit);
        }

        return [];
      },

      run(...args) {
        if (sqlTrimmed.startsWith('INSERT INTO users')) {
          const newUser = {
            id: data.userAutoInc++,
            username: args[0],
            password_hash: args[1],
            role: args[2] || 'user',
            can_download: args[3],
            can_upload: args[4],
            can_delete: args[5],
            allowed_paths: args[6] || '*',
            is_active: 1,
            created_at: new Date().toISOString()
          };
          data.users.push(newUser);
          saveDb();
          return { lastInsertRowid: newUser.id };
        }

        if (sqlTrimmed.startsWith('UPDATE users SET password_hash = ? WHERE id = ?')) {
          const user = data.users.find(u => u.id === parseInt(args[1]));
          if (user) {
            user.password_hash = args[0];
            saveDb();
          }
          return { changes: 1 };
        }

        if (sqlTrimmed.startsWith('UPDATE users')) {
          const userId = parseInt(args[args.length - 1]);
          const user = data.users.find(u => u.id === userId);
          if (user) {
            user.username = args[0] || user.username;
            if (args[1]) user.password_hash = args[1];
            user.role = args[2] || user.role;
            user.can_download = args[3] !== undefined ? args[3] : user.can_download;
            user.can_upload = args[4] !== undefined ? args[4] : user.can_upload;
            user.can_delete = args[5] !== undefined ? args[5] : user.can_delete;
            user.allowed_paths = args[6] || user.allowed_paths;
            user.is_active = args[7] !== undefined ? args[7] : user.is_active;
            saveDb();
          }
          return { changes: 1 };
        }

        if (sqlTrimmed.startsWith('DELETE FROM users WHERE id = ?')) {
          const id = parseInt(args[0]);
          data.users = data.users.filter(u => u.id !== id);
          saveDb();
          return { changes: 1 };
        }

        if (sqlTrimmed.startsWith('INSERT INTO download_logs')) {
          const newLog = {
            id: data.logAutoInc++,
            user_id: args[0],
            username: args[1],
            file_path: args[2],
            file_name: args[3],
            file_size: args[4],
            ip_address: args[5],
            user_agent: args[6],
            downloaded_at: new Date().toISOString()
          };
          data.download_logs.push(newLog);
          saveDb();
          return { lastInsertRowid: newLog.id };
        }

        if (sqlTrimmed.startsWith('DELETE FROM download_logs')) {
          data.download_logs = [];
          saveDb();
          return { changes: 1 };
        }

        return { changes: 0 };
      }
    };
  }
};

export default db;
