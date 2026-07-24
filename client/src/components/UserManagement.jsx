import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Lock, Trash2, Edit3, CheckCircle, XCircle, Download, Upload, Folder, Key, X, HardDrive } from 'lucide-react';
import { useI18n } from '../I18nContext';

export default function UserManagement({ token, currentUser }) {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
      alert('Cannot delete current logged in account');
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
  };

  return (
    <div>
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#f43f5e" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{t('userMgmtTitle')}</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Role-based Access Control</p>
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
          <UserPlus size={16} />
          <span>{t('addUserBtn')}</span>
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div className="glass-card" style={{ overflow: 'hidden', padding: '0.5rem' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
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
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {u.can_download && <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{t('canDownload')}</span>}
                      {u.can_upload && <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{t('canUpload')}</span>}
                      {u.can_delete && <span style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185', fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{t('canDelete')}</span>}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {u.allowed_paths || '*'}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{u.download_count || 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
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
                  className="form-input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="user">{t('guest')}</option>
                  <option value="admin">{t('admin')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('permissions')}</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.3rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.can_download}
                    onChange={(e) => setFormData({ ...formData, can_download: e.target.checked })}
                  />
                  <span>{t('canDownload')}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.3rem' }}>
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

              <div className="form-group">
                <label className="form-label">{t('allowedPathsHint')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.allowed_paths}
                  onChange={(e) => setFormData({ ...formData, allowed_paths: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
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
