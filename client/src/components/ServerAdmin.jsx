import React, { useState, useEffect } from 'react';
import { 
  Server, HardDrive, Wifi, QrCode, Shield, Activity, 
  FolderPlus, Bell, RefreshCw, Send, Trash2, Copy, Check, Users, History
} from 'lucide-react';
import { useI18n } from '../I18nContext';

export default function ServerAdmin({ token, currentUser }) {
  const { t } = useI18n();
  const [lanInfo, setLanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Custom Share Directory state
  const [newSharePath, setNewSharePath] = useState('');
  const [pathMessage, setPathMessage] = useState('');

  // Broadcast state
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  const [copiedIndex, setCopiedIndex] = useState(null);

  const fetchServerInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/system/lan-info', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch system info');
      setLanInfo(data);
      if (data.sharedStoragePath) {
        setNewSharePath(data.sharedStoragePath);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerInfo();
  }, []);

  const handleUpdateSharePath = async (e) => {
    e.preventDefault();
    setPathMessage('');
    try {
      const res = await fetch('/api/system/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sharedStoragePath: newSharePath.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update share path');
      setPathMessage('✓ ' + data.message);
      fetchServerInfo();
    } catch (err) {
      setPathMessage('❌ ' + err.message);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    setBroadcastSuccess('');
    try {
      const res = await fetch('/api/system/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: broadcastMsg.trim(), type: 'info' })
      });
      if (!res.ok) throw new Error('Failed to send broadcast');
      setBroadcastSuccess('✓ Broadcast published!');
      setBroadcastMsg('');
      fetchServerInfo();
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
      setBroadcastSuccess('✓ Broadcast revoked.');
      fetchServerInfo();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopyUrl = (url, index) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) {
    return (
      <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        {t('loading')}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary), #06b6d4)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Server size={22} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t('serverControlTitle')}</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('serverControlSub')}</p>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={fetchServerInfo}>
          <RefreshCw size={15} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        
        {/* CARD 1: LAN Access & QR Code */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, fontSize: '0.98rem' }}>
            <Wifi size={18} color="#06b6d4" />
            <span>{t('primaryLanAccess')}</span>
          </div>

          {lanInfo?.qrCodeDataUrl && (
            <div style={{ textAlign: 'center', marginBottom: '1rem', background: '#090d16', padding: '1rem', borderRadius: '10px' }}>
              <img src={lanInfo.qrCodeDataUrl} alt="QR Code" style={{ width: '150px', height: '150px', borderRadius: '8px', background: 'white', padding: '6px' }} />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                {t('mobileQrConnect')}
              </p>
            </div>
          )}

          {lanInfo?.lanIps?.map((item, idx) => {
            const url = `http://${item.ip}:${lanInfo.port}`;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.55rem 0.75rem', borderRadius: '6px', marginBottom: '0.4rem', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{t('nic')}: {item.interface}</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8', fontSize: '0.88rem' }}>{url}</div>
                </div>
                <button className="btn btn-secondary btn-icon" onClick={() => handleCopyUrl(url, idx)}>
                  {copiedIndex === idx ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
              </div>
            );
          })}
        </div>

        {/* CARD 2: Custom Shared Root Storage Path */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, fontSize: '0.98rem' }}>
            <FolderPlus size={18} color="var(--primary)" />
            <span>{t('customSharePathTitle')}</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {t('currentSystemPath')}
            <br />
            <b style={{ color: 'var(--text-main)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {lanInfo?.sharedStoragePath}
            </b>
          </p>

          <form onSubmit={handleUpdateSharePath}>
            <div className="form-group">
              <label className="form-label">{t('absStoragePath')}</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. /home/user/share or D:\Shared"
                value={newSharePath}
                onChange={(e) => setNewSharePath(e.target.value)}
                required
              />
            </div>

            {pathMessage && (
              <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem', color: pathMessage.startsWith('✓') ? '#34d399' : '#fda4af' }}>
                {pathMessage}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              {t('saveApplyPath')}
            </button>
          </form>
        </div>

        {/* CARD 3: System Broadcast Notification */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, fontSize: '0.98rem' }}>
            <Bell size={18} color="#38bdf8" />
            <span>{t('globalAlertTitle')}</span>
          </div>

          {lanInfo?.systemAlert ? (
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div><b>{t('activeAlert')}</b> {lanInfo.systemAlert.message}</div>
              <button className="btn btn-danger btn-icon" style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={handleClearBroadcast}>
                {t('revokeAlert')}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {t('noActiveAlert')}
            </p>
          )}

          <form onSubmit={handleSendBroadcast}>
            <div className="form-group">
              <textarea
                className="form-input"
                style={{ height: '80px', resize: 'vertical' }}
                placeholder={t('broadcastPlaceholder')}
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                required
              />
            </div>

            {broadcastSuccess && (
              <div style={{ fontSize: '0.82rem', marginBottom: '0.5rem', color: '#34d399' }}>
                {broadcastSuccess}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Send size={15} />
              <span>{t('publishAlert')}</span>
            </button>
          </form>
        </div>

        {/* CARD 4: System Telemetry Stats */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, fontSize: '0.98rem' }}>
            <Activity size={18} color="#10b981" />
            <span>{t('serverTelemetry')}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('hostname')}</span>
              <b>{lanInfo?.hostname}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('platform')}</span>
              <b>{lanInfo?.platform} ({lanInfo?.arch})</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('listenPort')}</span>
              <b>{lanInfo?.port}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('registeredUsers')}</span>
              <b>{lanInfo?.totalUsers}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('serverUptime')}</span>
              <b>{Math.floor((lanInfo?.uptimeSeconds || 0) / 60)} {t('minutes')}</b>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
