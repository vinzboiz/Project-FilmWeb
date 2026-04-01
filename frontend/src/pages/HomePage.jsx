import { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation, useParams } from 'react-router-dom';
import { API_BASE, getProfileId, getToken } from '../apis/client';
import HeroBanner from '../components/home/HeroBanner.jsx';
import HomeSearchSection from '../components/home/HomeSearchSection.jsx';
import HomeMovieRow from '../components/home/HomeMovieRow.jsx';
import '../styles/pages/home.css';

/** mode: all | series | movies | featured (từ pathname hoặc /browse/:type) */
function getModeFromPath(pathname, browseType) {
  if (pathname === '/series' || browseType === 'series') return 'series';
  if (pathname === '/movies' || browseType === 'movies') return 'movies';
  if (pathname === '/browse/new' || pathname === '/new' || browseType === 'new') return 'featured';
  return 'all';
}

function HomePage() {
  const { pathname } = useLocation();
  const { type: browseType } = useParams();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const mode = getModeFromPath(pathname, browseType);
  const [modalItem, setModalItem] = useState(null);
  const [topRating, setTopRating] = useState([]);
  const [newMovies, setNewMovies] = useState([]);
  const [genreRows, setGenreRows] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [continueList, setContinueList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const profileId = getProfileId();
  const token = getToken();
  const isLoggedIn = !!token;
  const isSearchMode = q.length > 0;

  const heroType = mode === 'movies' ? 'movie' : mode === 'series' ? 'series' : mode === 'featured' ? 'featured' : 'all';
  const apiType = mode === 'movies' ? 'movie' : mode === 'series' ? 'series' : '';
  const apiFeatured = mode === 'featured' ? '1' : '';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (isSearchMode) return;
    async function fetchData() {
      try {
        const tr = apiType ? `&type=${apiType}` : '';
        const tf = apiFeatured ? `&featured=${apiFeatured}` : '';
        const [topRes, trendingRes, genresRes] = await Promise.all([
          fetch(`${API_BASE}/api/movies/top-rating?limit=10${tr}${tf}`).then((r) => r.json()),
          fetch(`${API_BASE}/api/movies/trending?limit=20${tr}${tf}`).then((r) => r.json()),
          fetch(`${API_BASE}/api/genres/top-with-movies?limit=5${apiType ? `&type=${apiType}` : ''}${apiFeatured ? `&featured=${apiFeatured}` : ''}`).then((r) => r.json()),
        ]);
        setTopRating(Array.isArray(topRes) ? topRes : []);
        setNewMovies(Array.isArray(trendingRes) ? trendingRes.slice(0, 10) : []);
        setGenreRows(Array.isArray(genresRes) ? genresRes : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isSearchMode, mode, apiType, apiFeatured]);

  useEffect(() => {
    if (!profileId || !token) {
      setContinueList([]);
      setFavorites([]);
      return;
    }
    const authHeader = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/api/watch/continue?profile_id=${profileId}`, { headers: authHeader }).then((r) => (r.ok ? r.json() : {})),
      fetch(`${API_BASE}/api/favorites?profile_id=${profileId}`, { headers: authHeader }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([continueData, favoritesData]) => {
        const list = [];
        if (continueData.movies) {
          list.push(...continueData.movies.map((m) => ({ ...m, type: 'movie' })));
        }
        if (continueData.episodes) {
          list.push(...continueData.episodes.map((e) => ({ ...e, type: 'episode' })));
        }
        setContinueList(list.slice(0, 10));
        const favs = Array.isArray(favoritesData) ? favoritesData : [];
        setFavorites(
          favs.slice(0, 10).map((f) => ({
            id: f.movie_id,
            title: f.title,
            thumbnail_url: f.thumbnail_url,
            type: 'movie',
          }))
        );
      })
      .catch(() => {
        setContinueList([]);
        setFavorites([]);
      });
  }, [profileId, token]);

  return (
    <div className="home-root">
      {!isSearchMode && (
          <HeroBanner
            externalModalItem={modalItem}
            onCloseModal={() => setModalItem(null)}
            heroType={heroType}
          />
        )}

      {isSearchMode && <HomeSearchSection query={q} />}

      {!isSearchMode && (
        <div className="home-content">
          {loading && <p>Đang tải...</p>}
          {error && <p className="home-error">{error}</p>}

          {isLoggedIn && !profileId && (
            <section className="alert-warning">
              <strong>Chưa chọn profile.</strong> Tạo hoặc chọn profile để lưu <strong>danh sách yêu thích</strong>, <strong>lịch sử xem</strong> và <strong>tiếp tục xem</strong> theo từng profile.
              <Link to="/profiles">→ Tạo / Chọn profile</Link>
            </section>
          )}

          <HomeMovieRow title={mode === 'series' ? 'Top rating series' : mode === 'featured' ? 'Nổi bật' : 'Top rating phim'} items={topRating} onOpenInfo={setModalItem} />
          <HomeMovieRow title={mode === 'series' ? 'Series mới' : mode === 'movies' ? 'Phim mới' : mode === 'featured' ? 'Mới & phổ biến' : 'Phim mới'} items={newMovies} onOpenInfo={setModalItem} />
          {genreRows.map((row) => (
            <HomeMovieRow key={row.genre?.id} title={row.genre?.name || 'Thể loại'} items={row.movies || []} onOpenInfo={setModalItem} />
          ))}
          {isLoggedIn && profileId && (
            <>
              <HomeMovieRow title="Yêu thích" items={favorites} onOpenInfo={setModalItem} />
              <HomeMovieRow title="Đang xem" items={continueList} onOpenInfo={setModalItem} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default HomePage;
