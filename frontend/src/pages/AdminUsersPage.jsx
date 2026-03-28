import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getToken } from '../apis/client';
import '../styles/pages/admin-common.css';
import '../styles/pages/admin-dashboard.css';

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleString('vi-VN');
}

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api('GET', '/api/admin/users');
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function toggleAdmin(user) {
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin');
      return;
    }
    try {
      const updated = await api('PATCH', `/api/admin/users/${user.id}`, {
        is_admin: !user.is_admin,
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleLocked(user) {
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin');
      return;
    }
    try {
      const updated = await api('PATCH', `/api/admin/users/${user.id}`, {
        locked: !user.locked,
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="admin-page"><p>Đang tải...</p></div>;
  if (error) return <div className="admin-page"><p className="admin-msg-error">{error}</p></div>;

  return (
    <div className="admin-page">
      <h1>Quản lý người dùng (Admin)</h1>
      <p style={{ color: '#aaa', marginBottom: '16px' }}>
        Danh sách tất cả tài khoản: đăng ký email hoặc đăng nhập Google.
      </p>
      <Link to="/admin" style={{ color: '#aaa', marginBottom: '16px', display: 'block' }}>← Quay lại Admin</Link>

      <table className="admin-table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Ảnh</th>
            <th>Email</th>
            <th>Họ tên</th>
            <th>Đăng nhập bằng</th>
            <th>Admin</th>
            <th>Khóa</th>
            <th>Ngày tạo</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    color: '#888',
                    fontWeight: 600,
                  }}
                >
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (u.full_name || u.email || '?').charAt(0).toUpperCase()
                  )}
                </div>
              </td>
              <td>{u.email}</td>
              <td>{u.full_name || '—'}</td>
              <td>
                {u.auth_source === 'google' ? (
                  <span style={{ color: '#34a853', fontWeight: 500 }}>Google</span>
                ) : (
                  <span style={{ color: '#888' }}>Email</span>
                )}
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => toggleAdmin(u)}
                  className={u.is_admin ? 'admin-btn-danger' : 'admin-btn admin-btn--secondary'}
                  style={{ padding: '4px 8px', fontSize: 12 }}
                >
                  {u.is_admin ? 'Bỏ admin' : 'Thêm admin'}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => toggleLocked(u)}
                  className={u.locked ? 'admin-btn-danger' : 'admin-btn admin-btn--secondary'}
                  style={{ padding: '4px 8px', fontSize: 12 }}
                >
                  {u.locked ? 'Mở khóa' : 'Khóa'}
                </button>
              </td>
              <td className="admin-td-muted">{formatDate(u.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminUsersPage;
