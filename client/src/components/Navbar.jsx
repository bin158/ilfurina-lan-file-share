import React from 'react';
import { HardDrive, FolderGit2, History, Users, QrCode, LogOut, Key, Shield } from 'lucide-react';

export default function Navbar({ user, activeTab, setActiveTab, onLogout, onChangePassword, onOpenLanModal }) {
  return (
    <>
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <div className="nav-brand-icon">
            <HardDrive size={20} color="white" />
          </div>
          <span>LAN-Share <small style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 400 }}>局域网共享</small></span>
        </div>

        {/* Desktop Links */}
        <div className="desktop-nav-links">
          <button
            className={`nav-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FolderGit2 size={18} />
            <span>文件浏览</span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <History size={18} />
            <span>下载日志</span>
          </button>

          {user.role === 'admin' && (
            <button
              className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={18} />
              <span>用户管理</span>
            </button>
          )}

          <button className="nav-btn" onClick={onOpenLanModal} title="查看局域网 IP 与手机扫码">
            <QrCode size={18} color="#06b6d4" />
            <span style={{ color: '#06b6d4' }}>LAN 接入</span>
          </button>
        </div>

        {/* User Badge & Actions */}
        <div className="user-menu">
          <div className="user-badge">
            <Shield size={14} color={user.role === 'admin' ? '#f43f5e' : '#10b981'} />
            <span style={{ fontWeight: 600 }}>{user.username}</span>
            <span className={`role-tag ${user.role}`}>
              {user.role === 'admin' ? '管理员' : '普通'}
            </span>
          </div>

          <button className="btn btn-secondary btn-icon" onClick={onChangePassword} title="修改密码">
            <Key size={15} />
          </button>

          <button className="btn btn-danger btn-icon" onClick={onLogout} title="退出登录">
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-bar">
        <button
          className={`mobile-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <FolderGit2 size={20} />
          <span>文件</span>
        </button>

        <button
          className={`mobile-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <History size={20} />
          <span>日志</span>
        </button>

        {user.role === 'admin' && (
          <button
            className={`mobile-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={20} />
            <span>用户</span>
          </button>
        )}

        <button
          className="mobile-tab-btn"
          onClick={onOpenLanModal}
        >
          <QrCode size={20} color="#06b6d4" />
          <span style={{ color: '#06b6d4' }}>扫码</span>
        </button>
      </div>
    </>
  );
}
