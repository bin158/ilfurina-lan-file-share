import React from 'react';
import { HardDrive, FolderGit2, History, Users, QrCode, LogOut, Key, Shield, Palette, Languages } from 'lucide-react';
import { useI18n } from '../I18nContext';

export default function Navbar({ user, activeTab, setActiveTab, onLogout, onChangePassword, onOpenLanModal }) {
  const { lang, setLang, theme, setTheme, t, DAISY_THEMES } = useI18n();

  return (
    <>
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <div className="nav-brand-icon">
            <HardDrive size={18} color="white" />
          </div>
          <span>{t('appName')}</span>
        </div>

        {/* Desktop Links */}
        <div className="desktop-nav-links">
          <button
            className={`nav-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FolderGit2 size={18} />
            <span>{t('files')}</span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <History size={18} />
            <span>{t('logs')}</span>
          </button>

          {user.role === 'admin' && (
            <button
              className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={18} />
              <span>{t('users')}</span>
            </button>
          )}

          <button className="nav-btn" onClick={onOpenLanModal} title={t('scanTip')}>
            <QrCode size={18} color="#06b6d4" />
            <span style={{ color: '#06b6d4' }}>{t('lanAccess')}</span>
          </button>
        </div>

        {/* User Menu & Settings (Theme & Language grouped together) */}
        <div className="user-menu">
          {/* Combined Theme & Language Settings Group */}
          <div className="settings-group" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.15rem 0.3rem' }}>
            <Palette size={13} color="var(--primary)" />
            <select
              className="select select-xs"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '0.1rem 0.2rem', height: '26px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              title={t('theme')}
            >
              {DAISY_THEMES.map(th => (
                <option key={th} value={th} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
                  🎨 {th.charAt(0).toUpperCase() + th.slice(1)}
                </option>
              ))}
            </select>

            <span style={{ color: 'var(--border-color)', opacity: 0.4, fontSize: '0.7rem' }}>|</span>

            <Languages size={13} color="#06b6d4" />
            <select
              className="select select-xs"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '0.1rem 0.2rem', height: '26px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              title={t('language')}
            >
              <option value="zh" style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>🇨🇳 简</option>
              <option value="en" style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>🇺🇸 EN</option>
            </select>
          </div>

          <div className="user-badge">
            <Shield size={13} color={user.role === 'admin' ? '#f43f5e' : '#10b981'} />
            <span className="user-badge-name" style={{ fontWeight: 600 }}>{user.username}</span>
            <span className={`role-tag ${user.role}`}>
              {user.role === 'admin' ? t('adminTag') : t('guestTag')}
            </span>
          </div>

          <button className="btn btn-secondary btn-icon" onClick={onChangePassword} title={t('changePass')} style={{ padding: '0.3rem' }}>
            <Key size={14} />
          </button>

          <button className="btn btn-danger btn-icon" onClick={onLogout} title={t('logout')} style={{ padding: '0.3rem' }}>
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-bar">
        <button
          className={`mobile-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <FolderGit2 size={19} />
          <span>{t('files')}</span>
        </button>

        <button
          className={`mobile-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <History size={19} />
          <span>{t('logs')}</span>
        </button>

        {user.role === 'admin' && (
          <button
            className={`mobile-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={19} />
            <span>{t('users')}</span>
          </button>
        )}

        <button
          className="mobile-tab-btn"
          onClick={onOpenLanModal}
        >
          <QrCode size={19} color="#06b6d4" />
          <span style={{ color: '#06b6d4' }}>{t('scanQr')}</span>
        </button>
      </div>
    </>
  );
}
