import React, { useState, useEffect } from 'react';
import { QrCode, Copy, Check, X, Wifi, Monitor, HardDrive } from 'lucide-react';

export default function LanInfoModal({ token, onClose }) {
  const [lanData, setLanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    fetch('/api/system/lan-info', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setLanData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleCopy = (url, index) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#06b6d4' }}>
            <Wifi size={22} />
            <h3 className="modal-title">局域网接入 & 手机扫码</h3>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            正在检测局域网 IP...
          </div>
        ) : lanData ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', background: '#090d16', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              {lanData.qrCodeDataUrl && (
                <img
                  src={lanData.qrCodeDataUrl}
                  alt="LAN Access QR Code"
                  style={{ width: '180px', height: '180px', borderRadius: '12px', background: 'white', padding: '8px' }}
                />
              )}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                📱 手机 / 平板连接同一 WiFi 后扫码直接打开
              </p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
                同局域网设备浏览器访问地址 (IPv4):
              </div>

              {lanData.lanIps.map((item, idx) => {
                const url = `http://${item.ip}:${lanData.port}`;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.5rem',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>网卡: {item.interface}</div>
                      <div style={{ fontWeight: 600, color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                        {url}
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary btn-icon"
                      onClick={() => handleCopy(url, idx)}
                      title="复制地址"
                    >
                      {copiedIndex === idx ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              <div>主机名: <b style={{ color: 'var(--text-muted)' }}>{lanData.hostname}</b></div>
              <div>操作系统: <b style={{ color: 'var(--text-muted)' }}>{lanData.platform} ({lanData.arch})</b></div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '1rem', color: '#fda4af' }}>获取局域网地址失败</div>
        )}
      </div>
    </div>
  );
}
