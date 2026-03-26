package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.PersonsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/persons")
public class PersonsController {

    private final PersonsService personsService;

    public PersonsController(PersonsService personsService) {
        this.personsService = personsService;
    }

    private static void requireAdmin() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token");
        if (!u.isAdmin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin mới được phép thao tác");
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestParam(required = false) String q,
                                                         @RequestParam(required = false) String type) {
        return ResponseEntity.ok(personsService.list(q, type));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        requireAdmin();
        String name = body.get("name") == null ? null : String.valueOf(body.get("name"));
        if (name == null || name.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên là bắt buộc");
        }
        String avatarUrl = body.get("avatar_url") == null ? null : String.valueOf(body.get("avatar_url"));
        String biography = body.get("biography") == null ? null : String.valueOf(body.get("biography"));
        String personType = body.get("person_type") == null ? null : String.valueOf(body.get("person_type"));
        return ResponseEntity.status(HttpStatus.CREATED).body(personsService.create(name, avatarUrl, biography, personType));
    }

    @GetMapping("/{id}/movies")
    public ResponseEntity<Map<String, Object>> movies(@PathVariable int id) {
        return ResponseEntity.ok(personsService.getMovies(id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable int id) {
        Map<String, Object> p = personsService.getById(id);
        if (p == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Person not found");
        return ResponseEntity.ok(p);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable int id, @RequestBody Map<String, Object> body) {
        requireAdmin();
        String name = body.get("name") == null ? null : String.valueOf(body.get("name"));
        if (name == null || name.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên là bắt buộc");
        }
        String avatarUrl = body.get("avatar_url") == null ? null : String.valueOf(body.get("avatar_url"));
        String biography = body.get("biography") == null ? null : String.valueOf(body.get("biography"));
        String personType = body.get("person_type") == null ? null : String.valueOf(body.get("person_type"));
        Map<String, Object> updated = personsService.update(id, name, avatarUrl, biography, personType);
        if (updated == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Person not found");
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable int id) {
        requireAdmin();
        boolean ok = personsService.delete(id);
        if (!ok) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Person not found");
        return ResponseEntity.ok(Map.of("message", "Đã xoá diễn viên"));
    }
}

