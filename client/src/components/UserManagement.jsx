import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Lock, Trash2, Edit3, CheckCircle, XCircle, Download, Upload, Folder, Key, X, HardDrive } from 'lucide-react';

export default function UserManagement({ token, currentUser }) {
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
      if (!res.ok) throw new Error(data.error || '获取用户列表失败');
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
      if (!res.ok) throw new Error(data.error || '添加用户失败');

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
      if (!res.ok) throw new Error(data.error || '更新用户失败');

      setEditUser(null);
      resetForm();
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (userId === currentUser.id) {
      alert('无法删除您当前登录的账号');
      return;
    }
    if (!window.confirm('确定要删除该用户吗？')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '删除用户失败');
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
      can_download: u.can_download,
      can_upload: u.can_upload,
      can_delete: u.can_delete,
      allowed_paths: u.allowed_paths,
      is_active: u.is_active
    });
  };

  return (
    <div>
      <div className="glass-card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 600 }}>用户与权限管理</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>管理账号分布与细粒度权限配置</p>
          </div>

          <button className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }} onClick={() => { resetForm(); setShowAddModal(true); }}>
            <UserPlus size={15} />
            <span>添加新用户</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* User Container */}
      <div className="glass-card" style={{ overflow: 'hidden', padding: '0.5rem' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>加载用户数据...</div>
        ) : (
          <>
            {/* MOBILE USER CARDS VIEW (< 768px) */}
            <div className="mobile-file-grid">
              {users.map((u) => (
                <div key={u.id} style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem'
                }}>
                  {/* Top Bar: User Name & Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={18} color="var(--primary)" />
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{u.username}</span>
                      <span className={`role-tag ${u.role}`}>
                        {u.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </div>

                    <div>
                      {u.is_active ? (
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          <CheckCircle size={13} /> 正常
                        </span>
                      ) : (
                        <span style={{ color: '#f43f5e', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          <XCircle size={13} /> 禁用
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Permissions & Paths info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>功能权限:</span>
                      <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: u.can_download ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: u.can_download ? '#34d399' : '#f87171' }}>
                        下载 {u.can_download ? '✓' : '✗'}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: u.can_upload ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.05)', color: u.can_upload ? '#22d3ee' : 'var(--text-dim)' }}>
                        上传 {u.can_upload ? '✓' : '✗'}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: u.can_delete ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.05)', color: u.can_delete ? '#f87171' : 'var(--text-dim)' }}>
                        删除 {u.can_delete ? '✓' : '✗'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>目录可访问范围: <b style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{u.allowed_paths}</b></span>
                      <span>累计下载: <b style={{ color: 'var(--primary)' }}>{u.download_count} 次</b></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }} onClick={() => openEditModal(u)}>
                      <Edit3 size={14} color="#06b6d4" />
                      <span>编辑权限</span>
                    </button>

                    {u.id !== currentUser.id && (
                      <button className="btn btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }} onClick={() => handleDelete(u.id)}>
                        <Trash2 size={14} />
                        <span>删除账号</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP USER TABLE VIEW (>= 768px) */}
            <table className="desktop-file-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>用户名称</th>
                  <th style={{ padding: '0.85rem 1rem', width: '100px' }}>角色</th>
                  <th style={{ padding: '0.85rem 1rem' }}>功能权限</th>
                  <th style={{ padding: '0.85rem 1rem' }}>路径范围</th>
                  <th style={{ padding: '0.85rem 1rem', width: '90px' }}>下载次数</th>
                  <th style={{ padding: '0.85rem 1rem', width: '80px' }}>状态</th>
                  <th style={{ padding: '0.85rem 1rem', width: '110px', textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={16} color="var(--primary)" />
                        <span>{u.username}</span>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`role-tag ${u.role}`}>
                        {u.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: u.can_download ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: u.can_download ? '#34d399' : '#f87171' }}>
                          下载 {u.can_download ? '✓' : '✗'}
                        </span>
                        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: u.can_upload ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.05)', color: u.can_upload ? '#22d3ee' : 'var(--text-dim)' }}>
                          上传 {u.can_upload ? '✓' : '✗'}
                        </span>
                        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: u.can_delete ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.05)', color: u.can_delete ? '#f87171' : 'var(--text-dim)' }}>
                          删除 {u.can_delete ? '✓' : '✗'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {u.allowed_paths === '*' ? '全部路径 (*)' : u.allowed_paths}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--primary)' }}>
                      {u.download_count} 次
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      {u.is_active ? (
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.78rem' }}>
                          <CheckCircle size={13} /> 正常
                        </span>
                      ) : (
                        <span style={{ color: '#f43f5e', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.78rem' }}>
                          <XCircle size={13} /> 禁用
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                        <button className="btn btn-secondary btn-icon" onClick={() => openEditModal(u)} title="编辑权限">
                          <Edit3 size={15} color="#06b6d4" />
                        </button>

                        {u.id !== currentUser.id && (
                          <button className="btn btn-danger btn-icon" onClick={() => handleDelete(u.id)} title="删除用户">
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
              <h3 className="modal-title">{editUser ? `编辑用户: ${editUser.username}` : '添加新用户'}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => { setShowAddModal(false); setEditUser(null); }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={editUser ? handleEditSubmit : handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">用户名</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{editUser ? '新密码 (留空保持原密码)' : '密码'}</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editUser}
                />
              </div>

              <div className="form-group">
                <label className="form-label">角色权限</label>
                <select
                  className="form-input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="user">普通用户 (User)</option>
                  <option value="admin">系统管理员 (Admin)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">细粒度功能开关</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.can_download}
                      onChange={(e) => setFormData({ ...formData, can_download: e.target.checked })}
                    />
                    <span>允许下载文件 (Can Download)</span>
                  </label>

                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.can_upload}
                      onChange={(e) => setFormData({ ...formData, can_upload: e.target.checked })}
                    />
                    <span>允许上传文件/文件夹 (Can Upload)</span>
                  </label>

                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.can_delete}
                      onChange={(e) => setFormData({ ...formData, can_delete: e.target.checked })}
                    />
                    <span>允许删除文件与目录 (Can Delete)</span>
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.85rem' }}>
                <label className="form-label">目录访问限制 (路径匹配)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如: * 代表全部，或 Documents"
                  value={formData.allowed_paths}
                  onChange={(e) => setFormData({ ...formData, allowed_paths: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddModal(false); setEditUser(null); }}>取消</button>
                <button type="submit" className="btn btn-primary">保存设置</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
