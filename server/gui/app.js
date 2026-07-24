const { ipcRenderer, clipboard } = require('electron');

let currentPort = 3000;
let primaryLanIp = '127.0.0.1';
let cachedLogsData = [];
let currentGuiLang = localStorage.getItem('lan_share_lang') || 'zh';

function tGui(key, replacements = {}) {
  if (typeof guiTranslations === 'undefined') return key;
  const dict = guiTranslations[currentGuiLang] || guiTranslations.zh;
  let str = dict[key] || key;
  Object.keys(replacements).forEach(k => {
    str = str.replace(new RegExp(`{{${k}}}`, 'g'), replacements[k]);
  });
  return str;
}

function initThemeSelector() {
  const select = document.getElementById('guiThemeSelect');
  if (select && typeof DAISY_THEMES !== 'undefined') {
    const currentTheme = localStorage.getItem('lan_share_theme') || 'dark';
    select.innerHTML = DAISY_THEMES.map(th => 
      `<option value="${th}" ${th === currentTheme ? 'selected' : ''}>🎨 ${th.charAt(0).toUpperCase() + th.slice(1)}</option>`
    ).join('');
    document.documentElement.setAttribute('data-theme', currentTheme);
  }
  const langSelect = document.getElementById('guiLangSelect');
  if (langSelect) {
    langSelect.value = currentGuiLang;
  }
}

window.changeGuiTheme = function(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('lan_share_theme', theme);
};

window.changeGuiLang = function(lang) {
  currentGuiLang = lang;
  localStorage.setItem('lan_share_lang', lang);
  updateGuiTexts();
};

function updateGuiTexts() {
  if (typeof guiTranslations === 'undefined') return;
  const dict = guiTranslations[currentGuiLang] || guiTranslations.zh;
  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    if (dict[key]) {
      elem.textContent = dict[key];
    }
  });

  // Re-render dynamic elements
  fetchUsers();
  fetchLogs();
  fetchLanInfo();
}

document.addEventListener('DOMContentLoaded', () => {
  initThemeSelector();
  updateGuiTexts();
});

// Tab Switching
window.switchTab = function(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

  if (event && event.target) {
    event.target.classList.add('active');
  }
  document.getElementById(`tab-${tabName}`).classList.add('active');

  if (tabName === 'users') fetchUsers();
  if (tabName === 'logs') fetchLogs();
};

// Console logger
const consoleElem = document.getElementById('terminalConsole');
function appendLog(text, isError = false) {
  const line = document.createElement('div');
  line.style.color = isError ? '#f43f5e' : '#38bdf8';
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  consoleElem.appendChild(line);
  consoleElem.scrollTop = consoleElem.scrollHeight;
}

window.clearConsole = function() {
  consoleElem.innerHTML = '';
};

window.copyConsoleLogs = function() {
  const text = consoleElem.innerText;
  clipboard.writeText(text);
  alert(tGui('consoleCopied'));
};

window.copyTableLogs = function() {
  if (cachedLogsData.length === 0) return;
  const text = cachedLogsData.map(l => 
    `[${new Date(l.downloaded_at).toLocaleString()}] User: ${l.username} | File: ${l.file_name} (${l.file_path}) | Size: ${l.file_size}B | IP: ${l.ip_address}`
  ).join('\n');
  clipboard.writeText(text);
  alert(tGui('logsCopied'));
};

// Server Status IPC Listeners
ipcRenderer.on('server-status', (event, data) => {
  const pill = document.getElementById('statusPill');
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');

  if (data.running) {
    currentPort = data.port || 3000;
    pill.className = 'status-pill online';
    dot.className = 'dot online';
    text.textContent = tGui('serverOnlineUrl', { ip: primaryLanIp, port: currentPort });
    btnStart.style.display = 'none';
    btnStop.style.display = 'inline-flex';
    fetchLanInfo();
  } else {
    pill.className = 'status-pill offline';
    dot.className = 'dot offline';
    text.textContent = tGui('serverOffline');
    btnStart.style.display = 'inline-flex';
    btnStop.style.display = 'none';
  }
});

ipcRenderer.on('server-log', (event, data) => {
  appendLog(data.text, data.type === 'stderr');
});

// Server Controls
window.startServer = function() {
  const port = parseInt(document.getElementById('portInput').value) || 3000;
  ipcRenderer.send('start-server', port);
};

window.stopServer = function() {
  ipcRenderer.send('stop-server');
};

window.changePort = function() {
  stopServer();
  setTimeout(() => startServer(), 1000);
};

window.openStorageFolder = function() {
  ipcRenderer.send('open-storage-folder');
};

// Fetch System LAN info and update UI
async function fetchLanInfo() {
  try {
    const authRes = await fetch(`http://localhost:${currentPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const auth = await authRes.json();
    if (!auth.token) return;

    const sysRes = await fetch(`http://localhost:${currentPort}/api/system/lan-info`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    const info = await sysRes.json();

    primaryLanIp = info.primaryIp || '127.0.0.1';
    document.getElementById('statusText').textContent = tGui('serverOnlineUrl', { ip: primaryLanIp, port: info.port });

    // Custom folder path input
    const sharedInput = document.getElementById('sharedFolderInput');
    if (sharedInput && info.sharedStoragePath) {
      sharedInput.value = info.sharedStoragePath;
    }

    const lanContainer = document.getElementById('lanIpList');
    lanContainer.innerHTML = info.lanIps.map(item => `
      <div style="background: rgba(255,255,255,0.04); padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 0.4rem; font-size: 0.85rem;">
        <div style="color: var(--text-muted); font-size: 0.72rem;">${tGui('nicLabel')}: ${item.interface}</div>
        <div style="color: #38bdf8; font-weight: 600; font-family: monospace;">http://${item.ip}:${info.port}</div>
      </div>
    `).join('');

    const qrImg = document.getElementById('qrCodeImg');
    if (info.qrCodeDataUrl) {
      qrImg.src = info.qrCodeDataUrl;
      qrImg.style.display = 'inline-block';
    }
  } catch (e) {
    console.error('Fetch LAN info error:', e);
  }
}

// Update Custom Shared Folder
window.updateSharedFolder = async function() {
  const newPath = document.getElementById('sharedFolderInput').value.trim();
  if (!newPath) return;

  try {
    const authRes = await fetch(`http://localhost:${currentPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const auth = await authRes.json();

    const res = await fetch(`http://localhost:${currentPort}/api/system/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ sharedStoragePath: newPath })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    alert(tGui('pathUpdatedSuccess', { path: data.newPath }));
    fetchLanInfo();
  } catch (e) {
    alert(tGui('pathUpdateError') + e.message);
  }
};

// Fetch Users in GUI
let cachedUsers = [];
async function fetchUsers() {
  try {
    const authRes = await fetch(`http://localhost:${currentPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const auth = await authRes.json();

    const res = await fetch(`http://localhost:${currentPort}/api/users`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    cachedUsers = await res.json();

    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = cachedUsers.map(u => `
      <tr>
        <td>#${u.id}</td>
        <td><b>${u.username}</b></td>
        <td><span style="color: ${u.role === 'admin' ? '#fb7185' : '#34d399'}; font-weight: 600;">${u.role}</span></td>
        <td>${u.can_download ? '✓' : '✗'}</td>
        <td>${u.can_upload ? '✓' : '✗'}</td>
        <td>${u.can_delete ? '✓' : '✗'}</td>
        <td style="font-family: monospace; font-size: 0.78rem;">${u.allowed_paths}</td>
        <td><b>${u.download_count}</b> ${tGui('timesUnit')}</td>
        <td>${u.is_active ? `<span style="color:#10b981">${tGui('active')}</span>` : `<span style="color:#f43f5e">${tGui('banned')}</span>`}</td>
        <td style="text-align:right;">
          <button className="btn btn-secondary" style="font-size:0.75rem; padding: 0.2rem 0.5rem;" onclick="openEditUserModal(${u.id})">${tGui('edit')}</button>
          <button className="btn btn-secondary" style="font-size:0.75rem; padding: 0.2rem 0.5rem; color:#f43f5e;" onclick="deleteUserGui(${u.id}, '${u.username}')">${tGui('delete')}</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Fetch users error:', e);
  }
}

// User Modal Handlers
window.showAddUserModal = function() {
  document.getElementById('modalUserTitle').textContent = tGui('addUserTitle');
  document.getElementById('editUserId').value = '';
  document.getElementById('editUsername').value = '';
  document.getElementById('editPassword').value = '';
  document.getElementById('editRole').value = 'user';
  document.getElementById('editCanDownload').checked = true;
  document.getElementById('editCanUpload').checked = false;
  document.getElementById('editCanDelete').checked = false;
  document.getElementById('editAllowedPaths').value = '*';
  document.getElementById('userModal').style.display = 'flex';
};

window.openEditUserModal = function(id) {
  const u = cachedUsers.find(user => user.id === id);
  if (!u) return;

  document.getElementById('modalUserTitle').textContent = `${tGui('editUserTitle')}: ${u.username}`;
  document.getElementById('editUserId').value = u.id;
  document.getElementById('editUsername').value = u.username;
  document.getElementById('editPassword').value = '';
  document.getElementById('editRole').value = u.role;
  document.getElementById('editCanDownload').checked = u.can_download;
  document.getElementById('editCanUpload').checked = u.can_upload;
  document.getElementById('editCanDelete').checked = u.can_delete;
  document.getElementById('editAllowedPaths').value = u.allowed_paths;
  document.getElementById('userModal').style.display = 'flex';
};

window.closeUserModal = function() {
  document.getElementById('userModal').style.display = 'none';
};

window.saveUserGui = async function() {
  const id = document.getElementById('editUserId').value;
  const username = document.getElementById('editUsername').value.trim();
  const password = document.getElementById('editPassword').value;
  const role = document.getElementById('editRole').value;
  const can_download = document.getElementById('editCanDownload').checked;
  const can_upload = document.getElementById('editCanUpload').checked;
  const can_delete = document.getElementById('editCanDelete').checked;
  const allowed_paths = document.getElementById('editAllowedPaths').value.trim();

  if (!username) {
    alert(tGui('usernameRequired'));
    return;
  }

  try {
    const authRes = await fetch(`http://localhost:${currentPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const auth = await authRes.json();

    const payload = { username, role, can_download, can_upload, can_delete, allowed_paths };
    if (password) payload.password = password;

    let res;
    if (id) {
      // Edit User
      res = await fetch(`http://localhost:${currentPort}/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload)
      });
    } else {
      // Add User
      payload.password = password || '123456';
      res = await fetch(`http://localhost:${currentPort}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || tGui('saveUserFailed'));

    closeUserModal();
    fetchUsers();
  } catch (e) {
    alert(e.message);
  }
};

// Delete User GUI
window.deleteUserGui = async function(id, username) {
  if (!confirm(tGui('confirmDeleteUser', { username }))) return;
  try {
    const authRes = await fetch(`http://localhost:${currentPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const auth = await authRes.json();

    const res = await fetch(`http://localhost:${currentPort}/api/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || tGui('deleteFailed'));
    }
    fetchUsers();
  } catch (e) {
    alert(e.message);
  }
};

// Fetch Logs in GUI
async function fetchLogs() {
  try {
    const authRes = await fetch(`http://localhost:${currentPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const auth = await authRes.json();

    const res = await fetch(`http://localhost:${currentPort}/api/logs?limit=50`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    const data = await res.json();
    cachedLogsData = data.logs || [];

    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = cachedLogsData.map(l => `
      <tr>
        <td>#${l.id}</td>
        <td><b style="color:#a5b4fc;">${l.username}</b></td>
        <td>${l.file_name}</td>
        <td style="font-size:0.78rem; color:var(--text-muted);">${l.file_path}</td>
        <td>${l.file_size} B</td>
        <td style="color:#06b6d4; font-family:monospace;">${l.ip_address}</td>
        <td style="font-size:0.78rem; color:var(--text-muted);">${new Date(l.downloaded_at).toLocaleString()}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Fetch logs error:', e);
  }
}

// Clear Logs in GUI
window.clearServerLogs = async function() {
  if (!confirm(tGui('confirmClearLogs'))) return;
  try {
    const authRes = await fetch(`http://localhost:${currentPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const auth = await authRes.json();

    await fetch(`http://localhost:${currentPort}/api/logs`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    fetchLogs();
  } catch (e) {
    alert(e.message);
  }
};

// Send Broadcast Notification
window.sendBroadcastGui = async function() {
  const msg = document.getElementById('broadcastInput').value.trim();
  if (!msg) {
    alert(tGui('broadcastPrompt'));
    return;
  }

  try {
    const authRes = await fetch(`http://localhost:${currentPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const auth = await authRes.json();

    const res = await fetch(`http://localhost:${currentPort}/api/system/alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ message: msg, type: 'info' })
    });
    if (!res.ok) throw new Error('Broadcast failed');

    alert(tGui('broadcastSuccessMsg'));
  } catch (e) {
    alert(e.message);
  }
};

window.clearBroadcastGui = async function() {
  try {
    const authRes = await fetch(`http://localhost:${currentPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const auth = await authRes.json();

    await fetch(`http://localhost:${currentPort}/api/system/alert`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    document.getElementById('broadcastInput').value = '';
    alert(tGui('broadcastRevokedMsg'));
  } catch (e) {
    alert(e.message);
  }
};

// Request initial status
ipcRenderer.send('get-server-status');
