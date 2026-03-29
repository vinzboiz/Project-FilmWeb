import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE, getToken, normalizeUploadError } from '../apis/client';
import IntroRangeSlider, { formatTime } from '../components/player/IntroRangeSlider';

function AdminSeriesDetailPage() {
  const { id } = useParams();
  const [series, setSeries] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [seasonNumber, setSeasonNumber] = useState('');
  const [seasonTitle, setSeasonTitle] = useState('');
  const [seasonDesc, setSeasonDesc] = useState('');

  const [epForm, setEpForm] = useState({
    season_id: '',
    episode_number: '',
    title: '',
    description: '',
    duration_minutes: '',
    video_url: '',
    thumbnail_url: '',
  });
  const [creatingEpisode, setCreatingEpisode] = useState(false);
  const [uploadingVideoOverlay, setUploadingVideoOverlay] = useState(false);

  // Skip Intro (series) - chọn episode master + set intro mặc định của series
  const [introMasterEpisodeId, setIntroMasterEpisodeId] = useState('');
  const [seriesIntroStart, setSeriesIntroStart] = useState(0);
  const [seriesIntroEnd, setSeriesIntroEnd] = useState(0);
  const [savingIntro, setSavingIntro] = useState(false);
  const [introMsg, setIntroMsg] = useState('');
  const introVideoRef = useRef(null);
  const [introDuration, setIntroDuration] = useState(0);

  const masterEpisode = useMemo(
    () => episodes.find((e) => String(e.id) === String(introMasterEpisodeId)),
    [episodes, introMasterEpisodeId]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sRes, epsRes] = await Promise.all([
          fetch(`${API_BASE}/api/series/${id}`),
          fetch(`${API_BASE}/api/series/${id}/episodes`),
        ]);
        if (!sRes.ok) throw new Error('Không tải được series');
        const seriesData = await sRes.json();
        const epsData = epsRes.ok ? await epsRes.json() : [];
        if (!cancelled) {
          setSeries(seriesData);
          setSeasons(Array.isArray(seriesData.seasons) ? seriesData.seasons : []);
          setEpisodes(Array.isArray(epsData) ? epsData : []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // init intro state từ series sau khi load
  useEffect(() => {
    if (!series) return;
    const srcId = series.intro_source_episode_id != null ? String(series.intro_source_episode_id) : '';
    setIntroMasterEpisodeId(srcId);
    setSeriesIntroStart(series.intro_start_seconds != null ? Number(series.intro_start_seconds) : 0);
    setSeriesIntroEnd(series.intro_end_seconds != null ? Number(series.intro_end_seconds) : 0);
  }, [series]);

  useEffect(() => {
    const v = introVideoRef.current;
    if (!v) {
      setIntroDuration(0);
      return;
    }

    const syncDuration = () => {
      const d = Number(v.duration);
      setIntroDuration(isFinite(d) && d > 0 ? d : 0);
    };

    syncDuration();
    v.addEventListener('loadedmetadata', syncDuration);
    v.addEventListener('durationchange', syncDuration);
    return () => {
      v.removeEventListener('loadedmetadata', syncDuration);
      v.removeEventListener('durationchange', syncDuration);
    };
  }, [masterEpisode?.video_url, introMasterEpisodeId]);

  async function handleSaveSeriesIntro() {
    setIntroMsg('');
    setError('');
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin để lưu intro');
      return;
    }
    if (!introMasterEpisodeId) {
      setError('Hãy chọn một tập làm episode master cho intro.');
      return;
    }
    if (seriesIntroEnd <= seriesIntroStart) {
      setError('Intro End phải lớn hơn Intro Start.');
      return;
    }
    try {
      setSavingIntro(true);
      const res = await fetch(`${API_BASE}/api/series/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          intro_source_episode_id: Number(introMasterEpisodeId),
          intro_start_seconds: Number(seriesIntroStart),
          intro_end_seconds: Number(seriesIntroEnd),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Lưu intro thất bại');
      setIntroMsg('Đã lưu intro mặc định cho series.');
      setSeries((prev) => (prev ? { ...prev, ...data } : prev));
    } catch (e) {
      setError(e.message || 'Lưu intro thất bại');
    } finally {
      setSavingIntro(false);
    }
  }

  async function reloadEpisodes(seasonId) {
    try {
      const url = seasonId
        ? `${API_BASE}/api/series/${id}/episodes?season_id=${seasonId}`
        : `${API_BASE}/api/series/${id}/episodes`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Không tải được danh sách tập');
      const data = await res.json();
      setEpisodes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateSeason(e) {
    e.preventDefault();
    setError('');
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin để tạo season');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/series/${id}/seasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          season_number: Number(seasonNumber),
          title: seasonTitle || null,
          description: seasonDesc || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Tạo season thất bại. Kiểm tra: Season number >= 1, series tồn tại.');
      setSeasons((prev) => [...prev, data]);
      setSeasonNumber('');
      setSeasonTitle('');
      setSeasonDesc('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateEpisode(e) {
    e.preventDefault();
    setError('');
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin để tạo episode');
      return;
    }
    try {
      setCreatingEpisode(true);
      // overlay loading ~3s để đảm bảo video vừa upload sync xong
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const res = await fetch(`${API_BASE}/api/series/episodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          series_id: Number(id),
          season_id: epForm.season_id ? Number(epForm.season_id) : null,
          episode_number: epForm.episode_number ? Number(epForm.episode_number) : null,
          title: epForm.title,
          description: epForm.description || null,
          duration_minutes: epForm.duration_minutes ? Number(epForm.duration_minutes) : null,
          thumbnail_url: epForm.thumbnail_url || null,
          video_url: epForm.video_url || null,
          release_date: null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Tạo tập thất bại');
      setEpForm({
        season_id: '',
        episode_number: '',
        title: '',
        description: '',
        duration_minutes: '',
        video_url: '',
        thumbnail_url: '',
      });
      reloadEpisodes(selectedSeasonId);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingEpisode(false);
    }
  }

  async function handleUploadEpisodeVideo(episodeId, file) {
    if (!file) return;
    const token = getToken();
    if (!token) {
      alert('Cần đăng nhập admin để upload video tập');
      return;
    }
    const formData = new FormData();
    formData.append('video', file);
    try {
      const res = await fetch(`${API_BASE}/api/upload/episode-video/${episodeId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Upload video tập thất bại');
      reloadEpisodes(selectedSeasonId);
    } catch (err) {
      alert(normalizeUploadError(err));
    }
  }

  async function handleUploadEpisodeThumbnail(episodeId, file) {
    if (!file) return;
    const token = getToken();
    if (!token) {
      alert('Cần đăng nhập admin để upload ảnh bìa tập');
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch(`${API_BASE}/api/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Upload ảnh tập thất bại');

      const thumbUrl = data.image_url;
      await fetch(`${API_BASE}/api/series/episodes/${episodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ thumbnail_url: thumbUrl }),
      });

      reloadEpisodes(selectedSeasonId);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteSeason(seasonId) {
    if (!window.confirm('Bạn có chắc muốn xoá season này? Tất cả tập thuộc season có thể bị ảnh hưởng.')) {
      return;
    }
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin để xoá season');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/series/${id}/seasons/${seasonId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Xoá season thất bại');
      setSeasons((prev) => prev.filter((s) => s.id !== seasonId));
      if (String(selectedSeasonId) === String(seasonId)) {
        setSelectedSeasonId('');
        reloadEpisodes('');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteEpisode(episodeId) {
    if (!window.confirm('Bạn có chắc muốn xoá tập này?')) {
      return;
    }
    const token = getToken();
    if (!token) {
      setError('Cần đăng nhập admin để xoá tập');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/series/episodes/${episodeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Xoá tập thất bại');
      setEpisodes((prev) => prev.filter((ep) => ep.id !== episodeId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div style={{ padding: '24px' }}>Đang tải series...</div>;
  if (error || !series) return <div style={{ padding: '24px', color: 'red' }}>{error || 'Không tìm thấy series'}</div>;

  return (
    <div style={{ padding: '24px', position: 'relative' }}>
      {(creatingEpisode || uploadingVideoOverlay) && (
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
            {creatingEpisode
              ? 'Đang xử lý video tập và tạo tập...'
              : 'Đang upload video tập, vui lòng đợi trong giây lát...'}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Quản lý series: {series.title}</h1>
        <Link to={`/admin/series/${id}/edit`} style={{ padding: '8px 16px', background: '#e50914', color: '#fff', textDecoration: 'none', borderRadius: '4px', fontWeight: 500 }}>Sửa series (thông tin + cast)</Link>
      </div>
      <p style={{ color: '#ccc', maxWidth: '800px' }}>{series.description}</p>

      <section style={{ marginTop: 18, marginBottom: 24, padding: 12, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>Skip Intro (Series)</h2>
        <p style={{ margin: '0 0 12px', color: '#aaa', fontSize: 13 }}>
          Chọn <strong>1 tập bất kỳ</strong> làm <strong>episode master</strong> (không phụ thuộc mùa), kéo 2 tay nắm để set intro mặc định cho toàn bộ series.
        </p>
        {introMsg && <p style={{ color: '#46d369', marginTop: 0 }}>{introMsg}</p>}
        <label style={{ display: 'block', marginBottom: 10 }}>
          Episode master
          <select
            value={introMasterEpisodeId}
            onChange={(e) => setIntroMasterEpisodeId(e.target.value)}
            style={{ marginLeft: 8, padding: '4px 8px', minWidth: 260 }}
          >
            <option value="">(Chọn tập)</option>
            {episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                #{ep.id} — S{ep.season_id ? ep.season_id : '—'}E{ep.episode_number ?? '—'} — {ep.title}
              </option>
            ))}
          </select>
          {series.intro_source_episode_id && (
            <span style={{ marginLeft: 10, color: '#888', fontSize: 12 }}>
              (Hiện tại: episode #{series.intro_source_episode_id})
            </span>
          )}
        </label>

        {masterEpisode?.video_url ? (
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
                src={String(masterEpisode.video_url).startsWith('http') ? masterEpisode.video_url : `${API_BASE}${masterEpisode.video_url}`}
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
                durationSeconds={introDuration}
                startSeconds={seriesIntroStart}
                endSeconds={seriesIntroEnd}
                onChange={({ startSeconds, endSeconds }) => {
                  setSeriesIntroStart(startSeconds);
                  setSeriesIntroEnd(endSeconds);
                }}
                onSeek={(sec) => {
                  const v = introVideoRef.current;
                  if (v) v.currentTime = sec;
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleSaveSeriesIntro} disabled={savingIntro}>
                {savingIntro ? 'Đang lưu...' : 'Lưu intro cho series'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIntroMasterEpisodeId('');
                  setSeriesIntroStart(0);
                  setSeriesIntroEnd(0);
                }}
                disabled={savingIntro}
              >
                Reset
              </button>
              {seriesIntroEnd > seriesIntroStart && (
                <span style={{ color: '#888', fontSize: 12 }}>
                  Intro: {formatTime(seriesIntroStart)} → {formatTime(seriesIntroEnd)}
                </span>
              )}
            </div>
          </>
        ) : (
          <p style={{ color: '#888', margin: 0 }}>
            Hãy chọn episode master có <strong>video_url</strong> để preview và set intro.
          </p>
        )}
      </section>

      <section style={{ marginTop: '24px', marginBottom: '24px' }}>
        <h2>Seasons</h2>
        <form onSubmit={handleCreateSeason} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="number"
            min="1"
            placeholder="Season number"
            value={seasonNumber}
            onChange={(e) => setSeasonNumber(e.target.value)}
            style={{ width: '120px', padding: '4px 8px' }}
          />
          <input
            type="text"
            placeholder="Tiêu đề (tuỳ chọn)"
            value={seasonTitle}
            onChange={(e) => setSeasonTitle(e.target.value)}
            style={{ flex: 1, padding: '4px 8px' }}
          />
          <input
            type="text"
            placeholder="Mô tả (tuỳ chọn)"
            value={seasonDesc}
            onChange={(e) => setSeasonDesc(e.target.value)}
            style={{ flex: 2, padding: '4px 8px' }}
          />
          <button type="submit" disabled={!seasonNumber || Number(seasonNumber) < 1} style={{ padding: '4px 12px' }}>
            Thêm season
          </button>
        </form>

        {seasons.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Chọn season để lọc tập: </strong>
              <select
                value={selectedSeasonId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSeasonId(val);
                  reloadEpisodes(val);
                }}
                style={{ marginLeft: '8px', padding: '4px 8px' }}
              >
                <option value="">Tất cả</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    Season {s.season_number} {s.title ? `- ${s.title}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxWidth: 600 }}>
              {seasons.map((s) => (
                <li
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px solid #333',
                  }}
                >
                  <span>
                    Season {s.season_number} {s.title ? `- ${s.title}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSeason(s.id)}
                    style={{
                      padding: '4px 10px',
                      background: '#b91c1c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Xoá season
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2>Thêm tập mới</h2>
        <form onSubmit={handleCreateEpisode} style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
          <label>
            Season
            <select
              value={epForm.season_id}
              onChange={(e) => setEpForm((prev) => ({ ...prev, season_id: e.target.value }))}
              style={{ marginLeft: '8px', padding: '4px 8px' }}
            >
              <option value="">(Không season)</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  Season {s.season_number}
                </option>
              ))}
            </select>
          </label>
          <label>
            Số tập
            <input
              type="number"
              value={epForm.episode_number}
              onChange={(e) => setEpForm((prev) => ({ ...prev, episode_number: e.target.value }))}
            />
          </label>
          <label>
            Tiêu đề *
            <input
              type="text"
              value={epForm.title}
              onChange={(e) => setEpForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </label>
          <label>
            Mô tả
            <textarea
              value={epForm.description}
              onChange={(e) => setEpForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </label>
          <label>
            Thời lượng (phút)
            <input
              type="number"
              value={epForm.duration_minutes}
              onChange={(e) => setEpForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
            />
          </label>
          <label>
            Ảnh bìa
            <span style={{ display: 'block', fontSize: 12, color: '#aaa' }}>
              Dán URL hoặc upload file ảnh bên dưới.
            </span>
            <input
              type="text"
              value={epForm.thumbnail_url}
              onChange={(e) => setEpForm((prev) => ({ ...prev, thumbnail_url: e.target.value }))}
            />
          </label>
          <label>
            Video URL (sau khi upload hoặc dán link)
            <input
              type="text"
              value={epForm.video_url}
              onChange={(e) => setEpForm((prev) => ({ ...prev, video_url: e.target.value }))}
              placeholder="/uploads/videos/..."
            />
          </label>
          <label>
            <strong>Chọn file video</strong> — upload lên server, gán vào Video URL
            <input
              type="file"
              accept="video/*"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const token = getToken();
                if (!token) {
                  alert('Cần đăng nhập admin để upload video');
                  return;
                }
                const formData = new FormData();
                formData.append('video', file);
                try {
        setUploadingVideoOverlay(true);
                  const res = await fetch(`${API_BASE}/api/upload/video`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.message || 'Upload video thất bại');
                  setEpForm((prev) => ({ ...prev, video_url: data.video_url }));
                } catch (err) {
                  alert(normalizeUploadError(err));
                } finally {
                  // giữ overlay ít nhất 3s tính từ lúc bắt đầu chọn file
                  setTimeout(() => {
                    setUploadingVideoOverlay(false);
                  }, 3000);
                }
                e.target.value = '';
              }}
              style={{ display: 'block', marginTop: '4px' }}
            />
          </label>
          <label>
            Chọn file ảnh bìa
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const token = getToken();
                if (!token) {
                  alert('Cần đăng nhập admin để upload ảnh bìa');
                  return;
                }
                const formData = new FormData();
                formData.append('image', file);
                try {
                  const res = await fetch(`${API_BASE}/api/upload/image`, {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.message || 'Upload ảnh bìa thất bại');
                  setEpForm((prev) => ({ ...prev, thumbnail_url: data.image_url }));
                } catch (err) {
                  alert(err.message);
                }
              }}
            />
          </label>
          <button type="submit" style={{ marginTop: '8px' }} disabled={creatingEpisode}>
            {creatingEpisode ? 'Đang thêm...' : 'Thêm tập'}
          </button>
        </form>
      </section>

      <section>
        <h2>Danh sách tập theo season</h2>
        {episodes.length === 0 && <p>Chưa có tập nào.</p>}
        {(() => {
          const bySeason = {};
          episodes.forEach((ep) => {
            const key = ep.season_id != null ? String(ep.season_id) : '_none';
            if (!bySeason[key]) bySeason[key] = [];
            bySeason[key].push(ep);
          });
          const sortedSeasons = [...seasons].sort((a, b) => (a.season_number ?? 0) - (b.season_number ?? 0));
          const order = selectedSeasonId
            ? (bySeason[String(selectedSeasonId)]?.length ? [String(selectedSeasonId)] : [])
            : [...sortedSeasons.map((s) => String(s.id)), '_none'].filter((k) => bySeason[k]?.length > 0);
          return order.map((seasonKey) => {
            const eps = (bySeason[seasonKey] || []).sort((a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0));
            const seasonInfo = seasonKey === '_none' ? null : seasons.find((s) => String(s.id) === seasonKey);
            const title = seasonKey === '_none' ? 'Không thuộc season' : `Season ${seasonInfo?.season_number ?? '?'}${seasonInfo?.title ? ` - ${seasonInfo.title}` : ''}`;
            return (
              <div key={seasonKey} style={{ marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#e50914', fontSize: '18px' }}>{title}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>ID</th>
                      <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Số tập</th>
                      <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Tiêu đề</th>
                      <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Thời lượng</th>
                      <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Ảnh bìa</th>
                      <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Video</th>
                      <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Upload video</th>
                      <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Upload ảnh</th>
                      <th style={{ borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eps.map((ep) => (
                      <tr key={ep.id}>
                        <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>{ep.id}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>{ep.episode_number ?? '-'}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>{ep.title}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>{ep.duration_minutes != null ? `${ep.duration_minutes} phút` : '-'}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>
                          {ep.thumbnail_url ? (
                            <img src={`${API_BASE}${ep.thumbnail_url}`} alt={ep.title} style={{ width: '70px', height: 'auto', borderRadius: '4px' }} />
                          ) : (
                            <span style={{ color: '#999' }}>Chưa có</span>
                          )}
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>
                          {ep.video_url ? <span style={{ fontSize: '12px' }}>{ep.video_url}</span> : <span style={{ color: '#999' }}>Chưa có</span>}
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>
                          <input type="file" accept="video/*" onChange={(e) => handleUploadEpisodeVideo(ep.id, e.target.files[0])} />
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>
                          <input type="file" accept="image/*" onChange={(e) => handleUploadEpisodeThumbnail(ep.id, e.target.files[0])} />
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #333' }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <Link to={`/admin/series/${id}/episode/${ep.id}/edit`} style={{ padding: '6px 12px', background: '#e50914', color: '#fff', textDecoration: 'none', borderRadius: '4px', fontSize: '13px' }}>
                              Sửa
                            </Link>
                            <button type="button" onClick={() => handleDeleteEpisode(ep.id)} style={{ padding: '6px 10px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>
                              Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          });
        })()}
      </section>
    </div>
  );
}

export default AdminSeriesDetailPage;

