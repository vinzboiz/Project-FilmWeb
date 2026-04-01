import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../apis/client';
import MovieCard from '../components/home/MovieCard.jsx';
import '../styles/pages/browse.css';

const BROWSE_TYPES = {
  series: { title: 'Phim bộ', slug: 'series' },
  movies: { title: 'Phim lẻ', slug: 'movies' },
  new: { title: 'Mới & phổ biến', slug: 'new' },
};

function BrowsePage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const config = type ? BROWSE_TYPES[type] : null;

  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!config) {
      navigate('/');
      return;
    }
    setLoading(true);
    setError('');
    const { slug } = config;
    if (slug === 'series') {
      fetch(`${API_BASE}/api/series`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setSeries(Array.isArray(data) ? data : []))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
      setMovies([]);
      setTrending([]);
    } else if (slug === 'movies') {
      fetch(`${API_BASE}/api/movies`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setMovies(Array.isArray(data) ? data : []))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
      setSeries([]);
      setTrending([]);
    } else if (slug === 'new') {
      Promise.all([
        fetch(`${API_BASE}/api/movies/trending`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE}/api/movies`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE}/api/series`).then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([trendingRes, moviesRes, seriesRes]) => {
          setTrending(Array.isArray(trendingRes) ? trendingRes : []);
          setMovies(Array.isArray(moviesRes) ? moviesRes : []);
          setSeries(Array.isArray(seriesRes) ? seriesRes : []);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [config, navigate]);

  if (!config) return null;

  return (
    <div className="browse-page">
      <h1 className="browse-page-title">{config.title}</h1>
      {loading && <p className="browse-page-loading">Đang tải...</p>}
      {error && <p className="browse-page-error">{error}</p>}

      {!loading && !error && config.slug === 'series' && (
        <section className="section">
          {series.length === 0 ? (
            <p className="browse-page-empty">Chưa có phim bộ nào.</p>
          ) : (
            <div className="section-grid">
              {series.map((s) => (
                <div key={s.id} className="card">
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
          )}
        </section>
      )}

      {!loading && !error && config.slug === 'movies' && (
        <section className="section">
          {movies.length === 0 ? (
            <p className="browse-page-empty">Chưa có phim lẻ nào.</p>
          ) : (
            <div className="section-grid">
              {movies.map((m) => (
                <MovieCard key={m.id} movie={m} />
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && !error && config.slug === 'new' && (
        <>
          {trending.length > 0 && (
            <section className="section">
              <h2 className="section-title">Xu hướng xem</h2>
              <div className="section-grid">
                {trending.map((m) => (
                  <MovieCard key={m.id} movie={m} />
                ))}
              </div>
            </section>
          )}
          {movies.length > 0 && (
            <section className="section">
              <h2 className="section-title">Phim lẻ mới thêm</h2>
              <div className="section-grid">
                {movies.slice(0, 24).map((m) => (
                  <MovieCard key={m.id} movie={m} />
                ))}
              </div>
            </section>
          )}
          {series.length > 0 && (
            <section className="section">
              <h2 className="section-title">Phim bộ mới thêm</h2>
              <div className="section-grid">
                {series.slice(0, 24).map((s) => (
                  <div key={s.id} className="card">
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
            </section>
          )}
          {trending.length === 0 && movies.length === 0 && series.length === 0 && (
            <p className="browse-page-empty">Chưa có nội dung nào.</p>
          )}
        </>
      )}
    </div>
  );
}

export default BrowsePage;
