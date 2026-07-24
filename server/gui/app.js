const { ipcRenderer, clipboard } = require('electron');

let currentPort = 3000;
let primaryLanIp = '127.0.0.1';
let cachedLogsData = [];

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
  alert('控制台日志已复制到剪贴板！');
};

window.copyTableLogs = function() {
  if (cachedLogsData.length === 0) return;
  const text = cachedLogsData.map(l => 
    `[${new Date(l.downloaded_at).toLocaleString()}] User: ${l.username} | File: ${l.file_name} (${l.file_path}) | Size: ${l.file_size}B | IP: ${l.ip_address}`
  ).join('\n');
  clipboard.writeText(text);
  alert('下载日志列表已复制到剪贴板！');
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
    text.textContent = `服务器在线 (http://${primaryLanIp}:${currentPort})`;
    btnStart.style.display = 'none';
    btnStop.style.display = 'inline-flex';
    fetchLanInfo();
  } else {
    pill.className = 'status-pill offline';
    dot.className = 'dot offline';
    text.textContent = '服务器已停止';
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
    document.getElementById('statusText').textContent = `服务器在线 (http://${primaryLanIp}:${info.port})`;

    // Custom folder path input
    const sharedInput = document.getElementById('sharedFolderInput');
    if (sharedInput && info.sharedStoragePath) {
      sharedInput.value = info.sharedStoragePath;
    }

    const lanContainer = document.getElementById('lanIpList');
    lanContainer.innerHTML = info.lanIps.map(item => `
      <div style="background: rgba(255,255,255,0.04); padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 0.4rem; font-size: 0.85rem;">
        <div style="color: var(--text-muted); font-size: 0.72rem;">网卡: ${item.interface}</div>
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
    if (!res.ok) throw new Error(data.error || '失败');

    alert(`自定义共享文件夹路径已成功修改为:\n${data.newPath}`);
    fetchLanInfo();
  } catch (e) {
    alert('修改共享文件夹路径失败: ' + e.message);
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
        <td><b>${u.download_count}</b> 次</td>
        <td>${u.is_active ? '<span style="color:#10b981">正常</span>' : '<span style="color:#f43f5e">禁用</span>'}</td>
        <td style="text-align:right;">
          <button className="btn btn-secondary" style="font-size:0.75rem; padding: 0.2rem 0.5rem;" onclick="openEditUserModal(${u.id})">编辑</button>
          <button className="btn btn-secondary" style="font-size:0.75rem; padding: 0.2rem 0.5rem; color:#f43f5e;" onclick="deleteUserGui(${u.id}, '${u.username}')">删除</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Fetch users error:', e);
  }
}

// User Modal Handlers
window.showAddUserModal = function() {
  document.getElementById('modalUserTitle').textContent = '添加新用户';
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

  document.getElementById('modalUserTitle').textContent = `编辑用户: ${u.username}`;
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
    alert('用户名不能为空');
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
    if (!res.ok) throw new Error(data.error || '保存失败');

    closeUserModal();
    fetchUsers();
  } catch (e) {
    alert(e.message);
  }
};

// Delete User GUI
window.deleteUserGui = async function(id, username) {
  if (!confirm(`确定要删除用户 ${username} 吗？`)) return;
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
      throw new Error(data.error || '删除失败');
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
  if (!confirm('确定要清空所有历史下载日志吗？')) return;
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
    alert('请输入广播通知内容');
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
    if (!res.ok) throw new Error('发送广播失败');

    alert('✅ 全网广播 Notification 发布成功！在线 Web 用户将实时接收该通知。');
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
    alert('广播 Notification 已撤销');
  } catch (e) {
    alert(e.message);
  }
};

// Request initial status
ipcRenderer.send('get-server-status');
