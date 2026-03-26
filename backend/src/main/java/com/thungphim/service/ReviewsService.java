package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ReviewsService {

    private final JdbcTemplate jdbcTemplate;

    public ReviewsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private Double avgRatingLatestPerUser(String col, int id) {
        String sql =
                "SELECT AVG(r.rating) AS avg_rating FROM reviews r " +
                        "WHERE r." + col + " = ? AND r.created_at = ( " +
                        "  SELECT MAX(r2.created_at) FROM reviews r2 " +
                        "  WHERE r2." + col + " = r." + col + " AND r2.user_id = r.user_id" +
                        ")";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, id);
        if (rows.isEmpty()) return null;
        Object v = rows.get(0).get("avg_rating");
        if (v instanceof Number n) return n.doubleValue();
        try { return v == null ? null : Double.parseDouble(String.valueOf(v)); } catch (Exception ignored) { return null; }
    }

    public void upsert(int userId, Integer movieId, Integer episodeId, Integer seriesId, int rating, String comment) {
        String whereClause = "user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE) AND ";
        Object targetId;
        String col;
        if (movieId != null) { col = "movie_id"; targetId = movieId; }
        else if (seriesId != null) { col = "series_id"; targetId = seriesId; }
        else { col = "episode_id"; targetId = episodeId; }

        List<Map<String, Object>> countRows = jdbcTemplate.queryForList(
                "SELECT COUNT(*) AS cnt FROM reviews WHERE " + whereClause + col + " = ?",
                userId, targetId
        );
        int cnt = 0;
        if (!countRows.isEmpty()) {
            Object v = countRows.get(0).get("cnt");
            if (v instanceof Number n) cnt = n.intValue();
        }
        if (cnt >= 2) {
            throw new IllegalArgumentException("Trong 30 phút chỉ được gửi tối đa 2 bình luận.");
        }

        if (movieId != null) {
            jdbcTemplate.update(
                    "INSERT INTO reviews (user_id, profile_id, movie_id, episode_id, series_id, rating, comment, created_at) " +
                            "VALUES (?, NULL, ?, NULL, NULL, ?, ?, NOW())",
                    userId, movieId, rating, (comment == null || comment.isBlank()) ? null : comment
            );
            Double avg = avgRatingLatestPerUser("movie_id", movieId);
            jdbcTemplate.update("UPDATE movies SET rating = ? WHERE id = ?", avg, movieId);
        } else if (seriesId != null) {
            jdbcTemplate.update(
                    "INSERT INTO reviews (user_id, profile_id, movie_id, episode_id, series_id, rating, comment, created_at) " +
                            "VALUES (?, NULL, NULL, NULL, ?, ?, ?, NOW())",
                    userId, seriesId, rating, (comment == null || comment.isBlank()) ? null : comment
            );
            Double avg = avgRatingLatestPerUser("series_id", seriesId);
            jdbcTemplate.update("UPDATE series SET rating = ? WHERE id = ?", avg, seriesId);
        } else {
            jdbcTemplate.update(
                    "INSERT INTO reviews (user_id, profile_id, movie_id, episode_id, series_id, rating, comment, created_at) " +
                            "VALUES (?, NULL, NULL, ?, NULL, ?, ?, NOW())",
                    userId, episodeId, rating, (comment == null || comment.isBlank()) ? null : comment
            );
            // episodes table does not have rating column; only movies/series have aggregate rating
        }
    }

    public Map<String, Object> listMovieReviews(int movieId, int limit, int offset) {
        int lim = Math.min(Math.max(1, limit), 100);
        int off = Math.max(0, offset);
        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM reviews WHERE movie_id = ?", Integer.class, movieId);
        List<Map<String, Object>> reviews = jdbcTemplate.queryForList(
                "SELECT r.id, " +
                        "(SELECT r2.rating FROM reviews r2 WHERE r2.movie_id = r.movie_id AND r2.user_id = r.user_id ORDER BY r2.created_at DESC LIMIT 1) AS rating, " +
                        "r.comment, r.created_at, r.user_id, COALESCE(u.full_name, 'Thành viên') AS profile_name " +
                        "FROM reviews r LEFT JOIN users u ON u.id = r.user_id " +
                        "WHERE r.movie_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
                movieId, lim, off
        );
        Double avg = avgRatingLatestPerUser("movie_id", movieId);
        return Map.of("reviews", reviews, "avg_rating", avg, "total", total != null ? total : 0);
    }

    public Map<String, Object> listEpisodeReviews(int episodeId, int limit, int offset) {
        int lim = Math.min(Math.max(1, limit), 100);
        int off = Math.max(0, offset);
        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM reviews WHERE episode_id = ?", Integer.class, episodeId);
        List<Map<String, Object>> reviews = jdbcTemplate.queryForList(
                "SELECT r.id, " +
                        "(SELECT r2.rating FROM reviews r2 WHERE r2.episode_id = r.episode_id AND r2.user_id = r.user_id ORDER BY r2.created_at DESC LIMIT 1) AS rating, " +
                        "r.comment, r.created_at, r.user_id, COALESCE(u.full_name, 'Thành viên') AS profile_name " +
                        "FROM reviews r LEFT JOIN users u ON u.id = r.user_id " +
                        "WHERE r.episode_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
                episodeId, lim, off
        );
        Double avg = avgRatingLatestPerUser("episode_id", episodeId);
        return Map.of("reviews", reviews, "avg_rating", avg, "total", total != null ? total : 0);
    }

    public Map<String, Object> listSeriesReviews(int seriesId, int limit, int offset) {
        int lim = Math.min(Math.max(1, limit), 100);
        int off = Math.max(0, offset);
        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM reviews WHERE series_id = ?", Integer.class, seriesId);
        List<Map<String, Object>> reviews = jdbcTemplate.queryForList(
                "SELECT r.id, " +
                        "(SELECT r2.rating FROM reviews r2 WHERE r2.series_id = r.series_id AND r2.user_id = r.user_id ORDER BY r2.created_at DESC LIMIT 1) AS rating, " +
                        "r.comment, r.created_at, r.user_id, COALESCE(u.full_name, 'Thành viên') AS profile_name " +
                        "FROM reviews r LEFT JOIN users u ON u.id = r.user_id " +
                        "WHERE r.series_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
                seriesId, lim, off
        );
        Double avg = avgRatingLatestPerUser("series_id", seriesId);
        return Map.of("reviews", reviews, "avg_rating", avg, "total", total != null ? total : 0);
    }
}

