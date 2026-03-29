import { useEffect, useState } from 'react';
import { api, apiFormData, API_BASE, getToken, normalizeUploadError } from '../apis/client';
import { useAuth } from '../providers/AuthContext.jsx';
import '../styles/pages/admin-common.css';

function AdminAddMoviePage() {
  const { token: ctxToken } = useAuth();
  const [form, setForm] = useState({
    title: '',
    short_intro: '',
    description: '',
    release_year: '',
    duration_minutes: '',
    thumbnail_url: '',
    banner_url: '',
    trailer_url: '',
    trailer_youtube_url: '',
    video_url: '',
    rating: '',
    age_rating: '',
    country_code: '',
    is_featured: false,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [genres, setGenres] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState([]);
  const [persons, setPersons] = useState([]);
  const [actorIds, setActorIds] = useState([]);
  const [directorIds, setDirectorIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [gRes, cRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/genres`),
          fetch(`${API_BASE}/api/countries`),
          fetch(`${API_BASE}/api/persons`),
        ]);
        if (gRes.ok) {
          const data = await gRes.json();
          setGenres(Array.isArray(data) ? data : []);
        }
        if (cRes.ok) {
          const data = await cRes.json();
          setCountries(Array.isArray(data) ? data : []);
        }
        if (pRes.ok) {
          const data = await pRes.json();
          setPersons(Array.isArray(data) ? data : []);
        }
      } catch {
        // bỏ qua lỗi
      }
    }
    load();
  }, []);

  /** Token từ context + localStorage (tránh race sau khi đăng nhập) */
  function authToken() {
    return ctxToken || getToken();
  }

  async function uploadVideoToServer(file, fieldToSet) {
    if (!authToken()) {
      setError('Cần đăng nhập admin để upload video');
      throw new Error('Cần đăng nhập admin để upload video');
    }
    setError('');
    setMessage('Đang upload...');
    const formData = new FormData();
    formData.append('video', file);
    const data = await apiFormData('POST', '/api/upload/video', formData);
    setForm((prev) => ({ ...prev, [fieldToSet]: data.video_url }));
    return data.video_url;
  }

  async function handleVideoFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await uploadVideoToServer(file, 'video_url');
      setMessage('Upload video chính thành công. Đường dẫn đã gán vào Video URL.');
    } catch (err) {
      console.error(err);
      setError(normalizeUploadError(err));
    }
    e.target.value = '';
  }

  /** Trailer: file video/audio từ máy → lưu cùng thư mục uploads/videos, gán vào trailer_url */
  async function handleTrailerFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await uploadVideoToServer(file, 'trailer_url');
      setMessage('Upload trailer thành công. Đường dẫn đã gán vào Trailer URL.');
    } catch (err) {
      console.error(err);
      setError(normalizeUploadError(err));
    }
    e.target.value = '';
  }

  async function handleThumbnailFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!authToken()) {
      setError('Cần đăng nhập admin để upload ảnh');
      return;
    }
    setError('');
    setMessage('Đang upload ảnh bìa...');

    try {
      const formData = new FormData();
      formData.append('image', file);
      const data = await apiFormData('POST', '/api/upload/image', formData);
      setForm((prev) => ({ ...prev, thumbnail_url: data.image_url }));
      setMessage('Upload ảnh thành công. Đường dẫn đã được gán vào Thumbnail URL.');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  async function handleBannerFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!authToken()) {
      setError('Cần đăng nhập admin để upload ảnh');
      return;
    }
    setError('');
    setMessage('Đang upload ảnh banner...');

    try {
      const formData = new FormData();
      formData.append('image', file);
      const data = await apiFormData('POST', '/api/upload/image', formData);
      setForm((prev) => ({ ...prev, banner_url: data.image_url }));
      setMessage('Upload ảnh banner thành công. Đường dẫn đã được gán vào Banner URL.');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
    e.target.value = '';
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!authToken()) {
      setError('Cần đăng nhập admin để thêm phim');
      return;
    }

    try {
      setSubmitting(true);
      // overlay loading ~3s để đảm bảo video/ảnh vừa upload sync xong
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const created = await api('POST', '/api/movies', {
        ...form,
        release_year: form.release_year ? Number(form.release_year) : null,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        rating: form.rating ? Number(form.rating) : null,
      });

      const movieId = created.id || created.insertId;

      // nếu chọn genres → set genres cho movie
      if (movieId && selectedGenreIds.length > 0) {
        await api('POST', `/api/movies/${movieId}/genres`, {
          genre_ids: selectedGenreIds.map((g) => Number(g)).filter((g) => g > 0),
        });
      }

      // thêm diễn viên & đạo diễn nếu có chọn
      if (movieId) {
        for (const pid of actorIds) {
          await api('POST', `/api/movies/${movieId}/cast`, { person_id: Number(pid), role: 'actor' });
        }
        for (const pid of directorIds) {
          await api('POST', `/api/movies/${movieId}/cast`, { person_id: Number(pid), role: 'director' });
        }
      }

      setMessage(`Đã thêm phim với ID ${movieId || ''}`);
      setForm({
        title: '',
        short_intro: '',
        description: '',
        release_year: '',
        duration_minutes: '',
        thumbnail_url: '',
        banner_url: '',
        trailer_url: '',
        trailer_youtube_url: '',
        video_url: '',
        rating: '',
        age_rating: '',
        country_code: '',
        is_featured: false,
      });
      setSelectedGenreIds([]);
      setActorIds([]);
      setDirectorIds([]);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page admin-page--narrow">
      {submitting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#181818',
              padding: '16px 24px',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
            }}
          >
            Đang xử lý video và lưu phim...
          </div>
        </div>
      )}
      <h1>Thêm phim mới (Admin đơn giản)</h1>
      {message && <p className="admin-msg-success">{message}</p>}
      {error && <p className="admin-msg-error">{error}</p>}
      <form onSubmit={handleSubmit} className="admin-form-col">
        <label className="admin-form-label">
          Tiêu đề *
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </label>
        <label className="admin-form-label">
          Giới thiệu ngắn (hiện trên banner)
          <input
            type="text"
            name="short_intro"
            maxLength={255}
            value={form.short_intro}
            onChange={handleChange}
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
        <label className="admin-form-label">
          Năm phát hành
          <input
            type="number"
            name="release_year"
            value={form.release_year}
            onChange={handleChange}
          />
        </label>
        <label className="admin-form-label">
          Thời lượng (phút)
          <input
            type="number"
            name="duration_minutes"
            value={form.duration_minutes}
            onChange={handleChange}
          />
        </label>
        <fieldset className="admin-fieldset">
          <legend>Ảnh bìa (poster)</legend>
          <label className="admin-form-label">
            <strong>Chọn file ảnh</strong> — upload lên server
            <input type="file" accept="image/*" onChange={handleThumbnailFileChange} />
          </label>
          <label className="admin-form-label">
            Thumbnail URL (sau khi upload hoặc dán link)
            <input type="text" name="thumbnail_url" value={form.thumbnail_url} onChange={handleChange} placeholder="/uploads/images/..." />
          </label>
        </fieldset>
        <fieldset className="admin-fieldset">
          <legend>Banner ngang (ảnh nền trang chi tiết / Home)</legend>
          <label className="admin-form-label">
            <strong>Chọn file ảnh banner</strong>
            <input type="file" accept="image/*" onChange={handleBannerFileChange} />
          </label>
          <label className="admin-form-label">
            Banner URL
            <input type="text" name="banner_url" value={form.banner_url} onChange={handleChange} placeholder="/uploads/images/..." />
          </label>
        </fieldset>
        <fieldset className="admin-fieldset">
          <legend>Trailer</legend>
          <label className="admin-form-label">
            Chọn file từ máy — upload lên server, gán vào Trailer URL (dùng cho Hero banner)
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={handleTrailerFileChange}
            />
            <span className="admin-fieldset-hint">
              Muốn phim xuất hiện ở banner trang chủ, bắt buộc phải upload file (MP4/MP3…) tại đây.
              Field này chỉ dành cho file local dùng cho Hero banner.
            </span>
          </label>
          <label className="admin-form-label">
            Trailer URL (local, sau khi upload — dùng cho Hero)
            <input
              type="text"
              name="trailer_url"
              value={form.trailer_url}
              onChange={handleChange}
              placeholder="/uploads/videos/..."
            />
          </label>
          <label className="admin-form-label">
            Trailer YouTube URL (dùng cho trang chi tiết)
            <input
              type="text"
              name="trailer_youtube_url"
              value={form.trailer_youtube_url}
              onChange={handleChange}
              placeholder="https://youtube.com/..."
            />
          </label>
        </fieldset>
        <fieldset className="admin-fieldset">
          <legend>Video phim (video chính)</legend>
          <label className="admin-form-label">
            <strong>Chọn file video</strong> — upload lên server, gán vào Video URL
            <input type="file" accept="video/*" onChange={handleVideoFileChange} />
          </label>
          <label className="admin-form-label">
            Video URL (sau khi upload hoặc dán link)
            <input type="text" name="video_url" value={form.video_url} onChange={handleChange} placeholder="/uploads/videos/..." />
          </label>
        </fieldset>
        <label className="admin-form-label">
          Rating (VD: 8.5)
          <input
            type="number"
            step="0.1"
            name="rating"
            value={form.rating}
            onChange={handleChange}
          />
        </label>
        <label className="admin-form-label">
          Age rating (VD: 13+)
          <input
            type="text"
            name="age_rating"
            value={form.age_rating}
            onChange={handleChange}
          />
        </label>
        <label className="admin-form-label">
          Quốc gia sản xuất
          <select name="country_code" value={form.country_code} onChange={handleChange}>
            <option value="">-- Chọn quốc gia --</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        {genres.length > 0 && (
          <fieldset className="admin-fieldset">
            <legend>Thể loại</legend>
            <div className="admin-checkbox-wrap">
              {genres.map((g) => (
                <label key={g.id} className="admin-label-inline">
                  <input
                    type="checkbox"
                    checked={selectedGenreIds.includes(g.id)}
                    onChange={(e) => {
                      setSelectedGenreIds((prev) =>
                        e.target.checked
                          ? [...prev, g.id]
                          : prev.filter((id) => id !== g.id)
                      );
                    }}
                  />{' '}
                  {g.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {persons.length > 0 && (
          <fieldset className="admin-fieldset">
            <legend>Diễn viên &amp; Đạo diễn</legend>
            <div className="admin-two-col">
              <div>
                <h4 className="admin-subtitle">Diễn viên</h4>
                <div className="admin-checkbox-scroll">
                  {persons
                    .filter((p) => p.person_type !== 'director')
                    .map((p) => {
                      const checked = actorIds.includes(p.id);
                      return (
                        <label key={p.id} className="admin-label-inline">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setActorIds((prev) =>
                                e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                              );
                            }}
                          />{' '}
                          {p.name}
                        </label>
                      );
                    })}
                </div>
              </div>
              <div>
                <h4 className="admin-subtitle">Đạo diễn</h4>
                <div className="admin-checkbox-scroll">
                  {persons
                    .filter((p) => p.person_type === 'director')
                    .map((p) => {
                      const checked = directorIds.includes(p.id);
                      return (
                        <label key={p.id} className="admin-label-inline">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setDirectorIds((prev) =>
                                e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                              );
                            }}
                          />{' '}
                          {p.name}
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>
          </fieldset>
        )}
        <label className="admin-label-inline">
          <input
            type="checkbox"
            name="is_featured"
            checked={form.is_featured}
            onChange={handleChange}
          />
          Featured (hiển thị nổi bật)
        </label>
        <button type="submit" className="admin-btn-submit" disabled={submitting}>
          {submitting ? 'Đang lưu...' : 'Lưu phim'}
        </button>
      </form>
    </div>
  );
}

export default AdminAddMoviePage;

