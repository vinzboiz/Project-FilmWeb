package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class SeriesService {

    private final JdbcTemplate jdbcTemplate;

    public SeriesService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> listSeries(Integer profileId, Integer genreId, Integer yearFrom, Integer yearTo, String countryCode, Integer limit) {
        int lim = clamp(limit != null ? limit : 50, 1, 100);
        StringBuilder sql = new StringBuilder(
                "SELECT s.id, s.title, s.description, s.thumbnail_url, s.banner_url, s.age_rating, s.is_featured, s.release_year, s.rating " +
                        "FROM series s"
        );
        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        if (genreId != null) {
            conditions.add("EXISTS (SELECT 1 FROM series_genres sg WHERE sg.series_id = s.id AND sg.genre_id = ?)");
            params.add(genreId);
        }
        if (yearFrom != null) {
            conditions.add("s.release_year >= ?");
            params.add(yearFrom);
        }
        if (yearTo != null) {
            conditions.add("s.release_year <= ?");
            params.add(yearTo);
        }
        if (countryCode != null && !countryCode.trim().isEmpty()) {
            conditions.add("s.country_code = ?");
            params.add(countryCode.trim());
        }
        if (profileId != null) {
            List<Map<String, Object>> p = jdbcTemplate.queryForList("SELECT max_maturity_rating FROM profiles WHERE id = ?", profileId);
            if (!p.isEmpty()) {
                Object max = p.get(0).get("max_maturity_rating");
                if (max != null && !String.valueOf(max).isBlank()) {
                    conditions.add("(s.age_rating IS NULL OR s.age_rating <= ?)");
                    params.add(String.valueOf(max));
                }
            }
        }

        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        sql.append(" ORDER BY s.id DESC LIMIT ?");
        params.add(lim);
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    public List<Map<String, Object>> searchSeries(String q) {
        String raw = q == null ? "" : q.trim();
        if (raw.isEmpty()) return List.of();
        String normalized = normalize(raw);
        if (normalized.isEmpty()) return List.of();
        String likeNorm = "%" + escapeLike(normalized) + "%";
        String likeRaw = "%" + escapeLike(raw) + "%";

        String sql =
                "SELECT id, title, description, thumbnail_url, banner_url, age_rating, release_year " +
                        "FROM series " +
                        "WHERE (title_normalized IS NOT NULL AND title_normalized LIKE ?) " +
                        "   OR (title_normalized IS NULL AND title LIKE ?) " +
                        "ORDER BY id DESC LIMIT 50";
        return jdbcTemplate.queryForList(sql, likeNorm, likeRaw);
    }

    public Map<String, Object> getSeriesById(int id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM series WHERE id = ?", id);
        if (rows.isEmpty()) return null;

        Map<String, Object> series = new LinkedHashMap<>(rows.get(0));

        List<Map<String, Object>> seasons = jdbcTemplate.queryForList(
                "SELECT * FROM seasons WHERE series_id = ? ORDER BY season_number",
                id
        );

        List<Map<String, Object>> cast = new ArrayList<>();
        try {
            List<Map<String, Object>> castRows = jdbcTemplate.queryForList(
                    "SELECT sc.person_id, sc.role, p.name, p.avatar_url " +
                            "FROM series_cast sc JOIN persons p ON p.id = sc.person_id WHERE sc.series_id = ?",
                    id
            );
            for (Map<String, Object> r : castRows) {
                cast.add(Map.of(
                        "id", asInt(r.get("person_id")),
                        "name", Objects.toString(r.get("name"), ""),
                        "avatar_url", r.get("avatar_url"),
                        "role", r.get("role")
                ));
            }
        } catch (org.springframework.dao.DataAccessException ignored) {
            // series_cast table may not exist yet; return empty cast
        }

        Integer reviewCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM reviews WHERE series_id = ?", Integer.class, id);

        List<Map<String, Object>> genres = jdbcTemplate.queryForList(
                "SELECT g.id, g.name FROM series_genres sg JOIN genres g ON g.id = sg.genre_id WHERE sg.series_id = ? ORDER BY g.name",
                id
        );

        series.put("seasons", seasons);
        series.put("cast", cast);
        series.put("genres", genres);
        series.put("review_count", reviewCount != null ? reviewCount : 0);
        return series;
    }

    public List<Map<String, Object>> listEpisodesOfSeries(int seriesId, Integer seasonId) {
        if (seasonId == null) {
            return jdbcTemplate.queryForList("SELECT * FROM episodes WHERE series_id = ? ORDER BY episode_number", seriesId);
        }
        return jdbcTemplate.queryForList("SELECT * FROM episodes WHERE series_id = ? AND season_id = ? ORDER BY episode_number", seriesId, seasonId);
    }

    public Map<String, Object> getEpisodeById(int episodeId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM episodes WHERE id = ?", episodeId);
        if (rows.isEmpty()) return null;
        Map<String, Object> episode = new LinkedHashMap<>(rows.get(0));

        try {
            jdbcTemplate.update("UPDATE episodes SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?", episodeId);
            Object seriesId = episode.get("series_id");
            if (seriesId != null) {
                jdbcTemplate.update("UPDATE series SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?", asInt(seriesId));
            }
        } catch (Exception ignored) {}

        // Kèm intro mặc định của series để frontend tính "effective intro"
        Object seriesId = episode.get("series_id");
        if (seriesId != null) {
            List<Map<String, Object>> s = jdbcTemplate.queryForList(
                    "SELECT intro_source_episode_id, intro_start_seconds, intro_end_seconds FROM series WHERE id = ?",
                    asInt(seriesId)
            );
            if (!s.isEmpty()) {
                episode.put("series_intro_source_episode_id", s.get(0).get("intro_source_episode_id"));
                episode.put("series_intro_start_seconds", s.get(0).get("intro_start_seconds"));
                episode.put("series_intro_end_seconds", s.get(0).get("intro_end_seconds"));
            }
        }

        return episode;
    }

    public Map<String, Object> likeStatus(int seriesId, Integer profileId) {
        int likeCount = 0;
        List<Map<String, Object>> series = jdbcTemplate.queryForList("SELECT like_count FROM series WHERE id = ?", seriesId);
        if (!series.isEmpty()) likeCount = asInt(series.get(0).get("like_count"));
        boolean userHasLiked = false;
        if (profileId != null) {
            List<Map<String, Object>> liked = jdbcTemplate.queryForList(
                    "SELECT 1 FROM content_likes WHERE profile_id = ? AND content_type = ? AND content_id = ?",
                    profileId, "series", seriesId
            );
            userHasLiked = !liked.isEmpty();
        }
        return Map.of("like_count", likeCount, "user_has_liked", userHasLiked);
    }

    public Map<String, Object> likeSeries(int seriesId, int profileId) {
        List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                "SELECT 1 FROM content_likes WHERE profile_id = ? AND content_type = ? AND content_id = ?",
                profileId, "series", seriesId
        );
        if (!existing.isEmpty()) {
            List<Map<String, Object>> row = jdbcTemplate.queryForList("SELECT id, like_count FROM series WHERE id = ?", seriesId);
            int likeCount = row.isEmpty() ? 0 : asInt(row.get(0).get("like_count"));
            return Map.of("id", seriesId, "like_count", likeCount, "user_has_liked", true);
        }
        jdbcTemplate.update(
                "INSERT IGNORE INTO content_likes (profile_id, content_type, content_id) VALUES (?, ?, ?)",
                profileId, "series", seriesId
        );
        List<Map<String, Object>> inserted = jdbcTemplate.queryForList(
                "SELECT 1 FROM content_likes WHERE profile_id = ? AND content_type = ? AND content_id = ?",
                profileId, "series", seriesId
        );
        if (!inserted.isEmpty()) {
            jdbcTemplate.update("UPDATE series SET like_count = IFNULL(like_count, 0) + 1 WHERE id = ?", seriesId);
        }
        List<Map<String, Object>> row = jdbcTemplate.queryForList("SELECT id, like_count FROM series WHERE id = ?", seriesId);
        int likeCount = row.isEmpty() ? 0 : asInt(row.get(0).get("like_count"));
        return Map.of("id", seriesId, "like_count", likeCount, "user_has_liked", true);
    }

    public Map<String, Object> unlikeSeries(int seriesId, int profileId) {
        int affected = jdbcTemplate.update(
                "DELETE FROM content_likes WHERE profile_id = ? AND content_type = ? AND content_id = ?",
                profileId, "series", seriesId
        );
        if (affected > 0) {
            jdbcTemplate.update("UPDATE series SET like_count = GREATEST(IFNULL(like_count, 0) - 1, 0) WHERE id = ?", seriesId);
        }
        List<Map<String, Object>> row = jdbcTemplate.queryForList("SELECT id, like_count FROM series WHERE id = ?", seriesId);
        int likeCount = row.isEmpty() ? 0 : asInt(row.get(0).get("like_count"));
        return Map.of("id", seriesId, "like_count", likeCount, "user_has_liked", false);
    }

    public List<Map<String, Object>> getSuggestions(int seriesId, Integer limit) {
        int lim = clamp(limit != null ? limit : 10, 1, 20);
        List<Map<String, Object>> genreRows = jdbcTemplate.queryForList("SELECT genre_id FROM series_genres WHERE series_id = ?", seriesId);
        List<Integer> genreIds = new ArrayList<>();
        for (Map<String, Object> r : genreRows) {
            Object v = r.get("genre_id");
            if (v instanceof Number n) genreIds.add(n.intValue());
        }

        List<Map<String, Object>> combined = new ArrayList<>();
        if (!genreIds.isEmpty()) {
            String placeholders = String.join(",", genreIds.stream().map(x -> "?").toList());

            List<Object> movieParams = new ArrayList<>(genreIds);
            movieParams.add(lim);
            String movieSql =
                    "SELECT DISTINCT m.id, m.title, m.thumbnail_url, m.banner_url, m.age_rating, m.rating, m.release_year, m.country_code " +
                            "FROM movies m INNER JOIN movie_genres mg ON mg.movie_id = m.id AND mg.genre_id IN (" + placeholders + ") " +
                            "ORDER BY m.id DESC LIMIT ?";
            List<Map<String, Object>> movieRows = jdbcTemplate.queryForList(movieSql, movieParams.toArray());

            List<Object> seriesParams = new ArrayList<>(genreIds);
            seriesParams.add(seriesId);
            seriesParams.add(lim);
            String seriesSql =
                    "SELECT DISTINCT s.id, s.title, s.thumbnail_url, s.banner_url, s.age_rating, s.rating, s.release_year, s.country_code " +
                            "FROM series s INNER JOIN series_genres sg ON sg.series_id = s.id AND sg.genre_id IN (" + placeholders + ") " +
                            "WHERE s.id != ? ORDER BY s.id DESC LIMIT ?";
            List<Map<String, Object>> seriesRows = jdbcTemplate.queryForList(seriesSql, seriesParams.toArray());

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
                            "FROM movies ORDER BY id DESC LIMIT ?",
                    need * 2
            );
            List<Map<String, Object>> moreSeries = jdbcTemplate.queryForList(
                    "SELECT id, title, thumbnail_url, banner_url, age_rating, rating, release_year, country_code " +
                            "FROM series WHERE id != ? ORDER BY id DESC LIMIT ?",
                    seriesId, need * 2
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

    public List<Map<String, Object>> getSeriesCast(int seriesId) {
        return jdbcTemplate.queryForList(
                "SELECT sc.person_id AS id, p.name, p.avatar_url, sc.role " +
                        "FROM series_cast sc JOIN persons p ON p.id = sc.person_id WHERE sc.series_id = ?",
                seriesId
        );
    }

    public void addSeriesCast(int seriesId, int personId, String role) {
        String r = (role == null || role.isBlank()) ? "actor" : role;
        jdbcTemplate.update(
                "INSERT INTO series_cast (series_id, person_id, role) VALUES (?, ?, ?)",
                seriesId, personId, r
        );
    }

    public void removeSeriesCast(int seriesId, int personId) {
        jdbcTemplate.update("DELETE FROM series_cast WHERE series_id = ? AND person_id = ?", seriesId, personId);
    }

    public void setSeriesGenres(int seriesId, List<Integer> genreIds) {
        jdbcTemplate.update("DELETE FROM series_genres WHERE series_id = ?", seriesId);
        if (genreIds == null || genreIds.isEmpty()) return;
        for (Integer gid : genreIds) {
            jdbcTemplate.update("INSERT IGNORE INTO series_genres (series_id, genre_id) VALUES (?, ?)", seriesId, gid);
        }
    }

    public Map<String, Object> createSeries(Map<String, Object> body) {
        String title = body.get("title") == null ? null : String.valueOf(body.get("title")).trim();
        jdbcTemplate.update(
                "INSERT INTO series (title, description, thumbnail_url, banner_url, trailer_url, trailer_youtube_url, age_rating, is_featured, view_count, like_count, release_year, country_code, duration_minutes, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, NOW(3), NOW(3))",
                title,
                body.get("description"),
                body.get("thumbnail_url"),
                body.get("banner_url"),
                body.get("trailer_url"),
                body.get("trailer_youtube_url"),
                body.get("age_rating"),
                toBool(body.get("is_featured")) ? 1 : 0,
                toInt(body.get("release_year")),
                body.get("country_code"),
                toInt(body.get("duration_minutes"))
        );
        Integer id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Integer.class);
        if (title != null && !title.isBlank()) {
            try {
                jdbcTemplate.update("UPDATE series SET title_normalized = ? WHERE id = ?", normalize(title), id);
            } catch (Exception ignored) {}
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM series WHERE id = ?", id);
        return rows.isEmpty() ? Map.of("id", id) : rows.get(0);
    }

    public Map<String, Object> updateSeries(int id, Map<String, Object> body) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM series WHERE id = ?", id);
        if (rows.isEmpty()) return null;

        jdbcTemplate.update(
                "UPDATE series SET " +
                        "title = COALESCE(?, title), " +
                        "description = COALESCE(?, description), " +
                        "thumbnail_url = COALESCE(?, thumbnail_url), " +
                        "banner_url = COALESCE(?, banner_url), " +
                        "trailer_url = COALESCE(?, trailer_url), " +
                        "trailer_youtube_url = COALESCE(?, trailer_youtube_url), " +
                        "age_rating = COALESCE(?, age_rating), " +
                        "is_featured = COALESCE(?, is_featured), " +
                        "release_year = COALESCE(?, release_year), " +
                        "country_code = COALESCE(?, country_code), " +
                        "duration_minutes = COALESCE(?, duration_minutes), " +
                        "intro_source_episode_id = COALESCE(?, intro_source_episode_id), " +
                        "intro_start_seconds = COALESCE(?, intro_start_seconds), " +
                        "intro_end_seconds = COALESCE(?, intro_end_seconds), " +
                        "updated_at = NOW(3) " +
                        "WHERE id = ?",
                body.get("title"),
                body.get("description"),
                body.get("thumbnail_url"),
                body.get("banner_url"),
                body.get("trailer_url"),
                body.get("trailer_youtube_url"),
                body.get("age_rating"),
                toBoolOrNull(body, "is_featured"),
                toIntOrNull(body, "release_year"),
                body.get("country_code"),
                toIntOrNull(body, "duration_minutes"),
                toIntOrNull(body, "intro_source_episode_id"),
                toDoubleOrNull(body, "intro_start_seconds"),
                toDoubleOrNull(body, "intro_end_seconds"),
                id
        );

        if (body.containsKey("title") && body.get("title") != null) {
            String title = String.valueOf(body.get("title")).trim();
            try {
                jdbcTemplate.update("UPDATE series SET title_normalized = ? WHERE id = ?", normalize(title), id);
            } catch (Exception ignored) {}
        }

        List<Map<String, Object>> out = jdbcTemplate.queryForList("SELECT * FROM series WHERE id = ?", id);
        return out.isEmpty() ? Map.of("id", id) : out.get(0);
    }

    public boolean deleteSeries(int id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM series WHERE id = ?", id);
        if (rows.isEmpty()) return false;

        jdbcTemplate.update("DELETE FROM series_genres WHERE series_id = ?", id);
        jdbcTemplate.update("DELETE FROM series_cast WHERE series_id = ?", id);
        jdbcTemplate.update("DELETE FROM episodes WHERE series_id = ?", id);
        try { jdbcTemplate.update("DELETE FROM seasons WHERE series_id = ?", id); } catch (Exception ignored) {}
        jdbcTemplate.update("DELETE FROM series WHERE id = ?", id);
        return true;
    }

    // ADMIN - episodes CRUD
    public Map<String, Object> createEpisode(Map<String, Object> body) {
        Object seriesId = body.get("series_id");
        Object title = body.get("title");
        if (seriesId == null || title == null || String.valueOf(title).trim().isEmpty()) return null;

        Integer sId = toInt(seriesId);
        if (sId == null) return null;

        Integer seasonId = toInt(body.get("season_id"));
        Integer episodeNumber = toInt(body.get("episode_number"));
        String t = String.valueOf(title).trim();

        jdbcTemplate.update(
                "INSERT INTO episodes (series_id, season_id, episode_number, title, description, duration_minutes, thumbnail_url, video_url, release_date, intro_mode, intro_start_seconds, intro_end_seconds, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'series'), ?, ?, NOW(3), NOW(3))",
                sId,
                seasonId,
                episodeNumber,
                t,
                body.get("description"),
                toInt(body.get("duration_minutes")),
                body.get("thumbnail_url"),
                body.get("video_url"),
                body.get("release_date"),
                body.get("intro_mode"),
                toDouble(body.get("intro_start_seconds")),
                toDouble(body.get("intro_end_seconds"))
        );
        Integer episodeId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Integer.class);

        Object thumb = body.get("thumbnail_url");
        Object video = body.get("video_url");
        if (thumb == null && video != null) {
            String v = String.valueOf(video);
            if (!v.startsWith("http")) {
                try {
                    String relVideo = v.startsWith("/") ? v.substring(1) : v;
                    Path videoPath = Paths.get(relVideo).toAbsolutePath().normalize();

                    String fileName = "ep-" + episodeId + "-" + System.currentTimeMillis() + "-" + ThreadLocalRandom.current().nextInt(1_000_000) + ".jpg";
                    String imageUrl = "/uploads/images/" + fileName;
                    String relOut = imageUrl.substring(1);
                    Path outputPath = Paths.get(relOut).toAbsolutePath().normalize();

                    int randomSeconds = 5 + ThreadLocalRandom.current().nextInt(20);
                    ProcessBuilder pb = new ProcessBuilder(
                            "ffmpeg",
                            "-ss", String.valueOf(randomSeconds),
                            "-i", videoPath.toString(),
                            "-frames:v", "1",
                            "-q:v", "2",
                            outputPath.toString()
                    );
                    pb.redirectErrorStream(true);
                    int code = pb.start().waitFor();
                    if (code == 0) {
                        jdbcTemplate.update("UPDATE episodes SET thumbnail_url = ? WHERE id = ?", imageUrl, episodeId);
                    }
                } catch (Exception ignored) {}
            }
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM episodes WHERE id = ?", episodeId);
        return rows.isEmpty() ? Map.of("id", episodeId) : rows.get(0);
    }

    public Map<String, Object> updateEpisode(int episodeId, Map<String, Object> body) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM episodes WHERE id = ?", episodeId);
        if (rows.isEmpty()) return null;
        jdbcTemplate.update(
                "UPDATE episodes SET " +
                        "season_id = COALESCE(?, season_id), " +
                        "episode_number = COALESCE(?, episode_number), " +
                        "title = COALESCE(?, title), " +
                        "description = COALESCE(?, description), " +
                        "duration_minutes = COALESCE(?, duration_minutes), " +
                        "thumbnail_url = COALESCE(?, thumbnail_url), " +
                        "video_url = COALESCE(?, video_url), " +
                        "release_date = COALESCE(?, release_date), " +
                        "intro_mode = COALESCE(?, intro_mode), " +
                        "intro_start_seconds = COALESCE(?, intro_start_seconds), " +
                        "intro_end_seconds = COALESCE(?, intro_end_seconds), " +
                        "updated_at = NOW(3) " +
                        "WHERE id = ?",
                toIntOrNull(body, "season_id"),
                toIntOrNull(body, "episode_number"),
                body.get("title"),
                body.get("description"),
                toIntOrNull(body, "duration_minutes"),
                body.get("thumbnail_url"),
                body.get("video_url"),
                body.get("release_date"),
                asIntroModeOrNull(body.get("intro_mode")),
                toDoubleOrNull(body, "intro_start_seconds"),
                toDoubleOrNull(body, "intro_end_seconds"),
                episodeId
        );
        List<Map<String, Object>> out = jdbcTemplate.queryForList("SELECT * FROM episodes WHERE id = ?", episodeId);
        return out.isEmpty() ? Map.of("id", episodeId) : out.get(0);
    }

    private static String asIntroModeOrNull(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim().toLowerCase(Locale.ROOT);
        if (s.isEmpty()) return null;
        if (!s.equals("series") && !s.equals("custom") && !s.equals("none")) return null;
        return s;
    }

    private static Double toDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(String.valueOf(o)); } catch (Exception ignored) { return null; }
    }

    private static Double toDoubleOrNull(Map<String, Object> body, String key) {
        if (body == null || !body.containsKey(key)) return null;
        return toDouble(body.get(key));
    }

    public boolean deleteEpisode(int episodeId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM episodes WHERE id = ?", episodeId);
        if (rows.isEmpty()) return false;
        jdbcTemplate.update("DELETE FROM cast WHERE episode_id = ?", episodeId);
        jdbcTemplate.update("DELETE FROM watch_history WHERE episode_id = ?", episodeId);
        jdbcTemplate.update("DELETE FROM reviews WHERE episode_id = ?", episodeId);
        jdbcTemplate.update("DELETE FROM episodes WHERE id = ?", episodeId);
        return true;
    }

    // ADMIN - seasons CRUD - JDBC thuần, đúng 5 cột: id, series_id, season_number, title, description (không có created_at)
    public Map<String, Object> createSeason(int seriesId, Map<String, Object> body) {
        Integer seasonNumber = toInt(body.get("season_number"));
        if (seasonNumber == null || seasonNumber < 1) return null;

        List<Map<String, Object>> seriesCheck = jdbcTemplate.queryForList("SELECT id FROM series WHERE id = ?", seriesId);
        if (seriesCheck.isEmpty()) {
            throw new IllegalArgumentException("Series không tồn tại (id=" + seriesId + ")");
        }

        String title = body.get("title") != null ? String.valueOf(body.get("title")).trim() : null;
        String description = body.get("description") != null ? String.valueOf(body.get("description")).trim() : null;
        if (title != null && title.isEmpty()) title = null;
        if (description != null && description.isEmpty()) description = null;

        jdbcTemplate.update(
                "INSERT INTO seasons (series_id, season_number, title, description) VALUES (?, ?, ?, ?)",
                seriesId, seasonNumber, title, description
        );
        Integer id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Integer.class);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id, series_id, season_number, title, description FROM seasons WHERE id = ?", id);
        return rows.isEmpty() ? Map.of("id", id, "series_id", seriesId, "season_number", seasonNumber, "title", title, "description", description) : rows.get(0);
    }

    public Map<String, Object> updateSeason(int seasonId, Map<String, Object> body) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM seasons WHERE id = ?", seasonId);
        if (rows.isEmpty()) return null;
        jdbcTemplate.update(
                "UPDATE seasons SET " +
                        "season_number = COALESCE(?, season_number), " +
                        "title = COALESCE(?, title), " +
                        "description = COALESCE(?, description) " +
                        "WHERE id = ?",
                toIntOrNull(body, "season_number"),
                body.get("title"),
                body.get("description"),
                seasonId
        );
        List<Map<String, Object>> out = jdbcTemplate.queryForList("SELECT * FROM seasons WHERE id = ?", seasonId);
        return out.isEmpty() ? Map.of("id", seasonId) : out.get(0);
    }

    public boolean deleteSeason(int seriesId, int seasonId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM seasons WHERE id = ? AND series_id = ?", seasonId, seriesId);
        if (rows.isEmpty()) return false;
        jdbcTemplate.update("DELETE FROM episodes WHERE season_id = ?", seasonId);
        jdbcTemplate.update("DELETE FROM seasons WHERE id = ? AND series_id = ?", seasonId, seriesId);
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

    private static boolean toBool(Object o) {
        if (o == null) return false;
        if (o instanceof Boolean b) return b;
        String s = String.valueOf(o).trim().toLowerCase(Locale.ROOT);
        return "true".equals(s) || "1".equals(s);
    }

    private static Integer toIntOrNull(Map<String, Object> body, String key) {
        if (body == null || !body.containsKey(key)) return null;
        return toInt(body.get(key));
    }

    private static Integer toBoolOrNull(Map<String, Object> body, String key) {
        if (body == null || !body.containsKey(key)) return null;
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

