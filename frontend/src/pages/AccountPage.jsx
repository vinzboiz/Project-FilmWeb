import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthContext';
import { api, API_BASE, getToken } from '../apis/client';

function AccountPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn || !getToken()) {
      navigate('/login');
      return;
    }
    async function load() {
      try {
        const data = await api('GET', '/api/auth/me');
        setUser(data);
      } catch (err) {
        setError(err.message || 'Không tải được thông tin tài khoản');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isLoggedIn, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <p>Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Link to="/">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '560px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>Thông tin tài khoản</h1>
      <div
        style={{
          background: 'rgba(30,30,30,0.9)',
          borderRadius: '8px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#333',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              color: '#888',
              fontWeight: 600,
            }}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              (user?.full_name || user?.email || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p style={{ margin: '0 0 4px', color: '#999', fontSize: 12 }}>Họ tên</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 500 }}>{user?.full_name || '—'}</p>
            <p style={{ margin: '12px 0 4px', color: '#999', fontSize: 12 }}>Email</p>
            <p style={{ margin: 0, fontSize: '16px', color: '#ccc' }}>{user?.email || '—'}</p>
          </div>
        </div>
        {user?.is_admin && (
          <p style={{ margin: '0 0 16px', color: '#46d369', fontSize: '14px' }}>
            Tài khoản quản trị
          </p>
        )}
      </div>
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <Link
          to="/profiles"
          style={{
            padding: '10px 20px',
            background: '#e50914',
            color: '#fff',
            borderRadius: '4px',
            textDecoration: 'none',
          }}
        >
          Quản lý hồ sơ
        </Link>
        {user?.is_admin && (
          <Link
            to="/admin"
            style={{
              padding: '10px 20px',
              background: '#333',
              color: '#fff',
              borderRadius: '4px',
              textDecoration: 'none',
            }}
          >
            Quản trị website
          </Link>
        )}
        <Link
          to="/"
          style={{
            padding: '10px 20px',
            background: 'transparent',
            color: '#ccc',
            borderRadius: '4px',
            textDecoration: 'none',
            border: '1px solid #666',
          }}
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}

export default AccountPage;
