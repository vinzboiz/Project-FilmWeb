package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class WatchService {

    private final JdbcTemplate jdbcTemplate;

    public WatchService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int getProgress(int profileId, Integer movieId, Integer episodeId) {
        List<Map<String, Object>> rows;
        if (movieId != null) {
            rows = jdbcTemplate.queryForList(
                    "SELECT progress_seconds FROM watch_history " +
                            "WHERE profile_id = ? AND movie_id = ? AND episode_id IS NULL " +
                            "ORDER BY watched_at DESC LIMIT 1",
                    profileId, movieId
            );
        } else {
            rows = jdbcTemplate.queryForList(
                    "SELECT progress_seconds FROM watch_history " +
                            "WHERE profile_id = ? AND episode_id = ? " +
                            "ORDER BY watched_at DESC LIMIT 1",
                    profileId, episodeId
            );
        }
        if (rows.isEmpty()) return 0;
        Object v = rows.get(0).get("progress_seconds");
        if (v instanceof Number n) return Math.max(0, n.intValue());
        try { return Math.max(0, Integer.parseInt(String.valueOf(v))); } catch (Exception ignored) { return 0; }
    }

    public void saveProgress(int userId, int profileId, Integer movieId, Integer episodeId, int progressSeconds) {
        int sec = Math.max(0, progressSeconds);
        if (movieId != null) {
            int affected = jdbcTemplate.update(
                    "UPDATE watch_history SET progress_seconds = ?, watched_at = NOW() " +
                            "WHERE profile_id = ? AND movie_id = ? AND episode_id IS NULL",
                    sec, profileId, movieId
            );
            if (affected == 0) {
                jdbcTemplate.update(
                        "INSERT INTO watch_history (profile_id, movie_id, episode_id, progress_seconds, watched_at) " +
                                "VALUES (?, ?, NULL, ?, NOW())",
                        profileId, movieId, sec
                );
                // 1 view = first time any profile of this user watches this movie
                List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                        "SELECT 1 FROM watch_history wh " +
                                "JOIN profiles p ON p.id = wh.profile_id " +
                                "WHERE wh.movie_id = ? AND wh.episode_id IS NULL AND p.user_id = ? " +
                                "LIMIT 2",
                        movieId, userId
                );
                if (existing.size() == 1) {
                    jdbcTemplate.update("UPDATE movies SET view_count = IFNULL(view_count, 0) + 1 WHERE id = ?", movieId);
                }
            }
        } else {
            int affected = jdbcTemplate.update(
                    "UPDATE watch_history SET progress_seconds = ?, watched_at = NOW() " +
                            "WHERE profile_id = ? AND episode_id = ?",
                    sec, profileId, episodeId
            );
            if (affected == 0) {
                jdbcTemplate.update(
                        "INSERT INTO watch_history (profile_id, movie_id, episode_id, progress_seconds, watched_at) " +
                                "VALUES (?, NULL, ?, ?, NOW())",
                        profileId, episodeId, sec
                );
                List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                        "SELECT 1 FROM watch_history wh " +
                                "JOIN profiles p ON p.id = wh.profile_id " +
                                "WHERE wh.episode_id = ? AND p.user_id = ? " +
                                "LIMIT 2",
                        episodeId, userId
                );
                if (existing.size() == 1) {
                    jdbcTemplate.update("UPDATE episodes SET view_count = IFNULL(view_count, 0) + 1 WHERE id = ?", episodeId);
                }
            }
        }
    }

    public Map<String, Object> continueWatching(int profileId) {
        List<Map<String, Object>> movies = jdbcTemplate.queryForList(
                "SELECT wh.movie_id AS id, m.title, m.thumbnail_url, m.banner_url, " +
                        "MAX(wh.progress_seconds) AS progress_seconds, 'movie' AS type " +
                        "FROM watch_history wh JOIN movies m ON m.id = wh.movie_id " +
                        "WHERE wh.profile_id = ? AND wh.movie_id IS NOT NULL " +
                        "GROUP BY wh.movie_id, m.title, m.thumbnail_url, m.banner_url " +
                        "HAVING MAX(wh.progress_seconds) > 0 " +
                        "ORDER BY MAX(wh.watched_at) DESC LIMIT 15",
                profileId
        );
        List<Map<String, Object>> episodes = jdbcTemplate.queryForList(
                "SELECT wh.episode_id AS id, e.title, e.thumbnail_url, e.series_id, " +
                        "MAX(wh.progress_seconds) AS progress_seconds, 'episode' AS type " +
                        "FROM watch_history wh JOIN episodes e ON e.id = wh.episode_id " +
                        "WHERE wh.profile_id = ? AND wh.episode_id IS NOT NULL " +
                        "GROUP BY wh.episode_id, e.title, e.thumbnail_url, e.series_id " +
                        "HAVING MAX(wh.progress_seconds) > 0 " +
                        "ORDER BY MAX(wh.watched_at) DESC LIMIT 15",
                profileId
        );
        return Map.of("movies", movies, "episodes", episodes);
    }

    public List<Map<String, Object>> history(int profileId) {
        return jdbcTemplate.queryForList(
                "(SELECT wh.id, wh.movie_id AS content_id, wh.episode_id, wh.progress_seconds, wh.watched_at, " +
                        "m.title, m.thumbnail_url, 'movie' AS type, NULL AS series_id " +
                        "FROM watch_history wh LEFT JOIN movies m ON m.id = wh.movie_id " +
                        "WHERE wh.profile_id = ? AND wh.movie_id IS NOT NULL) " +
                        "UNION ALL " +
                        "(SELECT wh.id, wh.episode_id AS content_id, wh.episode_id, wh.progress_seconds, wh.watched_at, " +
                        "e.title, e.thumbnail_url, 'episode' AS type, e.series_id " +
                        "FROM watch_history wh LEFT JOIN episodes e ON e.id = wh.episode_id " +
                        "WHERE wh.profile_id = ? AND wh.episode_id IS NOT NULL) " +
                        "ORDER BY watched_at DESC LIMIT 50",
                profileId, profileId
        );
    }
}

