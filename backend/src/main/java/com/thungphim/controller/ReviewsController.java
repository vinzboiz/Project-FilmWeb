package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.ReviewsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
public class ReviewsController {

    private final ReviewsService reviewsService;

    public ReviewsController(ReviewsService reviewsService) {
        this.reviewsService = reviewsService;
    }

    private static JwtAuthFilter.JwtUser requireUser() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        return u;
    }

    @GetMapping("/movies/{id}")
    public ResponseEntity<Map<String, Object>> movie(@PathVariable int id,
                                                     @RequestParam(required = false) Integer limit,
                                                     @RequestParam(required = false) Integer offset) {
        return ResponseEntity.ok(reviewsService.listMovieReviews(id, limit != null ? limit : 50, offset != null ? offset : 0));
    }

    @GetMapping("/episodes/{id}")
    public ResponseEntity<Map<String, Object>> episode(@PathVariable int id,
                                                       @RequestParam(required = false) Integer limit,
                                                       @RequestParam(required = false) Integer offset) {
        return ResponseEntity.ok(reviewsService.listEpisodeReviews(id, limit != null ? limit : 50, offset != null ? offset : 0));
    }

    @GetMapping("/series/{id}")
    public ResponseEntity<Map<String, Object>> series(@PathVariable int id,
                                                      @RequestParam(required = false) Integer limit,
                                                      @RequestParam(required = false) Integer offset) {
        return ResponseEntity.ok(reviewsService.listSeriesReviews(id, limit != null ? limit : 50, offset != null ? offset : 0));
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> upsert(@RequestBody Map<String, Object> body) {
        JwtAuthFilter.JwtUser u = requireUser();

        Integer movieId = asInt(body.get("movie_id"));
        Integer episodeId = asInt(body.get("episode_id"));
        Integer seriesId = asInt(body.get("series_id"));

        int targets = (movieId != null ? 1 : 0) + (episodeId != null ? 1 : 0) + (seriesId != null ? 1 : 0);
        if (targets != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ được gửi một trong: movie_id, episode_id, series_id");
        }

        Integer rating = asInt(body.get("rating"));
        if (rating == null || rating < 1 || rating > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rating phải từ 1 đến 5");
        }
        String comment = body.get("comment") == null ? null : String.valueOf(body.get("comment"));

        try {
            reviewsService.upsert(u.userId, movieId, episodeId, seriesId, rating, comment);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
        return ResponseEntity.ok(Map.of("message", "Đã lưu đánh giá"));
    }

    private static Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(o)); } catch (Exception ignored) { return null; }
    }
}

