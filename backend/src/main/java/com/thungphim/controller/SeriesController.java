package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.SeriesService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/series")
public class SeriesController {

    private final SeriesService seriesService;

    public SeriesController(SeriesService seriesService) {
        this.seriesService = seriesService;
    }

    private static void requireAdmin() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token");
        if (!u.isAdmin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin mới được phép thao tác");
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam(name = "profile_id", required = false) Integer profileId,
            @RequestParam(name = "genre_id", required = false) Integer genreId,
            @RequestParam(name = "year_from", required = false) Integer yearFrom,
            @RequestParam(name = "year_to", required = false) Integer yearTo,
            @RequestParam(name = "country_code", required = false) String countryCode,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(seriesService.listSeries(profileId, genreId, yearFrom, yearTo, countryCode, limit));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(@RequestParam(name = "q", required = false) String q) {
        return ResponseEntity.ok(seriesService.searchSeries(q));
    }

    @GetMapping("/episode/{episodeId}")
    public ResponseEntity<?> episode(@PathVariable int episodeId) {
        Map<String, Object> ep = seriesService.getEpisodeById(episodeId);
        if (ep == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Episode not found");
        return ResponseEntity.ok(ep);
    }

    @GetMapping("/{id}/suggestions")
    public ResponseEntity<List<Map<String, Object>>> suggestions(@PathVariable int id, @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(seriesService.getSuggestions(id, limit));
    }

    @GetMapping("/{id}/like-status")
    public ResponseEntity<Map<String, Object>> likeStatus(
            @PathVariable int id,
            @RequestParam(name = "profile_id", required = false) Integer profileId
    ) {
        return ResponseEntity.ok(seriesService.likeStatus(id, profileId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable int id) {
        Map<String, Object> s = seriesService.getSeriesById(id);
        if (s == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Series not found");
        return ResponseEntity.ok(s);
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> like(@PathVariable int id, @RequestBody Map<String, Object> body) {
        Object p = body == null ? null : body.get("profile_id");
        Integer profileId = null;
        if (p instanceof Number n) profileId = n.intValue();
        else if (p != null) {
            try { profileId = Integer.parseInt(String.valueOf(p)); } catch (Exception ignored) {}
        }
        if (profileId == null || profileId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id là bắt buộc");
        return ResponseEntity.ok(seriesService.likeSeries(id, profileId));
    }

    @DeleteMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> unlike(@PathVariable int id, @RequestParam(name = "profile_id", required = false) Integer profileId) {
        if (profileId == null || profileId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id là bắt buộc");
        return ResponseEntity.ok(seriesService.unlikeSeries(id, profileId));
    }

    @GetMapping("/{id}/episodes")
    public ResponseEntity<List<Map<String, Object>>> listEpisodes(
            @PathVariable int id,
            @RequestParam(name = "season_id", required = false) Integer seasonId
    ) {
        return ResponseEntity.ok(seriesService.listEpisodesOfSeries(id, seasonId));
    }

    @GetMapping("/{id}/cast")
    public ResponseEntity<List<Map<String, Object>>> cast(@PathVariable int id) {
        return ResponseEntity.ok(seriesService.getSeriesCast(id));
    }

    @PostMapping("/{id}/cast")
    public ResponseEntity<Map<String, String>> addCast(@PathVariable int id, @RequestBody Map<String, Object> body) {
        Object person = body == null ? null : body.get("person_id");
        if (person == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "person_id là bắt buộc");
        int personId;
        try { personId = Integer.parseInt(String.valueOf(person)); } catch (Exception ex) { personId = 0; }
        if (personId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "person_id là bắt buộc");
        String role = body.get("role") == null ? null : String.valueOf(body.get("role"));
        seriesService.addSeriesCast(id, personId, role);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Đã gán cast cho series"));
    }

    @DeleteMapping("/{id}/cast/{personId}")
    public ResponseEntity<Map<String, String>> removeCast(@PathVariable int id, @PathVariable int personId) {
        seriesService.removeSeriesCast(id, personId);
        return ResponseEntity.ok(Map.of("message", "Đã xoá cast khỏi series"));
    }

    @PostMapping("/{id}/genres")
    public ResponseEntity<Map<String, String>> setGenres(@PathVariable int id, @RequestBody Map<String, Object> body) {
        requireAdmin();
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
        seriesService.setSeriesGenres(id, ids);
        return ResponseEntity.ok(Map.of("message", "Đã cập nhật thể loại cho series"));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        requireAdmin();
        Object title = body == null ? null : body.get("title");
        if (title == null || String.valueOf(title).trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title là bắt buộc");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(seriesService.createSeries(body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable int id, @RequestBody Map<String, Object> body) {
        requireAdmin();
        Map<String, Object> updated = seriesService.updateSeries(id, body == null ? Map.of() : body);
        if (updated == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Series not found");
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable int id) {
        requireAdmin();
        boolean ok = seriesService.deleteSeries(id);
        if (!ok) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Series not found");
        return ResponseEntity.ok(Map.of("message", "Đã xoá series và các tập liên quan"));
    }

    @PostMapping("/episodes")
    public ResponseEntity<?> createEpisode(@RequestBody Map<String, Object> body) {
        requireAdmin();
        Map<String, Object> ep = seriesService.createEpisode(body == null ? Map.of() : body);
        if (ep == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "series_id và title là bắt buộc");
        return ResponseEntity.status(HttpStatus.CREATED).body(ep);
    }

    @PutMapping("/episodes/{episodeId}")
    public ResponseEntity<?> updateEpisode(@PathVariable int episodeId, @RequestBody Map<String, Object> body) {
        requireAdmin();
        Map<String, Object> ep = seriesService.updateEpisode(episodeId, body == null ? Map.of() : body);
        if (ep == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Episode not found");
        return ResponseEntity.ok(ep);
    }

    @DeleteMapping("/episodes/{episodeId}")
    public ResponseEntity<Map<String, String>> deleteEpisode(@PathVariable int episodeId) {
        requireAdmin();
        boolean ok = seriesService.deleteEpisode(episodeId);
        if (!ok) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Episode not found");
        return ResponseEntity.ok(Map.of("message", "Đã xoá tập"));
    }

    @PostMapping("/{id}/seasons")
    public ResponseEntity<?> createSeason(@PathVariable int id, @RequestBody Map<String, Object> body) {
        requireAdmin();
        try {
            Map<String, Object> s = seriesService.createSeason(id, body == null ? Map.of() : body);
            if (s == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "season_number là bắt buộc (phải là số >= 1)");
            return ResponseEntity.status(HttpStatus.CREATED).body(s);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Season số này đã tồn tại cho series");
        } catch (Exception e) {
            String msg = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            if (msg == null) msg = e.getClass().getSimpleName();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi tạo season: " + msg);
        }
    }

    @PutMapping("/{id}/seasons/{seasonId}")
    public ResponseEntity<?> updateSeason(@PathVariable int id, @PathVariable int seasonId, @RequestBody Map<String, Object> body) {
        requireAdmin();
        Map<String, Object> s = seriesService.updateSeason(seasonId, body == null ? Map.of() : body);
        if (s == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Season not found");
        return ResponseEntity.ok(s);
    }

    @DeleteMapping("/{id}/seasons/{seasonId}")
    public ResponseEntity<Map<String, String>> deleteSeason(@PathVariable int id, @PathVariable int seasonId) {
        requireAdmin();
        boolean ok = seriesService.deleteSeason(id, seasonId);
        if (!ok) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Season not found");
        return ResponseEntity.ok(Map.of("message", "Đã xoá season"));
    }
}

