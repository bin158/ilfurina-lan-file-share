import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, FileText, Image, Film, Music, Archive, File, 
  Download, Eye, Trash2, Upload, FolderPlus, RefreshCw, 
  Search, ChevronRight, Home, X, AlertTriangle, FolderUp
} from 'lucide-react';
import { useI18n } from '../I18nContext';

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
  const { t } = useI18n();
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
  const [isDragging, setIsDragging] = useState(false);

  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Set webkitdirectory DOM attribute dynamically when folder mode is active
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, [uploadMode, showUploadModal]);

  const fetchFiles = async (targetPath = currentPath) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(targetPath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to list files');
      
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
      alert(t('permissions'));
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
        setPreviewTextContent(err.message);
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
      if (!res.ok) throw new Error(data.error || 'Failed to create folder');
      
      setShowMkdirModal(false);
      setNewFolderName('');
      fetchFiles(currentPath);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setUploadFiles(selected);
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
    }
    formData.append('relativePathsJson', JSON.stringify(relativePaths));

    try {
      const res = await fetch(`/api/files/upload?path=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

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

  // Drag and Drop folder & file upload support
  const handleDragOver = (e) => {
    e.preventDefault();
    if (user.can_upload) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!user.can_upload) return;

    const dtItems = e.dataTransfer.items;
    if (!dtItems || dtItems.length === 0) return;

    setUploading(true);
    const filesWithPaths = [];

    const readEntry = async (entry, pathStr = '') => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file) => {
            filesWithPaths.push({ file, relativePath: pathStr + file.name });
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readAllEntries = async () => {
          const entries = await new Promise((resolve) => dirReader.readEntries(resolve));
          if (entries.length === 0) return;
          for (const child of entries) {
            await readEntry(child, pathStr + entry.name + '/');
          }
          await readAllEntries();
        };
        await readAllEntries();
      }
    };

    try {
      for (let i = 0; i < dtItems.length; i++) {
        const entry = dtItems[i].webkitGetAsEntry ? dtItems[i].webkitGetAsEntry() : null;
        if (entry) {
          await readEntry(entry, '');
        } else {
          const file = dtItems[i].getAsFile();
          if (file) filesWithPaths.push({ file, relativePath: file.name });
        }
      }

      if (filesWithPaths.length > 0) {
        const formData = new FormData();
        const rels = [];
        filesWithPaths.forEach(fp => {
          formData.append('files', fp.file);
          rels.push(fp.relativePath);
        });
        formData.append('relativePathsJson', JSON.stringify(rels));

        const res = await fetch(`/api/files/upload?path=${encodeURIComponent(currentPath)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        fetchFiles(currentPath);
      }
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
      if (!res.ok) throw new Error(data.error || 'Delete failed');

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
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {isDragging && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(99, 102, 241, 0.4)',
          backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '1.25rem', fontWeight: 700, border: '4px dashed white'
        }}>
          <Upload size={48} style={{ marginBottom: '1rem' }} />
          <span>{t('dropToUpload')} "{currentPath || t('shareRoot')}"</span>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="glass-card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          {/* Breadcrumbs Navigation */}
          <div className="breadcrumbs-wrapper">
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPath('')}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            >
              <Home size={14} />
              <span>{t('shareRoot')}</span>
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
                  <span>{t('uploadFile')} / {t('uploadFolder')}</span>
                </button>

                <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => setShowMkdirModal(true)}>
                  <FolderPlus size={15} />
                  <span>{t('newFolder')}</span>
                </button>
              </>
            )}

            <button className="btn btn-secondary btn-icon" onClick={() => fetchFiles(currentPath)} title={t('refresh')}>
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
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {t('itemsCount', { count: filteredItems.length })}
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
            {t('loading')}
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Folder size={40} color="var(--text-dim)" style={{ marginBottom: '0.4rem' }} />
            <p style={{ fontSize: '0.88rem' }}>{t('emptyFolder')}</p>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW */}
            <div className="mobile-card-list">
              {filteredItems.map((item, idx) => (
                <div key={idx} className="mobile-file-card" onClick={() => handleItemClick(item)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    {getFileIcon(item, 24)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mobile-file-name">{item.name}</div>
                      <div className="mobile-file-meta">
                        {item.isDirectory ? t('newFolder') : formatBytes(item.size)} • {new Date(item.mtime).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                    {!item.isDirectory && user.can_download && (
                      <button className="btn btn-secondary btn-icon" onClick={() => handleDownload(item)} title={t('download')}>
                        <Download size={16} />
                      </button>
                    )}
                    {user.can_delete && (
                      <button className="btn btn-danger btn-icon" onClick={() => setDeleteTarget(item)} title={t('delete')}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <table className="desktop-table">
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('size')}</th>
                  <th>{t('updatedAt')}</th>
                  <th style={{ textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => (
                  <tr key={idx} className="file-row" onClick={() => handleItemClick(item)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {getFileIcon(item)}
                        <span style={{ fontWeight: item.isDirectory ? 600 : 400, color: 'var(--text-main)' }}>
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {item.isDirectory ? '-' : formatBytes(item.size)}
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                      {new Date(item.mtime).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {!item.isDirectory && user.can_download && (
                          <button className="btn btn-secondary btn-icon" onClick={() => handleDownload(item)} title={t('download')}>
                            <Download size={15} />
                          </button>
                        )}
                        {user.can_delete && (
                          <button className="btn btn-danger btn-icon" onClick={() => setDeleteTarget(item)} title={t('delete')}>
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

      {/* CREATE FOLDER MODAL */}
      {showMkdirModal && (
        <div className="modal-overlay" onClick={() => setShowMkdirModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderPlus size={20} color="var(--primary)" />
                <h3 className="modal-title">{t('newFolder')}</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowMkdirModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder}>
              <div className="form-group">
                <label className="form-label">{t('folderNamePrompt')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="MyFolder"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMkdirModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={20} color="var(--primary)" />
                <h3 className="modal-title">{t('uploadFile')} / {t('uploadFolder')}</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowUploadModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                className={`btn ${uploadMode === 'files' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => { setUploadMode('files'); setUploadFiles([]); setRelativePaths([]); }}
              >
                <File size={16} />
                <span>{t('uploadFile')}</span>
              </button>

              <button
                type="button"
                className={`btn ${uploadMode === 'folder' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => { setUploadMode('folder'); setUploadFiles([]); setRelativePaths([]); }}
              >
                <FolderUp size={16} />
                <span>{t('uploadFolder')}</span>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              {uploadMode === 'files' ? (
                <div className="form-group">
                  <label className="form-label">{t('selectFiles')}</label>
                  <input
                    type="file"
                    className="form-input"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">{t('selectFolderTree')}</label>
                  <input
                    type="file"
                    className="form-input"
                    multiple
                    ref={folderInputRef}
                    onChange={handleFileChange}
                    required
                  />
                </div>
              )}

              {uploadFiles.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {t('readyToUpload', { count: uploadFiles.length })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={uploading || uploadFiles.length === 0}>
                  {uploading ? t('uploading') : t('uploadFile')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ color: '#f43f5e' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} />
                <h3 className="modal-title">{t('delete')}</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', margin: '1rem 0' }}>
              {t('confirmDelete')}
              <br />
              <b style={{ color: 'var(--text-main)', marginTop: '0.5rem', display: 'inline-block' }}>{deleteTarget.name}</b>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>{t('cancel')}</button>
              <button className="btn btn-danger" onClick={handleDelete}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
