import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, getToken, normalizeUploadError } from '../apis/client';
import '../styles/pages/admin-common.css';

function AdminAddSeriesPage() {
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
  const [countries, setCountries] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreIds, setGenreIds] = useState([]);
  const [persons, setPersons] = useState([]);
  const [actorIds, setActorIds] = useState([]);
  const [directorIds, setDirectorIds] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [countriesRes, genresRes, personsRes] = await Promise.all([
          fetch(`${API_BASE}/api/countries`),
          fetch(`${API_BASE}/api/genres`),
          fetch(`${API_BASE}/api/persons`),
        ]);
        const cData = countriesRes.ok ? await countriesRes.json() : [];
        const gData = genresRes.ok ? await genresRes.json() : [];
        const pData = personsRes.ok ? await personsRes.json() : [];
        setCountries(Array.isArray(cData) ? cData : []);
        setGenres(Array.isArray(gData) ? gData : []);
        setPersons(Array.isArray(pData) ? pData : []);
      } catch (err) {
        setError(err.message || 'Không tải được dữ liệu phụ trợ');
      }
    }
    load();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Upload ảnh thất bại');
      }
      const data = await res.json();
      setForm((prev) => ({ ...prev, [field]: data.image_url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadTrailerFile(file) {
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
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin để tạo series');
      return;
    }
    try {
      const payload = {
        ...form,
        release_year: form.release_year ? Number(form.release_year) : null,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      };
      const res = await fetch(`${API_BASE}/api/series`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const created = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(created.message || 'Tạo series thất bại');
      }

      const seriesId = created.id;

      if (seriesId && genreIds.length > 0) {
        const genRes = await fetch(`${API_BASE}/api/series/${seriesId}/genres`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ genre_ids: genreIds }),
        });
        if (!genRes.ok) {
          const gErr = await genRes.json().catch(() => ({}));
          throw new Error(gErr.message || 'Gán thể loại thất bại');
        }
      }

      if (seriesId && (actorIds.length || directorIds.length)) {
        const allCast = [
          ...actorIds.map((id) => ({ person_id: id, role: 'actor' })),
          ...directorIds.map((id) => ({ person_id: id, role: 'director' })),
        ];
        for (const item of allCast) {
          // eslint-disable-next-line no-await-in-loop
          const castRes = await fetch(`${API_BASE}/api/series/${seriesId}/cast`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(item),
          });
          if (!castRes.ok) break;
        }
      }

      setMessage(`Đã tạo series #${seriesId}.`);
      // Sau khi tạo xong quay lại danh sách, không vào trang /admin/series/:id nữa
      navigate('/admin/series');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page" style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1>Thêm series mới</h1>
      {message && <p className="admin-msg-success">{message}</p>}
      {error && <p className="admin-msg-error">{error}</p>}

      <form onSubmit={handleSubmit} className="admin-form-col">
        <label className="admin-form-label">
          Tên series *
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </label>

        <label className="admin-form-label">
          Mô tả
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
          />
        </label>

        <div className="admin-form-row">
          <label className="admin-form-label" style={{ flex: 1 }}>
            Ảnh bìa (thumbnail)
            <input
              type="text"
              name="thumbnail_url"
              placeholder="/uploads/images/..."
              value={form.thumbnail_url}
              onChange={handleChange}
            />
          </label>
          <div style={{ minWidth: 200 }}>
            <span className="admin-upload-hint">Hoặc chọn file ảnh</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'thumbnail_url')}
            />
          </div>
        </div>

        <div className="admin-form-row">
          <label className="admin-form-label" style={{ flex: 1 }}>
            Banner ngang
            <input
              type="text"
              name="banner_url"
              placeholder="/uploads/images/..."
              value={form.banner_url}
              onChange={handleChange}
            />
          </label>
          <div style={{ minWidth: 200 }}>
            <span className="admin-upload-hint">Hoặc chọn file banner</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'banner_url')}
            />
          </div>
        </div>

        <fieldset className="admin-fieldset">
          <legend>Thông tin chi tiết</legend>
          <div className="admin-form-row">
            <label className="admin-form-label" style={{ flex: 1, minWidth: 140 }}>
              Năm sản xuất
              <input
                type="number"
                name="release_year"
                placeholder="vd: 2024"
                value={form.release_year}
                onChange={handleChange}
              />
            </label>
            <label className="admin-form-label" style={{ flex: 1, minWidth: 160 }}>
              Thời lượng trung bình 1 tập (phút)
              <input
                type="number"
                name="duration_minutes"
                placeholder="vd: 45"
                value={form.duration_minutes}
                onChange={handleChange}
              />
            </label>
          </div>
          <div className="admin-form-row">
            <label className="admin-form-label" style={{ flex: 1, minWidth: 140 }}>
              Age rating
              <input
                type="text"
                name="age_rating"
                placeholder="vd: 13+"
                value={form.age_rating}
                onChange={handleChange}
              />
            </label>
            <label className="admin-form-label" style={{ flex: 1, minWidth: 200 }}>
              Quốc gia sản xuất
              <select
                name="country_code"
                value={form.country_code}
                onChange={handleChange}
              >
                <option value="">-- Chọn quốc gia --</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>Trailer</legend>
          <label className="admin-form-label">
            Trailer local (Hero banner)
            <input
              type="text"
              name="trailer_url"
              placeholder="/uploads/videos/... (sau khi upload)"
              value={form.trailer_url}
              onChange={handleChange}
            />
          </label>
          <label className="admin-form-label">
            Trailer YouTube (trang chi tiết)
            <input
              type="text"
              name="trailer_youtube_url"
              placeholder="https://youtube.com/..."
              value={form.trailer_youtube_url}
              onChange={handleChange}
            />
          </label>
          <label className="admin-form-label">
            Hoặc chọn file trailer để upload
            <input
              type="file"
              accept="video/*"
              onChange={(e) => e.target.files[0] && uploadTrailerFile(e.target.files[0])}
            />
          </label>
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>Thể loại & hiển thị</legend>
          <label className="admin-form-label">
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
          </label>
          <label className="admin-label-inline">
            <input
              type="checkbox"
              name="is_featured"
              checked={form.is_featured}
              onChange={handleChange}
            />
            Hiển thị nổi bật (featured)
          </label>
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend>Diễn viên & Đạo diễn</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Diễn viên (chọn nhiều)</h4>
              <div
                style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  border: '1px solid #444',
                  borderRadius: 4,
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {persons
                  .filter((p) => p.person_type !== 'director')
                  .map((p) => {
                    const checked = actorIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setActorIds((prev) =>
                              e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                            );
                          }}
                        />
                        {p.name}
                      </label>
                    );
                  })}
                {persons.filter((p) => p.person_type !== 'director').length === 0 && (
                  <span className="admin-fieldset-hint">
                    Chưa có diễn viên. Hãy thêm tại trang Quản lý diễn viên &amp; đạo diễn.
                  </span>
                )}
              </div>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Đạo diễn (chọn nhiều)</h4>
              <div
                style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  border: '1px solid #444',
                  borderRadius: 4,
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {persons
                  .filter((p) => p.person_type === 'director')
                  .map((p) => {
                    const checked = directorIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setDirectorIds((prev) =>
                              e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                            );
                          }}
                        />
                        {p.name}
                      </label>
                    );
                  })}
                {persons.filter((p) => p.person_type === 'director').length === 0 && (
                  <span className="admin-fieldset-hint">
                    Chưa có đạo diễn. Hãy thêm tại trang Quản lý diễn viên &amp; đạo diễn.
                  </span>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        {uploading && <span className="admin-upload-hint">Đang upload...</span>}

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn-submit">
            Lưu series
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/series')}
          >
            Quay lại danh sách
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminAddSeriesPage;

