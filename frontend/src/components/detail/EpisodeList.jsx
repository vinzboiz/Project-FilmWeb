import { Link } from 'react-router-dom';
import { API_BASE } from '../../apis/client';
import '../../styles/components/episode-list.css';

function EpisodeList({ seasons, episodes, selectedSeasonId, onSeasonChange, apiBase }) {
  const base = apiBase || API_BASE;
  const filteredEpisodes = selectedSeasonId
    ? episodes.filter((ep) => String(ep.season_id) === String(selectedSeasonId))
    : episodes;

  return (
    <section className="episode-list">
      <h2 className="episode-list-title">Danh sách tập</h2>
      {seasons.length > 0 && (
        <div className="episode-list-season-wrap">
          <label className="episode-list-season-label">Chọn mùa:</label>
          <select
            value={selectedSeasonId}
            onChange={(e) => onSeasonChange(e.target.value)}
            className="episode-list-season-select"
          >
            <option value="">Tất cả các mùa</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                Mùa {s.season_number}
                {s.title ? ` - ${s.title}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      {filteredEpisodes.length === 0 ? (
        <p className="episode-list-empty">Chưa có tập nào.</p>
      ) : (
        <ul className="episode-list-ul">
          {filteredEpisodes.map((ep) => (
            <li key={ep.id} className="episode-list-item">
              {ep.thumbnail_url && (
                <img
                  src={ep.thumbnail_url.startsWith('http') ? ep.thumbnail_url : `${base}${ep.thumbnail_url}`}
                  alt={ep.title}
                  className="episode-list-thumb"
                />
              )}
              <div className="episode-list-info">
                <Link to={`/watch/episode/${ep.id}`} className="episode-list-link">
                  Tập {ep.episode_number}: {ep.title}
                </Link>
                {ep.duration_minutes && (
                  <span className="episode-list-meta">{ep.duration_minutes} phút</span>
                )}
                {ep.view_count != null && (
                  <span className="episode-list-meta">{ep.view_count} lượt xem</span>
                )}
                {ep.description && (
                  <p className="episode-list-desc">
                    {ep.description.length > 120
                      ? `${ep.description.slice(0, 120)}...`
                      : ep.description}
                  </p>
                )}
              </div>
              <Link to={`/watch/episode/${ep.id}`} className="episode-list-watch">
                Xem
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default EpisodeList;
