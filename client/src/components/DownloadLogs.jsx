import React, { useState, useEffect } from 'react';
import { History, Trash2, RefreshCw, FileText, User, Globe, HardDrive } from 'lucide-react';
import { useI18n } from '../I18nContext';

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function DownloadLogs({ user, token }) {
  const { t } = useI18n();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/logs?page=1&limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all audit logs?')) return;
    try {
      const res = await fetch('/api/logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to clear logs');
      fetchLogs();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History size={20} color="var(--primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{t('logsTitle')}</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('logsSubtitle')}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={fetchLogs}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>{t('refresh')}</span>
          </button>

          {user.role === 'admin' && (
            <button className="btn btn-danger" onClick={handleClearLogs}>
              <Trash2 size={15} />
              <span>{t('clearLogsBtn')}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div className="glass-card" style={{ overflow: 'hidden', padding: '0.5rem' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <History size={36} color="var(--text-dim)" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.88rem' }}>{t('noLogs')}</p>
          </div>
        ) : (
          <table className="desktop-table">
            <thead>
              <tr>
                <th>{t('downloadUser')}</th>
                <th>{t('filename')}</th>
                <th>{t('fileSize')}</th>
                <th>{t('clientIp')}</th>
                <th>{t('downloadTime')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                      <User size={14} color="var(--primary)" />
                      <span>{log.username}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FileText size={14} color="#10b981" />
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.file_name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {formatBytes(log.file_size)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#06b6d4' }}>
                      <Globe size={13} />
                      <span>{log.ip_address}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                    {new Date(log.downloaded_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
