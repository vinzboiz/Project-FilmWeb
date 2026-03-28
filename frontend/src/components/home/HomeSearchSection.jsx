import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../../apis/client';
import MovieCard from './MovieCard.jsx';
import '../../styles/components/home-search-section.css';

function HomeSearchSection({ query }) {
  const q = (query || '').trim();
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) {
      setMovies([]);
      setSeries([]);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/movies/search?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/api/series/search?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([mData, sData]) => {
        setMovies(Array.isArray(mData) ? mData : []);
        setSeries(Array.isArray(sData) ? sData : []);
      })
      .catch(() => {
        setMovies([]);
        setSeries([]);
      })
      .finally(() => setLoading(false));
  }, [q]);

  if (!q) return null;

  return (
    <section className="section">
      <h2 className="section-title">Kết quả tìm kiếm: &quot;{q}&quot;</h2>
      {loading && <p>Đang tìm...</p>}

      {!loading && movies.length === 0 && series.length === 0 && (
        <p className="text-muted">Không tìm thấy phim hoặc series nào.</p>
      )}

      {!loading && (movies.length > 0 || series.length > 0) && (
        <>
          {movies.length > 0 && (
            <div className="home-search-block">
              <h3 className="home-search-heading">Phim lẻ</h3>
              <div className="section-grid">
                {movies.map((m) => (
                  <div key={`m-${m.id}`}>
                    <MovieCard movie={m} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {series.length > 0 && (
            <div className="home-search-block">
              <h3 className="home-search-heading">Phim bộ</h3>
              <div className="section-grid">
                {series.map((s) => (
                  <div key={`s-${s.id}`} className="card">
                    {s.thumbnail_url && (
                      <img
                        src={`${API_BASE}${s.thumbnail_url}`}
                        alt={s.title}
                        className="card-img"
                      />
                    )}
                    <h3 className="card-title">{s.title}</h3>
                    {s.age_rating && <span className="card-badge">{s.age_rating}</span>}
                    <Link to={`/series/${s.id}`} className="link-accent link-accent--block">
                      Xem chi tiết
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default HomeSearchSection;
