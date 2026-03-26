package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.WatchlistService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    private final WatchlistService watchlistService;

    public WatchlistController(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    private static JwtAuthFilter.JwtUser requireUser() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        return u;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestParam(name = "profile_id", required = false) Integer profileId) {
        requireUser();
        if (profileId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id là bắt buộc");
        return ResponseEntity.ok(watchlistService.list(profileId));
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> add(@RequestBody Map<String, Object> body) {
        JwtAuthFilter.JwtUser u = requireUser();
        Integer profileId = asInt(body.get("profile_id"));
        Integer movieId = asInt(body.get("movie_id"));
        Integer seriesId = asInt(body.get("series_id"));
        Integer episodeId = asInt(body.get("episode_id"));
        if (profileId == null || (movieId == null && seriesId == null && episodeId == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id và một trong movie_id/series_id/episode_id là bắt buộc");
        }
        watchlistService.add(u.userId, profileId, movieId, seriesId, episodeId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Đã thêm vào watchlist"));
    }

    @DeleteMapping("/{movieId}")
    public ResponseEntity<Map<String, String>> remove(
            @PathVariable int movieId,
            @RequestParam(name = "profile_id", required = false) Integer profileId,
            @RequestParam(required = false) String type
    ) {
        requireUser();
        if (profileId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id là bắt buộc");
        watchlistService.remove(profileId, movieId, type);
        return ResponseEntity.ok(Map.of("message", "Đã xoá khỏi watchlist"));
    }

    private static Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(o)); } catch (Exception ignored) { return null; }
    }
}

