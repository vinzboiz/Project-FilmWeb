import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../apis/client';
import { getToken, getProfileId } from '../apis/client';
import HomeMovieRow from '../components/home/HomeMovieRow';
import HeroBanner from '../components/home/HeroBanner';
import '../styles/pages/favorites.css';

function FavoritesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalItem, setModalItem] = useState(null);
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
    api('GET', `/api/favorites?profile_id=${profileId}`)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, profileId, navigate]);

  if (!token || !profileId) return null;
  if (loading) return <div className="favorites-page-loading">Đang tải...</div>;

  const mappedItems = items.map((item) => ({
    id: item.movie_id,
    title: item.title,
    thumbnail_url: item.thumbnail_url,
    banner_url: item.banner_url,
    rating: item.rating,
    type: 'movie',
  }));

  function handleItemRemoved(removed) {
    setItems((prev) =>
      prev.filter((f) => Number(f.movie_id) !== Number(removed.id)),
    );
  }

  return (
    <div className="favorites-page">
      <h1>Yêu thích</h1>
      {error && <p className="favorites-page-error">{error}</p>}
      {items.length === 0 && !error && (
        <p>Chưa có phim yêu thích. Vào trang phim và bấm nút "Yêu thích".</p>
      )}
      {mappedItems.length > 0 && (
        <HomeMovieRow
          title="Yêu thích"
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

export default FavoritesPage;
