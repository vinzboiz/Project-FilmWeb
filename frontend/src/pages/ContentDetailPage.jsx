import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../apis/client';
import { API_BASE, getToken, getProfileId } from '../apis/client';
import { pushClientNotification } from '../utils/notificationsClient';
import ReviewSection from '../components/ReviewSection';
import DetailMetaRow from '../components/detail/DetailMetaRow';
import DetailCast from '../components/detail/DetailCast';
import EpisodeList from '../components/detail/EpisodeList';
import DetailSuggestions from '../components/detail/DetailSuggestions';
import HeroBanner from '../components/home/HeroBanner';
import '../styles/pages/movie-detail.css';

function resolveVideoSrc(url, apiBase) {
  const base = apiBase || API_BASE;
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  if (u.startsWith('http')) return u;
  return u.startsWith('/') ? `${base}${u}` : `${base}/${u.replace(/^\//, '')}`;
}

function getYouTubeEmbedUrl(rawUrl) {
  if (!rawUrl) return null;
  const url = String(rawUrl).trim();
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const parts = u.pathname.split('/');
      const id = parts[parts.length - 1];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('youtu.be')) {
      const parts = u.pathname.split('/');
      const id = parts[parts.length - 1];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function ContentDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const pathname = location.pathname || '';
  const type = pathname.startsWith('/series') ? 'series' : 'movie';

  const [content, setContent] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [likeCount, setLikeCount] = useState(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [userHasLiked, setUserHasLiked] = useState(false);

  const [inWatchlist, setInWatchlist] = useState(false);
  const [inFavorite, setInFavorite] = useState(false);
  const [suggestionModalItem, setSuggestionModalItem] = useState(null);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const trailerSectionRef = useRef(null);

  const profileId = getProfileId();
  const token = getToken();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id, pathname]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/countries`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!cancelled) setCountries(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (type === 'movie') {
      fetch(`${API_BASE}/api/movies/${id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled) setContent(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      Promise.all([
        fetch(`${API_BASE}/api/series/${id}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_BASE}/api/series/${id}/episodes`).then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([s, eps]) => {
          if (!cancelled) {
            setContent(s);
            setEpisodes(Array.isArray(eps) ? eps : []);
            if (s && typeof s.like_count === 'number') setLikeCount(s.like_count);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => { cancelled = true; };
  }, [id, type]);

  useEffect(() => {
    if (type !== 'series' || !id || !profileId || !token) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/series/${id}/like-status?profile_id=${profileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!cancelled && data?.user_has_liked === true) setUserHasLiked(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [type, id, profileId, token]);

  useEffect(() => {
    if (type !== 'movie' || !token || !profileId || !content) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/watchlist?profile_id=${profileId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!cancelled)
          setInWatchlist(Array.isArray(list) && list.some((w) => String(w.movie_id || w.content_id) === String(id)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [type, token, profileId, content, id]);

  useEffect(() => {
    if (type !== 'movie' || !token || !profileId || !id) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/favorites/check?profile_id=${profileId}&movie_id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { is_favorite: false }))
      .then((data) => {
        if (!cancelled) setInFavorite(!!data.is_favorite);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [type, token, profileId, id]);

  const toggleWatchlist = useCallback(async () => {
    if (type !== 'movie' || !token || !profileId) return;
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
  }, [type, token, profileId, id, inWatchlist]);

  const toggleFavorite = useCallback(async () => {
    if (type !== 'movie' || !token || !profileId) return;
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
  }, [type, token, profileId, id, inFavorite]);

  const scrollToTrailer = useCallback(() => {
    trailerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (loading) return <div className="movie-detail" style={{ padding: '24px' }}>Đang tải...</div>;
  if (error || !content) {
    return (
      <div className="movie-detail" style={{ padding: '24px', color: 'red' }}>
        {error || (type === 'movie' ? 'Không tìm thấy phim' : 'Không tìm thấy series')}
      </div>
    );
  }

  const title = content.title;
  const bannerImg = content.banner_url || content.thumbnail_url;
  const posterSrc = bannerImg
    ? (String(bannerImg).startsWith('http') ? bannerImg : `${API_BASE}${bannerImg}`)
    : null;
  const thumbSrc = content.thumbnail_url
    ? (String(content.thumbnail_url).startsWith('http') ? content.thumbnail_url : `${API_BASE}${content.thumbnail_url}`)
    : null;
  const youtubeEmbedUrl = getYouTubeEmbedUrl(content.trailer_youtube_url);
  const localTrailerSrc = resolveVideoSrc(content.trailer_url, API_BASE);
  const trailerSrc = youtubeEmbedUrl || localTrailerSrc;
  const hasTrailer = !!trailerSrc;
  const seasons = content.seasons || [];
  const countryName = content.country_code
    ? (countries.find((c) => c.code === content.country_code)?.name || content.country_code)
    : null;

  return (
    <div className="movie-detail">
      <nav className="movie-detail-breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>›</span>
        <span>{title}</span>
      </nav>

      <div
        className="movie-detail-banner"
        style={{ backgroundImage: posterSrc ? `url(${posterSrc})` : undefined }}
      >
        <div className="movie-detail-banner-gradient" />
        <div className="movie-detail-banner-inner">
          <div className="movie-detail-poster">
            {thumbSrc && <img src={thumbSrc} alt={title} />}
          </div>
          <div className="movie-detail-info">
            <h1 className="movie-detail-title">{title}</h1>
            <p className="movie-detail-meta">
              {content.release_year && <span style={{ marginRight: '12px' }}>{content.release_year}</span>}
              {content.age_rating && <span style={{ marginRight: '12px' }}>{content.age_rating}</span>}
              {type === 'movie' ? 'Phim lẻ' : 'Phim bộ'}
              {content.view_count != null && (
                <span style={{ marginLeft: '12px' }}>{content.view_count} lượt xem</span>
              )}
              {type === 'series' && likeCount != null && (
                <span style={{ marginLeft: '12px' }}>👍 {likeCount}</span>
              )}
            </p>
            <div className="movie-detail-actions">
              {hasTrailer && (
                <button
                  type="button"
                  className="movie-detail-btn movie-detail-btn--secondary"
                  onClick={scrollToTrailer}
                >
                  ▶ Trailer
                </button>
              )}
              {type === 'movie' && content.video_url && (
                <Link to={`/watch/movie/${id}`} className="movie-detail-btn movie-detail-btn--primary">
                  ▶ Xem phim
                </Link>
              )}
              {type === 'series' && (
                <button
                  type="button"
                  className={`movie-detail-btn movie-detail-btn--secondary movie-detail-btn-like ${userHasLiked ? 'movie-detail-btn-like--active' : ''}`}
                  disabled={likeLoading || !profileId}
                  title={userHasLiked ? 'Bỏ thích' : 'Thích'}
                  onClick={async () => {
                    if (!token || !profileId) return;
                    setLikeLoading(true);
                    try {
                      const url = userHasLiked
                        ? `${API_BASE}/api/series/${id}/like?profile_id=${profileId}`
                        : `${API_BASE}/api/series/${id}/like`;
                      const res = await fetch(url, {
                        method: userHasLiked ? 'DELETE' : 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: userHasLiked ? undefined : JSON.stringify({ profile_id: Number(profileId) }),
                      });
                      const data = res.ok ? await res.json() : null;
                      if (data && typeof data.like_count === 'number') {
                        setLikeCount(data.like_count);
                        setUserHasLiked(!!data.user_has_liked);
                        setContent((prev) => (prev ? { ...prev, like_count: data.like_count } : null));
                      }
                    } finally {
                      setLikeLoading(false);
                    }
                  }}
                >
                  👍 Thích
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="movie-detail-toolbar">
        {type === 'movie' && token && profileId && (
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

      <div className="movie-detail-content">
        <DetailMetaRow content={content} type={type} countryName={countryName} />

        <section className="detail-info-section">
          <h2 className="detail-info-title">Thông tin bộ phim</h2>
          {content.description && (
            <p className="detail-info-desc">{content.description}</p>
          )}
        </section>

        {hasTrailer && (
          <section className="movie-detail-trailer" ref={trailerSectionRef}>
            <h2>Trailer</h2>
            {youtubeEmbedUrl ? (
              <div className="detail-trailer-video detail-trailer-video--embed">
                <iframe
                  src={youtubeEmbedUrl}
                  title="Trailer"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <video src={localTrailerSrc} controls className="detail-trailer-video" />
            )}
          </section>
        )}

        {type === 'series' && (
          <EpisodeList
            seasons={seasons}
            episodes={episodes}
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={setSelectedSeasonId}
          />
        )}

        <DetailCast cast={content.cast} />

        <ReviewSection
          contentType={type === 'movie' ? 'movie' : 'series'}
          contentId={id}
          initialLimit={10}
        />
        <DetailSuggestions type={type} contentId={id} onOpenInfo={setSuggestionModalItem} />
      </div>
      <HeroBanner
        modalOnly
        externalModalItem={suggestionModalItem}
        onCloseModal={() => setSuggestionModalItem(null)}
      />
    </div>
  );
}

export default ContentDetailPage;
