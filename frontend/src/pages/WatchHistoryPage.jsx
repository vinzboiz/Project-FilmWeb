import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, getToken, getProfileId } from '../apis/client';

function WatchHistoryPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);
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
    fetch(`${API_BASE}/api/watch/history?profile_id=${profileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [token, profileId, navigate]);

  if (!token || !profileId) return null;
  if (loading) return <div style={{ padding: '24px' }}>Đang tải...</div>;

  const openPopup = (item) => (e) => {
    e.preventDefault();
    const isEpisode = item.type === 'episode' && item.series_id;
    const path = isEpisode ? `/watch/episode/${item.content_id}` : `/movies/${item.content_id}`;
    setPopup({ item, path });
  };

  const handleContinue = () => {
    if (popup) {
      navigate(popup.path);
      setPopup(null);
    }
  };

  const handleFromStart = () => {
    if (popup) {
      navigate(popup.path, { state: { fromStart: true } });
      setPopup(null);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1>Lịch sử xem</h1>
      <p style={{ color: '#666', marginBottom: '16px' }}>Theo profile hiện tại. Bấm vào phim/tập để chọn xem tiếp hay xem từ đầu.</p>
      {list.length === 0 && <p>Chưa có lịch sử xem.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
        {list.map((item) => {
          const isEpisode = item.type === 'episode' && item.series_id;
          const path = isEpisode ? `/watch/episode/${item.content_id}` : `/movies/${item.content_id}`;
          return (
            <div key={`${item.type}-${item.content_id}-${item.id}`} style={{ border: '1px solid #444', borderRadius: '8px', padding: '8px', backgroundColor: '#111' }}>
              {item.thumbnail_url && (
                <img src={`${API_BASE}${item.thumbnail_url}`} alt={item.title} style={{ width: '100%', borderRadius: '4px', marginBottom: '8px' }} />
              )}
              <div style={{ fontSize: '13px', marginBottom: '4px' }}>{item.title}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {item.type === 'episode' ? 'Tập phim' : 'Phim'} · {item.progress_seconds ? `Đã xem ${Math.floor(item.progress_seconds)} giây` : ''}
              </div>
              <button
                type="button"
                onClick={openPopup(item)}
                style={{ marginTop: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#61dafb', fontSize: '12px' }}
              >
                {isEpisode ? 'Xem tiếp' : 'Xem'}
              </button>
            </div>
          );
        })}
      </div>

      {popup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setPopup(null)}
          role="presentation"
        >
          <div
            style={{
              backgroundColor: '#222',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '360px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="popup-title"
          >
            <h2 id="popup-title" style={{ marginTop: 0, marginBottom: '12px' }}>Bạn muốn xem tiếp hay xem từ đầu?</h2>
            <p style={{ color: '#ccc', marginBottom: '20px' }}>{popup.item?.title}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={handleFromStart} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Xem từ đầu
              </button>
              <button type="button" onClick={handleContinue} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#61dafb', color: '#000', border: 'none', borderRadius: '4px' }}>
                Xem tiếp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WatchHistoryPage;
