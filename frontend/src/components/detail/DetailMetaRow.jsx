import { Link } from 'react-router-dom';
import { API_BASE } from '../../apis/client';
import '../../styles/components/detail-meta.css';

function starRating(value) {
  const v = Number(value);
  if (!v || v < 0) return 0;
  if (v >= 5) return 5;
  return Math.round(v * 2) / 2;
}

export default function DetailMetaRow({ content, type, countryName }) {
  if (!content) return null;
  const rating = starRating(content.rating);
  const reviewCount = content.review_count ?? 0;
  const genres = content.genres || [];
  const cast = content.cast || [];
  const directors = cast.filter((c) => String(c.role).toLowerCase() === 'director');
  const actors = cast.filter((c) => String(c.role).toLowerCase() !== 'director');
  const durationMinutes = content.duration_minutes;

  return (
    <section className="detail-meta">
      <div className="detail-meta-rating">
        <div className="detail-meta-stars" title={`${rating}/5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`detail-meta-star ${i <= rating ? 'full' : i - 0.5 <= rating ? 'half' : ''}`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="detail-meta-rating-count">
          {rating > 0 ? `${Number(rating).toFixed(1)}/5` : '—'} ({reviewCount} lượt đánh giá)
        </span>
      </div>

      <div className="detail-meta-cols">
        <div className="detail-meta-col">
          <div className="detail-meta-item">
            <span className="detail-meta-label">Thể loại:</span>
            <span className="detail-meta-value">
              {genres.length ? genres.map((g, i) => (
                <span key={g.id}>
                  {i > 0 && ', '}
                  <Link to={`/genres?genre_id=${g.id}`} className="detail-meta-link">
                    {g.name}
                  </Link>
                </span>
              )) : '—'}
            </span>
          </div>
        </div>
        <div className="detail-meta-col">
          {content.release_year != null && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Năm phát hành:</span>
              <span className="detail-meta-value">{content.release_year}</span>
            </div>
          )}
          {directors.length > 0 && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Đạo diễn:</span>
              <span className="detail-meta-value">
                {directors.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ', '}
                    <Link to={`/persons/${p.id}`} className="detail-meta-link">
                      {p.name}
                    </Link>
                  </span>
                ))}
              </span>
            </div>
          )}
          {type === 'movie' && durationMinutes != null && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Thời lượng:</span>
              <span className="detail-meta-value">
                {durationMinutes >= 60
                  ? `${Math.floor(durationMinutes / 60)} giờ ${durationMinutes % 60} phút`
                  : `${durationMinutes} phút`}
              </span>
            </div>
          )}
          {type === 'series' && durationMinutes != null && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Thời lượng:</span>
              <span className="detail-meta-value">{durationMinutes} phút/tập</span>
            </div>
          )}
        </div>
        <div className="detail-meta-col">
          <div className="detail-meta-item">
            <span className="detail-meta-label">Quốc gia:</span>
            <span className="detail-meta-value">{countryName || '—'}</span>
          </div>
          {actors.length > 0 && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Diễn viên:</span>
              <span className="detail-meta-value">
                {actors.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ', '}
                    <Link to={`/persons/${p.id}`} className="detail-meta-link">
                      {p.name}
                    </Link>
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
