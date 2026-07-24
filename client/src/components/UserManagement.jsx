import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Lock, Trash2, Edit3, CheckCircle, XCircle, Download, Upload, Folder, Key, X, HardDrive, FolderPlus, Plus, ChevronDown } from 'lucide-react';
import { useI18n } from '../I18nContext';

export default function UserManagement({ token, currentUser }) {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Server directory list for allowed_paths dropdown
  const [serverDirs, setServerDirs] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    can_download: true,
    can_upload: false,
    can_delete: false,
    allowed_paths: '*'
  });

  const fetchUsers = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data);
    } catch (err) {
      if (!isSilent) setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchServerDirectories = async () => {
    try {
      const res = await fetch('/api/files/list?path=', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        const dirs = data.items.filter(i => i.isDirectory).map(i => i.name);
        setServerDirs(dirs);
      }
    } catch (e) {
      console.error('Failed to fetch server directories:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchServerDirectories();
    const interval = setInterval(() => {
      fetchUsers(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add user');

      setShowAddModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setEditUser(null);
      resetForm();
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (userId === currentUser.id) {
      alert(t('cannotDeleteSelf'));
      return;
    }
    if (!window.confirm(t('confirmDeleteUser'))) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'user',
      can_download: true,
      can_upload: false,
      can_delete: false,
      allowed_paths: '*'
    });
  };

  const openEditModal = (u) => {
    setEditUser(u);
    setFormData({
      username: u.username,
      password: '',
      role: u.role,
      can_download: Boolean(u.can_download),
      can_upload: Boolean(u.can_upload),
      can_delete: Boolean(u.can_delete),
      allowed_paths: u.allowed_paths || '*'
    });
    fetchServerDirectories();
  };

  const handleAppendPath = (folderName) => {
    if (folderName === '*') {
      setFormData(prev => ({ ...prev, allowed_paths: '*' }));
      return;
    }
    if (formData.allowed_paths === '*' || !formData.allowed_paths.trim()) {
      setFormData(prev => ({ ...prev, allowed_paths: folderName }));
    } else {
      const currentArr = formData.allowed_paths.split(',').map(p => p.trim()).filter(Boolean);
      if (!currentArr.includes(folderName)) {
        setFormData(prev => ({ ...prev, allowed_paths: [...currentArr, folderName].join(', ') }));
      }
    }
  };

  return (
    <div>
      <div className="glass-card section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.35)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={20} color="#f43f5e" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{t('userMgmtTitle')}</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Role-based Access Control</p>
          </div>
        </div>

        <div className="section-header-actions">
          <div className="live-badge" title="Real-time live update active">
            <span className="pulse-dot"></span>
            <span>{t('realtimeSync')}</span>
          </div>

          <button className="btn btn-primary" onClick={() => { resetForm(); fetchServerDirectories(); setShowAddModal(true); }}>
            <UserPlus size={16} />
            <span>{t('addUserBtn')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.35)', color: '#fda4af', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div className="glass-card" style={{ overflow: 'hidden', padding: '0.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('loading')}</div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW */}
            <div className="mobile-card-list">
              {users.map((u) => (
                <div key={u.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>{u.username}</span>
                      <span className={`role-tag ${u.role}`}>
                        {u.role === 'admin' ? t('admin') : t('guest')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-secondary btn-icon" onClick={() => openEditModal(u)} title={t('edit')}>
                        <Edit3 size={15} />
                      </button>
                      {u.id !== currentUser.id && (
                        <button className="btn btn-danger btn-icon" onClick={() => handleDelete(u.id)} title={t('delete')}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                    {u.can_download && <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.72rem', padding: '0.18rem 0.45rem', borderRadius: '5px' }}>{t('canDownload')}</span>}
                    {u.can_upload && <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: '0.72rem', padding: '0.18rem 0.45rem', borderRadius: '5px' }}>{t('canUpload')}</span>}
                    {u.can_delete && <span style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185', fontSize: '0.72rem', padding: '0.18rem 0.45rem', borderRadius: '5px' }}>{t('canDelete')}</span>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <span>Scope: <code style={{ color: 'var(--text-muted)' }}>{u.allowed_paths || '*'}</code></span>
                    <span>Downloads: <b>{u.download_count || 0}</b></span>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <table className="desktop-table">
              <thead>
                <tr>
                  <th>{t('username')}</th>
                  <th>{t('role')}</th>
                  <th>{t('permissions')}</th>
                  <th>{t('allowedPaths')}</th>
                  <th>{t('downloadCount')}</th>
                  <th style={{ textAlign: 'right' }}>{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.username}</div>
                    </td>
                    <td>
                      <span className={`role-tag ${u.role}`}>
                        {u.role === 'admin' ? t('admin') : t('guest')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {u.can_download && <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.72rem', padding: '0.18rem 0.45rem', borderRadius: '5px' }}>{t('canDownload')}</span>}
                        {u.can_upload && <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: '0.72rem', padding: '0.18rem 0.45rem', borderRadius: '5px' }}>{t('canUpload')}</span>}
                        {u.can_delete && <span style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185', fontSize: '0.72rem', padding: '0.18rem 0.45rem', borderRadius: '5px' }}>{t('canDelete')}</span>}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {u.allowed_paths || '*'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{u.download_count || 0}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button className="btn btn-secondary btn-icon" onClick={() => openEditModal(u)} title={t('edit')}>
                          <Edit3 size={15} />
                        </button>
                        {u.id !== currentUser.id && (
                          <button className="btn btn-danger btn-icon" onClick={() => handleDelete(u.id)} title={t('delete')}>
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

      {/* ADD / EDIT USER MODAL */}
      {(showAddModal || editUser) && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setEditUser(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editUser ? t('editUserTitle') : t('addUserTitle')}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => { setShowAddModal(false); setEditUser(null); }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={editUser ? handleEditSubmit : handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">{t('username')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{editUser ? t('resetPass') : t('passwordLabel')}</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={editUser ? t('resetPassPlaceholder') : ''}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editUser}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('role')}</label>
                <select
                  className="shadcn-select form-input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="user">{t('guest')}</option>
                  <option value="admin">{t('admin')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('permissions')}</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.4rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.can_download}
                    onChange={(e) => setFormData({ ...formData, can_download: e.target.checked })}
                  />
                  <span>{t('canDownload')}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.4rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.can_upload}
                    onChange={(e) => setFormData({ ...formData, can_upload: e.target.checked })}
                  />
                  <span>{t('canUpload')}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.can_delete}
                    onChange={(e) => setFormData({ ...formData, can_delete: e.target.checked })}
                  />
                  <span>{t('canDelete')}</span>
                </label>
              </div>

              {/* ALLOWED PATHS WITH DROPDOWN MENU & QUICK PRESETS */}
              <div className="form-group">
                <label className="form-label">{t('allowedPathsHint')}</label>
                
                {/* DROPDOWN MENU SELECTOR */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <select
                    className="shadcn-select"
                    style={{ flex: 1 }}
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAppendPath(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="" disabled>{t('selectPresetPath')}</option>
                    <option value="*">🌟 {t('allDirectories')}</option>
                    {serverDirs.map(d => (
                      <option key={d} value={d}>📁 {d}</option>
                    ))}
                  </select>
                </div>

                {/* TEXT INPUT FOR CUSTOM OR COMBINED PATHS */}
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. documents, pictures"
                  value={formData.allowed_paths}
                  onChange={(e) => setFormData({ ...formData, allowed_paths: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddModal(false); setEditUser(null); }}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
