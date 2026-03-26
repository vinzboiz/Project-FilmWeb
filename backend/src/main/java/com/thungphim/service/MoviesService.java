package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class MoviesService {

    private static final String TRAILER_WHERE = "trailer_url IS NOT NULL AND trailer_url != '' AND trailer_url LIKE '/uploads/%'";

    private final JdbcTemplate jdbcTemplate;

    public MoviesService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> topRating(Integer limit, String type, boolean featured) {
        int lim = clamp(limit != null ? limit : 10, 1, 20);
        String feat = featured ? " AND is_featured = 1" : "";
        String t = (type == null) ? "" : type.trim().toLowerCase(Locale.ROOT);

        String sql;
        if ("movie".equals(t)) {
            sql = "SELECT id, title, short_intro, thumbnail_url, banner_url, age_rating, release_year, country_code, rating, 'movie' AS type " +
                    "FROM movies WHERE rating IS NOT NULL AND rating > 0" + feat + " ORDER BY rating DESC, id DESC LIMIT ?";
        } else if ("series".equals(t)) {
            sql = "SELECT id, title, NULL AS short_intro, thumbnail_url, banner_url, age_rating, release_year, country_code, rating, 'series' AS type " +
                    "FROM series WHERE rating IS NOT NULL AND rating > 0" + feat + " ORDER BY rating DESC, id DESC LIMIT ?";
        } else {
            sql = "(SELECT id, title, short_intro, thumbnail_url, banner_url, age_rating, release_year, country_code, rating, 'movie' AS type " +
                    "FROM movies WHERE rating IS NOT NULL AND rating > 0" + feat + ") " +
                    "UNION ALL " +
                    "(SELECT id, title, NULL AS short_intro, thumbnail_url, banner_url, age_rating, release_year, country_code, rating, 'series' AS type " +
                    "FROM series WHERE rating IS NOT NULL AND rating > 0" + feat + ") " +
                    "ORDER BY rating DESC, id DESC LIMIT ?";
        }

        return jdbcTemplate.queryForList(sql, lim);
    }

    public List<Map<String, Object>> trending(Integer limit, String type, boolean featured) {
        int lim = clamp(limit != null ? limit : 20, 1, 50);
        String feat = featured ? " AND is_featured = 1" : "";
        String t = (type == null) ? "" : type.trim().toLowerCase(Locale.ROOT);

        String sql;
        if ("movie".equals(t)) {
            sql = "SELECT id, title, short_intro, thumbnail_url, banner_url, age_rating, release_year, country_code, rating, 'movie' AS type " +
                    "FROM movies WHERE 1=1" + feat + " ORDER BY id DESC LIMIT ?";
        } else if ("series".equals(t)) {
            sql = "SELECT id, title, NULL AS short_intro, thumbnail_url, banner_url, age_rating, release_year, country_code, rating, 'series' AS type " +
                    "FROM series WHERE 1=1" + feat + " ORDER BY id DESC LIMIT ?";
        } else {
            sql = "(SELECT id, title, short_intro, thumbnail_url, banner_url, age_rating, release_year, country_code, rating, 'movie' AS type " +
                    "FROM movies WHERE 1=1" + feat + ") " +
                    "UNION ALL " +
                    "(SELECT id, title, NULL AS short_intro, thumbnail_url, banner_url, age_rating, release_year, country_code, rating, 'series' AS type " +
                    "FROM series WHERE 1=1" + feat + ") " +
                    "ORDER BY id DESC LIMIT ?";
        }

        return jdbcTemplate.queryForList(sql, lim);
    }

    public Map<String, Object> randomWithTrailer() {
        String sql = "SELECT id, title, short_intro, thumbnail_url, banner_url, trailer_url, description, age_rating " +
                "FROM movies WHERE " + TRAILER_WHERE + " ORDER BY RAND() LIMIT 1";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<Map<String, Object>> listMovies(Integer genreId, Integer profileId, Integer yearFrom, Integer yearTo, String countryCode, Integer limit) {
        int lim = clamp(limit != null ? limit : 50, 1, 100);
        StringBuilder sql = new StringBuilder(
                "SELECT id, title, short_intro, description, thumbnail_url, banner_url, age_rating, is_featured, release_year, country_code, rating, created_at " +
                        "FROM movies m"
        );
        List<Object> params = new ArrayList<>();
        List<String> conditions = new ArrayList<>();

        if (genreId != null) {
            conditions.add("EXISTS (SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id AND mg.genre_id = ?)");
            params.add(genreId);
        }
        if (yearFrom != null) {
            conditions.add("m.release_year >= ?");
            params.add(yearFrom);
        }
        if (yearTo != null) {
            conditions.add("m.release_year <= ?");
            params.add(yearTo);
        }
        if (countryCode != null && !countryCode.trim().isEmpty()) {
            conditions.add("m.country_code = ?");
            params.add(countryCode.trim());
        }
        if (profileId != null) {
            List<Map<String, Object>> p = jdbcTemplate.queryForList("SELECT max_maturity_rating FROM profiles WHERE id = ?", profileId);
            if (!p.isEmpty()) {
                Object max = p.get(0).get("max_maturity_rating");
                if (max != null && !String.valueOf(max).isBlank()) {
                    conditions.add("(m.age_rating IS NULL OR m.age_rating <= ?)");
                    params.add(String.valueOf(max));
                }
            }
        }

        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        sql.append(" ORDER BY m.id DESC LIMIT ?");
        params.add(lim);
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    public Map<String, Object> getMovieById(int movieId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM movies WHERE id = ?", movieId);
        if (rows.isEmpty()) return null;

        Map<String, Object> movie = new LinkedHashMap<>(rows.get(0));

        List<Map<String, Object>> cast = jdbcTemplate.queryForList(
                "SELECT p.id, p.name, p.avatar_url, c.role " +
                        "FROM cast c JOIN persons p ON p.id = c.person_id " +
                        "WHERE c.movie_id = ? AND c.movie_id IS NOT NULL",
                movieId
        );
        List<Map<String, Object>> genres = jdbcTemplate.queryForList(
                "SELECT g.id, g.name " +
                        "FROM movie_genres mg JOIN genres g ON g.id = mg.genre_id " +
                        "WHERE mg.movie_id = ?",
                movieId
        );
        Integer reviewCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reviews WHERE movie_id = ?",
                Integer.class,
                movieId
        );

        movie.put("cast", cast);
        movie.put("genres", genres);
        movie.put("review_count", reviewCount != null ? reviewCount : 0);
        return movie;
    }

    public List<Map<String, Object>> searchMovies(String q) {
        String raw = q == null ? "" : q.trim();
        if (raw.isEmpty()) return List.of();
        String normalized = normalize(raw);
        if (normalized.isEmpty()) return List.of();
        String likeNorm = "%" + escapeLike(normalized) + "%";
        String likeRaw = "%" + escapeLike(raw) + "%";
        String sql =
                "SELECT id, title, short_intro, description, thumbnail_url, banner_url, age_rating " +
                        "FROM movies " +
                        "WHERE (title_normalized IS NOT NULL AND title_normalized LIKE ?) " +
                        "   OR (title_normalized IS NULL AND title LIKE ?) " +
                        "ORDER BY id DESC LIMIT 50";
        return jdbcTemplate.queryForList(sql, likeNorm, likeRaw);
    }

    public List<Map<String, Object>> getSuggestions(int movieId, Integer limit) {
        int lim = clamp(limit != null ? limit : 10, 1, 20);
        List<Map<String, Object>> genreRows = jdbcTemplate.queryForList("SELECT genre_id FROM movie_genres WHERE movie_id = ?", movieId);
        List<Integer> genreIds = new ArrayList<>();
        for (Map<String, Object> r : genreRows) {
            Object v = r.get("genre_id");
            if (v instanceof Number n) genreIds.add(n.intValue());
        }

        List<Map<String, Object>> combined = new ArrayList<>();
        if (!genreIds.isEmpty()) {
            String placeholders = String.join(",", genreIds.stream().map(x -> "?").toList());
            List<Object> paramsMovies = new ArrayList<>(genreIds);
            paramsMovies.add(movieId);
            paramsMovies.add(lim);

            String movieSql =
                    "SELECT DISTINCT m.id, m.title, m.thumbnail_url, m.banner_url, m.age_rating, m.rating, m.release_year, m.country_code " +
                            "FROM movies m INNER JOIN movie_genres mg ON mg.movie_id = m.id AND mg.genre_id IN (" + placeholders + ") " +
                            "WHERE m.id != ? ORDER BY m.id DESC LIMIT ?";
            List<Map<String, Object>> movieRows = jdbcTemplate.queryForList(movieSql, paramsMovies.toArray());

            List<Object> paramsSeries = new ArrayList<>(genreIds);
            paramsSeries.add(lim);
            String seriesSql =
                    "SELECT DISTINCT s.id, s.title, s.thumbnail_url, s.banner_url, s.age_rating, s.rating, s.release_year, s.country_code " +
                            "FROM series s INNER JOIN series_genres sg ON sg.series_id = s.id AND sg.genre_id IN (" + placeholders + ") " +
                            "ORDER BY s.id DESC LIMIT ?";
            List<Map<String, Object>> seriesRows = jdbcTemplate.queryForList(seriesSql, paramsSeries.toArray());

            for (Map<String, Object> r : movieRows) {
                Map<String, Object> m = new LinkedHashMap<>(r);
                m.put("type", "movie");
                combined.add(m);
            }
            for (Map<String, Object> r : seriesRows) {
                Map<String, Object> s = new LinkedHashMap<>(r);
                s.put("type", "series");
                combined.add(s);
            }
            combined.sort((a, b) -> Integer.compare(asInt(b.get("id")), asInt(a.get("id"))));
            if (combined.size() > lim) combined = combined.subList(0, lim);
        }

        if (combined.size() < lim) {
            int need = lim - combined.size();
            var have = new java.util.HashSet<String>();
            for (Map<String, Object> c : combined) have.add(c.get("type") + "-" + c.get("id"));

            List<Map<String, Object>> moreMovies = jdbcTemplate.queryForList(
                    "SELECT id, title, thumbnail_url, banner_url, age_rating, rating, release_year, country_code " +
                            "FROM movies WHERE id != ? ORDER BY id DESC LIMIT ?",
                    movieId, need * 2
            );
            List<Map<String, Object>> moreSeries = jdbcTemplate.queryForList(
                    "SELECT id, title, thumbnail_url, banner_url, age_rating, rating, release_year, country_code " +
                            "FROM series ORDER BY id DESC LIMIT ?",
                    need * 2
            );
            List<Map<String, Object>> more = new ArrayList<>();
            for (Map<String, Object> r : moreMovies) {
                Map<String, Object> m = new LinkedHashMap<>(r);
                m.put("type", "movie");
                more.add(m);
            }
            for (Map<String, Object> r : moreSeries) {
                Map<String, Object> s = new LinkedHashMap<>(r);
                s.put("type", "series");
                more.add(s);
            }
            more.sort((a, b) -> Integer.compare(asInt(b.get("id")), asInt(a.get("id"))));
            for (Map<String, Object> r : more) {
                if (combined.size() >= lim) break;
                String key = r.get("type") + "-" + r.get("id");
                if (have.contains(key)) continue;
                combined.add(r);
                have.add(key);
            }
        }

        return combined;
    }

    public Map<String, Object> likeMovie(int movieId, int profileId) {
        List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                "SELECT 1 FROM content_likes WHERE profile_id = ? AND content_type = ? AND content_id = ?",
                profileId, "movie", movieId
        );
        if (!existing.isEmpty()) {
            List<Map<String, Object>> row = jdbcTemplate.queryForList("SELECT id, like_count FROM movies WHERE id = ?", movieId);
            int likeCount = row.isEmpty() ? 0 : asInt(row.get(0).get("like_count"));
            return Map.of("id", movieId, "like_count", likeCount, "user_has_liked", true);
        }

        jdbcTemplate.update(
                "INSERT IGNORE INTO content_likes (profile_id, content_type, content_id) VALUES (?, ?, ?)",
                profileId, "movie", movieId
        );
        List<Map<String, Object>> inserted = jdbcTemplate.queryForList(
                "SELECT 1 FROM content_likes WHERE profile_id = ? AND content_type = ? AND content_id = ?",
                profileId, "movie", movieId
        );
        if (!inserted.isEmpty()) {
            jdbcTemplate.update("UPDATE movies SET like_count = IFNULL(like_count, 0) + 1 WHERE id = ?", movieId);
        }
        List<Map<String, Object>> row = jdbcTemplate.queryForList("SELECT id, like_count FROM movies WHERE id = ?", movieId);
        int likeCount = row.isEmpty() ? 0 : asInt(row.get(0).get("like_count"));
        return Map.of("id", movieId, "like_count", likeCount, "user_has_liked", true);
    }

    public Map<String, Object> unlikeMovie(int movieId, int profileId) {
        int affected = jdbcTemplate.update(
                "DELETE FROM content_likes WHERE profile_id = ? AND content_type = ? AND content_id = ?",
                profileId, "movie", movieId
        );
        if (affected > 0) {
            jdbcTemplate.update("UPDATE movies SET like_count = GREATEST(IFNULL(like_count, 0) - 1, 0) WHERE id = ?", movieId);
        }
        List<Map<String, Object>> row = jdbcTemplate.queryForList("SELECT id, like_count FROM movies WHERE id = ?", movieId);
        int likeCount = row.isEmpty() ? 0 : asInt(row.get(0).get("like_count"));
        return Map.of("id", movieId, "like_count", likeCount, "user_has_liked", false);
    }

    public Map<String, Object> likeStatus(int movieId, Integer profileId) {
        int likeCount = 0;
        List<Map<String, Object>> movie = jdbcTemplate.queryForList("SELECT like_count FROM movies WHERE id = ?", movieId);
        if (!movie.isEmpty()) likeCount = asInt(movie.get(0).get("like_count"));
        boolean userHasLiked = false;
        if (profileId != null) {
            List<Map<String, Object>> liked = jdbcTemplate.queryForList(
                    "SELECT 1 FROM content_likes WHERE profile_id = ? AND content_type = ? AND content_id = ?",
                    profileId, "movie", movieId
            );
            userHasLiked = !liked.isEmpty();
        }
        return Map.of("like_count", likeCount, "user_has_liked", userHasLiked);
    }

    public List<Map<String, Object>> getMovieGenres(int movieId) {
        return jdbcTemplate.queryForList(
                "SELECT g.id, g.name FROM movie_genres mg JOIN genres g ON g.id = mg.genre_id WHERE mg.movie_id = ?",
                movieId
        );
    }

    public void setMovieGenres(int movieId, List<Integer> genreIds) {
        jdbcTemplate.update("DELETE FROM movie_genres WHERE movie_id = ?", movieId);
        if (genreIds == null || genreIds.isEmpty()) return;
        for (Integer gid : genreIds) {
            jdbcTemplate.update("INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)", movieId, gid);
        }
    }

    public List<Map<String, Object>> getMovieCast(int movieId) {
        return jdbcTemplate.queryForList(
                "SELECT p.id, p.name, p.avatar_url, c.role " +
                        "FROM cast c JOIN persons p ON p.id = c.person_id " +
                        "WHERE c.movie_id = ? AND c.episode_id IS NULL",
                movieId
        );
    }

    public void addMovieCast(int movieId, int personId, String role) {
        String r = (role == null || role.isBlank()) ? "actor" : role;
        jdbcTemplate.update(
                "INSERT INTO cast (movie_id, episode_id, person_id, role) VALUES (?, NULL, ?, ?)",
                movieId, personId, r
        );
    }

    public void removeMovieCast(int movieId, int personId) {
        jdbcTemplate.update(
                "DELETE FROM cast WHERE movie_id = ? AND person_id = ? AND episode_id IS NULL",
                movieId, personId
        );
    }

    public Map<String, Object> createMovie(Map<String, Object> body) {
        String title = body.get("title") == null ? null : String.valueOf(body.get("title")).trim();
        jdbcTemplate.update(
                "INSERT INTO movies (title, short_intro, description, release_year, duration_minutes, thumbnail_url, banner_url, trailer_url, trailer_youtube_url, video_url, rating, age_rating, country_code, is_featured, view_count, like_count, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(3), NOW(3))",
                title,
                body.get("short_intro"),
                body.get("description"),
                toInt(body.get("release_year")),
                toInt(body.get("duration_minutes")),
                body.get("thumbnail_url"),
                body.get("banner_url"),
                body.get("trailer_url"),
                body.get("trailer_youtube_url"),
                body.get("video_url"),
                toDouble(body.get("rating")),
                body.get("age_rating"),
                body.get("country_code"),
                toBool(body.get("is_featured")) ? 1 : 0
        );
        Integer id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Integer.class);
        if (title != null && !title.isBlank()) {
            try {
                jdbcTemplate.update("UPDATE movies SET title_normalized = ? WHERE id = ?", normalize(title), id);
            } catch (Exception ignored) {
                // DB cũ chưa có cột title_normalized — bỏ qua, INSERT phim vẫn thành công
            }
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM movies WHERE id = ?", id);
        return rows.isEmpty() ? Map.of("id", id) : rows.get(0);
    }

    public Map<String, Object> updateMovie(int movieId, Map<String, Object> body) {
        List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id FROM movies WHERE id = ?", movieId);
        if (existing.isEmpty()) return null;

        jdbcTemplate.update(
                "UPDATE movies SET " +
                        "title = COALESCE(?, title), " +
                        "short_intro = COALESCE(?, short_intro), " +
                        "description = COALESCE(?, description), " +
                        "release_year = COALESCE(?, release_year), " +
                        "duration_minutes = COALESCE(?, duration_minutes), " +
                        "thumbnail_url = COALESCE(?, thumbnail_url), " +
                        "banner_url = COALESCE(?, banner_url), " +
                        "trailer_url = COALESCE(?, trailer_url), " +
                        "trailer_youtube_url = COALESCE(?, trailer_youtube_url), " +
                        "video_url = COALESCE(?, video_url), " +
                        "rating = COALESCE(?, rating), " +
                        "age_rating = COALESCE(?, age_rating), " +
                        "country_code = COALESCE(?, country_code), " +
                        "is_featured = COALESCE(?, is_featured), " +
                        "updated_at = ? " +
                        "WHERE id = ?",
                body.get("title"),
                body.get("short_intro"),
                body.get("description"),
                toIntOrNull(body, "release_year"),
                toIntOrNull(body, "duration_minutes"),
                body.get("thumbnail_url"),
                body.get("banner_url"),
                body.get("trailer_url"),
                body.get("trailer_youtube_url"),
                body.get("video_url"),
                toDoubleOrNull(body, "rating"),
                body.get("age_rating"),
                body.get("country_code"),
                toBoolOrNull(body, "is_featured"),
                Timestamp.from(Instant.now()),
                movieId
        );

        if (body.containsKey("title") && body.get("title") != null) {
            String title = String.valueOf(body.get("title")).trim();
            try {
                jdbcTemplate.update("UPDATE movies SET title_normalized = ? WHERE id = ?", normalize(title), movieId);
            } catch (Exception ignored) {
                // DB cũ chưa có cột title_normalized
            }
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM movies WHERE id = ?", movieId);
        return rows.isEmpty() ? Map.of("id", movieId) : rows.get(0);
    }

    public boolean deleteMovie(int movieId) {
        List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id FROM movies WHERE id = ?", movieId);
        if (existing.isEmpty()) return false;
        jdbcTemplate.update("DELETE FROM movie_genres WHERE movie_id = ?", movieId);
        jdbcTemplate.update("DELETE FROM cast WHERE movie_id = ?", movieId);
        jdbcTemplate.update("DELETE FROM watchlist WHERE movie_id = ?", movieId);
        jdbcTemplate.update("DELETE FROM watch_history WHERE movie_id = ?", movieId);
        jdbcTemplate.update("DELETE FROM reviews WHERE movie_id = ?", movieId);
        jdbcTemplate.update("DELETE FROM movies WHERE id = ?", movieId);
        return true;
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static int asInt(Object o) {
        if (o == null) return 0;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(o)); } catch (Exception ignored) { return 0; }
    }

    private static Integer toInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(o)); } catch (Exception ignored) { return null; }
    }

    private static Double toDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(String.valueOf(o)); } catch (Exception ignored) { return null; }
    }

    private static boolean toBool(Object o) {
        if (o == null) return false;
        if (o instanceof Boolean b) return b;
        String s = String.valueOf(o).trim().toLowerCase(Locale.ROOT);
        return "true".equals(s) || "1".equals(s);
    }

    private static Integer toIntOrNull(Map<String, Object> body, String key) {
        if (!body.containsKey(key)) return null;
        return toInt(body.get(key));
    }

    private static Double toDoubleOrNull(Map<String, Object> body, String key) {
        if (!body.containsKey(key)) return null;
        return toDouble(body.get(key));
    }

    private static Integer toBoolOrNull(Map<String, Object> body, String key) {
        if (!body.containsKey(key)) return null;
        return toBool(body.get(key)) ? 1 : 0;
    }

    private static String normalize(String input) {
        if (input == null) return "";
        String s = input.trim().toLowerCase(Locale.ROOT);
        s = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        s = s.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
        return s;
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}

