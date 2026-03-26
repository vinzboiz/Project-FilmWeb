package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.EpisodesService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/episodes")
public class EpisodesController {

    private final EpisodesService episodesService;

    public EpisodesController(EpisodesService episodesService) {
        this.episodesService = episodesService;
    }

    private static void requireAdmin() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token");
        if (!u.isAdmin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin mới được phép thao tác");
    }

    @GetMapping("/{id}/cast")
    public ResponseEntity<List<Map<String, Object>>> getCast(@PathVariable int id) {
        return ResponseEntity.ok(episodesService.getEpisodeCast(id));
    }

    @PostMapping("/{id}/cast")
    public ResponseEntity<Map<String, String>> addCast(@PathVariable int id, @RequestBody Map<String, Object> body) {
        requireAdmin();
        Object person = body == null ? null : body.get("person_id");
        if (person == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "person_id là bắt buộc");
        int personId;
        try {
            personId = Integer.parseInt(String.valueOf(person));
        } catch (Exception ex) {
            personId = 0;
        }
        if (personId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "person_id là bắt buộc");
        String role = body == null ? null : (body.get("role") == null ? null : String.valueOf(body.get("role")));
        episodesService.addEpisodeCast(id, personId, role);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Đã gán cast cho episode"));
    }

    @DeleteMapping("/{episodeId}/cast/{personId}")
    public ResponseEntity<Map<String, String>> removeCast(@PathVariable int episodeId, @PathVariable int personId) {
        requireAdmin();
        episodesService.removeEpisodeCast(episodeId, personId);
        return ResponseEntity.ok(Map.of("message", "Đã xoá cast khỏi episode"));
    }
}
