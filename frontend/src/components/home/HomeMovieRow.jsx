import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE, api, getToken, getProfileId } from '../../apis/client';
import { pushClientNotification } from '../../utils/notificationsClient';
import '../../styles/components/home-movie-row.css';

const HOVER_PANEL_W = 320;
const HOVER_PANEL_H = 280;

function getImageUrl(item) {
  const url = item.banner_url || item.thumbnail_url;
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

function getLink(item) {
  if (item.type === 'episode') return `/watch/episode/${item.id}`;
  if (item.type === 'series') return `/series/${item.id}`;
  return `/movies/${item.id || item.movie_id}`;
}

/** Nút Play (tam giác) */
function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** Chevron hướng xuống (mở modal thông tin) */
function ChevronDownIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

function HomeMovieRow({ title, items, onOpenInfo, onItemRemoved, onPlay }) {
  const scrollRef = useRef(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [cardRect, setCardRect] = useState(null);
  const [hoverAddedToWatchlist, setHoverAddedToWatchlist] = useState(false);
  const [hoverUserHasLiked, setHoverUserHasLiked] = useState(false);
  const leaveTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const token = getToken();
  const profileId = getProfileId();

  // Khi hover vào thẻ: lấy trạng thái watchlist + like để hiển thị nút đỏ
  useEffect(() => {
    if (!hoveredItem || !token || !profileId) {
      setHoverAddedToWatchlist(false);
      setHoverUserHasLiked(false);
      return;
    }
    let cancelled = false;
    const type = hoveredItem.type === 'series' ? 'series' : 'movie';
    const id = hoveredItem.id;
    Promise.all([
      fetch(`${API_BASE}/api/watchlist?profile_id=${profileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/api/${type === 'series' ? 'series' : 'movies'}/${id}/like-status?profile_id=${profileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : {})),
    ]).then(([watchlist, likeStatus]) => {
      if (cancelled) return;
      const inList = Array.isArray(watchlist) && watchlist.some(
        (row) => (row.type === type && Number(row.content_id) === Number(id))
      );
      setHoverAddedToWatchlist(!!inList);
      setHoverUserHasLiked(!!likeStatus?.user_has_liked);
    }).catch(() => {
      if (!cancelled) {
        setHoverAddedToWatchlist(false);
        setHoverUserHasLiked(false);
      }
    });
    return () => { cancelled = true; };
  }, [hoveredItem?.id, hoveredItem?.type, token, profileId]);

  if (!items || items.length === 0) return null;

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 280;
    const gap = 16;
    const scrollAmount = (cardWidth + gap) * 3;
    el.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
  };

  const handleCardEnter = (item, e) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    const el = e.currentTarget;
    setCardRect(el.getBoundingClientRect());
    setHoveredItem(item);
  };

  const handleCardLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
      setCardRect(null);
    }, 150);
  };

  const handlePanelEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handlePanelLeave = () => {
    setHoveredItem(null);
    setCardRect(null);
  };

  const getPanelStyle = () => {
    if (!cardRect) return { visibility: 'hidden' };
    const centerX = cardRect.left + cardRect.width / 2;
    const centerY = cardRect.top + cardRect.height / 2;
    let left = centerX - HOVER_PANEL_W / 2;
    let top = centerY - HOVER_PANEL_H / 2;
    const pad = 8;
    left = Math.max(pad, Math.min(left, window.innerWidth - HOVER_PANEL_W - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - HOVER_PANEL_H - pad));
    return { left, top };
  };

  const handlePlay = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPlay) {
      onPlay(item, e);
    } else if (item.type === 'episode' && item.series_id) {
      navigate(`/series/${item.series_id}`);
    } else if (item.type === 'series') {
      navigate(`/series/${item.id}`);
    } else {
      navigate(`/movies/${item.id}`);
    }
    setHoveredItem(null);
  };

  const handleAddWatchlist = async (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || !profileId) return;
    const type = item.type === 'series' ? 'series' : 'movie';
    try {
      if (hoverAddedToWatchlist) {
        await api('DELETE', `/api/watchlist/${item.id}?profile_id=${profileId}&type=${type}`);
        setHoverAddedToWatchlist(false);
      } else {
        if (type === 'series') {
          await api('POST', '/api/watchlist', { profile_id: Number(profileId), series_id: Number(item.id) });
        } else {
          await api('POST', '/api/watchlist', { profile_id: Number(profileId), movie_id: Number(item.id) });
        }
        setHoverAddedToWatchlist(true);
        pushClientNotification(
          'watchlist_add',
          type === 'series'
            ? 'Bạn đã thêm một series vào danh sách của tôi.'
            : 'Bạn đã thêm một phim vào danh sách của tôi.',
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFromRow = async (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onItemRemoved) return;
    if (!token || !profileId) {
      onItemRemoved(item);
      return;
    }
    try {
      if (title === 'Danh sách của tôi') {
        const type = item.type === 'series' ? 'series' : 'movie';
        await api('DELETE', `/api/watchlist/${item.id}?profile_id=${profileId}&type=${type}`);
      } else if (title === 'Yêu thích') {
        await api('DELETE', `/api/favorites/${item.id}?profile_id=${profileId}`);
      }
    } catch (err) {
      console.error(err);
    }
    onItemRemoved(item);
  };

  const handleLike = async (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || !profileId) return;
    const type = item.type === 'series' ? 'series' : 'movie';
    try {
      const q = `?profile_id=${profileId}`;
      if (hoverUserHasLiked) {
        await api('DELETE', `/api/${type === 'series' ? 'series' : 'movies'}/${item.id}/like${q}`);
        setHoverUserHasLiked(false);
      } else {
        const body = { profile_id: Number(profileId) };
        if (type === 'series') {
          await api('POST', `/api/series/${item.id}/like`, body);
        } else {
          await api('POST', `/api/movies/${item.id}/like`, body);
        }
        setHoverUserHasLiked(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExpand = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenInfo) {
      onOpenInfo({ ...item, type: item.type || 'movie' });
      // Đóng hover panel sau khi parent đã nhận state, để modal HeroBanner kịp hiện
      setTimeout(() => setHoveredItem(null), 0);
    }
  };

  return (
    <section className="home-movie-row">
      <h2 className="home-movie-row-title">{title}</h2>
      <div className="home-movie-row-outer">
        <button
          type="button"
          className="home-movie-row-arrow home-movie-row-arrow--left"
          onClick={() => scroll(-1)}
          aria-label="Cuộn trái"
        >
          ‹
        </button>
        <div ref={scrollRef} className="home-movie-row-track">
          {items.map((item) => {
            const link = getLink(item);
            const imgUrl = getImageUrl(item);
            return (
              <div
                key={`${item.type || 'movie'}-${item.id}`}
                className="home-movie-row-card-wrap"
                onMouseEnter={(e) => handleCardEnter(item, e)}
                onMouseLeave={handleCardLeave}
              >
                <Link to={link} className="home-movie-row-card">
                  <div className="home-movie-row-img-wrap">
                    {imgUrl ? (
                      <img src={imgUrl} alt={item.title} className="home-movie-row-img" />
                    ) : (
                      <div className="home-movie-row-img home-movie-row-img--placeholder" />
                    )}
                    {item.rating != null && (
                      <span className="home-movie-row-rating-badge">★ {Number(item.rating).toFixed(1)}</span>
                    )}
                    <div className="home-movie-row-title-bar">
                      <span className="home-movie-row-name">{item.title}</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="home-movie-row-arrow home-movie-row-arrow--right"
          onClick={() => scroll(1)}
          aria-label="Cuộn phải"
        >
          ›
        </button>
      </div>

      {hoveredItem && (
        <div
          className="home-movie-row-hover-panel"
          style={{
            width: HOVER_PANEL_W,
            height: HOVER_PANEL_H,
            ...getPanelStyle(),
          }}
          onMouseEnter={handlePanelEnter}
          onMouseLeave={handlePanelLeave}
        >
          <div className="home-movie-row-hover-img-wrap">
            {onItemRemoved && (
              <button
                type="button"
                className="home-movie-row-remove-btn"
                onClick={(e) => handleRemoveFromRow(e, hoveredItem)}
                aria-label="Xóa khỏi danh sách"
              >
                ×
              </button>
            )}
            {getImageUrl(hoveredItem) ? (
              <img src={getImageUrl(hoveredItem)} alt="" className="home-movie-row-hover-img" />
            ) : (
              <div className="home-movie-row-hover-img home-movie-row-hover-img--placeholder" />
            )}
          </div>
          <div className="home-movie-row-hover-actions">
            <button
              type="button"
              className="home-movie-row-hover-btn home-movie-row-hover-btn-play"
              onClick={(e) => handlePlay(e, hoveredItem)}
              aria-label="Phát"
            >
              <PlayIcon />
            </button>
            <button
              type="button"
              className={`home-movie-row-hover-btn home-movie-row-hover-btn-icon home-movie-row-hover-btn-watchlist ${hoverAddedToWatchlist ? 'home-movie-row-hover-btn--active' : ''}`}
              onClick={(e) => handleAddWatchlist(e, hoveredItem)}
              disabled={!token || !profileId}
              aria-label={hoverAddedToWatchlist ? 'Xóa khỏi danh sách' : 'Thêm vào danh sách'}
            >
              +
            </button>
            <button
              type="button"
              className={`home-movie-row-hover-btn home-movie-row-hover-btn-icon home-movie-row-hover-btn-like ${hoverUserHasLiked ? 'home-movie-row-hover-btn--active' : ''}`}
              onClick={(e) => handleLike(e, hoveredItem)}
              disabled={!token || !profileId}
              aria-label={hoverUserHasLiked ? 'Bỏ thích' : 'Thích'}
            >
              👍
            </button>
            <button
              type="button"
              className="home-movie-row-hover-btn home-movie-row-hover-btn-expand"
              onClick={(e) => handleExpand(e, hoveredItem)}
              aria-label="Xem thông tin"
            >
              <ChevronDownIcon />
            </button>
          </div>
          <div className="home-movie-row-hover-meta">
            {hoveredItem.age_rating && <span className="home-movie-row-hover-age">T{hoveredItem.age_rating}</span>}
            {hoveredItem.country_code && (
              <span className="home-movie-row-hover-country">{hoveredItem.country_code}</span>
            )}
          </div>
          <h3 className="home-movie-row-hover-title">{hoveredItem.title}</h3>
        </div>
      )}
    </section>
  );
}

export default HomeMovieRow;
