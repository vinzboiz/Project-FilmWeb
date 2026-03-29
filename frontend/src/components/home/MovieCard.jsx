import { Link } from 'react-router-dom';
import { API_BASE } from '../../apis/client';

function MovieCard({ movie }) {
  return (
    <div className="card">
      {movie.thumbnail_url && (
        <img
          src={`${API_BASE}${movie.thumbnail_url}`}
          alt={movie.title}
          className="card-img"
        />
      )}
      <h3 className="card-title">{movie.title}</h3>
      {movie.age_rating && (
        <span className="card-badge">{movie.age_rating}</span>
      )}
      {movie.description && (
        <p className="card-description text-muted">
          {movie.description.length > 80 ? movie.description.slice(0, 80) + '...' : movie.description}
        </p>
      )}
      <Link to={`/movies/${movie.id}`} className="link-accent">
        Xem chi tiết
      </Link>
    </div>
  );
}

export default MovieCard;
