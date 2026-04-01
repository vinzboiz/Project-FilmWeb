import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import mainBannerVideo from '../../assets/mp4/main_movie_banner.mp4';
import { API_BASE, api, getToken, getProfileId } from '../../apis/client';
import '../../styles/components/hero-banner.css';

/**
 * Chuẩn hoá trailer_url từ DB thành URL video đầy đủ (local).
 */
function resolveVideoSrc(trailerUrl) {
  if (!trailerUrl || !String(trailerUrl).trim()) return null;
  const url = String(trailerUrl).trim();
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url.replace(/^\//, '')}`;
}

function HeroBanner({ externalModalItem = null, onCloseModal, heroType = 'all', modalOnly = false }) {
  const videoRef = useRef(null);
  const [movie, setMovie] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [startFade, setStartFade] = useState(false);
  const [shrinkTitle, setShrinkTitle] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [muted, setMuted] = useState(true);
  const profileId = getProfileId();
  const token = getToken();
  const [showInfo, setShowInfo] = useState(false);
  const [infoData, setInfoData] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [likeCount, setLikeCount] = useState(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [addedToWatchlist, setAddedToWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [modalMuted, setModalMuted] = useState(true);
  const modalVideoRef = useRef(null);
  const navigate = useNavigate();

  // Random 1 phim hoặc series có trailer (banner). heroType: all | movie | series | featured. Bỏ qua khi modalOnly.
  useEffect(() => {
    if (modalOnly) return;
    let cancelled = false;
    async function load() {
      try {
        const typeParam = heroType && heroType !== 'all' ? `&type=${encodeURIComponent(heroType)}` : '';
        const url = `${API_BASE}/api/hero/random?t=${Date.now()}${typeParam}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('no trailer');
        const data = await res.json();
        if (!cancelled && data?.trailer_url) {
          setMovie(data);
        }
      } catch {
        // bỏ qua lỗi, sẽ dùng fallback video mặc định
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [heroType, modalOnly]);

// 0–3s: chỉ hiện ảnh bìa + intro; 3–5s: ảnh bìa mờ dần, intro ẩn, title thu nhỏ; sau 5s mount video
  useEffect(() => {
    if (!movie) return;
    const fadeTimer = setTimeout(() => {
      setStartFade(true);
      setShrinkTitle(true);
      setTimeout(() => setShowPlayer(true), 2000);
    }, 3000);
    return () => clearTimeout(fadeTimer);
  }, [movie]);

  // MP4 local: gọi play() sau khi show, sync muted state
  useEffect(() => {
    if (!showPlayer || !videoRef.current) return;
    const el = videoRef.current;
    if (el.tagName !== 'VIDEO') return;
    el.muted = muted;
    el.play().catch(() => {});
  }, [showPlayer, movie, muted]);

  const trailerUrl = movie?.trailer_url;
  const videoSrc = trailerUrl ? resolveVideoSrc(trailerUrl) : null;
  const shortIntro =
    (movie && movie.short_intro) ||
    (movie && movie.description
      ? movie.description.length > 140
        ? `${movie.description.slice(0, 140)}…`
        : movie.description
      : null);
  const isSeries = movie?.type === 'series';
  const detailPath = movie ? (isSeries ? `/series/${movie.id}` : `/movies/${movie.id}`) : '';
  const modalContent = externalModalItem || (showInfo && movie ? movie : null);
  const isModalOpen = !!(showInfo && movie) || !!externalModalItem;
  const isSeriesModal = modalContent?.type === 'series';

  // Đồng bộ likeCount từ hero item (series có like_count từ API)
  useEffect(() => {
    if (movie && isSeries && typeof movie.like_count === 'number') setLikeCount(movie.like_count);
  }, [movie, isSeries]);

  // Khi mở modal từ row (externalModalItem): load chi tiết + episodes
  useEffect(() => {
    if (!externalModalItem) return;
    let cancelled = false;
    setUserHasLiked(false);
    setSelectedSeasonId('');
    setInfoLoading(true);
    setInfoError('');
    const type = externalModalItem.type === 'series' ? 'series' : 'movie';
    const load = async () => {
      try {
        if (type === 'series') {
          const [detailRes, episodesRes] = await Promise.all([
            fetch(`${API_BASE}/api/series/${externalModalItem.id}`).then((r) =>
              r.ok ? r.json() : Promise.reject(new Error('Không tải được chi tiết series'))
            ),
            fetch(`${API_BASE}/api/series/${externalModalItem.id}/episodes`).then((r) =>
              r.ok ? r.json() : []
            ),
          ]);
          if (!cancelled) {
            setInfoData({ ...detailRes, type: 'series', genres: detailRes.genres || [] });
            if (typeof detailRes.like_count === 'number') setLikeCount(detailRes.like_count);
            setEpisodes(Array.isArray(episodesRes) ? episodesRes : []);
            const firstSeason = (detailRes.seasons || [])[0];
            if (firstSeason) setSelectedSeasonId(String(firstSeason.id));
          }
        } else {
          const [detailRes, genresRes] = await Promise.all([
            fetch(`${API_BASE}/api/movies/${externalModalItem.id}`).then((r) =>
              r.ok ? r.json() : Promise.reject(new Error('Không tải được chi tiết phim'))
            ),
            fetch(`${API_BASE}/api/movies/${externalModalItem.id}/genres`).then((r) =>
              r.ok ? r.json() : []
            ),
          ]);
          if (!cancelled) {
            setInfoData({
              ...detailRes,
              type: 'movie',
              genres: Array.isArray(genresRes) ? genresRes : [],
            });
            if (typeof detailRes.like_count === 'number') setLikeCount(detailRes.like_count);
            setEpisodes([]);
          }
        }
      } catch (err) {
        if (!cancelled) setInfoError(err.message || 'Không tải được thông tin');
      } finally {
        if (!cancelled) setInfoLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [externalModalItem?.id, externalModalItem?.type]);

  // Khi mở modal: lấy trạng thái like (đã like chưa) để disable nút / hiển thị đúng
  useEffect(() => {
    if (!modalContent || !profileId || !token) return;
    const type = modalContent.type === 'series' ? 'series' : 'movie';
    const url = `${API_BASE}/api/${type === 'series' ? 'series' : 'movies'}/${modalContent.id}/like-status?profile_id=${profileId}`;
    let cancelled = false;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!cancelled && data) {
          if (typeof data.like_count === 'number') setLikeCount(data.like_count);
          if (data.user_has_liked === true) setUserHasLiked(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isModalOpen, modalContent?.id, modalContent?.type, profileId, token]);

  // Kiểm tra đã trong watchlist chưa (movie hoặc series)
  useEffect(() => {
    if (!token || !profileId || !modalContent) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/watchlist?profile_id=${profileId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (cancelled) return;
        const inList = Array.isArray(list) && list.some(
          (item) => (item.type === 'movie' && Number(item.content_id) === Number(modalContent.id))
            || (item.type === 'series' && Number(item.content_id) === Number(modalContent.id))
        );
        setAddedToWatchlist(!!inList);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, profileId, modalContent?.id, modalContent?.type]);

  // Không có trailer hợp lệ -> luôn dùng file MP4 mặc định
  const useLocalFallback = showPlayer && !videoSrc;

  const restartSequence = () => {
    setHasPlayed(false);
    setShowPlayer(true);
    setStartFade(false);
    setShrinkTitle(false);
    const v = videoRef.current;
    if (v && v.tagName === 'VIDEO') {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  };

  const handlePlay = () => {
    const target = modalContent || movie;
    if (!target) return;
    const isSeriesTarget = target.type === 'series';
    if (isSeriesTarget) {
      const filtered = selectedSeasonId
        ? episodes.filter((ep) => String(ep.season_id) === String(selectedSeasonId))
        : episodes;
      const firstEp = filtered.length ? filtered[0] : episodes[0];
      if (firstEp) {
        navigate(`/watch/episode/${firstEp.id}`);
        handleCloseInfo();
      } else {
        navigate(`/series/${target.id}`);
      }
    } else {
      navigate(`/watch/movie/${target.id}`);
      handleCloseInfo();
    }
  };

  /** Nút Phát trên hero banner chính: chuyển qua trang detail (không phát luôn) */
  const handleGoToDetail = () => {
    if (!movie) return;
    navigate(detailPath);
  };

  const handleToggleMute = () => {
    const v = videoRef.current;
    setMuted((prev) => {
      const next = !prev;
      if (v && v.tagName === 'VIDEO') {
        v.muted = next;
      }
      return next;
    });
  };

  const handleOpenInfo = async () => {
    if (!movie) return;
    setShowInfo(true);
    setUserHasLiked(false);
    setSelectedSeasonId('');
    if (infoData && infoData.id === movie.id && infoData.type === movie.type) {
      return;
    }
    setInfoLoading(true);
    setInfoError('');
    try {
      if (movie.type === 'series') {
        const [detailRes, episodesRes] = await Promise.all([
          fetch(`${API_BASE}/api/series/${movie.id}`).then((r) =>
            r.ok ? r.json() : Promise.reject(new Error('Không tải được chi tiết series'))
          ),
          fetch(`${API_BASE}/api/series/${movie.id}/episodes`).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);
        setInfoData({ ...detailRes, type: 'series', genres: detailRes.genres || [] });
        if (typeof detailRes.like_count === 'number') setLikeCount(detailRes.like_count);
        setEpisodes(Array.isArray(episodesRes) ? episodesRes : []);
        const firstSeason = (detailRes.seasons || [])[0];
        if (firstSeason) setSelectedSeasonId(String(firstSeason.id));
      } else {
        const [detailRes, genresRes] = await Promise.all([
          fetch(`${API_BASE}/api/movies/${movie.id}`).then((r) =>
            r.ok ? r.json() : Promise.reject(new Error('Không tải được chi tiết phim'))
          ),
          fetch(`${API_BASE}/api/movies/${movie.id}/genres`).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);
        setInfoData({
          ...detailRes,
          type: 'movie',
          genres: Array.isArray(genresRes) ? genresRes : [],
        });
        if (typeof detailRes.like_count === 'number') {
          setLikeCount(detailRes.like_count);
        }
        setEpisodes([]);
      }
    } catch (err) {
      setInfoError(err.message || 'Không tải được thông tin');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleCloseInfo = () => {
    setShowInfo(false);
    setUserHasLiked(false);
    setEpisodes([]);
    if (externalModalItem && onCloseModal) onCloseModal();
  };

  const handleToggleModalMute = () => {
    setModalMuted((prev) => !prev);
  };

  const modalTrailerSrc = isModalOpen && modalContent?.trailer_url ? resolveVideoSrc(modalContent.trailer_url) : null;

  useEffect(() => {
    if (!isModalOpen || !modalVideoRef.current || !modalTrailerSrc) return;
    const el = modalVideoRef.current;
    if (el.tagName !== 'VIDEO') return;
    el.muted = modalMuted;
    el.play().catch(() => {});
  }, [isModalOpen, modalTrailerSrc, modalMuted]);

  const seasons = (infoData && infoData.seasons) || [];
  const modalEpisodes =
    selectedSeasonId
      ? episodes.filter((ep) => String(ep.season_id) === String(selectedSeasonId))
      : episodes;
  const directors = (infoData && infoData.cast && Array.isArray(infoData.cast))
    ? infoData.cast.filter((c) => String(c.role).toLowerCase() === 'director')
    : [];
  const actors = (infoData && infoData.cast && Array.isArray(infoData.cast))
    ? infoData.cast.filter((c) => String(c.role).toLowerCase() !== 'director')
    : [];

  const handleToggleWatchlist = async () => {
    const target = modalContent || movie;
    if (!target || !token || !profileId || watchlistLoading) return;
    setWatchlistLoading(true);
    try {
      const isSeriesTarget = target.type === 'series';
      if (addedToWatchlist) {
        const type = isSeriesTarget ? 'series' : 'movie';
        await api('DELETE', `/api/watchlist/${target.id}?profile_id=${profileId}&type=${type}`);
        setAddedToWatchlist(false);
      } else {
        if (isSeriesTarget) {
          await api('POST', '/api/watchlist', {
            profile_id: Number(profileId),
            series_id: Number(target.id),
          });
        } else {
          await api('POST', '/api/watchlist', {
            profile_id: Number(profileId),
            movie_id: Number(target.id),
          });
        }
        setAddedToWatchlist(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleToggleLike = async () => {
    const target = modalContent || movie;
    if (!target || likeLoading || !token || !profileId) return;
    setLikeLoading(true);
    try {
      const isSeriesTarget = target.type === 'series';
      const q = `?profile_id=${profileId}`;
      if (userHasLiked) {
        const res = isSeriesTarget
          ? await api('DELETE', `/api/series/${target.id}/like${q}`)
          : await api('DELETE', `/api/movies/${target.id}/like${q}`);
        if (res && typeof res.like_count === 'number') {
          setLikeCount(res.like_count);
          setUserHasLiked(false);
        }
      } else {
        const body = { profile_id: Number(profileId) };
        const res = isSeriesTarget
          ? await api('POST', `/api/series/${target.id}/like`, body)
          : await api('POST', `/api/movies/${target.id}/like`, body);
        if (res && typeof res.like_count === 'number') {
          setLikeCount(res.like_count);
          setUserHasLiked(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLikeLoading(false);
    }
  };

  const detailPathModal = modalContent
    ? (modalContent.type === 'series' ? `/series/${modalContent.id}` : `/movies/${modalContent.id}`)
    : detailPath;
  const handleMetaMore = () => {
    if (!modalContent && !movie) return;
    navigate(modalContent ? detailPathModal : detailPath);
  };

  return (
    <>
    {!modalOnly && (
    <section className="hero-banner">
      {/* Ảnh bìa hiển thị ngay lập tức; sau 3s bắt đầu fade 2s, rồi trailer xuất hiện */}
      {!showPlayer && movie && (
        <img
          className={`hero-banner-image${
            startFade ? ' hero-banner-poster-fade' : ''
          }`}
          src={
            movie.banner_url
              ? String(movie.banner_url).startsWith('http')
                ? movie.banner_url
                : `${API_BASE}${movie.banner_url}`
              : movie.thumbnail_url
                ? String(movie.thumbnail_url).startsWith('http')
                  ? movie.thumbnail_url
                  : `${API_BASE}${movie.thumbnail_url}`
                : mainBannerVideo
          }
          alt={movie.title}
        />
      )}

      {showPlayer && (
        <>
          {videoSrc ? (
            <video
              ref={videoRef}
              className="hero-banner-video"
              src={videoSrc}
              muted={muted}
              playsInline
              onEnded={() => {
                setHasPlayed(true);
                setShowPlayer(false);
                setStartFade(false);
                setShrinkTitle(false);
              }}
            />
          ) : useLocalFallback ? (
            <video
              ref={videoRef}
              className="hero-banner-video"
              src={mainBannerVideo}
              poster={
                movie?.thumbnail_url
                  ? String(movie.thumbnail_url).startsWith('http')
                    ? movie.thumbnail_url
                    : `${API_BASE}${movie.thumbnail_url}`
                  : undefined
              }
              muted={muted}
              playsInline
              onEnded={() => {
                setHasPlayed(true);
                setShowPlayer(false);
                setStartFade(false);
                setShrinkTitle(false);
              }}
            />
          ) : null}
        </>
      )}

      <div className="hero-banner-gradient" />

      {movie && (
        <>


          {/* Góc phải dưới: nhãn tuổi + nút mute khi đang phát + nút xem lại sau khi trailer đã chạy xong */}
          <div className="hero-banner-bottom-right">

            {showPlayer && (
              <button
                type="button"
                className="hero-banner-mute-btn"
                onClick={handleToggleMute}
                aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
              >
                {muted ? '🔇' : '🔊'}
              </button>
            )}
            {!showPlayer && hasPlayed && (
              <button
                type="button"
                className="hero-banner-replay-btn"
                onClick={restartSequence}
              >
                ↺ Xem lại
              </button>
            )}
              {movie.age_rating && (
              <span className="hero-banner-age">
                T{movie.age_rating}
              </span>
            )}
          </div>

          <div
            className={`hero-banner-content${
              shrinkTitle ? ' hero-banner-content--shrink' : ''
            }`}
          >
            <h2
              className={`hero-banner-title${
                shrinkTitle ? ' hero-banner-title--shrink' : ''
              }`}
            >
              {movie.title}
            </h2>
            {shortIntro && (
              <p
                className={`hero-banner-intro${
                  shrinkTitle ? ' hero-banner-intro--hidden' : ''
                }`}
              >
                {shortIntro}
              </p>
            )}

            <div className="hero-banner-modal-actions">
              <button
                type="button"
                className="hero-banner-btn hero-banner-btn-primary"
                onClick={handleGoToDetail}
              >
                Phát
              </button>
              <button
                type="button"
                className="hero-banner-btn hero-banner-btn-secondary"
                onClick={handleOpenInfo}
              >
                Thông tin khác
              </button>
            </div>
          </div>
        </>
      )}
    </section>
    )}

      {isModalOpen && modalContent && createPortal(
        (
          <div className="hero-banner-overlay" onClick={handleCloseInfo}>
            <div
              className="hero-banner-modal"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="hero-banner-modal-header">
              <button
                type="button"
                className="hero-banner-close-btn"
                onClick={handleCloseInfo}
              >
                ✕
              </button>
            </div>
            <div className="hero-banner-modal-scroll">
            {/* Top: trailer video (hoặc ảnh ngang) + gradient bottom, overlay nút Phát, +, Like, Mute */}
            <div className="hero-banner-modal-top">
              {modalTrailerSrc ? (
                <video
                  ref={modalVideoRef}
                  className="hero-banner-modal-video"
                  src={modalTrailerSrc}
                  muted={modalMuted}
                  playsInline
                  loop
                  poster={
                    (modalContent?.banner_url || modalContent?.thumbnail_url)
                      ? (String(modalContent.banner_url || modalContent.thumbnail_url).startsWith('http')
                          ? (modalContent.banner_url || modalContent.thumbnail_url)
                          : `${API_BASE}${modalContent.banner_url || modalContent.thumbnail_url}`)
                      : undefined
                  }
                />
              ) : (
                <img
                  className="hero-banner-modal-video-poster"
                  src={
                    (modalContent.banner_url || modalContent.thumbnail_url)
                      ? (String(modalContent.banner_url || modalContent.thumbnail_url).startsWith('http')
                          ? (modalContent.banner_url || modalContent.thumbnail_url)
                          : `${API_BASE}${modalContent.banner_url || modalContent.thumbnail_url}`)
                      : ''
                  }
                  alt=""
                />
              )}
              <div className="hero-banner-modal-top-gradient" />
              <div className="hero-banner-modal-top-overlay">
                <h2 className="hero-banner-modal-title">{modalContent.title}</h2>
                <div className="hero-banner-modal-actions hero-banner-modal-actions--top">
                  <button
                    type="button"
                    className="hero-banner-btn hero-banner-btn-primary"
                    onClick={handlePlay}
                  >
                    ▶ Phát
                  </button>
                  <button
                    type="button"
                    className={`hero-banner-btn hero-banner-btn-icon hero-banner-btn-watchlist ${addedToWatchlist ? 'hero-banner-btn-watchlist--active' : ''}`}
                    onClick={handleToggleWatchlist}
                    disabled={watchlistLoading || !token || !profileId}
                    title={addedToWatchlist ? 'Xóa khỏi danh sách' : 'Thêm vào danh sách'}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className={`hero-banner-btn hero-banner-btn-icon hero-banner-btn-like ${userHasLiked ? 'hero-banner-btn-like--active' : ''}`}
                    onClick={handleToggleLike}

                    disabled={likeLoading || !token || !profileId}
                    title={userHasLiked ? 'Bỏ thích' : 'Thích'}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    className="hero-banner-btn hero-banner-btn-icon"
                    onClick={handleToggleModalMute}
                    aria-label={modalMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                  >
                    {modalMuted ? '🔇' : '🔊'}
                  </button>
                </div>
                {likeCount != null && (
                  <span className="hero-banner-modal-like-count">Lượt thích: {likeCount}</span>
                )}
              </div>
            </div>

            {/* Panel thông tin: trái = năm, tuổi, mô tả; phải = diễn viên, thể loại, đạo diễn */}
            <div className="hero-banner-modal-body">
              <div className="hero-banner-modal-info">
                <div className="hero-banner-modal-info-left">
                  {infoLoading && (
                    <p className="hero-banner-modal-loading">Đang tải thông tin...</p>
                  )}
                  {infoError && (
                    <p className="hero-banner-modal-error">{infoError}</p>
                  )}
                  {infoData && (
                    <>
                      <div className="hero-banner-modal-meta-row">
                        {infoData.release_year != null && (
                          <span>{infoData.release_year}</span>
                        )}
                        {isSeriesModal && seasons.length > 0 && (
                          <span>{seasons.length} mùa</span>
                        )}
                        {!isSeriesModal && infoData.duration_minutes != null && (
                          <span>{infoData.duration_minutes} phút</span>
                        )}
                        {(modalContent?.age_rating) && (
                          <span className="hero-banner-modal-age">T{modalContent.age_rating}</span>
                        )}
                      </div>
                      <p className="hero-banner-modal-desc">
                        {(infoData.description || modalContent?.description || '').slice(0, 280)}
                        {((infoData.description || modalContent?.description) || '').length > 280 ? '…' : ''}
                      </p>
                    </>
                  )}
                </div>
                <div className="hero-banner-modal-info-right">
                  {actors.length > 0 && (
                    <div className="hero-banner-meta-section">
                      <strong>Diễn viên:</strong>{' '}
                      {actors.slice(0, 3).map((c) => c.name).join(', ')}
                      {actors.length > 3 && (
                        <span className="hero-banner-meta-more" onClick={handleMetaMore}>thêm</span>
                      )}
                    </div>
                  )}
                  {Array.isArray(infoData?.genres) && infoData.genres.length > 0 && (
                    <div className="hero-banner-meta-section">
                      <strong>Thể loại:</strong>{' '}
                      {infoData.genres.slice(0, 3).map((g) => g.name).join(', ')}
                      {infoData.genres.length > 3 && (
                        <span className="hero-banner-meta-more" onClick={handleMetaMore}>thêm</span>
                      )}
                    </div>
                  )}
                  {directors.length > 0 && (
                    <div className="hero-banner-meta-section">
                      <strong>Đạo diễn:</strong>{' '}
                      {directors.map((d) => d.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Series: chọn mùa + danh sách tập */}
              {isSeriesModal && (
                <div className="hero-banner-modal-episodes">
                  <h3 className="hero-banner-modal-episodes-title">Tập</h3>
                  {seasons.length > 0 && (
                    <div className="hero-banner-modal-season-wrap">
                      <select
                        value={selectedSeasonId}
                        onChange={(e) => setSelectedSeasonId(e.target.value)}
                        className="hero-banner-modal-season-select"
                      >
                        {seasons.map((s) => (
                          <option key={s.id} value={s.id}>
                            Mùa {s.season_number}
                            {s.title ? ` - ${s.title}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {selectedSeasonId && (
                    <p className="hero-banner-modal-season-meta">
                      {seasons.find((s) => String(s.id) === selectedSeasonId)?.title || ''}
                      {modalContent.age_rating && ` • T${modalContent.age_rating}`}
                    </p>
                  )}
                  <ul className="hero-banner-modal-episode-list">
                    {modalEpisodes.length === 0 ? (
                      <li className="hero-banner-modal-episode-empty">Chưa có tập nào.</li>
                    ) : (
                      modalEpisodes.map((ep) => (
                        <li key={ep.id} className="hero-banner-modal-episode-item">
                          <span className="hero-banner-modal-episode-num">{ep.episode_number}</span>
                          {ep.thumbnail_url && (
                            <img
                              src={
                                ep.thumbnail_url.startsWith('http')
                                  ? ep.thumbnail_url
                                  : `${API_BASE}${ep.thumbnail_url}`
                              }
                              alt=""
                              className="hero-banner-modal-episode-thumb"
                            />
                          )}
                          <div className="hero-banner-modal-episode-info">
                            <Link
                              to={`/watch/episode/${ep.id}`}
                              className="hero-banner-modal-episode-title"
                              onClick={handleCloseInfo}
                            >
                              {ep.title || `Tập ${ep.episode_number}`}
                            </Link>
                            {ep.description && (
                              <p className="hero-banner-modal-episode-desc">
                                {ep.description.length > 100
                                  ? `${ep.description.slice(0, 100)}…`
                                  : ep.description}
                              </p>
                            )}
                          </div>
                          <span className="hero-banner-modal-episode-duration">
                            {ep.duration_minutes != null ? `${ep.duration_minutes}ph` : ''}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
        ),
        document.body
      )}
    </>
  );
}

export default HeroBanner;
