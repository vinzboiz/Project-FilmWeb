package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class HeroService {

    private static final String TRAILER_WHERE = "trailer_url IS NOT NULL AND trailer_url != '' AND trailer_url LIKE '/uploads/%'";

    private final JdbcTemplate jdbcTemplate;

    public HeroService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> getRandomHero(String type) {
        String sql;
        if ("movie".equalsIgnoreCase(type)) {
            sql = "SELECT id, title, short_intro, description, thumbnail_url, banner_url, trailer_url, age_rating, like_count, release_year, 'movie' AS type " +
                    "FROM movies WHERE " + TRAILER_WHERE + " ORDER BY RAND() LIMIT 1";
        } else if ("series".equalsIgnoreCase(type)) {
            sql = "SELECT id, title, NULL AS short_intro, description, thumbnail_url, banner_url, trailer_url, age_rating, like_count, release_year, 'series' AS type " +
                    "FROM series WHERE " + TRAILER_WHERE + " ORDER BY RAND() LIMIT 1";
        } else if ("featured".equalsIgnoreCase(type)) {
            sql = "(SELECT id, title, short_intro, description, thumbnail_url, banner_url, trailer_url, age_rating, like_count, release_year, 'movie' AS type " +
                    "FROM movies WHERE " + TRAILER_WHERE + " AND is_featured = 1) " +
                    "UNION ALL (SELECT id, title, NULL, description, thumbnail_url, banner_url, trailer_url, age_rating, like_count, release_year, 'series' AS type " +
                    "FROM series WHERE " + TRAILER_WHERE + " AND is_featured = 1) ORDER BY RAND() LIMIT 1";
        } else {
            sql = "(SELECT id, title, short_intro, description, thumbnail_url, banner_url, trailer_url, age_rating, like_count, release_year, 'movie' AS type " +
                    "FROM movies WHERE " + TRAILER_WHERE + ") " +
                    "UNION ALL (SELECT id, title, NULL, description, thumbnail_url, banner_url, trailer_url, age_rating, like_count, release_year, 'series' AS type " +
                    "FROM series WHERE " + TRAILER_WHERE + ") ORDER BY RAND() LIMIT 1";
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        return rows.isEmpty() ? null : rows.get(0);
    }
}
