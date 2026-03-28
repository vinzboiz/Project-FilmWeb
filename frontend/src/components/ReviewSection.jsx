import { useEffect, useState } from 'react';
import { API_BASE, getToken } from '../apis/client';
import '../styles/components/review-section.css';

const REVIEW_PAGE_SIZE = 10;

/**
 * Đánh giá theo account (mỗi tài khoản một đánh giá), không theo profile.
 * contentType: 'movie' | 'series' | 'episode'
 * contentId: id của movie / series / episode
 * initialLimit: số bình luận tải lần đầu (mặc định 10)
 * scrollRef: ref gán vào section để nút "Bình luận" bên ngoài có thể scroll tới
 */
function ReviewSection({ contentType, contentId, title, initialLimit = REVIEW_PAGE_SIZE, scrollRef }) {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const token = getToken();

  const endpoint = contentType === 'movie'
    ? `/api/reviews/movies/${contentId}`
    : contentType === 'series'
      ? `/api/reviews/series/${contentId}`
      : `/api/reviews/episodes/${contentId}`;

  const loadReviews = (limit = initialLimit, offset = 0, append = false) => {
    if (!contentId) return;
    if (!append) setLoading(true);
    else setLoadingMore(true);
    const url = `${API_BASE}${endpoint}?limit=${limit}&offset=${offset}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : { reviews: [], avg_rating: null, total: 0 }))
      .then((data) => {
        const list = data && Array.isArray(data.reviews) ? data.reviews : [];
        if (append) setReviews((prev) => [...prev, ...list]);
        else setReviews(list);
        setAvgRating(data && data.avg_rating != null ? Number(data.avg_rating) : null);
        setTotal(data && data.total != null ? Number(data.total) : 0);
      })
      .catch(() => { if (!append) setReviews([]); })
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  const loadMore = () => {
    loadReviews(REVIEW_PAGE_SIZE, reviews.length, true);
  };

  useEffect(() => {
    loadReviews(initialLimit, 0, false);
  }, [contentType, contentId]);

  // Lấy user_id của tài khoản đăng nhập (để đánh dấu đánh giá "của mình")
  useEffect(() => {
    if (!token) {
      setUserId(null);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUserId(data.id))
      .catch(() => setUserId(null));
  }, [token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!token) {
      setError('Vui lòng đăng nhập để đánh giá.');
      return;
    }
    const r = Number(rating);
    if (!r || r < 1 || r > 5) {
      setError('Chọn điểm từ 1 đến 5 sao.');
      return;
    }
    setError('');
    setSubmitting(true);
    const body = { rating: r, comment: comment.trim() || null };
    if (contentType === 'movie') body.movie_id = Number(contentId);
    else if (contentType === 'series') body.series_id = Number(contentId);
    else body.episode_id = Number(contentId);

    fetch(`${API_BASE}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.message || 'Gửi thất bại')));
      })
      .then(() => {
        setComment('');
        loadReviews();
      })
      .catch((err) => setError(err.message || 'Gửi thất bại'))
      .finally(() => setSubmitting(false));
  };

  const formatDate = (str) => {
    if (!str) return '';
    const d = new Date(str);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <section className="review-section" ref={scrollRef}>
      <h2 className="review-section-title">{title || 'Đánh giá & Bình luận'}</h2>

      <div className="review-section-summary">
        <span className="review-section-stars">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={avgRating != null && i <= Math.round(avgRating) ? 'star filled' : 'star'}>★</span>
          ))}
        </span>
        <span className="review-section-avg">
          {avgRating != null ? avgRating.toFixed(1) : '—'}
        </span>
        <span className="review-section-count">({total} đánh giá)</span>
      </div>

      {token && (
        <form className="review-section-form" onSubmit={handleSubmit}>
          <label className="review-section-label">
            Điểm của bạn (1–5 sao):
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} required className="review-section-select">
              <option value={0}>Chọn điểm</option>
              {[1, 2, 3, 4, 5].map((i) => (
                <option key={i} value={i}>{i} sao</option>
              ))}
            </select>
          </label>
          <label className="review-section-label">
            Bình luận (tuỳ chọn):
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Viết cảm nhận của bạn..."
              className="review-section-textarea"
              rows={3}
            />
          </label>
          {error && <p className="review-section-error">{error}</p>}
          <button type="submit" disabled={submitting} className="review-section-submit">
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </form>
      )}

      {!token && <p className="review-section-login">Đăng nhập để đánh giá và bình luận.</p>}

      {loading ? (
        <p className="review-section-loading">Đang tải đánh giá...</p>
      ) : (
        <>
          <ul className="review-section-list">
            {reviews.length === 0 && <li className="review-section-empty">Chưa có đánh giá nào.</li>}
            {reviews.map((r) => (
              <li key={r.id} className={`review-section-item ${String(r.user_id) === String(userId) ? 'is-mine' : ''}`}>
                <div className="review-section-item-header">
                  <span className="review-section-item-name">{r.profile_name || 'Thành viên'}</span>
                  <span className="review-section-item-stars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={i <= r.rating ? 'star filled' : 'star'}>★</span>
                    ))}
                  </span>
                  <span className="review-section-item-date">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="review-section-item-comment">{r.comment}</p>}
              </li>
            ))}
          </ul>
          {reviews.length < total && (
            <button type="button" className="review-section-load-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Đang tải...' : 'Tải thêm bình luận'}
            </button>
          )}
        </>
      )}
    </section>
  );
}

export default ReviewSection;
