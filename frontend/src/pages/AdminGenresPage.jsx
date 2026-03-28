import { useEffect, useState } from 'react';
import { api, API_BASE, getToken } from '../apis/client';
import '../styles/pages/admin-common.css';

function AdminGenresPage() {
  const [genres, setGenres] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/genres`);
        if (!res.ok) throw new Error('Không tải được danh sách thể loại');
        const data = await res.json();
        setGenres(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin để thao tác genres');
      return;
    }
    try {
      const payload = {
        name,
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
      };

      if (editId) {
        const updated = await api('PUT', `/api/genres/${editId}`, payload);
        setGenres((prev) => prev.map((g) => (g.id === editId ? updated : g)));
      } else {
        const created = await api('POST', '/api/genres', payload);
        setGenres((prev) => [...prev, created]);
      }
      setName('');
      setDescription('');
      setThumbnailUrl('');
      setEditId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleThumbnailFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const token = getToken();
      if (!token) {
        setError('Cần đăng nhập admin để upload ảnh');
        return;
      }
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_BASE}/api/upload/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Upload ảnh thất bại');
      }
      const data = await res.json();
      setThumbnailUrl(data.image_url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Xoá thể loại này?')) return;
    try {
      await api('DELETE', `/api/genres/${id}`);
      setGenres((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(genre) {
    setEditId(genre.id);
    setName(genre.name);
    setDescription(genre.description || '');
    setThumbnailUrl(genre.thumbnail_url || '');
  }

  return (
    <div className="admin-page admin-page--narrow">
      <h1>Quản lý thể loại (Admin)</h1>
      {error && <p className="admin-msg-error">{error}</p>}

      <form onSubmit={handleSubmit} className="admin-form-col">
        <input
          type="text"
          placeholder="Tên thể loại..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="admin-input"
        />
        <textarea
          placeholder="Mô tả (tuỳ chọn)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="admin-input"
        />
        <div className="admin-form-col">
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailFileChange}
          />
          <input
            type="text"
            placeholder="Ảnh bìa (thumbnail URL)..."
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            className="admin-input"
          />
          {uploading && <span className="admin-upload-hint">Đang upload ảnh...</span>}
        </div>
        <div className="admin-form-actions">
          <button type="submit" disabled={!name.trim()}>
            {editId ? 'Cập nhật' : 'Thêm mới'}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => {
                setEditId(null);
                setName('');
                setDescription('');
                setThumbnailUrl('');
              }}
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      {loading && <p>Đang tải...</p>}
      {!loading && genres.length === 0 && <p>Chưa có thể loại nào.</p>}

      {!loading && genres.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Mô tả</th>
              <th>Ảnh bìa</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {genres.map((g) => (
              <tr key={g.id}>
                <td>{g.id}</td>
                <td>{g.name}</td>
                <td className="admin-td-muted">
                  {g.description || <span>—</span>}
                </td>
                <td>
                  {g.thumbnail_url ? (
                    <img
                      src={`${API_BASE}${g.thumbnail_url}`}
                      alt={g.name}
                      className="admin-thumb-sm"
                    />
                  ) : (
                    <span className="admin-td-muted">—</span>
                  )}
                </td>
                <td>
                  <button type="button" onClick={() => startEdit(g)} className="admin-btn-link">
                    Sửa
                  </button>
                  <button type="button" onClick={() => handleDelete(g.id)} className="admin-btn-danger">
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

export default AdminGenresPage;

