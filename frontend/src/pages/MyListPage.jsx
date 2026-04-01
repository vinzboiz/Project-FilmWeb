import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken, getProfileId } from '../apis/client';
import HomeMovieRow from '../components/home/HomeMovieRow';
import HeroBanner from '../components/home/HeroBanner';

function MyListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalItem, setModalItem] = useState(null);
  const [continueMovies, setContinueMovies] = useState([]);
  const [continueEpisodes, setContinueEpisodes] = useState([]);
  const token = getToken();
  const profileId = getProfileId();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!profileId) {
      navigate('/profiles');
      return;
    }
    api('GET', `/api/watchlist?profile_id=${profileId}`)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // load danh sách "Xem tiếp"
    api('GET', `/api/watch/continue?profile_id=${profileId}`)
      .then((data) => {
        if (!data) return;
        setContinueMovies(Array.isArray(data.movies) ? data.movies : []);
        setContinueEpisodes(Array.isArray(data.episodes) ? data.episodes : []);
      })
      .catch(() => {});
  }, [token, profileId, navigate]);

  if (!token || !profileId) return null;
  if (loading) return <div style={{ padding: '24px' }}>Đang tải...</div>;

  const mappedItems = items.map((item) => ({
    id: item.content_id,
    title: item.title,
    thumbnail_url: item.thumbnail_url,
    banner_url: item.banner_url,
    rating: item.rating,
    type: item.type || 'movie',
  }));

  const hasContinue =
    (continueMovies && continueMovies.length > 0) ||
    (continueEpisodes && continueEpisodes.length > 0);

  function handleContinuePlay(item) {
    if (item.type === 'movie') {
      navigate(`/watch/movie/${item.id}`, {
        state: {
          askContinue: true,
          continueSeconds: item.progress_seconds || 0,
        },
      });
    } else if (item.type === 'episode') {
      navigate(`/watch/episode/${item.id}`, {
        state: {
          askContinue: true,
          continueSeconds: item.progress_seconds || 0,
        },
      });
    }
  }

  function handleItemRemoved(removed) {
    setItems((prev) =>
      prev.filter(
        (w) =>
          !(
            String(w.type || 'movie') === String(removed.type || 'movie') &&
            Number(w.content_id) === Number(removed.id)
          ),
      ),
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1>Danh sách của tôi</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {hasContinue && (
        <HomeMovieRow
          title="Xem tiếp"
          items={[
            ...continueMovies.map((m) => ({
              id: m.id,
              title: m.title,
              thumbnail_url: m.thumbnail_url,
              banner_url: m.banner_url,
              rating: null,
              type: 'movie',
              progress_seconds: m.progress_seconds,
            })),
            ...continueEpisodes.map((e) => ({
              id: e.id,
              title: `Tập ${e.episode_number ?? ''}: ${e.title}`,
              thumbnail_url: e.thumbnail_url,
              banner_url: e.banner_url,
              rating: null,
              type: 'episode',
              series_id: e.series_id,
              progress_seconds: e.progress_seconds,
            })),
          ]}
          onOpenInfo={setModalItem}
          onPlay={handleContinuePlay}
        />
      )}
      {mappedItems.length === 0 && !error && (
        <p>Chưa có phim nào trong danh sách. Vào trang phim và bấm &quot;Thêm vào danh sách của tôi&quot;.</p>
      )}
      {mappedItems.length > 0 && (
        <HomeMovieRow
          title="Danh sách của tôi"
          items={mappedItems}
          onOpenInfo={setModalItem}
          onItemRemoved={handleItemRemoved}
        />
      )}
      <HeroBanner
        modalOnly
        externalModalItem={modalItem}
        onCloseModal={() => setModalItem(null)}
      />
    </div>
  );
}

export default MyListPage;
