package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class FavoritesService {

    private final JdbcTemplate jdbcTemplate;
    private final NotificationService notificationService;

    public FavoritesService(JdbcTemplate jdbcTemplate, NotificationService notificationService) {
        this.jdbcTemplate = jdbcTemplate;
        this.notificationService = notificationService;
    }

    public List<Map<String, Object>> list(int profileId) {
        return jdbcTemplate.queryForList(
                "SELECT f.id, f.movie_id, f.added_at, m.title, m.thumbnail_url, m.banner_url, m.age_rating " +
                        "FROM favorites f JOIN movies m ON m.id = f.movie_id " +
                        "WHERE f.profile_id = ? ORDER BY f.added_at DESC",
                profileId
        );
    }

    public void add(Integer userId, int profileId, int movieId) {
        jdbcTemplate.update("INSERT IGNORE INTO favorites (profile_id, movie_id) VALUES (?, ?)", profileId, movieId);
        if (userId != null) {
            notificationService.createNotification(userId, "favorite_add", "Bạn đã thêm một phim vào danh sách yêu thích.");
        }
    }

    public void remove(int profileId, int movieId) {
        jdbcTemplate.update("DELETE FROM favorites WHERE profile_id = ? AND movie_id = ?", profileId, movieId);
    }

    public boolean check(int profileId, int movieId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id FROM favorites WHERE profile_id = ? AND movie_id = ?",
                profileId, movieId
        );
        return !rows.isEmpty();
    }
}

