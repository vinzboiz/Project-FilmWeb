package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.WatchService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/watch")
public class WatchController {

    private final WatchService watchService;

    public WatchController(WatchService watchService) {
        this.watchService = watchService;
    }

    private static JwtAuthFilter.JwtUser requireUser() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        return u;
    }

    @GetMapping("/progress")
    public ResponseEntity<Map<String, Object>> getProgress(
            @RequestParam(name = "profile_id", required = false) Integer profileId,
            @RequestParam(name = "movie_id", required = false) Integer movieId,
            @RequestParam(name = "episode_id", required = false) Integer episodeId
    ) {
        requireUser();
        if (profileId == null || (movieId == null && episodeId == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id và movie_id hoặc episode_id là bắt buộc");
        }
        int progress = watchService.getProgress(profileId, movieId, episodeId);
        return ResponseEntity.ok(Map.of("progress_seconds", progress));
    }

    @PostMapping("/progress")
    public ResponseEntity<Map<String, String>> saveProgress(@RequestBody Map<String, Object> body) {
        JwtAuthFilter.JwtUser u = requireUser();
        Integer profileId = asInt(body.get("profile_id"));
        Integer movieId = asInt(body.get("movie_id"));
        Integer episodeId = asInt(body.get("episode_id"));
        Integer progressSeconds = asInt(body.get("progress_seconds"));

        if (profileId == null || (movieId == null && episodeId == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id và movie_id hoặc episode_id là bắt buộc");
        }

        watchService.saveProgress(u.userId, profileId, movieId, episodeId, progressSeconds != null ? progressSeconds : 0);
        return ResponseEntity.ok(Map.of("message", "Đã lưu tiến độ xem"));
    }

    @GetMapping("/continue")
    public ResponseEntity<Map<String, Object>> cont(@RequestParam(name = "profile_id", required = false) Integer profileId) {
        requireUser();
        if (profileId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id là bắt buộc");
        return ResponseEntity.ok(watchService.continueWatching(profileId));
    }

    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> history(@RequestParam(name = "profile_id", required = false) Integer profileId) {
        requireUser();
        if (profileId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id là bắt buộc");
        return ResponseEntity.ok(watchService.history(profileId));
    }

    private static Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(o)); } catch (Exception ignored) { return null; }
    }
}

