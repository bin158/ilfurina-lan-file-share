import React, { useState } from 'react';
import { HardDrive, Lock, User, LogIn, Palette, Languages } from 'lucide-react';
import { useI18n } from '../I18nContext';

export default function Login({ onLoginSuccess }) {
  const { lang, setLang, theme, setTheme, t, DAISY_THEMES } = useI18n();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative'
    }}>
      {/* Top right Quick Theme & Language Selector on Login Page */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'var(--bg-card)',
        padding: '0.4rem 0.8rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Palette size={14} color="var(--primary)" />
          <select
            className="select select-sm select-bordered"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{ fontSize: '0.78rem', height: '28px', padding: '0 0.3rem' }}
          >
            {DAISY_THEMES.map(th => (
              <option key={th} value={th}>
                🎨 {th.charAt(0).toUpperCase() + th.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Languages size={14} color="#06b6d4" />
          <select
            className="select select-sm select-bordered"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{ fontSize: '0.78rem', height: '28px', padding: '0 0.3rem' }}
          >
            <option value="zh">🇨🇳 简</option>
            <option value="en">🇺🇸 EN</option>
          </select>
        </div>
      </div>

      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '2.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, var(--primary), #06b6d4)',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
            marginBottom: '1rem'
          }}>
            <HardDrive size={30} color="white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{t('loginWelcome')}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {t('loginSub')}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fda4af',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('usernameLabel')}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">{t('passwordLabel')}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : t('loginBtn')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          <div>{t('presetAdmin')}</div>
          <div style={{ marginTop: '0.2rem' }}>{t('presetGuest')}</div>
        </div>
      </div>
    </div>
  );
}
