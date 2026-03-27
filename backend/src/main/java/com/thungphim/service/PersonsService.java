package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class PersonsService {

    private final JdbcTemplate jdbcTemplate;

    public PersonsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> list(String q, String type) {
        StringBuilder sql = new StringBuilder("SELECT id, name, avatar_url, biography, person_type FROM persons");
        java.util.ArrayList<Object> params = new java.util.ArrayList<>();
        java.util.ArrayList<String> cond = new java.util.ArrayList<>();

        if (q != null && !q.trim().isEmpty()) {
            cond.add("name LIKE ?");
            params.add("%" + q.trim() + "%");
        }
        if ("actor".equals(type) || "director".equals(type)) {
            if ("actor".equals(type)) {
                cond.add("(person_type = ? OR person_type IS NULL)");
                params.add("actor");
            } else {
                cond.add("person_type = ?");
                params.add("director");
            }
        }
        if (!cond.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", cond));
        }
        sql.append(" ORDER BY name ASC");
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    public Map<String, Object> getById(int id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM persons WHERE id = ?", id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> getMovies(int id) {
        List<Map<String, Object>> movies = jdbcTemplate.queryForList(
                "SELECT m.id, m.title, m.thumbnail_url, m.age_rating, c.role " +
                        "FROM cast c JOIN movies m ON m.id = c.movie_id " +
                        "WHERE c.person_id = ? AND c.movie_id IS NOT NULL",
                id
        );
        List<Map<String, Object>> episodes = jdbcTemplate.queryForList(
                "SELECT e.id, e.title, e.thumbnail_url, e.series_id, c.role " +
                        "FROM cast c JOIN episodes e ON e.id = c.episode_id " +
                        "WHERE c.person_id = ? AND c.episode_id IS NOT NULL",
                id
        );
        return Map.of("movies", movies, "episodes", episodes);
    }

    public Map<String, Object> create(String name, String avatarUrl, String biography, String personType) {
        String nameTrim = name.trim();
        String type = "director".equals(personType) ? "director" : "actor";
        try {
            jdbcTemplate.update(
                    "INSERT INTO persons (name, name_normalized, avatar_url, biography, person_type) VALUES (?, ?, ?, ?, ?)",
                    nameTrim,
                    normalize(nameTrim),
                    emptyToNull(avatarUrl),
                    emptyToNull(biography),
                    type
            );
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("name_normalized")) {
                jdbcTemplate.update(
                        "INSERT INTO persons (name, avatar_url, biography, person_type) VALUES (?, ?, ?, ?)",
                        nameTrim,
                        emptyToNull(avatarUrl),
                        emptyToNull(biography),
                        type
                );
            } else throw e;
        }
        Integer id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Integer.class);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM persons WHERE id = ?", id);
        return rows.isEmpty() ? Map.of("id", id) : rows.get(0);
    }

    public Map<String, Object> update(int id, String name, String avatarUrl, String biography, String personType) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM persons WHERE id = ?", id);
        if (rows.isEmpty()) return null;
        String nameTrim = name.trim();
        String type = "director".equals(personType) ? "director" : "actor";
        try {
            jdbcTemplate.update(
                    "UPDATE persons SET name = ?, name_normalized = ?, avatar_url = ?, biography = ?, person_type = ? WHERE id = ?",
                    nameTrim,
                    normalize(nameTrim),
                    emptyToNull(avatarUrl),
                    emptyToNull(biography),
                    type,
                    id
            );
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("name_normalized")) {
                jdbcTemplate.update(
                        "UPDATE persons SET name = ?, avatar_url = ?, biography = ?, person_type = ? WHERE id = ?",
                        nameTrim,
                        emptyToNull(avatarUrl),
                        emptyToNull(biography),
                        type,
                        id
                );
            } else throw e;
        }
        List<Map<String, Object>> updated = jdbcTemplate.queryForList("SELECT * FROM persons WHERE id = ?", id);
        return updated.isEmpty() ? Map.of("id", id) : updated.get(0);
    }

    public boolean delete(int id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM persons WHERE id = ?", id);
        if (rows.isEmpty()) return false;
        jdbcTemplate.update("DELETE FROM cast WHERE person_id = ?", id);
        jdbcTemplate.update("DELETE FROM persons WHERE id = ?", id);
        return true;
    }

    private static String emptyToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String normalize(String input) {
        if (input == null) return null;
        String s = input.trim().toLowerCase(Locale.ROOT);
        s = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        s = s.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
        return s.isEmpty() ? null : s;
    }
}

