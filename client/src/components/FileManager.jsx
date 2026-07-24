import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, FileText, Image, Film, Music, Archive, File, 
  Download, Eye, Trash2, Upload, FolderPlus, RefreshCw, 
  Search, ChevronRight, Home, X, AlertTriangle, FolderUp
} from 'lucide-react';

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileIcon(item, size = 20) {
  if (item.isDirectory) return <Folder size={size} color="#f59e0b" />;
  const mime = item.mimeType || '';
  if (mime.startsWith('image/')) return <Image size={size} color="#06b6d4" />;
  if (mime.startsWith('video/')) return <Film size={size} color="#ec4899" />;
  if (mime.startsWith('audio/')) return <Music size={size} color="#8b5cf6" />;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar') || mime.includes('7z')) {
    return <Archive size={size} color="#f97316" />;
  }
  if (mime.startsWith('text/') || mime.includes('pdf') || mime.includes('json') || mime.includes('javascript')) {
    return <FileText size={size} color="#10b981" />;
  }
  return <File size={size} color="#94a3b8" />;
}

export default function FileManager({ user, token }) {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Modals state
  const [previewItem, setPreviewItem] = useState(null);
  const [previewTextContent, setPreviewTextContent] = useState('');
  const [showMkdirModal, setShowMkdirModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('files'); // 'files' or 'folder'
  const [uploadFiles, setUploadFiles] = useState([]);
  const [relativePaths, setRelativePaths] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchFiles = async (targetPath = currentPath) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(targetPath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取文件列表失败');
      
      setCurrentPath(data.currentPath);
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const handleItemClick = (item) => {
    if (item.isDirectory) {
      setCurrentPath(item.path);
    } else {
      handlePreview(item);
    }
  };

  const handleDownload = (item) => {
    if (!user.can_download) {
      alert('您没有下载权限');
      return;
    }
    const downloadUrl = `/api/files/download?path=${encodeURIComponent(item.path)}&token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreview = async (item) => {
    setPreviewItem(item);
    setPreviewTextContent('');
    const mime = item.mimeType || '';

    if (mime.startsWith('text/') || mime.includes('json') || mime.includes('javascript') || item.name.endsWith('.md') || item.name.endsWith('.txt')) {
      try {
        const previewUrl = `/api/files/preview?path=${encodeURIComponent(item.path)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(previewUrl, { headers: { Authorization: `Bearer ${token}` } });
        const text = await res.text();
        setPreviewTextContent(text.substring(0, 100000));
      } catch (err) {
        setPreviewTextContent('加载文本失败: ' + err.message);
      }
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/files/mkdir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: currentPath, folderName: newFolderName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建文件夹失败');
      
      setShowMkdirModal(false);
      setNewFolderName('');
      fetchFiles(currentPath);
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle File or Folder selection
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setUploadFiles(selected);

    // Extract webkitRelativePath for folder upload
    const rels = selected.map(f => f.webkitRelativePath || f.name);
    setRelativePaths(rels);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < uploadFiles.length; i++) {
      formData.append('files', uploadFiles[i]);
      formData.append('relativePaths', relativePaths[i] || uploadFiles[i].name);
    }

    try {
      const res = await fetch(`/api/files/upload?path=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');

      setShowUploadModal(false);
      setUploadFiles([]);
      setRelativePaths([]);
      fetchFiles(currentPath);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(deleteTarget.path)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');

      setDeleteTarget(null);
      fetchFiles(currentPath);
    } catch (err) {
      alert(err.message);
    }
  };

  const pathParts = currentPath ? currentPath.split('/') : [];
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Top Controls Bar */}
      <div className="glass-card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          {/* Breadcrumbs Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPath('')}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            >
              <Home size={14} />
              <span>根目录</span>
            </button>

            {pathParts.map((part, index) => {
              const target = pathParts.slice(0, index + 1).join('/');
              return (
                <React.Fragment key={index}>
                  <ChevronRight size={14} color="var(--text-dim)" />
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    onClick={() => setCurrentPath(target)}
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {user.can_upload && (
              <>
                <button className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => setShowUploadModal(true)}>
                  <Upload size={15} />
                  <span>上传文件/文件夹</span>
                </button>

                <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => setShowMkdirModal(true)}>
                  <FolderPlus size={15} />
                  <span>新建目录</span>
                </button>
              </>
            )}

            <button className="btn btn-secondary btn-icon" onClick={() => fetchFiles(currentPath)} title="刷新">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search Bar & Sub-info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.1rem', padding: '0.4rem 0.75rem 0.4rem 2.1rem', fontSize: '0.85rem' }}
              placeholder="搜索当前目录..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            共 <b>{filteredItems.length}</b> 项目
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Main Files View */}
      <div className="glass-card" style={{ overflow: 'hidden', padding: '0.5rem' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            加载中...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Folder size={40} color="var(--text-dim)" style={{ marginBottom: '0.4rem' }} />
            <p style={{ fontSize: '0.88rem' }}>该目录下暂无文件</p>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW (< 768px) */}
            <div className="mobile-file-grid">
              {filteredItems.map((item, idx) => (
                <div key={idx} className="mobile-file-card">
                  <div className="mobile-file-info" onClick={() => handleItemClick(item)}>
                    <div style={{ flexShrink: 0 }}>
                      {getFileIcon(item, 24)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mobile-file-title" style={{ color: item.isDirectory ? '#60a5fa' : 'var(--text-main)' }}>
                        {item.name}
                      </div>
                      <div className="mobile-file-meta">
                        {item.isDirectory ? '文件夹' : formatBytes(item.size)} • {new Date(item.modifiedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                    {!item.isDirectory && (
                      <>
                        <button
                          className="btn btn-secondary btn-icon"
                          style={{ padding: '0.4rem' }}
                          onClick={() => handlePreview(item)}
                          title="预览"
                        >
                          <Eye size={16} color="#06b6d4" />
                        </button>

                        {user.can_download && (
                          <button
                            className="btn btn-secondary btn-icon"
                            style={{ padding: '0.4rem', background: 'rgba(16, 185, 129, 0.15)' }}
                            onClick={() => handleDownload(item)}
                            title="下载"
                          >
                            <Download size={16} color="#10b981" />
                          </button>
                        )}
                      </>
                    )}

                    {user.can_delete && (
                      <button
                        className="btn btn-danger btn-icon"
                        style={{ padding: '0.4rem' }}
                        onClick={() => setDeleteTarget(item)}
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW (>= 768px) */}
            <table className="desktop-file-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.8rem 1rem' }}>名称</th>
                  <th style={{ padding: '0.8rem 1rem', width: '110px' }}>大小</th>
                  <th style={{ padding: '0.8rem 1rem', width: '170px' }}>修改时间</th>
                  <th style={{ padding: '0.8rem 1rem', width: '150px', textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }} onClick={() => handleItemClick(item)}>
                        {getFileIcon(item)}
                        <span style={{ fontWeight: item.isDirectory ? 600 : 400, color: item.isDirectory ? '#60a5fa' : 'var(--text-main)' }}>
                          {item.name}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {item.isDirectory ? '-' : formatBytes(item.size)}
                    </td>

                    <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(item.modifiedAt).toLocaleString()}
                    </td>

                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                        {!item.isDirectory && (
                          <>
                            <button className="btn btn-secondary btn-icon" title="预览" onClick={() => handlePreview(item)}>
                              <Eye size={15} color="#06b6d4" />
                            </button>

                            {user.can_download && (
                              <button className="btn btn-secondary btn-icon" title="下载文件" onClick={() => handleDownload(item)}>
                                <Download size={15} color="#10b981" />
                              </button>
                            )}
                          </>
                        )}

                        {user.can_delete && (
                          <button className="btn btn-danger btn-icon" title="删除" onClick={() => setDeleteTarget(item)}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div className="modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                {getFileIcon(previewItem)}
                <h3 className="modal-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewItem.name}</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setPreviewItem(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: '65vh', overflowY: 'auto', background: '#0a0f1d', padding: '0.85rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              {previewItem.mimeType.startsWith('image/') ? (
                <img
                  src={`/api/files/preview?path=${encodeURIComponent(previewItem.path)}&token=${encodeURIComponent(token)}`}
                  alt={previewItem.name}
                  style={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: '8px', objectFit: 'contain' }}
                />
              ) : previewItem.mimeType.startsWith('video/') ? (
                <video
                  controls
                  style={{ width: '100%', maxHeight: '55vh', borderRadius: '8px' }}
                  src={`/api/files/preview?path=${encodeURIComponent(previewItem.path)}&token=${encodeURIComponent(token)}`}
                />
              ) : previewItem.mimeType.startsWith('audio/') ? (
                <div style={{ padding: '1.5rem' }}>
                  <audio
                    controls
                    style={{ width: '100%' }}
                    src={`/api/files/preview?path=${encodeURIComponent(previewItem.path)}&token=${encodeURIComponent(token)}`}
                  />
                </div>
              ) : previewTextContent ? (
                <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem', color: '#e2e8f0' }}>
                  {previewTextContent}
                </pre>
              ) : (
                <div style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '0.88rem' }}>该文件格式不支持在线预览</p>
                  {user.can_download && (
                    <button className="btn btn-primary" style={{ marginTop: '0.85rem' }} onClick={() => handleDownload(previewItem)}>
                      <Download size={15} />
                      <span>直接下载</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW FOLDER MODAL */}
      {showMkdirModal && (
        <div className="modal-overlay" onClick={() => setShowMkdirModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">新建文件夹</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowMkdirModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="form-group">
                <label className="form-label">文件夹名称</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如: Movies, Backup..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMkdirModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">确认创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD FILES & FOLDER MODAL */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">上传文件或文件夹</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowUploadModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                className={`btn ${uploadMode === 'files' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => { setUploadMode('files'); setUploadFiles([]); }}
              >
                <Upload size={15} />
                <span>选择单/多个文件</span>
              </button>

              <button
                type="button"
                className={`btn ${uploadMode === 'folder' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => { setUploadMode('folder'); setUploadFiles([]); }}
              >
                <FolderUp size={15} />
                <span>选择完整文件夹</span>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="form-group">
                <label className="form-label">{uploadMode === 'folder' ? '选择包含多层子目录的文件夹' : '选择要上传的文件'}</label>
                
                {uploadMode === 'files' ? (
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="form-input"
                    onChange={handleFileChange}
                    required
                  />
                ) : (
                  <input
                    ref={folderInputRef}
                    type="file"
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    className="form-input"
                    onChange={handleFileChange}
                    required
                  />
                )}
              </div>

              {uploadFiles.length > 0 && (
                <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  已选定 <b>{uploadFiles.length}</b> 个文件 (保存相对目录树结构)
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? '上传中...' : '开始上传'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f43f5e' }}>
                <AlertTriangle size={18} />
                <h3 className="modal-title">确认删除</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              确定要删除 <b>{deleteTarget.name}</b> 吗？不可恢复。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>取消</button>
              <button className="btn btn-danger" onClick={handleDelete}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
