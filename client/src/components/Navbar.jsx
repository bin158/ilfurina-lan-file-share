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
            <HardDrive size={20} color="white" />
          </div>
          <span>{t('appName')} <small style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 400 }}>{t('appSub')}</small></span>
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

        {/* User Menu & Settings (Language & DaisyUI Theme Selector) */}
        <div className="user-menu" style={{ gap: '0.5rem', alignItems: 'center' }}>
          {/* DaisyUI Theme Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={t('theme')}>
            <Palette size={15} color="var(--primary)" />
            <select
              className="select select-sm select-bordered"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem', height: '32px', borderRadius: '6px' }}
            >
              {DAISY_THEMES.map(th => (
                <option key={th} value={th}>
                  🎨 {th.charAt(0).toUpperCase() + th.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Language Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={t('language')}>
            <Languages size={15} color="#06b6d4" />
            <select
              className="select select-sm select-bordered"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem', height: '32px', borderRadius: '6px' }}
            >
              <option value="zh">🇨🇳 简体中文</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>

          <div className="user-badge">
            <Shield size={14} color={user.role === 'admin' ? '#f43f5e' : '#10b981'} />
            <span style={{ fontWeight: 600 }}>{user.username}</span>
            <span className={`role-tag ${user.role}`}>
              {user.role === 'admin' ? t('adminTag') : t('guestTag')}
            </span>
          </div>

          <button className="btn btn-secondary btn-icon" onClick={onChangePassword} title={t('changePass')}>
            <Key size={15} />
          </button>

          <button className="btn btn-danger btn-icon" onClick={onLogout} title={t('logout')}>
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
          <span>{t('files')}</span>
        </button>

        <button
          className={`mobile-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <History size={20} />
          <span>{t('logs')}</span>
        </button>

        {user.role === 'admin' && (
          <button
            className={`mobile-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={20} />
            <span>{t('users')}</span>
          </button>
        )}

        <button
          className="mobile-tab-btn"
          onClick={onOpenLanModal}
        >
          <QrCode size={20} color="#06b6d4" />
          <span style={{ color: '#06b6d4' }}>{t('scanQr')}</span>
        </button>
      </div>
    </>
  );
}
