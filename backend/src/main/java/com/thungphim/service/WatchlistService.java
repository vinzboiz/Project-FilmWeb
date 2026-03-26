package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class WatchlistService {

    private final JdbcTemplate jdbcTemplate;
    private final NotificationService notificationService;

    public WatchlistService(JdbcTemplate jdbcTemplate, NotificationService notificationService) {
        this.jdbcTemplate = jdbcTemplate;
        this.notificationService = notificationService;
    }

    public List<Map<String, Object>> list(int profileId) {
        return jdbcTemplate.queryForList(
                "(SELECT 'movie' AS type, w.movie_id AS content_id, NULL AS series_id, " +
                        "m.title, m.thumbnail_url, m.banner_url, m.age_rating, w.added_at " +
                        "FROM watchlist w JOIN movies m ON m.id = w.movie_id " +
                        "WHERE w.profile_id = ? AND w.movie_id IS NOT NULL) " +
                        "UNION ALL " +
                        "(SELECT 'series' AS type, w.series_id AS content_id, NULL AS series_id, " +
                        "s.title, s.thumbnail_url, s.banner_url, s.age_rating, w.added_at " +
                        "FROM watchlist w JOIN series s ON s.id = w.series_id " +
                        "WHERE w.profile_id = ? AND w.series_id IS NOT NULL) " +
                        "UNION ALL " +
                        "(SELECT 'episode' AS type, w.episode_id AS content_id, e.series_id AS series_id, " +
                        "e.title, e.thumbnail_url, NULL AS banner_url, NULL AS age_rating, w.added_at " +
                        "FROM watchlist w JOIN episodes e ON e.id = w.episode_id " +
                        "WHERE w.profile_id = ? AND w.episode_id IS NOT NULL) " +
                        "ORDER BY added_at DESC",
                profileId, profileId, profileId
        );
    }

    public void add(int userId, int profileId, Integer movieId, Integer seriesId, Integer episodeId) {
        jdbcTemplate.update(
                "INSERT IGNORE INTO watchlist (profile_id, movie_id, series_id, episode_id, added_at) VALUES (?, ?, ?, ?, NOW())",
                profileId, movieId, seriesId, episodeId
        );
        if (movieId != null) {
            notificationService.createNotification(userId, "watchlist_add", "Bạn đã thêm một phim vào danh sách của tôi.");
        } else if (seriesId != null) {
            notificationService.createNotification(userId, "watchlist_add", "Bạn đã thêm một series vào danh sách của tôi.");
        }
    }

    public void remove(int profileId, int contentId, String type) {
        if ("series".equalsIgnoreCase(type)) {
            jdbcTemplate.update("DELETE FROM watchlist WHERE profile_id = ? AND series_id = ?", profileId, contentId);
        } else if ("episode".equalsIgnoreCase(type)) {
            jdbcTemplate.update("DELETE FROM watchlist WHERE profile_id = ? AND episode_id = ?", profileId, contentId);
        } else {
            jdbcTemplate.update("DELETE FROM watchlist WHERE profile_id = ? AND movie_id = ?", profileId, contentId);
        }
    }
}

