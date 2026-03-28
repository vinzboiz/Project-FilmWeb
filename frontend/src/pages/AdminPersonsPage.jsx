import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE, getToken } from '../apis/client';

function AdminPersonsPage() {
  const [persons, setPersons] = useState([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [biography, setBiography] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [personType, setPersonType] = useState('actor');
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function loadPersons(q = '') {
    let url = `${API_BASE}/api/persons`;
    if (q) url += `?q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không tải được danh sách');
    const data = await res.json();
    setPersons(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadPersons(search).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  async function handleSearch(e) {
    e?.preventDefault();
    setLoading(true);
    try {
      await loadPersons(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin để thao tác');
      return;
    }
    try {
      const payload = {
        name: name.trim(),
        biography: biography.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        person_type: personType,
      };
      if (editId) {
        const updated = await api('PUT', `/api/persons/${editId}`, payload);
        setPersons((prev) => prev.map((p) => (p.id === editId ? updated : p)));
      } else {
        const created = await api('POST', '/api/persons', payload);
        setPersons((prev) => [...prev, created]);
      }
      setName('');
      setBiography('');
      setAvatarUrl('');
      setPersonType('actor');
      setEditId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAvatarFileChange(e) {
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
      setAvatarUrl(data.image_url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Xoá diễn viên này? Các vai diễn liên quan sẽ bị xoá.')) return;
    try {
      await api('DELETE', `/api/persons/${id}`);
      setPersons((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(p) {
    setEditId(p.id);
    setName(p.name || '');
    setBiography(p.biography || '');
    setAvatarUrl(p.avatar_url || '');
    setPersonType(p.person_type === 'director' ? 'director' : 'actor');
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Quản lý diễn viên & đạo diễn</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSearch} style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Tìm theo tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px', flex: 1 }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>Tìm kiếm</button>
      </form>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', padding: '16px', border: '1px solid #444', borderRadius: '8px' }}
      >
        <h3>{editId ? 'Chỉnh sửa' : 'Thêm mới'}</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span>Loại:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="radio" name="personType" value="actor" checked={personType === 'actor'} onChange={() => setPersonType('actor')} />
            Diễn viên
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="radio" name="personType" value="director" checked={personType === 'director'} onChange={() => setPersonType('director')} />
            Đạo diễn
          </label>
        </div>
        <label>
          Tên *
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </label>
        <label>
          Tiểu sử
          <textarea
            value={biography}
            onChange={(e) => setBiography(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px', minHeight: '80px' }}
          />
        </label>
        <label>
          Ảnh đại diện
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
            <input type="file" accept="image/*" onChange={handleAvatarFileChange} />
            <input
              type="text"
              placeholder="URL hoặc upload file..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              style={{ flex: 1, padding: '8px' }}
            />
          </div>
          {uploading && <span style={{ fontSize: '12px', color: '#aaa' }}>Đang upload...</span>}
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" disabled={!name.trim()} style={{ padding: '8px 16px' }}>
            {editId ? 'Cập nhật' : 'Thêm mới'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setName(''); setBiography(''); setAvatarUrl(''); setPersonType('actor'); }} style={{ padding: '8px 12px' }}>
              Hủy
            </button>
          )}
        </div>
      </form>

      {loading && <p>Đang tải...</p>}

      {!loading && (
        <>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ marginBottom: '12px', fontSize: '18px' }}>Danh sách diễn viên</h2>
            {persons.filter((p) => p.person_type !== 'director').length === 0 ? (
              <p style={{ color: '#888' }}>Chưa có diễn viên nào.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>ID</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Ảnh</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Tên</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Tiểu sử</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.filter((p) => p.person_type !== 'director').map((p) => (
                    <tr key={p.id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>{p.id}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>
                        {p.avatar_url ? (
                          <img src={p.avatar_url.startsWith('http') ? p.avatar_url : `${API_BASE}${p.avatar_url}`} alt={p.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : <span style={{ color: '#888' }}>—</span>}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #333' }}><Link to={`/persons/${p.id}`} style={{ color: '#fff' }}>{p.name}</Link></td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #333', fontSize: '13px', maxWidth: '300px' }}>{p.biography ? `${p.biography.slice(0, 80)}${p.biography.length > 80 ? '...' : ''}` : '—'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>
                        <button type="button" onClick={() => startEdit(p)} style={{ marginRight: '8px' }}>Sửa</button>
                        <button type="button" onClick={() => handleDelete(p.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Xoá</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 style={{ marginBottom: '12px', fontSize: '18px' }}>Danh sách đạo diễn</h2>
            {persons.filter((p) => p.person_type === 'director').length === 0 ? (
              <p style={{ color: '#888' }}>Chưa có đạo diễn nào.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>ID</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Ảnh</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Tên</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Tiểu sử</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.filter((p) => p.person_type === 'director').map((p) => (
                    <tr key={p.id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>{p.id}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>
                        {p.avatar_url ? (
                          <img src={p.avatar_url.startsWith('http') ? p.avatar_url : `${API_BASE}${p.avatar_url}`} alt={p.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : <span style={{ color: '#888' }}>—</span>}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #333' }}><Link to={`/persons/${p.id}`} style={{ color: '#fff' }}>{p.name}</Link></td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #333', fontSize: '13px', maxWidth: '300px' }}>{p.biography ? `${p.biography.slice(0, 80)}${p.biography.length > 80 ? '...' : ''}` : '—'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>
                        <button type="button" onClick={() => startEdit(p)} style={{ marginRight: '8px' }}>Sửa</button>
                        <button type="button" onClick={() => handleDelete(p.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Xoá</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <p style={{ marginTop: '16px' }}>
        <Link to="/admin" style={{ color: '#aaa' }}>← Quay lại Admin</Link>
      </p>
    </div>
  );
}

export default AdminPersonsPage;
