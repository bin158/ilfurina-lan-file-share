import React, { useState, useEffect } from 'react';
import { History, Download, HardDrive, User, Search, RefreshCw, Trash2, Calendar, Copy, Check } from 'lucide-react';

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function DownloadLogs({ user, token }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/logs?page=${page}&limit=15&search=${encodeURIComponent(search)}`;
      if (usernameFilter) url += `&username=${encodeURIComponent(usernameFilter)}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/logs/stats', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, search, usernameFilter]);

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    const textLines = logs.map(l => 
      `[${new Date(l.downloaded_at).toLocaleString()}] User: ${l.username} | File: ${l.file_name} (${l.file_path}) | Size: ${formatBytes(l.file_size)} | IP: ${l.ip_address}`
    ).join('\n');

    navigator.clipboard.writeText(textLines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = async () => {
    if (!window.confirm('确定要清空所有下载日志记录吗？')) return;
    try {
      const res = await fetch('/api/logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchLogs();
        fetchStats();
      }
    } catch (err) {
      alert('清空日志失败: ' + err.message);
    }
  };

  return (
    <div>
      {/* Statistics Header Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="glass-card stat-card">
            <div className="stat-icon">
              <Download size={22} />
            </div>
            <div>
              <div className="stat-val">{stats.totalDownloads}</div>
              <div className="stat-lbl">累计下载总次数</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
              <HardDrive size={22} />
            </div>
            <div>
              <div className="stat-val">{formatBytes(stats.totalVolume)}</div>
              <div className="stat-lbl">传输总数据量</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <User size={22} />
            </div>
            <div>
              <div className="stat-val" style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{stats.topFiles?.[0]?.file_name || '暂无数据'}</div>
              <div className="stat-lbl">最热门文件 (下载 {stats.topFiles?.[0]?.count || 0} 次)</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="glass-card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.1rem', padding: '0.4rem 0.75rem 0.4rem 2.1rem', fontSize: '0.85rem' }}
                placeholder="搜索文件名、路径或 IP..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {user.role === 'admin' && (
              <input
                type="text"
                className="form-input"
                style={{ width: '130px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                placeholder="用户名筛选"
                value={usernameFilter}
                onChange={(e) => { setUsernameFilter(e.target.value); setPage(1); }}
              />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button className="btn btn-secondary" onClick={handleCopyLogs} title="复制当前页面日志到剪贴板">
              {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              <span>{copied ? '已复制日志' : '复制日志'}</span>
            </button>

            <button className="btn btn-secondary btn-icon" onClick={() => { fetchLogs(); fetchStats(); }} title="刷新数据">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>

            {user.role === 'admin' && (
              <button className="btn btn-danger" onClick={handleClearLogs}>
                <Trash2 size={15} />
                <span>清空日志</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Download Logs Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            加载下载记录...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <History size={40} color="var(--text-dim)" style={{ marginBottom: '0.4rem' }} />
            <p style={{ fontSize: '0.88rem' }}>暂无下载日志记录</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem', width: '60px' }}>ID</th>
                <th style={{ padding: '0.75rem 1rem', width: '110px' }}>下载用户</th>
                <th style={{ padding: '0.75rem 1rem' }}>下载文件</th>
                <th style={{ padding: '0.75rem 1rem', width: '100px' }}>大小</th>
                <th style={{ padding: '0.75rem 1rem', width: '130px' }}>客户端 IP</th>
                <th style={{ padding: '0.75rem 1rem', width: '160px' }}>下载时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>#{log.id}</td>
                  
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontWeight: 600, color: '#a5b4fc' }}>{log.username}</span>
                  </td>

                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{log.file_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{log.file_path}</div>
                  </td>

                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                    {formatBytes(log.file_size)}
                  </td>

                  <td style={{ padding: '0.75rem 1rem', color: '#06b6d4', fontFamily: 'monospace' }}>
                    {log.ip_address}
                  </td>

                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={13} color="var(--text-dim)" />
                      <span>{new Date(log.downloaded_at).toLocaleString()}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              第 {page} / {totalPages} 页 (共 {totalCount} 条记录)
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
