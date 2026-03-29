import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE, getToken } from '../apis/client';

function AdminMoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/movies`);
        if (!res.ok) {
          throw new Error('Không tải được danh sách phim');
        }
        const data = await res.json();
        setMovies(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDelete(id) {
    if (!window.confirm('Bạn có chắc muốn xoá phim này?')) return;
    const token = getToken();
    if (!token) {
      alert('Bạn cần đăng nhập với tài khoản admin để xoá.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/movies/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Xoá phim thất bại');
      }
      setMovies((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1>Quản lý phim (Admin)</h1>
      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => navigate('/admin/movies/new')}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          + Thêm phim mới
        </button>
      </div>

      {loading && <p>Đang tải danh sách phim...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && movies.length === 0 && <p>Chưa có phim nào.</p>}

      {!loading && movies.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>ID</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Tiêu đề</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Năm</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Age</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Featured</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {movies.map((m) => (
              <tr key={m.id}>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{m.id}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{m.title}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{m.release_year || '-'}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{m.age_rating || '-'}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{m.is_featured ? '✓' : ''}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                  <Link to={`/movies/${m.id}`} style={{ marginRight: '8px' }}>
                    Xem
                  </Link>
                  <Link
                    to={`/admin/movies/${m.id}/edit`}
                    style={{ marginRight: '8px' }}
                  >
                    Sửa
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminMoviesPage;

