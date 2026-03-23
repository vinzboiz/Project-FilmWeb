package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final JdbcTemplate jdbcTemplate;

    public AdminController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static JwtAuthFilter.JwtUser requireAdmin() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token");
        if (!u.isAdmin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin mới được phép thao tác");
        return u;
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> listUsers() {
        requireAdmin();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, email, full_name, is_admin, created_at FROM users ORDER BY id DESC"
        );
        return ResponseEntity.ok(rows);
    }

    @PatchMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable int id, @RequestBody Map<String, Object> body) {
        requireAdmin();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM users WHERE id = ?", id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");

        Integer isAdmin = body.containsKey("is_admin") ? toBoolOrNull(body.get("is_admin")) : null;
        Integer locked = body.containsKey("locked") ? toBoolOrNull(body.get("locked")) : null;

        jdbcTemplate.update(
                "UPDATE users SET is_admin = COALESCE(?, is_admin), locked = COALESCE(?, locked) WHERE id = ?",
                isAdmin, locked, id
        );
        List<Map<String, Object>> updated = jdbcTemplate.queryForList(
                "SELECT id, email, full_name, is_admin, locked, created_at FROM users WHERE id = ?",
                id
        );
        return ResponseEntity.ok(updated.isEmpty() ? Map.of() : updated.get(0));
    }

    private static Integer toBoolOrNull(Object o) {
        if (o == null) return null;
        if (o instanceof Boolean b) return b ? 1 : 0;
        String s = String.valueOf(o).trim().toLowerCase();
        if ("true".equals(s) || "1".equals(s)) return 1;
        if ("false".equals(s) || "0".equals(s)) return 0;
        return null;
    }
}

