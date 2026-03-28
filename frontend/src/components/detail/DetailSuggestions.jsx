import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE, api, getToken, getProfileId } from '../../apis/client';
import '../../styles/components/detail-suggestions.css';

const HOVER_PANEL_W = 320;
const HOVER_PANEL_H = 280;

function getImageUrl(item) {
  const url = item?.banner_url || item?.thumbnail_url;
  if (!url) return null;
  return String(url).startsWith('http') ? url : `${API_BASE}${url}`;
}

function getLink(item) {
  if (item?.type === 'series') return `/series/${item.id}`;
  return `/movies/${item.id}`;
}

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

/**
 * Gợi ý phim/series: cùng thể loại (tất cả thể loại của nội dung) + fallback nếu không đủ.
 * Thẻ gợi ý giống home-movie-row; hover hiện panel với nút Phát, +, Like, >.
 * onOpenInfo(item): khi có thì nhấn > mở overlay thông tin (HeroBanner modal); không có thì > chuyển sang trang detail.
 */
function DetailSuggestions({ type, contentId, onOpenInfo }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [cardRect, setCardRect] = useState(null);
  const [hoverAddedToWatchlist, setHoverAddedToWatchlist] = useState(false);
  const [hoverUserHasLiked, setHoverUserHasLiked] = useState(false);
  const leaveTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const token = getToken();
  const profileId = getProfileId();

  useEffect(() => {
    let cancelled = false;
    if (!contentId) {
      setLoading(false);
      return () => {};
    }
    if (type === 'movie') {
      fetch(`${API_BASE}/api/movies/${contentId}/suggestions?limit=10`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => {
          if (!cancelled) setItems(Array.isArray(list) ? list : []);
        })
        .catch(() => { if (!cancelled) setItems([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else if (type === 'series') {
      fetch(`${API_BASE}/api/series/${contentId}/suggestions?limit=10`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => {
          if (!cancelled) setItems(Array.isArray(list) ? list : []);
        })
        .catch(() => { if (!cancelled) setItems([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [type, contentId]);

  useEffect(() => {
    if (!hoveredItem || !token || !profileId) {
      setHoverAddedToWatchlist(false);
      setHoverUserHasLiked(false);
      return;
    }
    let cancelled = false;
    const contentType = hoveredItem.type === 'series' ? 'series' : 'movie';
    const id = hoveredItem.id;
    Promise.all([
      fetch(`${API_BASE}/api/watchlist?profile_id=${profileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/api/${contentType === 'series' ? 'series' : 'movies'}/${id}/like-status?profile_id=${profileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : {})),
    ]).then(([watchlist, likeStatus]) => {
      if (cancelled) return;
      const inList = Array.isArray(watchlist) && watchlist.some(
        (row) => (row.type === contentType && Number(row.content_id) === Number(id))
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
    navigate(getLink(item));
    setHoveredItem(null);
  };

  const handleAddWatchlist = async (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || !profileId) return;
    const contentType = item.type === 'series' ? 'series' : 'movie';
    try {
      if (hoverAddedToWatchlist) {
        await api('DELETE', `/api/watchlist/${item.id}?profile_id=${profileId}&type=${contentType}`);
        setHoverAddedToWatchlist(false);
      } else {
        if (contentType === 'series') {
          await api('POST', '/api/watchlist', { profile_id: Number(profileId), series_id: Number(item.id) });
        } else {
          await api('POST', '/api/watchlist', { profile_id: Number(profileId), movie_id: Number(item.id) });
        }
        setHoverAddedToWatchlist(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || !profileId) return;
    const contentType = item.type === 'series' ? 'series' : 'movie';
    try {
      const q = `?profile_id=${profileId}`;
      if (hoverUserHasLiked) {
        await api('DELETE', `/api/${contentType === 'series' ? 'series' : 'movies'}/${item.id}/like${q}`);
        setHoverUserHasLiked(false);
      } else {
        const body = { profile_id: Number(profileId) };
        if (contentType === 'series') {
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
      setTimeout(() => setHoveredItem(null), 0);
    } else {
      navigate(getLink(item));
      setHoveredItem(null);
    }
  };

  if (loading) return <section className="detail-suggestions"><p className="detail-suggestions-loading">Đang tải gợi ý...</p></section>;
  if (items.length === 0) return null;

  return (
    <section className="detail-suggestions">
      <h2 className="detail-suggestions-title">Gợi ý xem</h2>
      <div className="detail-suggestions-track">
        {items.map((item) => {
          const link = getLink(item);
          const imgUrl = getImageUrl(item);
          return (
            <div
              key={`${item.type || 'movie'}-${item.id}`}
              className="detail-suggestions-card-wrap"
              onMouseEnter={(e) => handleCardEnter(item, e)}
              onMouseLeave={handleCardLeave}
            >
              <Link to={link} className="detail-suggestions-card">
                <div className="detail-suggestions-img-wrap">
                  {imgUrl ? (
                    <img src={imgUrl} alt={item.title} className="detail-suggestions-img" />
                  ) : (
                    <div className="detail-suggestions-img detail-suggestions-img--placeholder" />
                  )}
                  {item.rating != null && (
                    <span className="detail-suggestions-rating-badge">★ {Number(item.rating).toFixed(1)}</span>
                  )}
                  <div className="detail-suggestions-title-bar">
                    <span className="detail-suggestions-name">{item.title}</span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {hoveredItem && (
        <div
          className="detail-suggestions-hover-panel"
          style={{
            width: HOVER_PANEL_W,
            height: HOVER_PANEL_H,
            ...getPanelStyle(),
          }}
          onMouseEnter={handlePanelEnter}
          onMouseLeave={handlePanelLeave}
        >
          <div className="detail-suggestions-hover-img-wrap">
            {getImageUrl(hoveredItem) ? (
              <img src={getImageUrl(hoveredItem)} alt="" className="detail-suggestions-hover-img" />
            ) : (
              <div className="detail-suggestions-hover-img detail-suggestions-hover-img--placeholder" />
            )}
          </div>
          <div className="detail-suggestions-hover-actions">
            <button
              type="button"
              className="detail-suggestions-hover-btn detail-suggestions-hover-btn-play"
              onClick={(e) => handlePlay(e, hoveredItem)}
              aria-label="Phát"
            >
              <PlayIcon />
            </button>
            <button
              type="button"
              className={`detail-suggestions-hover-btn detail-suggestions-hover-btn-icon detail-suggestions-hover-btn-watchlist ${hoverAddedToWatchlist ? 'detail-suggestions-hover-btn--active' : ''}`}
              onClick={(e) => handleAddWatchlist(e, hoveredItem)}
              disabled={!token || !profileId}
              aria-label={hoverAddedToWatchlist ? 'Xóa khỏi danh sách' : 'Thêm vào danh sách'}
            >
              +
            </button>
            <button
              type="button"
              className={`detail-suggestions-hover-btn detail-suggestions-hover-btn-icon detail-suggestions-hover-btn-like ${hoverUserHasLiked ? 'detail-suggestions-hover-btn--active' : ''}`}
              onClick={(e) => handleLike(e, hoveredItem)}
              disabled={!token || !profileId}
              aria-label={hoverUserHasLiked ? 'Bỏ thích' : 'Thích'}
            >
              👍
            </button>
            <button
              type="button"
              className="detail-suggestions-hover-btn detail-suggestions-hover-btn-expand"
              onClick={(e) => handleExpand(e, hoveredItem)}
              aria-label="Xem thông tin"
            >
              <ChevronDownIcon />
            </button>
          </div>
          <div className="detail-suggestions-hover-meta">
            {hoveredItem.age_rating && <span className="detail-suggestions-hover-age">T{hoveredItem.age_rating}</span>}
            {hoveredItem.country_code && (
              <span className="detail-suggestions-hover-country">{hoveredItem.country_code}</span>
            )}
          </div>
          <h3 className="detail-suggestions-hover-title">{hoveredItem.title}</h3>
        </div>
      )}
    </section>
  );
}

export default DetailSuggestions;
