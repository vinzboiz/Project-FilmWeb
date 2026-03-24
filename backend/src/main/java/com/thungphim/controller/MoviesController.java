package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.MoviesService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movies")
public class MoviesController {

    private final MoviesService moviesService;

    public MoviesController(MoviesService moviesService) {
        this.moviesService = moviesService;
    }

    private static void requireAdmin() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token");
        if (!u.isAdmin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin mới được phép thao tác");
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listMovies(
            @RequestParam(name = "genre_id", required = false) Integer genreId,
            @RequestParam(name = "profile_id", required = false) Integer profileId,
            @RequestParam(name = "year_from", required = false) Integer yearFrom,
            @RequestParam(name = "year_to", required = false) Integer yearTo,
            @RequestParam(name = "country_code", required = false) String countryCode,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(moviesService.listMovies(genreId, profileId, yearFrom, yearTo, countryCode, limit));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable String id) {
        int movieId;
        try { movieId = Integer.parseInt(id); } catch (Exception ex) { movieId = -1; }
        if (movieId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movie id không hợp lệ");
        Map<String, Object> movie = moviesService.getMovieById(movieId);
        if (movie == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found");
        return ResponseEntity.ok(movie);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(@RequestParam(name = "q", required = false) String q) {
        return ResponseEntity.ok(moviesService.searchMovies(q));
    }

    @GetMapping("/{id}/suggestions")
    public ResponseEntity<List<Map<String, Object>>> suggestions(
            @PathVariable int id,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(moviesService.getSuggestions(id, limit));
    }

    @GetMapping("/{id}/like-status")
    public ResponseEntity<Map<String, Object>> likeStatus(
            @PathVariable int id,
            @RequestParam(name = "profile_id", required = false) Integer profileId
    ) {
        if (id <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movie id không hợp lệ");
        return ResponseEntity.ok(moviesService.likeStatus(id, profileId));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> like(@PathVariable int id, @RequestBody Map<String, Object> body) {
        if (id <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movieId không hợp lệ");
        Integer profileId = null;
        Object p = body == null ? null : body.get("profile_id");
        if (p instanceof Number n) profileId = n.intValue();
        else if (p != null) {
            try { profileId = Integer.parseInt(String.valueOf(p)); } catch (Exception ignored) {}
        }
        if (profileId == null || profileId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id là bắt buộc");
        return ResponseEntity.ok(moviesService.likeMovie(id, profileId));
    }

    @DeleteMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> unlike(
            @PathVariable int id,
            @RequestParam(name = "profile_id", required = false) Integer profileId
    ) {
        if (id <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movieId không hợp lệ");
        if (profileId == null || profileId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id là bắt buộc");
        return ResponseEntity.ok(moviesService.unlikeMovie(id, profileId));
    }

    @GetMapping("/{id}/genres")
    public ResponseEntity<List<Map<String, Object>>> getGenres(@PathVariable int id) {
        if (id <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movie id không hợp lệ");
        return ResponseEntity.ok(moviesService.getMovieGenres(id));
    }

    @PostMapping("/{id}/genres")
    public ResponseEntity<Map<String, String>> setGenres(@PathVariable int id, @RequestBody Map<String, Object> body) {
        requireAdmin();
        if (id <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Movie ID không hợp lệ");
        Object genreIdsRaw = body == null ? null : body.get("genre_ids");
        List<Integer> ids = new java.util.ArrayList<>();
        if (genreIdsRaw instanceof List<?> list) {
            for (Object o : list) {
                try {
                    int v = Integer.parseInt(String.valueOf(o));
                    if (v > 0) ids.add(v);
                } catch (Exception ignored) {}
            }
        } else if (genreIdsRaw instanceof String s) {
            for (String part : s.split(",")) {
                try {
                    int v = Integer.parseInt(part.trim());
                    if (v > 0) ids.add(v);
                } catch (Exception ignored) {}
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "genre_ids phải là một mảng id (ví dụ: [1, 2, 3])");
        }
        ids = ids.stream().distinct().toList();

        Map<String, Object> existing = moviesService.getMovieById(id);
        if (existing == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found");
        moviesService.setMovieGenres(id, ids);
        return ResponseEntity.ok(Map.of("message", "Đã cập nhật thể loại cho phim"));
    }

    @GetMapping("/{id}/cast")
    public ResponseEntity<List<Map<String, Object>>> getCast(@PathVariable int id) {
        return ResponseEntity.ok(moviesService.getMovieCast(id));
    }

    @PostMapping("/{id}/cast")
    public ResponseEntity<Map<String, String>> addCast(@PathVariable int id, @RequestBody Map<String, Object> body) {
        requireAdmin();
        Object person = body == null ? null : body.get("person_id");
        if (person == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "person_id là bắt buộc");
        int personId;
        try { personId = Integer.parseInt(String.valueOf(person)); } catch (Exception ex) { personId = 0; }
        if (personId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "person_id là bắt buộc");
        String role = body == null ? null : (body.get("role") == null ? null : String.valueOf(body.get("role")));
        moviesService.addMovieCast(id, personId, role);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Đã gán cast cho phim"));
    }

    @DeleteMapping("/{movieId}/cast/{personId}")
    public ResponseEntity<Map<String, String>> removeCast(@PathVariable int movieId, @PathVariable int personId) {
        requireAdmin();
        moviesService.removeMovieCast(movieId, personId);
        return ResponseEntity.ok(Map.of("message", "Đã xoá cast khỏi phim"));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        requireAdmin();
        Object title = body == null ? null : body.get("title");
        if (title == null || String.valueOf(title).trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title là bắt buộc");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(moviesService.createMovie(body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable int id, @RequestBody Map<String, Object> body) {
        requireAdmin();
        Map<String, Object> updated = moviesService.updateMovie(id, body == null ? Map.of() : body);
        if (updated == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found");
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable int id) {
        requireAdmin();
        boolean ok = moviesService.deleteMovie(id);
        if (!ok) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found");
        return ResponseEntity.ok(Map.of("message", "Đã xoá phim và dữ liệu liên quan"));
    }

    @GetMapping("/top-rating")
    public ResponseEntity<List<Map<String, Object>>> topRating(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String featured
    ) {
        boolean isFeatured = "1".equals(featured) || "true".equalsIgnoreCase(featured);
        return ResponseEntity.ok(moviesService.topRating(limit, type, isFeatured));
    }

    @GetMapping("/trending")
    public ResponseEntity<List<Map<String, Object>>> trending(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String featured
    ) {
        boolean isFeatured = "1".equals(featured) || "true".equalsIgnoreCase(featured);
        return ResponseEntity.ok(moviesService.trending(limit, type, isFeatured));
    }

    @GetMapping("/random-with-trailer")
    public ResponseEntity<?> randomWithTrailer() {
        Map<String, Object> pick = moviesService.randomWithTrailer();
        if (pick == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có phim nào có trailer");
        }
        return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.noStore())
                .body(pick);
    }
}

