import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Folder, FileText, Image, Film, Music, Archive, File, 
  Download, Eye, Trash2, Upload, FolderPlus, RefreshCw, 
  Search, ChevronRight, Home, X, AlertTriangle, FolderUp,
  CheckCircle2, Loader2, Zap, Copy, RefreshCcw
} from 'lucide-react';
import { useI18n } from '../I18nContext';

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(dateVal, includeTime = true) {
  if (!dateVal) return '-';
  let str = String(dateVal);
  if (typeof dateVal === 'string' && dateVal.includes(' ') && !dateVal.includes('T')) {
    str = str.replace(' ', 'T');
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) {
    const num = Number(dateVal);
    if (!isNaN(num)) {
      const dNum = new Date(num);
      if (!isNaN(dNum.getTime())) {
        return includeTime ? dNum.toLocaleString() : dNum.toLocaleDateString();
      }
    }
    return '-';
  }
  return includeTime ? d.toLocaleString() : d.toLocaleDateString();
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

// XHR Upload Helper with Progress Tracking
function uploadWithProgress({ url, token, formData, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        const elapsedTime = (Date.now() - startTime) / 1000;
        const bytesPerSec = elapsedTime > 0 ? event.loaded / elapsedTime : 0;
        onProgress({
          percent,
          loaded: event.loaded,
          total: event.total,
          speed: formatBytes(bytesPerSec) + '/s'
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch (e) {
          resolve({});
        }
      } else {
        let errMessage = 'Upload failed';
        try {
          const errRes = JSON.parse(xhr.responseText);
          if (errRes.error) errMessage = errRes.error;
        } catch (e) {}
        reject(new Error(errMessage));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));

    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

export default function FileManager({ user, token }) {
  const { t } = useI18n();

  // Compute allowed roots for the logged-in user
  const allowedRoots = useMemo(() => {
    if (user.role === 'admin' || !user.allowed_paths || user.allowed_paths === '*') {
      return [''];
    }
    const paths = user.allowed_paths.split(',').map(p => p.trim()).filter(Boolean);
    return paths.length > 0 ? paths : [''];
  }, [user]);

  const [activeRoot, setActiveRoot] = useState(() => allowedRoots[0]);
  const [currentPath, setCurrentPath] = useState(() => allowedRoots[0]);

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
  const [uploadMode, setUploadMode] = useState('files'); // 'files', 'folder', 'zip'
  const [uploadFiles, setUploadFiles] = useState([]);
  const [relativePaths, setRelativePaths] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Progress modal state
  const [uploadProgress, setUploadProgress] = useState(null);
  
  // Conflict resolution modal state
  const [conflictData, setConflictData] = useState(null);
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync activeRoot if user allowed_paths change
  useEffect(() => {
    if (!allowedRoots.includes(activeRoot)) {
      const newRoot = allowedRoots[0];
      setActiveRoot(newRoot);
      setCurrentPath(newRoot);
    }
  }, [allowedRoots, activeRoot]);

  // Set webkitdirectory DOM attribute dynamically when folder mode is active
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, [uploadMode, showUploadModal]);

  const fetchFiles = async (targetPath = currentPath, isSilent = false) => {
    if (!isSilent) setLoading(true);
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
      if (!isSilent) setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPath);

    const interval = setInterval(() => {
      fetchFiles(currentPath, true);
    }, 3000);

    return () => clearInterval(interval);
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

  const checkAndUpload = async (files, rels, isZip) => {
    setShowUploadModal(false);
    try {
      const res = await fetch(`/api/files/check-conflicts?path=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          files: rels,
          autoUnzip: isZip
        })
      });
      const data = await res.json();

      if (res.ok && data.hasConflict) {
        setConflictData({
          files,
          relativePaths: rels,
          isZip,
          conflicts: data.conflicts
        });
      } else {
        performUpload(files, rels, isZip, 'replace');
      }
    } catch (err) {
      performUpload(files, rels, isZip, 'replace');
    }
  };

  const performUpload = async (files, rels, isZip, conflictAction = 'replace') => {
    setConflictData(null);
    setUploading(true);

    setUploadProgress({
      percent: 0,
      loaded: 0,
      total: 0,
      speed: '0 B/s',
      status: 'uploading',
      count: files.length
    });

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('relativePathsJson', JSON.stringify(rels));
    formData.append('conflictAction', conflictAction);
    if (isZip) {
      formData.append('autoUnzip', 'true');
    }

    try {
      await uploadWithProgress({
        url: `/api/files/upload?path=${encodeURIComponent(currentPath)}`,
        token,
        formData,
        onProgress: (prog) => {
          setUploadProgress(prev => ({
            ...prev,
            ...prog,
            status: prog.percent === 100 ? 'processing' : 'uploading'
          }));
        }
      });

      setUploadProgress(prev => ({ ...prev, percent: 100, status: 'done' }));

      setTimeout(() => {
        setUploadProgress(null);
        setUploadFiles([]);
        setRelativePaths([]);
        fetchFiles(currentPath);
      }, 1000);
    } catch (err) {
      alert(err.message);
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;
    checkAndUpload(uploadFiles, relativePaths, uploadMode === 'zip');
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
        const files = filesWithPaths.map(fp => fp.file);
        const rels = filesWithPaths.map(fp => fp.relativePath);
        checkAndUpload(files, rels, false);
      }
    } catch (err) {
      alert(err.message);
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

  // Calculate breadcrumbs relative to activeRoot
  let subPaths = [];
  if (activeRoot === '') {
    subPaths = currentPath ? currentPath.split('/') : [];
  } else if (currentPath === activeRoot) {
    subPaths = [];
  } else if (currentPath.startsWith(activeRoot + '/')) {
    subPaths = currentPath.substring(activeRoot.length + 1).split('/');
  }

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRootChange = (newRoot) => {
    setActiveRoot(newRoot);
    setCurrentPath(newRoot);
  };

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {isDragging && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(99, 102, 241, 0.45)',
          backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '1.25rem', fontWeight: 700, border: '4px dashed white'
        }}>
          <Upload size={52} style={{ marginBottom: '1rem' }} />
          <span>{t('dropToUpload')} "{currentPath || activeRoot || t('shareRoot')}"</span>
        </div>
      )}

      {/* Top Controls & Breadcrumbs Bar */}
      <div className="glass-card fm-toolbar">
        <div className="fm-toolbar-row">
          
          {/* Breadcrumbs Navigation with Root Dropdown */}
          <div className="breadcrumbs-wrapper">
            
            {/* MULTIPLE ALLOWED ROOTS DROPDOWN MENU */}
            {allowedRoots.length > 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                <Folder size={16} color="#6366f1" />
                <select
                  className="shadcn-select"
                  value={activeRoot}
                  onChange={(e) => handleRootChange(e.target.value)}
                  title={t('selectRoot')}
                >
                  {allowedRoots.map(rootPath => (
                    <option key={rootPath} value={rootPath}>
                      📁 {rootPath || t('shareRoot')}
                    </option>
                  ))}
                </select>
              </div>
            ) : allowedRoots[0] !== '' ? (
              /* SINGLE SPECIFIC ALLOWED ROOT */
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPath(activeRoot)}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
                title={t('selectRoot')}
              >
                <Folder size={15} color="#6366f1" />
                <span>{activeRoot}</span>
              </button>
            ) : (
              /* ADMIN / FULL SYSTEM ROOT */
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPath('')}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
              >
                <Home size={15} />
                <span>{t('shareRoot')}</span>
              </button>
            )}

            {/* SUB-PATH BREADCRUMBS */}
            {subPaths.map((part, index) => {
              const target = activeRoot 
                ? `${activeRoot}/${subPaths.slice(0, index + 1).join('/')}`
                : subPaths.slice(0, index + 1).join('/');
              return (
                <React.Fragment key={index}>
                  <ChevronRight size={15} color="var(--text-dim)" />
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.7rem', fontSize: '0.82rem' }}
                    onClick={() => setCurrentPath(target)}
                  >
                    <span>{part}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Live badge + refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <div className="live-badge" title="Real-time live update active">
              <span className="pulse-dot"></span>
              <span>{t('realtimeSync')}</span>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={() => fetchFiles(currentPath)} title={t('refresh')}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Action Buttons - Stacks on mobile */}
        {user.can_upload && (
          <div className="fm-actions">
            <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
              <Upload size={16} />
              <span>{t('uploadFile')}</span>
            </button>

            <button className="btn btn-secondary" onClick={() => setShowMkdirModal(true)}>
              <FolderPlus size={16} />
              <span>{t('newFolder')}</span>
            </button>
          </div>
        )}

        {/* Search Bar & Sub-info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.2rem', padding: '0.45rem 0.85rem 0.45rem 2.2rem', fontSize: '0.85rem' }}
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            {t('itemsCount', { count: filteredItems.length })}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.35)', color: '#fda4af', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Main Files View */}
      <div className="glass-card" style={{ overflow: 'hidden', padding: '0.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('loading')}
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Folder size={44} color="var(--text-dim)" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.9rem' }}>{t('emptyFolder')}</p>
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
                        {item.isDirectory ? t('newFolder') : formatBytes(item.size)} • {formatDate(item.mtime, false)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.45rem', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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
                  <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => handleItemClick(item)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                      {formatDate(item.mtime, true)}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
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

      {/* UPLOAD PROGRESS DIALOG MODAL */}
      {uploadProgress && (
        <div className="modal-overlay">
          <div className="upload-progress-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                  padding: '0.55rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
                }}>
                  <Upload size={22} color="white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {t('uploadingTitle')}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {t('readyToUpload', { count: uploadProgress.count || 1 })}
                  </p>
                </div>
              </div>

              <div style={{
                background: uploadProgress.status === 'done' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: uploadProgress.status === 'done' ? '#34d399' : '#818cf8',
                border: `1px solid ${uploadProgress.status === 'done' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
                padding: '0.3rem 0.7rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                {uploadProgress.status === 'done' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Zap size={14} color="#06b6d4" />
                )}
                <span>{uploadProgress.percent}%</span>
              </div>
            </div>

            {/* Glowing Animated Progress Bar */}
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>

            {/* Stats Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <div>
                <span>{t('uploadedSize')}: </span>
                <b style={{ color: 'var(--text-main)' }}>{formatBytes(uploadProgress.loaded)}</b> / {formatBytes(uploadProgress.total)}
              </div>

              {uploadProgress.status === 'uploading' && (
                <div style={{ color: '#06b6d4', fontWeight: 600 }}>
                  ⚡ {uploadProgress.speed}
                </div>
              )}
            </div>

            {/* Status notice */}
            {uploadProgress.status === 'processing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#38bdf8', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '1rem', fontSize: '0.82rem' }}>
                <Loader2 size={16} className="spin" />
                <span>{t('processingServer')}</span>
              </div>
            )}

            {uploadProgress.status === 'done' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '1rem', fontSize: '0.82rem', fontWeight: 600 }}>
                <CheckCircle2 size={16} />
                <span>{t('uploadComplete')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFLICT RESOLUTION MODAL */}
      {conflictData && (
        <div className="modal-overlay" onClick={() => setConflictData(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header" style={{ color: '#f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertTriangle size={24} color="#f59e0b" />
                <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>{t('conflictTitle')}</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setConflictData(null)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
              {t('conflictSubtitle')}
            </p>

            {/* List of conflicting files */}
            <div style={{
              maxHeight: '140px',
              overflowY: 'auto',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 0.8rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              {conflictData.conflicts.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#fbbf24' }}>
                  <FileText size={15} color="#f59e0b" />
                  <span style={{ wordBreak: 'break-all' }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* RENAME OPTION BUTTON */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  textAlign: 'left',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => performUpload(conflictData.files, conflictData.relativePaths, conflictData.isZip, 'rename')}
              >
                <Copy size={20} color="#818cf8" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#a5b4fc', fontSize: '0.92rem' }}>
                    {t('conflictRename')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {t('conflictRenameDesc')}
                  </div>
                </div>
              </button>

              {/* REPLACE OPTION BUTTON */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  textAlign: 'left',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  background: 'rgba(244, 63, 94, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => performUpload(conflictData.files, conflictData.relativePaths, conflictData.isZip, 'replace')}
              >
                <RefreshCcw size={20} color="#f43f5e" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#fda4af', fontSize: '0.92rem' }}>
                    {t('conflictReplace')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {t('conflictReplaceDesc')}
                  </div>
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setConflictData(null)}>
                {t('conflictCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div className="modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                {getFileIcon(previewItem, 22)}
                <h3 className="modal-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {previewItem.name}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                {user.can_download && (
                  <button className="btn btn-primary" onClick={() => handleDownload(previewItem)}>
                    <Download size={15} />
                    <span>{t('download')}</span>
                  </button>
                )}
                <button className="btn btn-secondary btn-icon" onClick={() => setPreviewItem(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ marginTop: '1rem', maxHeight: '65vh', overflowY: 'auto' }}>
              {(previewItem.mimeType || '').startsWith('image/') ? (
                <img
                  src={`/api/files/preview?path=${encodeURIComponent(previewItem.path)}&token=${encodeURIComponent(token)}`}
                  alt={previewItem.name}
                  style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block', margin: '0 auto', borderRadius: 'var(--radius-md)' }}
                />
              ) : (previewItem.mimeType || '').startsWith('video/') ? (
                <video
                  controls
                  style={{ width: '100%', maxHeight: '60vh', borderRadius: 'var(--radius-md)' }}
                  src={`/api/files/preview?path=${encodeURIComponent(previewItem.path)}&token=${encodeURIComponent(token)}`}
                />
              ) : (previewItem.mimeType || '').startsWith('audio/') ? (
                <audio
                  controls
                  style={{ width: '100%', margin: '1.5rem 0' }}
                  src={`/api/files/preview?path=${encodeURIComponent(previewItem.path)}&token=${encodeURIComponent(token)}`}
                />
              ) : previewTextContent ? (
                <pre style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace'
                }}>
                  {previewTextContent}
                </pre>
              ) : (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <File size={40} style={{ marginBottom: '0.5rem' }} />
                  <p>Preview not supported for this file type.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE FOLDER MODAL */}
      {showMkdirModal && (
        <div className="modal-overlay" onClick={() => setShowMkdirModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderPlus size={20} color="#6366f1" />
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.5rem' }}>
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
                <Upload size={20} color="#6366f1" />
                <h3 className="modal-title">{t('uploadFile')} / {t('uploadFolder')}</h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowUploadModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${uploadMode === 'files' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { setUploadMode('files'); setUploadFiles([]); setRelativePaths([]); }}
              >
                <File size={15} />
                <span>{t('uploadModeFiles')}</span>
              </button>

              <button
                type="button"
                className={`btn ${uploadMode === 'folder' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { setUploadMode('folder'); setUploadFiles([]); setRelativePaths([]); }}
              >
                <FolderUp size={15} />
                <span>{t('uploadModeFolder')}</span>
              </button>

              <button
                type="button"
                className={`btn ${uploadMode === 'zip' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: '1 1 100%', marginTop: '0.25rem' }}
                onClick={() => { setUploadMode('zip'); setUploadFiles([]); setRelativePaths([]); }}
              >
                <Archive size={15} color="#38bdf8" />
                <span>{t('uploadModeZip')}</span>
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
              ) : uploadMode === 'folder' ? (
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
              ) : (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#38bdf8' }}>{t('uploadZipFolderHint')}</label>
                  <input
                    type="file"
                    className="form-input"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={handleFileChange}
                    required
                  />
                </div>
              )}

              {uploadFiles.length > 0 && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {t('readyToUpload', { count: uploadFiles.length })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.5rem' }}>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>{t('cancel')}</button>
              <button className="btn btn-danger" onClick={handleDelete}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
