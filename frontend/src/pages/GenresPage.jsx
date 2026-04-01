import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE } from '../apis/client';
import HomeMovieRow from '../components/home/HomeMovieRow';
import '../styles/pages/genres-page.css';

const CONTENT_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'movie', label: 'Phim lẻ' },
  { value: 'series', label: 'Phim bộ' },
];

function GenresPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [genres, setGenres] = useState([]);
  const [genreRows, setGenreRows] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterGenreId, setFilterGenreId] = useState(() => searchParams.get('genre_id') || '');
  const [filterContentType, setFilterContentType] = useState(() => searchParams.get('type') || '');
  const [filterYearFrom, setFilterYearFrom] = useState('');
  const [filterYearTo, setFilterYearTo] = useState('');
  const [filterCountry, setFilterCountry] = useState('');

  // Sync URL -> state on mount / external nav
  useEffect(() => {
    const g = searchParams.get('genre_id') || '';
    const t = searchParams.get('type') || '';
    setFilterGenreId(g);
    setFilterContentType(t);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API_BASE}/api/genres`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/api/countries`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([gData, cData]) => {
        if (!cancelled) {
          setGenres(Array.isArray(gData) ? gData : []);
          setCountries(Array.isArray(cData) ? cData : []);
        }
      })
      .catch(() => { if (!cancelled) setError('Không tải được dữ liệu'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (genres.length === 0) {
      setGenreRows([]);
      return;
    }
    const genreIdsToFetch = filterGenreId
      ? [Number(filterGenreId)]
      : genres.map((g) => g.id);

    let cancelled = false;
    setGenreRows([]);

    const params = new URLSearchParams();
    params.set('limit', '10');
    const currentYear = new Date().getFullYear();
    const yFrom = filterYearFrom && !Number.isNaN(Number(filterYearFrom)) ? Number(filterYearFrom) : null;
    let yTo = filterYearTo && !Number.isNaN(Number(filterYearTo)) ? Number(filterYearTo) : null;
    if (yTo != null) {
      if (yFrom != null && yTo < yFrom) yTo = currentYear;
      if (yTo > currentYear) yTo = currentYear;
    }
    if (yFrom != null && yTo != null) {
      params.set('year_from', String(yFrom));
      params.set('year_to', String(yTo));
    } else if (yFrom != null) {
      params.set('year_from', String(yFrom));
    } else if (yTo != null) {
      params.set('year_to', String(yTo));
    }
    if (filterCountry) params.set('country_code', filterCountry);

    const wantMovies = filterContentType !== 'series';
    const wantSeries = filterContentType !== 'movie';

    const run = async () => {
      const rows = [];
      for (let i = 0; i < genreIdsToFetch.length; i++) {
        if (cancelled) return;
        const genreId = genreIdsToFetch[i];
        const genre = genres.find((g) => g.id === genreId) || { id: genreId, name: 'Thể loại' };
        let items = [];
        if (wantMovies) {
          const q = new URLSearchParams(params);
          q.set('genre_id', String(genreId));
          const res = await fetch(`${API_BASE}/api/movies?${q}`);
          const list = res.ok ? await res.json() : [];
          items = (list || []).map((m) => ({ ...m, type: 'movie' }));
        }
        if (wantSeries) {
          const q = new URLSearchParams(params);
          q.set('genre_id', String(genreId));
          const res = await fetch(`${API_BASE}/api/series?${q}`);
          const list = res.ok ? await res.json() : [];
          const seriesItems = (list || []).map((s) => ({ ...s, type: 'series' }));
          if (wantMovies) {
            items = [...items, ...seriesItems].sort((a, b) => (b.id - a.id));
          } else {
            items = seriesItems;
          }
        }
        rows.push({ genre, movies: items });
      }
      if (!cancelled) {
        const sorted = rows
          .slice()
          .sort((a, b) => (b.movies.length - a.movies.length));
        setGenreRows(sorted);
      }
    };
    run().catch(() => { if (!cancelled) setGenreRows([]); });

    return () => { cancelled = true; };
  }, [genres, filterGenreId, filterContentType, filterYearFrom, filterYearTo, filterCountry]);

  const handleApplyFilters = (e) => {
    e?.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (filterGenreId) next.set('genre_id', filterGenreId); else next.delete('genre_id');
    if (filterContentType) next.set('type', filterContentType); else next.delete('type');
    setSearchParams(next, { replace: true });
  };

  const selectedGenre = filterGenreId ? genres.find((g) => String(g.id) === String(filterGenreId)) : null;

  if (loading) {
    return (
      <div className="genres-page">
        <p className="genres-page-loading">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="genres-page">
      <h1 className="genres-page-title">Thể loại phim</h1>
      {error && <p className="genres-page-error">{error}</p>}

      <form className="genres-page-filters" onSubmit={handleApplyFilters}>
        <label className="genres-page-filter">
          <span>Loại</span>
          <select
            value={filterContentType}
            onChange={(e) => setFilterContentType(e.target.value)}
            className="genres-page-select"
          >
            {CONTENT_TYPES.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className="genres-page-filter">
          <span>Thể loại</span>
          <select
            value={filterGenreId}
            onChange={(e) => setFilterGenreId(e.target.value)}
            className="genres-page-select"
          >
            <option value="">Tất cả thể loại</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </label>
        <label className="genres-page-filter">
          <span>Năm từ</span>
          <input
            type="number"
            min="1900"
            max="2100"
            placeholder="VD: 2000"
            value={filterYearFrom}
            onChange={(e) => {
              const val = e.target.value;
              setFilterYearFrom(val);
              const currentYear = new Date().getFullYear();
              const yFrom = val && !Number.isNaN(Number(val)) ? Number(val) : null;
              const yTo = filterYearTo && !Number.isNaN(Number(filterYearTo)) ? Number(filterYearTo) : null;
              if (yFrom != null && yTo != null && yTo < yFrom) {
                setFilterYearTo(String(currentYear));
              }
            }}
            className="genres-page-input"
          />
        </label>
        <label className="genres-page-filter">
          <span>Năm đến</span>
          <input
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            placeholder="VD: 2024"
            value={filterYearTo}
            onChange={(e) => setFilterYearTo(e.target.value)}
            onBlur={() => {
              const val = filterYearTo?.trim();
              if (!val) return;
              const currentYear = new Date().getFullYear();
              const yFrom = filterYearFrom && !Number.isNaN(Number(filterYearFrom)) ? Number(filterYearFrom) : null;
              const yTo = Number(val);
              if (Number.isNaN(yTo)) return;
              const minYear = yFrom != null ? yFrom : 1900;
              if (yTo < minYear || yTo > currentYear) {
                setFilterYearTo(String(currentYear));
              }
            }}
            className="genres-page-input"
          />
        </label>
        <label className="genres-page-filter">
          <span>Quốc gia</span>
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="genres-page-select"
          >
            <option value="">Tất cả quốc gia</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="genres-page-btn-apply">
          Lọc
        </button>
      </form>

      {selectedGenre && (
        <section className="genres-page-banner">
          <div className="genres-page-banner-img-wrap">
            {selectedGenre.thumbnail_url ? (
              <img
                src={selectedGenre.thumbnail_url.startsWith('http') ? selectedGenre.thumbnail_url : `${API_BASE}${selectedGenre.thumbnail_url}`}
                alt=""
                className="genres-page-banner-img"
              />
            ) : (
              <div className="genres-page-banner-img genres-page-banner-img--placeholder" />
            )}
          </div>
          <div className="genres-page-banner-text">
            <h2 className="genres-page-banner-title">{selectedGenre.name}</h2>
            {selectedGenre.description && (
              <p className="genres-page-banner-desc">{selectedGenre.description}</p>
            )}
          </div>
        </section>
      )}

      <div className="genres-page-rows">
        {genreRows.map((row) => (
          <HomeMovieRow
            key={row.genre.id}
            title={row.genre.name}
            items={row.movies}
          />
        ))}
      </div>
      {genreRows.length === 0 && !loading && (
        <p className="genres-page-empty">Không có nội dung nào phù hợp với bộ lọc.</p>
      )}
    </div>
  );
}

export default GenresPage;
