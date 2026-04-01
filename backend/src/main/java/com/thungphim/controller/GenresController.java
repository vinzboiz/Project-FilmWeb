package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.GenresService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/genres")
public class GenresController {

    private final GenresService genresService;

    public GenresController(GenresService genresService) {
        this.genresService = genresService;
    }

    private static void requireAdmin() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token");
        if (!u.isAdmin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin mới được phép thao tác");
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(genresService.listGenres());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        requireAdmin();
        String name = body.get("name") == null ? null : String.valueOf(body.get("name")).trim();
        String description = body.get("description") == null ? null : String.valueOf(body.get("description"));
        String thumbnailUrl = body.get("thumbnail_url") == null ? null : String.valueOf(body.get("thumbnail_url"));
        try {
            Map<String, Object> created = genresService.createGenre(name, description, thumbnailUrl);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable int id, @RequestBody Map<String, Object> body) {
        requireAdmin();
        String name = body.get("name") == null ? null : String.valueOf(body.get("name")).trim();
        String description = body.get("description") == null ? null : String.valueOf(body.get("description"));
        String thumbnailUrl = body.get("thumbnail_url") == null ? null : String.valueOf(body.get("thumbnail_url"));
        try {
            Map<String, Object> updated = genresService.updateGenre(id, name, description, thumbnailUrl);
            if (updated == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Genre not found");
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable int id) {
        requireAdmin();
        boolean ok = genresService.deleteGenre(id);
        if (!ok) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Genre not found");
        return ResponseEntity.ok(Map.of("message", "Đã xoá genre"));
    }

    @GetMapping("/top-with-movies")
    public ResponseEntity<List<Map<String, Object>>> topWithMovies(
            @RequestParam(required = false) Integer limit,
            @RequestParam(name = "movies_per_genre", required = false) Integer moviesPerGenre,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String featured
    ) {
        boolean isFeatured = "1".equals(featured) || "true".equalsIgnoreCase(featured);
        return ResponseEntity.ok(genresService.topWithMovies(limit, moviesPerGenre, type, isFeatured));
    }
}

