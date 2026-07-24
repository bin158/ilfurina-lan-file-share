import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import FileManager from './components/FileManager';
import DownloadLogs from './components/DownloadLogs';
import UserManagement from './components/UserManagement';
import LanInfoModal from './components/LanInfoModal';
import { Key, X, Bell, AlertTriangle, Send } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('lan_share_token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('files');
  const [loading, setLoading] = useState(true);

  // System Alert Banner state
  const [systemAlert, setSystemAlert] = useState(null);

  // Modals
  const [showLanModal, setShowLanModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Validate Token on Mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          fetchSystemAlert();
        } else {
          handleLogout();
        }
      })
      .catch(() => handleLogout())
      .finally(() => setLoading(false));
  }, [token]);

  // Real-time polling for Broadcast Alerts every 3 seconds
  useEffect(() => {
    if (!token || !user) return;

    fetchSystemAlert();
    const interval = setInterval(() => {
      fetchSystemAlert();
    }, 3000);

    return () => clearInterval(interval);
  }, [token, user]);

  const fetchSystemAlert = () => {
    if (!token) return;
    fetch('/api/system/lan-info', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.systemAlert) {
          setSystemAlert(data.systemAlert);
        } else {
          setSystemAlert(null);
        }
      })
      .catch(() => {});
  };

  const handleLoginSuccess = (newToken, userData) => {
    localStorage.setItem('lan_share_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('lan_share_token');
    setToken('');
    setUser(null);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '修改密码失败');

      setPassSuccess('密码更新成功');
      setTimeout(() => {
        setShowPassModal(false);
        setOldPassword('');
        setNewPassword('');
        setPassSuccess('');
      }, 1500);
    } catch (err) {
      setPassError(err.message);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;

    try {
      const res = await fetch('/api/system/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: broadcastMsg.trim(), type: 'info' })
      });
      if (!res.ok) throw new Error('发送广播失败');

      setShowBroadcastModal(false);
      setBroadcastMsg('');
      fetchSystemAlert();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClearBroadcast = async () => {
    try {
      await fetch('/api/system/alert', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemAlert(null);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        加载 LAN-Share...
      </div>
    );
  }

  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onChangePassword={() => setShowPassModal(true)}
        onOpenLanModal={() => setShowLanModal(true)}
      />

      {/* SYSTEM BROADCAST ALERT BANNER */}
      {systemAlert && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.25), rgba(6, 182, 212, 0.25))',
          borderBottom: '1px solid rgba(99, 102, 241, 0.4)',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.88rem',
          color: '#f8fafc',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={18} color="#38bdf8" />
            <span><b>系统广播通知:</b> {systemAlert.message}</span>
          </div>

          {user.role === 'admin' && (
            <button
              className="btn btn-secondary btn-icon"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              onClick={handleClearBroadcast}
              title="撤销广播"
            >
              清除广播
            </button>
          )}
        </div>
      )}

      {/* ADMIN BROADCAST TRIGGER BAR */}
      {user.role === 'admin' && !systemAlert && (
        <div style={{ maxWidth: '1300px', margin: '0.5rem auto -0.5rem auto', padding: '0 1rem', textAlign: 'right' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
            onClick={() => setShowBroadcastModal(true)}
          >
            <Bell size={14} color="#38bdf8" />
            <span>发送全局广播 Notification</span>
          </button>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'files' && <FileManager user={user} token={token} />}
        {activeTab === 'logs' && <DownloadLogs user={user} token={token} />}
        {activeTab === 'users' && user.role === 'admin' && <UserManagement token={token} currentUser={user} />}
      </main>

      {/* LAN ACCESS & QR CODE MODAL */}
      {showLanModal && (
        <LanInfoModal token={token} onClose={() => setShowLanModal(false)} />
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPassModal && (
        <div className="modal-overlay" onClick={() => setShowPassModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} color="var(--primary)" />
                <h3 className="modal-title">修改个人密码</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowPassModal(false)}>
                <X size={18} />
              </button>
            </div>

            {passError && <div style={{ color: '#fda4af', fontSize: '0.88rem', marginBottom: '1rem' }}>{passError}</div>}
            {passSuccess && <div style={{ color: '#34d399', fontSize: '0.88rem', marginBottom: '1rem' }}>{passSuccess}</div>}

            <form onSubmit={handleChangePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">当前原密码</label>
                <input
                  type="password"
                  className="form-input"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">设置新密码</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPassModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">确认修改</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BROADCAST ALERT MODAL */}
      {showBroadcastModal && (
        <div className="modal-overlay" onClick={() => setShowBroadcastModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8' }}>
                <Bell size={20} />
                <h3 className="modal-title">发送全网系统通知/Alert</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowBroadcastModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast}>
              <div className="form-group">
                <label className="form-label">系统广播内容 (所有在线用户均可实时看到)</label>
                <textarea
                  className="form-input"
                  style={{ height: '90px', resize: 'vertical' }}
                  placeholder="例如: 欢迎访问 LAN-Share！系统将于 22:00 进行临时保养..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBroadcastModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">
                  <Send size={15} />
                  <span>发布广播</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
