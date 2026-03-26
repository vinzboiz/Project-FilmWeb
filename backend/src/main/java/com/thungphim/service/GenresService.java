package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class GenresService {

    private final JdbcTemplate jdbcTemplate;

    public GenresService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> listGenres() {
        String sql = "SELECT id, name, description, thumbnail_url FROM genres ORDER BY name";
        return jdbcTemplate.queryForList(sql);
    }

    public List<Map<String, Object>> topWithMovies(Integer limit, Integer moviesPerGenre, String type, boolean featured) {
        int genreLimit = clamp(limit != null ? limit : 5, 1, 10);
        int perGenre = clamp(moviesPerGenre != null ? moviesPerGenre : 10, 1, 20);

        String featWhereMovies = featured ? " AND m.is_featured = 1" : "";
        String featWhereSeries = featured ? " AND s.is_featured = 1" : "";

        String topGenresSql =
                "SELECT g.id, g.name, " +
                        "COUNT(u.content_id) AS cnt, " +
                        "COALESCE(AVG(u.rating), 0) AS avg_rating, " +
                        "COALESCE(SUM(u.view_count), 0) AS total_views " +
                        "FROM genres g " +
                        "LEFT JOIN ( " +
                        "  SELECT mg.genre_id, m.id AS content_id, m.rating, m.view_count " +
                        "  FROM movie_genres mg INNER JOIN movies m ON m.id = mg.movie_id " +
                        "  UNION ALL " +
                        "  SELECT sg.genre_id, s.id AS content_id, s.rating, s.view_count " +
                        "  FROM series_genres sg INNER JOIN series s ON s.id = sg.series_id " +
                        ") u ON u.genre_id = g.id " +
                        "GROUP BY g.id, g.name " +
                        "ORDER BY cnt DESC, avg_rating DESC, total_views DESC " +
                        "LIMIT ?";

        List<Map<String, Object>> topGenres = jdbcTemplate.queryForList(topGenresSql, genreLimit);
        List<Map<String, Object>> result = new ArrayList<>();

        String normalizedType = (type == null) ? "" : type.trim().toLowerCase(Locale.ROOT);

        for (Map<String, Object> g : topGenres) {
            Integer genreId = asInt(g.get("id"));
            String genreName = Objects.toString(g.get("name"), "");

            List<Map<String, Object>> combined = new ArrayList<>();

            if (!"series".equals(normalizedType)) {
                String moviesSql =
                        "SELECT m.id, m.title, m.thumbnail_url, m.banner_url, m.age_rating, m.release_year, m.country_code, m.rating " +
                                "FROM movies m " +
                                "INNER JOIN movie_genres mg ON mg.movie_id = m.id AND mg.genre_id = ? " +
                                "WHERE 1=1" + featWhereMovies + " " +
                                "ORDER BY m.id DESC " +
                                "LIMIT ?";
                List<Map<String, Object>> movies = jdbcTemplate.queryForList(moviesSql, genreId, perGenre);
                for (Map<String, Object> m : movies) {
                    Map<String, Object> row = new LinkedHashMap<>(m);
                    row.put("type", "movie");
                    combined.add(row);
                }
            }

            if (!"movie".equals(normalizedType)) {
                String seriesSql =
                        "SELECT s.id, s.title, s.thumbnail_url, s.banner_url, s.age_rating, s.release_year, s.country_code, s.rating " +
                                "FROM series s " +
                                "INNER JOIN series_genres sg ON sg.series_id = s.id AND sg.genre_id = ? " +
                                "WHERE 1=1" + featWhereSeries + " " +
                                "ORDER BY s.id DESC " +
                                "LIMIT ?";
                List<Map<String, Object>> series = jdbcTemplate.queryForList(seriesSql, genreId, perGenre);
                for (Map<String, Object> s : series) {
                    Map<String, Object> row = new LinkedHashMap<>(s);
                    row.put("type", "series");
                    combined.add(row);
                }
            }

            combined.sort((a, b) -> Integer.compare(asInt(b.get("id")), asInt(a.get("id"))));
            if (combined.size() > perGenre) {
                combined = combined.subList(0, perGenre);
            }

            Map<String, Object> genreObj = new LinkedHashMap<>();
            genreObj.put("id", genreId);
            genreObj.put("name", genreName);

            Map<String, Object> out = new LinkedHashMap<>();
            out.put("genre", genreObj);
            out.put("movies", combined);
            result.add(out);
        }

        return result;
    }

    public Map<String, Object> createGenre(String name, String description, String thumbnailUrl) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name là bắt buộc");
        }
        List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id FROM genres WHERE name = ?", name.trim());
        if (!existing.isEmpty()) {
            throw new IllegalStateException("Genre đã tồn tại");
        }
        jdbcTemplate.update(
                "INSERT INTO genres (name, description, thumbnail_url) VALUES (?, ?, ?)",
                name.trim(),
                (description != null && !description.isBlank()) ? description.trim() : null,
                (thumbnailUrl != null && !thumbnailUrl.isBlank()) ? thumbnailUrl.trim() : null
        );
        Integer id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Integer.class);
        return jdbcTemplate.queryForMap("SELECT id, name, description, thumbnail_url FROM genres WHERE id = ?", id);
    }

    public Map<String, Object> updateGenre(int id, String name, String description, String thumbnailUrl) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name là bắt buộc");
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM genres WHERE id = ?", id);
        if (rows.isEmpty()) {
            return null;
        }
        jdbcTemplate.update(
                "UPDATE genres SET name = ?, description = ?, thumbnail_url = ? WHERE id = ?",
                name.trim(),
                (description != null && !description.isBlank()) ? description.trim() : null,
                (thumbnailUrl != null && !thumbnailUrl.isBlank()) ? thumbnailUrl.trim() : null,
                id
        );
        return jdbcTemplate.queryForMap("SELECT id, name, description, thumbnail_url FROM genres WHERE id = ?", id);
    }

    public boolean deleteGenre(int id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM genres WHERE id = ?", id);
        if (rows.isEmpty()) {
            return false;
        }
        jdbcTemplate.update("DELETE FROM movie_genres WHERE genre_id = ?", id);
        jdbcTemplate.update("DELETE FROM series_genres WHERE genre_id = ?", id);
        jdbcTemplate.update("DELETE FROM genres WHERE id = ?", id);
        return true;
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static Integer asInt(Object obj) {
        if (obj == null) return 0;
        if (obj instanceof Integer i) return i;
        if (obj instanceof Long l) return l.intValue();
        if (obj instanceof Short s) return s.intValue();
        if (obj instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(obj)); } catch (Exception ignored) { return 0; }
    }
}

