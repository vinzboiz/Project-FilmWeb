import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { API_BASE } from '../apis/client';
import '../styles/pages/search.css';
import '../styles/components/card.css';

function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setMovies([]);
      setSeries([]);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/movies/search?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/api/series/search?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([movieData, seriesData]) => {
        setMovies(Array.isArray(movieData) ? movieData : []);
        setSeries(Array.isArray(seriesData) ? seriesData : []);
      })
      .catch(() => {
        setMovies([]);
        setSeries([]);
      })
      .finally(() => setLoading(false));
  }, [q]);

  const hasResults = movies.length > 0 || series.length > 0;

  return (
    <div className="search-page">
      <h1>Tìm kiếm</h1>
      {q && <p className="search-page-subtitle">Kết quả cho: &quot;{q}&quot;</p>}
      {loading && <p>Đang tìm...</p>}
      {!loading && q && !hasResults && <p>Không tìm thấy phim hoặc series nào.</p>}

      {!loading && movies.length > 0 && (
        <section className="search-page-section">
          <h2 className="search-page-heading">Phim lẻ</h2>
          <div className="search-page-grid">
            {movies.map((m) => (
              <Link key={`m-${m.id}`} to={`/movies/${m.id}`} className="search-page-link">
                <div className="search-page-card card">
                  {m.thumbnail_url && (
                    <img src={`${API_BASE}${m.thumbnail_url}`} alt={m.title} className="card-img" />
                  )}
                  <h3 className="card-title">{m.title}</h3>
                  {m.age_rating && <span className="card-badge">{m.age_rating}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && series.length > 0 && (
        <section className="search-page-section">
          <h2 className="search-page-heading">Phim bộ</h2>
          <div className="search-page-grid">
            {series.map((s) => (
              <Link key={`s-${s.id}`} to={`/series/${s.id}`} className="search-page-link">
                <div className="search-page-card card">
                  {s.thumbnail_url && (
                    <img src={`${API_BASE}${s.thumbnail_url}`} alt={s.title} className="card-img" />
                  )}
                  <h3 className="card-title">{s.title}</h3>
                  {s.release_year && <span className="card-badge">{s.release_year}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default SearchPage;
