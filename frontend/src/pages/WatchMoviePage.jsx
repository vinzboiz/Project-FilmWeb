import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../apis/client';
import { API_BASE, getToken, getProfileId } from '../apis/client';
import { pushClientNotification } from '../utils/notificationsClient';
import ReviewSection from '../components/ReviewSection';
import DetailSuggestions from '../components/detail/DetailSuggestions';
import HeroBanner from '../components/home/HeroBanner';
import '../styles/pages/movie-detail.css';
import '../styles/pages/watch-movie.css';

function resolveVideoSrc(url) {
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return u.startsWith('/') ? `${API_BASE}${u}` : `${API_BASE}/${u.replace(/^\//, '')}`;
}

function WatchMoviePage() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inWatchlist, setInWatchlist] = useState(false);
  const [inFavorite, setInFavorite] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [savedProgress, setSavedProgress] = useState(0);
  const [suggestionModalItem, setSuggestionModalItem] = useState(null);

  const videoRef = useRef(null);
  const commentSectionRef = useRef(null);
  const initialProgressApplied = useRef(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const showSkipRef = useRef(false);
  const profileId = getProfileId();
  const token = getToken();
  const location = useLocation();
  const continueSecondsFromState = location.state?.continueSeconds || 0;
  const [showContinuePrompt, setShowContinuePrompt] = useState(
    !!location.state?.askContinue && continueSecondsFromState > 0,
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/movies/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setMovie(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (continueSecondsFromState > 0) {
      setSavedProgress(continueSecondsFromState);
    }
  }, [continueSecondsFromState]);

  useEffect(() => {
    if (!token || !profileId || !id || showContinuePrompt) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/watch/progress?profile_id=${profileId}&movie_id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { progress_seconds: 0 }))
      .then((data) => {
        if (!cancelled && data && data.progress_seconds > 0) setSavedProgress(data.progress_seconds);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, profileId, id]);

  useEffect(() => {
    if (!token || !profileId || !movie) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/watchlist?profile_id=${profileId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!cancelled) setInWatchlist(Array.isArray(list) && list.some((w) => String(w.movie_id || w.content_id) === String(id)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, profileId, movie, id]);

  useEffect(() => {
    if (!token || !profileId || !id) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/favorites/check?profile_id=${profileId}&movie_id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { is_favorite: false }))
      .then((data) => { if (!cancelled) setInFavorite(!!data.is_favorite); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, profileId, id]);

  const saveProgress = useCallback(
    (seconds) => {
      if (!token || !profileId || (seconds !== 0 && !seconds)) return;
      fetch(`${API_BASE}/api/watch/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profile_id: profileId, movie_id: Number(id), progress_seconds: Math.floor(seconds) }),
      }).catch(() => {});
    },
    [token, profileId, id]
  );

  const lastSaved = useRef(0);
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = Math.floor(v.currentTime);
    if (t - lastSaved.current >= 10) {
      lastSaved.current = t;
      saveProgress(t);
    }

    // Skip intro (movie)
    const s = movie?.intro_start_seconds != null ? Number(movie.intro_start_seconds) : null;
    const e = movie?.intro_end_seconds != null ? Number(movie.intro_end_seconds) : null;
    if (s != null && e != null && isFinite(s) && isFinite(e) && e > s) {
      const inRange = v.currentTime >= s && v.currentTime < e;
      if (inRange !== showSkipRef.current) {
        showSkipRef.current = inRange;
        setShowSkipIntro(inRange);
      }
    } else if (showSkipRef.current) {
      showSkipRef.current = false;
      setShowSkipIntro(false);
    }
  }, [
    saveProgress,
    movie?.intro_start_seconds,
    movie?.intro_end_seconds,
  ]);

  const handlePause = useCallback(() => {
    if (videoRef.current) saveProgress(Math.floor(videoRef.current.currentTime));
  }, [saveProgress]);

  const applySavedProgressOnce = useCallback(() => {
    if (showContinuePrompt) return;
    if (initialProgressApplied.current) return;
    const v = videoRef.current;
    if (savedProgress <= 0 || !v || v.readyState < 1) return;
    const duration = v.duration;
    const start = isFinite(duration) && duration > 0 && duration > savedProgress
      ? Math.min(savedProgress, duration - 1)
      : savedProgress;
    v.currentTime = start;
    initialProgressApplied.current = true;
  }, [savedProgress, showContinuePrompt]);

  const handleLoadedMetadata = useCallback(() => {
    applySavedProgressOnce();
    queueMicrotask(() => {
      handleTimeUpdate();
    });
  }, [applySavedProgressOnce, handleTimeUpdate]);

  const scrollToComments = useCallback(() => {
    commentSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const toggleWatchlist = useCallback(async () => {
    if (!token || !profileId) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await api('DELETE', `/api/watchlist/${id}?profile_id=${profileId}`);
        setInWatchlist(false);
      } else {
        await api('POST', '/api/watchlist', { profile_id: profileId, movie_id: Number(id) });
        setInWatchlist(true);
        pushClientNotification('watchlist_add', 'Bạn đã thêm một phim vào danh sách của tôi.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWatchlistLoading(false);
    }
  }, [token, profileId, id, inWatchlist]);

  const toggleFavorite = useCallback(async () => {
    if (!token || !profileId) return;
    setFavoriteLoading(true);
    try {
      if (inFavorite) {
        await api('DELETE', `/api/favorites/${id}?profile_id=${profileId}`);
        setInFavorite(false);
      } else {
        await api('POST', '/api/favorites', { profile_id: profileId, movie_id: Number(id) });
        setInFavorite(true);
        pushClientNotification('favorite_add', 'Bạn đã thêm một phim vào danh sách yêu thích.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFavoriteLoading(false);
    }
  }, [token, profileId, id, inFavorite]);

  const handleChooseContinue = () => {
    setShowContinuePrompt(false);
    const v = videoRef.current;
    if (v && savedProgress > 0) {
      const duration = v.duration;
      const start =
        isFinite(duration) && duration > 0 && duration > savedProgress
          ? Math.min(savedProgress, duration - 1)
          : savedProgress;
      v.currentTime = start;
    }
    initialProgressApplied.current = true;
  };

  const handleChooseRestart = () => {
    setShowContinuePrompt(false);
    const v = videoRef.current;
    initialProgressApplied.current = true;
    if (v) {
      v.currentTime = 0;
      saveProgress(0);
    }
  };

  if (loading) return <div className="watch-movie"><div className="watch-movie-loading">Đang tải...</div></div>;
  if (error || !movie) {
    return (
      <div className="watch-movie">
        <div className="watch-movie-error">{error || 'Không tìm thấy phim'}</div>
      </div>
    );
  }

  const videoSrc = resolveVideoSrc(movie.video_url);
  if (!videoSrc) {
    return (
      <div className="watch-movie">
        <div className="watch-movie-error">Phim chưa có video.</div>
        <Link to={`/movies/${id}`}>Quay lại trang chi tiết</Link>
      </div>
    );
  }

  const title = movie.title;

  return (
    <div className="watch-movie">
      {showContinuePrompt && savedProgress > 0 && (
        <div className="watch-movie-continue-overlay">
          <div className="watch-movie-continue-dialog">
            <p>
              Hiện bạn đang xem đến{' '}
              <strong>{Math.floor(savedProgress / 60)} phút {Math.floor(savedProgress % 60)} giây</strong>.
            </p>
            <p>Bạn muốn tiếp tục xem từ vị trí này hay xem lại từ đầu?</p>
            <div className="watch-movie-continue-actions">
              <button type="button" onClick={handleChooseContinue}>
                Tiếp tục xem
              </button>
              <button type="button" onClick={handleChooseRestart}>
                Xem lại từ đầu
              </button>
            </div>
          </div>
        </div>
      )}
      <nav className="watch-movie-breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>›</span>
        <Link to={`/movies/${id}`}>{title}</Link>
        <span>›</span>
        <span>Xem phim</span>
      </nav>

      <div className="watch-movie-video-wrap">
        <video
          ref={videoRef}
          controls
          className="watch-movie-video"
          src={videoSrc}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onSeeked={handleTimeUpdate}
          onPlaying={handleTimeUpdate}
          onPause={handlePause}
        />
        {showSkipIntro && (
          <button
            type="button"
            className="watch-skip-intro-btn"
            onClick={() => {
              const v = videoRef.current;
              const e = movie?.intro_end_seconds != null ? Number(movie.intro_end_seconds) : null;
              if (v && e != null && isFinite(e)) v.currentTime = e;
            }}
          >
            Skip Intro
          </button>
        )}
      </div>

      <div className="watch-movie-bar">
        <div className="watch-movie-rating">
          <span className="watch-movie-rating-stars" aria-hidden>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={movie.rating != null && i <= Math.round(Number(movie.rating)) ? 'filled' : ''}>★</span>
            ))}
          </span>
          <span className="watch-movie-rating-text">
            {movie.rating != null ? Number(movie.rating).toFixed(1) : '—'} điểm
          </span>
        </div>
        <button type="button" className="watch-movie-btn-comment" onClick={scrollToComments}>
          💬 Bình luận
        </button>
      </div>

      <div className="movie-detail-toolbar">
        {token && profileId && (
          <>
            <button
              type="button"
              className={`movie-detail-toolbar-btn ${inWatchlist ? 'active' : ''}`}
              onClick={toggleWatchlist}
              disabled={watchlistLoading}
            >
              + Danh sách phát
            </button>
            <button
              type="button"
              className={`movie-detail-toolbar-btn ${inFavorite ? 'active' : ''}`}
              onClick={toggleFavorite}
              disabled={favoriteLoading}
            >
              ❤ Yêu thích
            </button>
          </>
        )}
        <button type="button" className="movie-detail-toolbar-btn" disabled title="Chức năng sẽ có sau">
          Chia sẻ
        </button>
      </div>

      <div className="watch-movie-content">
        <h1 className="watch-movie-title">{title}</h1>
        {movie.description && (
          <p className="watch-movie-desc">{movie.description}</p>
        )}

        <ReviewSection
          contentType="movie"
          contentId={id}
          title="Đánh giá & Bình luận"
          initialLimit={10}
          scrollRef={commentSectionRef}
        />

        <DetailSuggestions type="movie" contentId={id} onOpenInfo={setSuggestionModalItem} />
      </div>
      <HeroBanner
        modalOnly
        externalModalItem={suggestionModalItem}
        onCloseModal={() => setSuggestionModalItem(null)}
      />
    </div>
  );
}

export default WatchMoviePage;
