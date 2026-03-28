import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_BASE, getToken, normalizeUploadError } from '../apis/client';
import IntroRangeSlider, { formatTime } from '../components/player/IntroRangeSlider';

function AdminEditEpisodePage() {
  const { id: seriesId, episodeId } = useParams();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    season_id: '',
    episode_number: '',
    title: '',
    description: '',
    duration_minutes: '',
    thumbnail_url: '',
    video_url: '',
    intro_mode: 'series', // series | custom | none
    intro_start_seconds: '',
    intro_end_seconds: '',
  });
  const [seasons, setSeasons] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideoOverlay, setUploadingVideoOverlay] = useState(false);
  const previewRef = useRef(null);
  const [previewDuration, setPreviewDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [epRes, seriesRes] = await Promise.all([
          fetch(`${API_BASE}/api/series/${seriesId}/episodes`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${API_BASE}/api/series/${seriesId}`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (!cancelled && Array.isArray(epRes)) {
          const ep = epRes.find((e) => String(e.id) === String(episodeId));
          if (ep) {
            setEpisode(ep);
            setForm({
              season_id: ep.season_id != null ? String(ep.season_id) : '',
              episode_number: ep.episode_number != null ? String(ep.episode_number) : '',
              title: ep.title || '',
              description: ep.description || '',
              duration_minutes: ep.duration_minutes != null ? String(ep.duration_minutes) : '',
              thumbnail_url: ep.thumbnail_url || '',
              video_url: ep.video_url || '',
              intro_mode: ep.intro_mode || 'series',
              intro_start_seconds: ep.intro_start_seconds ?? '',
              intro_end_seconds: ep.intro_end_seconds ?? '',
            });
          } else {
            setError('Không tìm thấy tập');
          }
        }
        if (!cancelled && seriesRes && Array.isArray(seriesRes.seasons)) {
          setSeasons(seriesRes.seasons);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
  }, [seriesId, episodeId]);

  useEffect(() => {
    const v = previewRef.current;
    if (!v) {
      setPreviewDuration(0);
      return;
    }

    const syncDuration = () => {
      const d = Number(v.duration);
      setPreviewDuration(isFinite(d) && d > 0 ? d : 0);
    };

    // Handle both fresh loads and cached metadata cases.
    syncDuration();
    v.addEventListener('loadedmetadata', syncDuration);
    v.addEventListener('durationchange', syncDuration);
    return () => {
      v.removeEventListener('loadedmetadata', syncDuration);
      v.removeEventListener('durationchange', syncDuration);
    };
  }, [form.video_url, form.intro_mode]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/series/episodes/${episodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          season_id: form.season_id ? Number(form.season_id) : null,
          episode_number: form.episode_number ? Number(form.episode_number) : null,
          title: form.title,
          description: form.description || null,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
          thumbnail_url: form.thumbnail_url || null,
          video_url: form.video_url || null,
          intro_mode: form.intro_mode || 'series',
          intro_start_seconds:
            form.intro_mode === 'custom'
              ? (form.intro_start_seconds === '' || form.intro_start_seconds == null ? 0 : Number(form.intro_start_seconds))
              : null,
          intro_end_seconds:
            form.intro_mode === 'custom'
              ? (form.intro_end_seconds === '' || form.intro_end_seconds == null ? 0 : Number(form.intro_end_seconds))
              : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Cập nhật thất bại');
      }
      setMessage('Đã lưu tập.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadFile(file, field, type) {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append(type === 'video' ? 'video' : 'image', file);
      if (type === 'video') {
        setUploadingVideoOverlay(true);
      }
      const res = await fetch(`${API_BASE}/api/upload/${type === 'video' ? 'video' : 'image'}`, {
        method: 'POST',
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Upload thất bại');
      const url = type === 'video' ? data.video_url : data.image_url;
      setForm((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      setError(normalizeUploadError(err));
    } finally {
      setUploading(false);
      if (type === 'video') {
        setTimeout(() => {
          setUploadingVideoOverlay(false);
        }, 3000);
      }
    }
  }

  if (loading) return <div style={{ padding: '24px', color: '#fff' }}>Đang tải...</div>;
  if (error && !episode) return <div style={{ padding: '24px', color: '#f44' }}>{error}</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', color: '#fff', position: 'relative' }}>
      {uploadingVideoOverlay && (
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
            Đang upload video tập, vui lòng đợi trong giây lát...
          </div>
        </div>
      )}
      <div style={{ marginBottom: '16px' }}>
        <Link to={`/admin/series/${seriesId}`} style={{ color: '#e50914' }}>← Quay lại series</Link>
      </div>
      <h1>Sửa tập #{episodeId}</h1>
      {message && <p style={{ color: '#0f0' }}>{message}</p>}
      {error && <p style={{ color: '#f44' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label>
          Season
          <select name="season_id" value={form.season_id} onChange={handleChange} style={{ display: 'block', marginTop: '4px', padding: '8px' }}>
            <option value="">(Không chọn)</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>Season {s.season_number} {s.title ? `- ${s.title}` : ''}</option>
            ))}
          </select>
        </label>
        <label>
          Số tập
          <input type="number" name="episode_number" value={form.episode_number} onChange={handleChange} style={{ padding: '8px', width: '80px' }} />
        </label>
        <label>
          Tiêu đề *
          <input type="text" name="title" value={form.title} onChange={handleChange} required style={{ display: 'block', width: '100%', padding: '8px' }} />
        </label>
        <label>
          Mô tả
          <textarea name="description" value={form.description} onChange={handleChange} style={{ display: 'block', width: '100%', padding: '8px', minHeight: 60 }} />
        </label>
        <label>
          Thời lượng (phút)
          <input type="number" name="duration_minutes" value={form.duration_minutes} onChange={handleChange} min="1" max="300" style={{ padding: '8px', width: '80px' }} />
        </label>
        <label>
          Ảnh bìa (URL)
          <input type="text" name="thumbnail_url" value={form.thumbnail_url} onChange={handleChange} style={{ display: 'block', width: '100%', padding: '8px' }} />
          <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadFile(e.target.files[0], 'thumbnail_url', 'image')} disabled={uploading} style={{ marginTop: '4px' }} />
        </label>
        <label>
          Video URL
          <input type="text" name="video_url" value={form.video_url} onChange={handleChange} style={{ display: 'block', width: '100%', padding: '8px' }} />
          <input type="file" accept="video/*" onChange={(e) => e.target.files[0] && uploadFile(e.target.files[0], 'video_url', 'video')} disabled={uploading} style={{ marginTop: '4px' }} />
        </label>

        <div style={{ marginTop: 8, padding: 12, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 8px' }}>Skip Intro (Episode)</h3>
          <label style={{ display: 'block', marginBottom: 10 }}>
            Chế độ intro
            <select
              name="intro_mode"
              value={form.intro_mode}
              onChange={handleChange}
              style={{ display: 'block', marginTop: 6, padding: '8px', width: '100%' }}
            >
              <option value="series">Lấy skip cũ (dùng intro của series)</option>
              <option value="custom">Lấy skip mới (tùy chỉnh cho tập này)</option>
              <option value="none">Không có intro</option>
            </select>
          </label>

          {form.intro_mode === 'custom' ? (
            form.video_url ? (
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
                    ref={previewRef}
                    src={String(form.video_url).startsWith('http') ? form.video_url : `${API_BASE}${form.video_url}`}
                    controls
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
                    durationSeconds={previewDuration}
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
                      const v = previewRef.current;
                      if (v) v.currentTime = sec;
                    }}
                  />
                </div>
                <p style={{ margin: '10px 0 0', color: '#888', fontSize: 12 }}>
                  Đang chọn: {formatTime(Number(form.intro_start_seconds || 0))} → {formatTime(Number(form.intro_end_seconds || 0))}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, color: '#888' }}>Cần có Video URL để preview và đặt intro.</p>
            )
          ) : (
            <p style={{ margin: 0, color: '#888', fontSize: 12 }}>
              {form.intro_mode === 'series'
                ? 'Tập này sẽ dùng intro mặc định của series (được set từ episode master).'
                : 'Tập này sẽ không hiển thị nút Skip Intro.'}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" style={{ padding: '8px 16px' }}>Lưu</button>
          <button type="button" onClick={() => navigate(`/admin/series/${seriesId}`)} style={{ padding: '8px 16px' }}>Hủy</button>
        </div>
      </form>
    </div>
  );
}

export default AdminEditEpisodePage;
