import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE, getToken, normalizeUploadError } from '../apis/client';

function AdminEditSeriesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    banner_url: '',
    trailer_url: '',
    trailer_youtube_url: '',
    age_rating: '',
    release_year: '',
    country_code: '',
    duration_minutes: '',
    is_featured: false,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreIds, setGenreIds] = useState([]);
  const [cast, setCast] = useState([]);
  const [persons, setPersons] = useState([]);
  const [addActorIds, setAddActorIds] = useState([]);
  const [addDirectorIds, setAddDirectorIds] = useState([]);
  const [addingActors, setAddingActors] = useState(false);
  const [addingDirectors, setAddingDirectors] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [seriesRes, personsRes, countriesRes, genresRes] = await Promise.all([
          fetch(`${API_BASE}/api/series/${id}`),
          fetch(`${API_BASE}/api/persons`),
          fetch(`${API_BASE}/api/countries`),
          fetch(`${API_BASE}/api/genres`),
        ]);
        if (!seriesRes.ok) throw new Error('Không tải được series');
        const data = await seriesRes.json();
        setForm({
          title: data.title || '',
          description: data.description || '',
          thumbnail_url: data.thumbnail_url || '',
          banner_url: data.banner_url || '',
          trailer_url: data.trailer_url || '',
          trailer_youtube_url: data.trailer_youtube_url || '',
          age_rating: data.age_rating || '',
          release_year: data.release_year != null ? String(data.release_year) : '',
          country_code: data.country_code || '',
          duration_minutes: data.duration_minutes != null ? String(data.duration_minutes) : '',
          is_featured: !!data.is_featured,
        });
        setGenreIds(Array.isArray(data.genres) ? data.genres.map((g) => g.id) : []);
        setCast(Array.isArray(data.cast) ? data.cast : []);
        const pData = personsRes.ok ? await personsRes.json() : [];
        setPersons(Array.isArray(pData) ? pData : []);
        const cData = countriesRes.ok ? await countriesRes.json() : [];
        setCountries(Array.isArray(cData) ? cData : []);
        const gData = genresRes.ok ? await genresRes.json() : [];
        setGenres(Array.isArray(gData) ? gData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/series/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Cập nhật thất bại');
      }
      const genRes = await fetch(`${API_BASE}/api/series/${id}/genres`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ genre_ids: genreIds }),
      });
      if (!genRes.ok) {
        const d = await genRes.json().catch(() => ({}));
        throw new Error(d.message || 'Cập nhật thể loại thất bại');
      }
      setMessage('Đã lưu series.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadImage(file, field) {
    setUploading(true);
    setError('');
    try {
      const token = getToken();
      if (!token) {
        setError('Cần đăng nhập admin để upload ảnh');
        return;
      }
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${API_BASE}/api/upload/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload ảnh thất bại');
      const data = await res.json();
      setForm((prev) => ({ ...prev, [field]: data.image_url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleAddActors() {
    if (!addActorIds.length) return;
    setError('');
    setAddingActors(true);
    const token = getToken();
    for (const personId of addActorIds) {
      try {
        const res = await fetch(`${API_BASE}/api/series/${id}/cast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ person_id: Number(personId), role: 'actor' }),
        });
        if (!res.ok) throw new Error('Thêm diễn viên thất bại');
        const p = persons.find((x) => x.id === Number(personId));
        setCast((prev) => [...prev, { id: p?.id, name: p?.name, avatar_url: p?.avatar_url, role: 'actor' }]);
      } catch (err) {
        setError(err.message);
        break;
      }
    }
    setAddActorIds([]);
    setAddingActors(false);
  }

  async function handleAddDirectors() {
    if (!addDirectorIds.length) return;
    setError('');
    setAddingDirectors(true);
    const token = getToken();
    for (const personId of addDirectorIds) {
      try {
        const res = await fetch(`${API_BASE}/api/series/${id}/cast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ person_id: Number(personId), role: 'director' }),
        });
        if (!res.ok) throw new Error('Thêm đạo diễn thất bại');
        const p = persons.find((x) => x.id === Number(personId));
        setCast((prev) => [...prev, { id: p?.id, name: p?.name, avatar_url: p?.avatar_url, role: 'director' }]);
      } catch (err) {
        setError(err.message);
        break;
      }
    }
    setAddDirectorIds([]);
    setAddingDirectors(false);
  }

  async function handleRemoveCast(personId) {
    setError('');
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/series/${id}/cast/${personId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Xoá thất bại');
      setCast((prev) => prev.filter((c) => c.id !== personId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div style={{ padding: '24px', color: '#fff' }}>Đang tải...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto', color: '#fff', minHeight: '60vh' }}>
      <h1 style={{ color: '#fff' }}>Chỉnh sửa series #{id}</h1>
      {message && <p style={{ color: '#0f0' }}>{message}</p>}
      {error && <p style={{ color: '#f44' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <label>
          Tên series *
          <input type="text" name="title" value={form.title} onChange={handleChange} required style={{ display: 'block', width: '100%', padding: '8px' }} />
        </label>
        <label>
          Mô tả
          <textarea name="description" value={form.description} onChange={handleChange} style={{ display: 'block', width: '100%', padding: '8px', minHeight: 80 }} />
        </label>
        <label>
          Ảnh bìa (thumbnail)
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'thumbnail_url')} />
            <input type="text" name="thumbnail_url" value={form.thumbnail_url} onChange={handleChange} style={{ flex: 1, minWidth: 200, padding: '8px' }} />
          </div>
        </label>
        <label>
          Banner ngang
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'banner_url')} />
            <input type="text" name="banner_url" value={form.banner_url} onChange={handleChange} style={{ flex: 1, minWidth: 200, padding: '8px' }} />
          </div>
        </label>
        <label>
          Trailer (của toàn bộ series)
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" accept="video/*" onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              setUploading(true);
              setError('');
              try {
                const token = getToken();
                if (!token) {
                  setError('Cần đăng nhập admin để upload trailer');
                  return;
                }
                const fd = new FormData();
                fd.append('video', file);
                const res = await fetch(`${API_BASE}/api/upload/video`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                  body: fd,
                });
                if (!res.ok) {
                  const d = await res.json().catch(() => ({}));
                  throw new Error(d.message || 'Upload trailer thất bại');
                }
                const data = await res.json();
                setForm((prev) => ({ ...prev, trailer_url: data.video_url }));
              } catch (err) {
                setError(normalizeUploadError(err));
              } finally {
                setUploading(false);
              }
              e.target.value = '';
            }} />
            <input type="text" name="trailer_url" value={form.trailer_url} onChange={handleChange} placeholder="/uploads/videos/... (Hero)" style={{ flex: 1, minWidth: 200, padding: '8px' }} />
          </div>
        </label>
        <label>
          Trailer YouTube URL (trang chi tiết)
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="text" name="trailer_youtube_url" value={form.trailer_youtube_url} onChange={handleChange} placeholder="https://youtube.com/..." style={{ flex: 1, minWidth: 200, padding: '8px' }} />
          </div>
        </label>
        <label>
          Năm sản xuất
          <input type="number" name="release_year" value={form.release_year} onChange={handleChange} placeholder="vd: 2008" min="1900" max="2100" style={{ padding: '8px', width: '100px' }} />
        </label>
        <label>
          Quốc gia sản xuất
          <select name="country_code" value={form.country_code} onChange={handleChange} style={{ display: 'block', marginTop: '4px', padding: '8px', minWidth: '200px' }}>
            <option value="">-- Chọn quốc gia --</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          Thời lượng trung bình 1 tập (phút)
          <input type="number" name="duration_minutes" value={form.duration_minutes} onChange={handleChange} placeholder="vd: 45" min="1" max="300" style={{ padding: '8px', width: '100px' }} />
        </label>
        <label>
          Age rating (vd: 13+)
          <input type="text" name="age_rating" value={form.age_rating} onChange={handleChange} style={{ padding: '8px' }} />
        </label>
        <label>
          Thể loại
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: '4px' }}>
            {genres.map((g) => {
              const checked = genreIds.includes(g.id);
              return (
                <label
                  key={g.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setGenreIds((prev) =>
                        e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id),
                      );
                    }}
                  />
                  {g.name}
                </label>
              );
            })}
          </div>
          <span style={{ fontSize: 12, color: '#888' }}>Có thể chọn nhiều thể loại cho series.</span>
        </label>
        <label>
          <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleChange} /> Featured
        </label>

        <fieldset style={{ border: '1px solid #444', padding: '12px' }}>
          <legend>Diễn viên &amp; Đạo diễn (của toàn bộ series)</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Diễn viên</h4>
              <div style={{ marginBottom: 10 }}>
                {cast.filter((c) => c.role === 'actor').map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <>{c.avatar_url && <img src={c.avatar_url.startsWith('http') ? c.avatar_url : `${API_BASE}${c.avatar_url}`} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />}
                    <span style={{ fontSize: 13 }}>{c.name}</span>
                    <button type="button" onClick={() => handleRemoveCast(c.id)} style={{ marginLeft: 'auto', color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Xoá</button></>
                  </div>
                ))}
                {cast.filter((c) => c.role === 'actor').length === 0 && <span style={{ color: '#888', fontSize: 13 }}>Chưa có</span>}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid #444',
                  padding: 6,
                  borderRadius: 4,
                  marginBottom: 6,
                }}
              >
                {persons
                  .filter((p) => p.person_type !== 'director' && !cast.some((c) => c.id === p.id))
                  .map((p) => {
                    const checked = addActorIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setAddActorIds((prev) =>
                              e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                            );
                          }}
                        />
                        {p.name}
                      </label>
                    );
                  })}
                {persons.filter((p) => p.person_type !== 'director' && !cast.some((c) => c.id === p.id)).length === 0 && (
                  <span style={{ fontSize: 12, color: '#888' }}>Không còn diễn viên nào để thêm.</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddActors}
                disabled={!addActorIds.length || addingActors}
              >
                {addingActors ? 'Đang thêm...' : 'Thêm diễn viên đã chọn'}
              </button>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Đạo diễn</h4>
              <div style={{ marginBottom: 10 }}>
                {cast.filter((c) => c.role === 'director').map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <>{c.avatar_url && <img src={c.avatar_url.startsWith('http') ? c.avatar_url : `${API_BASE}${c.avatar_url}`} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />}
                    <span style={{ fontSize: 13 }}>{c.name}</span>
                    <button type="button" onClick={() => handleRemoveCast(c.id)} style={{ marginLeft: 'auto', color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Xoá</button></>
                  </div>
                ))}
                {cast.filter((c) => c.role === 'director').length === 0 && <span style={{ color: '#888', fontSize: 13 }}>Chưa có</span>}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid #444',
                  padding: 6,
                  borderRadius: 4,
                  marginBottom: 6,
                }}
              >
                {persons
                  .filter((p) => p.person_type === 'director' && !cast.some((c) => c.id === p.id))
                  .map((p) => {
                    const checked = addDirectorIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setAddDirectorIds((prev) =>
                              e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                            );
                          }}
                        />
                        {p.name}
                      </label>
                    );
                  })}
                {persons.filter((p) => p.person_type === 'director' && !cast.some((c) => c.id === p.id)).length === 0 && (
                  <span style={{ fontSize: 12, color: '#888' }}>Không còn đạo diễn nào để thêm.</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddDirectors}
                disabled={!addDirectorIds.length || addingDirectors}
              >
                {addingDirectors ? 'Đang thêm...' : 'Thêm đạo diễn đã chọn'}
              </button>
            </div>
          </div>
        </fieldset>

        {uploading && <span style={{ fontSize: 12, color: '#888' }}>Đang upload...</span>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit">Lưu thay đổi</button>
          <button type="button" onClick={() => navigate('/admin/series')}>Quay lại danh sách</button>
          <button type="button" onClick={() => navigate(`/admin/series/${id}`)}>Quản lý tập</button>
        </div>
      </form>
    </div>
  );
}

export default AdminEditSeriesPage;
