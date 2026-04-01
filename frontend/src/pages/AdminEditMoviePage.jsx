import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE, getToken, normalizeUploadError } from '../apis/client';
import IntroRangeSlider from '../components/player/IntroRangeSlider';

function AdminEditMoviePage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    intro_start_seconds: '',
    intro_end_seconds: '',
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const introVideoRef = useRef(null);
  const [introPreviewDuration, setIntroPreviewDuration] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [movieRes, castRes, countriesRes, personsRes, genresRes] = await Promise.all([
          fetch(`${API_BASE}/api/movies/${id}`),
          fetch(`${API_BASE}/api/movies/${id}/cast`),
          fetch(`${API_BASE}/api/countries`),
          fetch(`${API_BASE}/api/persons`),
          fetch(`${API_BASE}/api/genres`),
        ]);
        if (!movieRes.ok) throw new Error('Không tải được thông tin phim');
        const data = await movieRes.json();
        setForm({
          title: data.title || '',
          short_intro: data.short_intro || '',
          description: data.description || '',
          release_year: data.release_year || '',
          duration_minutes: data.duration_minutes || '',
          thumbnail_url: data.thumbnail_url || '',
          banner_url: data.banner_url || '',
          trailer_url: data.trailer_url || '',
          trailer_youtube_url: data.trailer_youtube_url || '',
          video_url: data.video_url || '',
          rating: data.rating || '',
          age_rating: data.age_rating || '',
          country_code: data.country_code || '',
          is_featured: !!data.is_featured,
          intro_start_seconds: data.intro_start_seconds ?? '',
          intro_end_seconds: data.intro_end_seconds ?? '',
        });
        const castData = castRes.ok ? await castRes.json() : [];
        setCast(Array.isArray(castData) ? castData : []);
        const countriesData = countriesRes.ok ? await countriesRes.json() : [];
        setCountries(Array.isArray(countriesData) ? countriesData : []);
        const personsData = personsRes.ok ? await personsRes.json() : [];
        setPersons(Array.isArray(personsData) ? personsData : []);
        setGenreIds(Array.isArray(data.genres) ? data.genres.map((g) => g.id) : []);
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

  async function handleAddActors() {
    if (!addActorIds.length) return;
    setError('');
    setAddingActors(true);
    const token = getToken();
    for (const personId of addActorIds) {
      try {
        const res = await fetch(`${API_BASE}/api/movies/${id}/cast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ person_id: Number(personId), role: 'actor' }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || 'Thêm diễn viên thất bại');
        }
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
        const res = await fetch(`${API_BASE}/api/movies/${id}/cast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ person_id: Number(personId), role: 'director' }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || 'Thêm đạo diễn thất bại');
        }
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
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/movies/${id}/cast/${personId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Xoá cast thất bại');
      setCast((prev) => prev.filter((c) => c.id !== personId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadVideoToServer(file, fieldToSet) {
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin để upload video');
      throw new Error('Cần đăng nhập admin để upload video');
    }
    setError('');
    setMessage('Đang upload video...');
    const formData = new FormData();
    formData.append('video', file);
    const res = await fetch(`${API_BASE}/api/upload/video`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Upload video thất bại.');
    }
    const data = await res.json();
    setForm((prev) => ({ ...prev, [fieldToSet]: data.video_url }));
    setMessage('Upload video thành công.');
  }

  async function handleVideoFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await uploadVideoToServer(file, 'video_url');
    } catch (err) {
      setError(err.message);
    }
    e.target.value = '';
  }

  async function handleTrailerFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await uploadVideoToServer(file, 'trailer_url');
    } catch (err) {
      setError(normalizeUploadError(err));
    }
    e.target.value = '';
  }

  async function uploadImage(file, field) {
    setUploadingImage(true);
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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Upload ảnh thất bại');
      }
      const data = await res.json();
      setForm((prev) => ({ ...prev, [field]: data.image_url }));
      if (field === 'banner_url') {
        setMessage('Upload ảnh banner thành công. Đường dẫn đã được gán vào Banner URL.');
      } else {
        setMessage('Upload ảnh bìa thành công.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleThumbnailFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    await uploadImage(file, 'thumbnail_url');
    e.target.value = '';
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleBannerFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    await uploadImage(file, 'banner_url');
    e.target.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Cần đăng nhập với tài khoản admin');
      }
      await api(
        'PUT',
        `/api/movies/${id}`,
        {
          ...form,
          release_year: form.release_year ? Number(form.release_year) : null,
          duration_minutes: form.duration_minutes
            ? Number(form.duration_minutes)
            : null,
          rating: form.rating ? Number(form.rating) : null,
          intro_start_seconds:
            form.intro_start_seconds === '' || form.intro_start_seconds == null ? null : Number(form.intro_start_seconds),
          intro_end_seconds:
            form.intro_end_seconds === '' || form.intro_end_seconds == null ? null : Number(form.intro_end_seconds),
        },
        { auth: true },
      );
      await api('POST', `/api/movies/${id}/genres`, {
        genre_ids: genreIds.map((g) => Number(g)).filter((g) => g > 0),
      }, { auth: true });
      setMessage('Đã cập nhật phim.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div style={{ padding: '24px' }}>Đang tải thông tin phim...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Chỉnh sửa phim #{id}</h1>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <label>
          Tiêu đề *
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Giới thiệu ngắn (hiện trên banner)
          <input
            type="text"
            name="short_intro"
            maxLength={255}
            value={form.short_intro}
            onChange={handleChange}
          />
        </label>
        <label>
          Mô tả
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
          />
        </label>
        <label>
          Năm phát hành
          <input
            type="number"
            name="release_year"
            value={form.release_year}
            onChange={handleChange}
          />
        </label>
        <label>
          Thời lượng (phút)
          <input
            type="number"
            name="duration_minutes"
            value={form.duration_minutes}
            onChange={handleChange}
          />
        </label>
        <label>
          Ảnh bìa (chọn file từ máy)
          <input type="file" accept="image/*" onChange={handleThumbnailFileChange} />
        </label>
        <label>
          Thumbnail URL
          <input
            type="text"
            name="thumbnail_url"
            value={form.thumbnail_url}
            onChange={handleChange}
          />
        </label>
        <label>
          Banner ngang URL (ảnh dùng cho banner Home)
          <input
            type="file"
            accept="image/*"
            onChange={handleBannerFileChange}
          />
        </label>
        <label>
          Đường dẫn Banner ngang
          <input
            type="text"
            name="banner_url"
            value={form.banner_url}
            onChange={handleChange}
          />
        </label>
        <fieldset style={{ border: '1px solid #444', padding: '12px', marginBottom: '8px' }}>
          <legend>Trailer</legend>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            Chọn file từ máy — upload lên server, gán vào Trailer URL (dùng cho Hero banner)
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={handleTrailerFileChange}
            />
          </label>
          <label>
            Trailer URL (local, dùng cho Hero)
            <input
              type="text"
              name="trailer_url"
              value={form.trailer_url}
              onChange={handleChange}
            />
          </label>
          <label>
            Trailer YouTube URL (trang chi tiết)
            <input
              type="text"
              name="trailer_youtube_url"
              value={form.trailer_youtube_url}
              onChange={handleChange}
              placeholder="https://youtube.com/..."
            />
          </label>
        </fieldset>
        <fieldset style={{ border: '1px solid #444', padding: '12px', marginBottom: '8px' }}>
          <legend>Video chính</legend>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            Chọn file video — gán vào Video URL
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
            />
          </label>
          <label>
            Video URL
            <input
              type="text"
              name="video_url"
              value={form.video_url}
              onChange={handleChange}
            />
          </label>
        </fieldset>
        <label>
          Rating (VD: 8.5)
          <input
            type="number"
            step="0.1"
            name="rating"
            value={form.rating}
            onChange={handleChange}
          />
        </label>

        <div style={{ marginTop: 12, padding: 12, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 8px' }}>Skip Intro (Movie)</h3>
          <p style={{ margin: '0 0 10px', color: '#aaa', fontSize: 13 }}>
            Kéo 2 tay nắm để chọn đoạn intro. Khi người dùng xem phim, trong khoảng này sẽ hiện nút “Skip Intro”.
          </p>
          {form.video_url ? (
            <>
              <div
                style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.12)',
                  marginBottom: 10,
                }}
              >
                <video
                  ref={introVideoRef}
                  src={String(form.video_url).startsWith('http') ? form.video_url : `${API_BASE}${form.video_url}`}
                  controls
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (isFinite(d) && d > 0) setIntroPreviewDuration(d);
                  }}
                  style={{
                    width: '100%',
                    maxHeight: 260,
                    borderRadius: 0,
                    background: '#000',
                    display: 'block',
                    marginBottom: 0,
                    verticalAlign: 'top',
                  }}
                />
                <IntroRangeSlider
                  attachedBelowVideo
                  durationSeconds={
                    introPreviewDuration > 0
                      ? introPreviewDuration
                      : Number(form.duration_minutes)
                        ? Number(form.duration_minutes) * 60
                        : 0
                  }
                  startSeconds={form.intro_start_seconds === '' ? 0 : Number(form.intro_start_seconds)}
                  endSeconds={form.intro_end_seconds === '' ? 0 : Number(form.intro_end_seconds)}
                  onChange={({ startSeconds, endSeconds }) => {
                    setForm((prev) => ({
                      ...prev,
                      intro_start_seconds: String(startSeconds),
                      intro_end_seconds: String(endSeconds),
                    }));
                  }}
                  onSeek={(sec) => {
                    const v = introVideoRef.current;
                    if (v) v.currentTime = sec;
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, intro_start_seconds: '', intro_end_seconds: '' }))}
                >
                  Xóa intro
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: '#888', margin: 0 }}>Chưa có video, hãy upload/gán Video URL trước.</p>
          )}
        </div>
        <label>
          Age rating (VD: 13+)
          <input
            type="text"
            name="age_rating"
            value={form.age_rating}
            onChange={handleChange}
          />
        </label>
        <label>
          Quốc gia sản xuất
          <select name="country_code" value={form.country_code} onChange={handleChange} style={{ padding: '8px', width: '100%' }}>
            <option value="">-- Chọn quốc gia --</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        {genres.length > 0 && (
          <fieldset style={{ border: '1px solid #444', padding: '12px', marginBottom: '8px' }}>
            <legend>Thể loại</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px' }}>
              {genres.map((g) => (
                <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={genreIds.includes(g.id)}
                    onChange={(e) => {
                      setGenreIds((prev) =>
                        e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)
                      );
                    }}
                  />
                  {g.name}
                </label>
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#888' }}>Chọn nhiều thể loại cho phim</span>
          </fieldset>
        )}
        <fieldset style={{ border: '1px solid #444', padding: '12px', marginBottom: '8px' }}>
          <legend>Diễn viên &amp; Đạo diễn</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Diễn viên</h4>
              <div style={{ marginBottom: '10px' }}>
                {cast.filter((c) => c.role === 'actor').map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {c.avatar_url && (
                      <img src={c.avatar_url.startsWith('http') ? c.avatar_url : `${API_BASE}${c.avatar_url}`} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    )}
                    <span style={{ fontSize: '13px' }}>{c.name}</span>
                    <button type="button" onClick={() => handleRemoveCast(c.id)} style={{ marginLeft: 'auto', color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Xoá</button>
                  </div>
                ))}
                {cast.filter((c) => c.role === 'actor').length === 0 && <span style={{ color: '#888', fontSize: '13px' }}>Chưa có</span>}
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
              <button type="button" onClick={handleAddActors} disabled={!addActorIds.length || addingActors} style={{ padding: '6px 12px' }}>
                {addingActors ? 'Đang thêm...' : 'Thêm diễn viên đã chọn'}
              </button>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Đạo diễn</h4>
              <div style={{ marginBottom: '10px' }}>
                {cast.filter((c) => c.role === 'director').map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {c.avatar_url && (
                      <img src={c.avatar_url.startsWith('http') ? c.avatar_url : `${API_BASE}${c.avatar_url}`} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    )}
                    <span style={{ fontSize: '13px' }}>{c.name}</span>
                    <button type="button" onClick={() => handleRemoveCast(c.id)} style={{ marginLeft: 'auto', color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Xoá</button>
                  </div>
                ))}
                {cast.filter((c) => c.role === 'director').length === 0 && <span style={{ color: '#888', fontSize: '13px' }}>Chưa có</span>}
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
              <button type="button" onClick={handleAddDirectors} disabled={!addDirectorIds.length || addingDirectors} style={{ padding: '6px 12px' }}>
                {addingDirectors ? 'Đang thêm...' : 'Thêm đạo diễn đã chọn'}
              </button>
            </div>
          </div>
        </fieldset>
        <label>
          <input
            type="checkbox"
            name="is_featured"
            checked={form.is_featured}
            onChange={handleChange}
          />
          {' '}
          Featured (hiển thị nổi bật)
        </label>

        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button type="submit">Lưu thay đổi</button>
          <button
            type="button"
            onClick={() => navigate('/admin/movies')}
          >
            Quay lại danh sách
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminEditMoviePage;

