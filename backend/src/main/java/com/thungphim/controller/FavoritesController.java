package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.FavoritesService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoritesController {

    private final FavoritesService favoritesService;

    public FavoritesController(FavoritesService favoritesService) {
        this.favoritesService = favoritesService;
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
        return ResponseEntity.ok(favoritesService.list(profileId));
    }

    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> check(
            @RequestParam(name = "profile_id", required = false) Integer profileId,
            @RequestParam(name = "movie_id", required = false) Integer movieId
    ) {
        requireUser();
        if (profileId == null || movieId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id và movie_id là bắt buộc");
        }
        return ResponseEntity.ok(Map.of("is_favorite", favoritesService.check(profileId, movieId)));
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> add(@RequestBody Map<String, Object> body) {
        JwtAuthFilter.JwtUser u = requireUser();
        Integer profileId = asInt(body.get("profile_id"));
        Integer movieId = asInt(body.get("movie_id"));
        if (profileId == null || movieId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id và movie_id là bắt buộc");
        }
        favoritesService.add(u.userId, profileId, movieId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Đã thêm vào yêu thích"));
    }

    @DeleteMapping("/{movieId}")
    public ResponseEntity<Map<String, String>> remove(
            @PathVariable int movieId,
            @RequestParam(name = "profile_id", required = false) Integer profileId
    ) {
        requireUser();
        if (profileId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profile_id là bắt buộc");
        favoritesService.remove(profileId, movieId);
        return ResponseEntity.ok(Map.of("message", "Đã bỏ khỏi yêu thích"));
    }

    private static Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(o)); } catch (Exception ignored) { return null; }
    }
}

