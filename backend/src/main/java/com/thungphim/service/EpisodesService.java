package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class EpisodesService {

    private final JdbcTemplate jdbcTemplate;

    public EpisodesService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> getEpisodeCast(int episodeId) {
        return jdbcTemplate.queryForList(
                "SELECT c.episode_id, c.person_id, c.role, p.name, p.avatar_url " +
                        "FROM cast c JOIN persons p ON p.id = c.person_id " +
                        "WHERE c.episode_id = ?",
                episodeId
        );
    }

    public void addEpisodeCast(int episodeId, int personId, String role) {
        String r = (role == null || role.isBlank()) ? "actor" : role;
        jdbcTemplate.update(
                "INSERT IGNORE INTO cast (movie_id, episode_id, person_id, role) VALUES (NULL, ?, ?, ?)",
                episodeId, personId, r
        );
    }

    public void removeEpisodeCast(int episodeId, int personId) {
        jdbcTemplate.update(
                "DELETE FROM cast WHERE episode_id = ? AND person_id = ?",
                episodeId, personId
        );
    }
}
