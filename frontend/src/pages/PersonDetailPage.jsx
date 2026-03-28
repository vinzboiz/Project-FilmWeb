import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from '../apis/client';
import '../styles/pages/person-detail.css';

function PersonDetailPage() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [works, setWorks] = useState({ movies: [], episodes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API_BASE}/api/persons/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE}/api/persons/${id}/movies`).then((r) => (r.ok ? r.json() : { movies: [], episodes: [] })),
    ])
      .then(([p, w]) => {
        if (!cancelled) {
          setPerson(p);
          setWorks(w || { movies: [], episodes: [] });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="person-detail"><div className="person-detail-inner">Đang tải...</div></div>;
  if (error || !person) return <div className="person-detail"><div className="person-detail-inner" style={{ color: 'red' }}>{error || 'Không tìm thấy'}</div></div>;

  const imgUrl = person.avatar_url
    ? (person.avatar_url.startsWith('http') ? person.avatar_url : `${API_BASE}${person.avatar_url}`)
    : null;

  return (
    <div className="person-detail">
      <div className="person-detail-inner">
        <div className="person-detail-header">
          <div className="person-detail-avatar">
            {imgUrl ? <img src={imgUrl} alt={person.name} /> : null}
          </div>
          <div className="person-detail-info">
            <h1 className="person-detail-name">{person.name}</h1>
            {person.biography && <div className="person-detail-bio">{person.biography}</div>}
          </div>
        </div>

        {(works.movies?.length > 0 || works.episodes?.length > 0) && (
          <section className="person-detail-section">
            <h2>Phim tham gia</h2>
            <div className="person-detail-movies">
              {works.movies?.map((m) => (
                <Link key={`m-${m.id}`} to={`/movies/${m.id}`} className="person-detail-movie-card">
                  {m.thumbnail_url ? (
                    <img src={m.thumbnail_url.startsWith('http') ? m.thumbnail_url : `${API_BASE}${m.thumbnail_url}`} alt={m.title} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '2/3', background: '#333', borderRadius: 6 }} />
                  )}
                  <div className="title">{m.title}</div>
                  {m.role && <div className="role">{m.role}</div>}
                </Link>
              ))}
              {works.episodes?.map((e) => (
                <Link key={`e-${e.id}`} to={`/series/${e.series_id}`} className="person-detail-movie-card">
                  {e.thumbnail_url ? (
                    <img src={e.thumbnail_url.startsWith('http') ? e.thumbnail_url : `${API_BASE}${e.thumbnail_url}`} alt={e.title} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '2/3', background: '#333', borderRadius: 6 }} />
                  )}
                  <div className="title">{e.title}</div>
                  {e.role && <div className="role">{e.role}</div>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {(!works.movies || works.movies.length === 0) && (!works.episodes || works.episodes.length === 0) && (
          <p style={{ color: '#888' }}>Chưa có phim/tập nào.</p>
        )}
      </div>
    </div>
  );
}

export default PersonDetailPage;
