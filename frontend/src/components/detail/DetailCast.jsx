import { Link } from 'react-router-dom';
import { API_BASE } from '../../apis/client';
import '../../styles/components/detail-cast.css';

const MAX_VISIBLE = 8; // Số người hiển thị trên 1 hàng, còn lại gộp thành "... X khác"

function DetailCast({ cast, apiBase }) {
  const base = apiBase || API_BASE;
  const list = cast || [];
  const directors = list.filter((c) => String(c.role).toLowerCase() === 'director');
  const actors = list.filter((c) => String(c.role).toLowerCase() !== 'director');
  const combined = [...directors, ...actors];
  if (combined.length === 0) return null;

  const visible = combined.slice(0, MAX_VISIBLE);
  const restCount = combined.length - visible.length;

  return (
    <section className="detail-cast">
      <h2 className="detail-cast-title">Đạo diễn & Diễn viên</h2>
      <div className="detail-cast-row">
        {visible.map((p) => (
          <Link key={`${p.id}-${p.role}`} to={`/persons/${p.id}`} className="detail-cast-card">
            {p.avatar_url ? (
              <img
                src={p.avatar_url.startsWith('http') ? p.avatar_url : `${base}${p.avatar_url}`}
                alt={p.name}
                className="detail-cast-avatar"
              />
            ) : (
              <div className="detail-cast-avatar detail-cast-avatar--placeholder" />
            )}
            <div className="detail-cast-name">{p.name}</div>
            <div className="detail-cast-role">{p.role === 'director' ? 'Đạo diễn' : 'Diễn viên'}</div>
          </Link>
        ))}
        {restCount > 0 && (
          <span className="detail-cast-more">... {restCount} khác</span>
        )}
      </div>
    </section>
  );
}

export default DetailCast;
