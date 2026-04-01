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
@RequestMapping("/api/notifications")
public class NotificationsController {

    private final JdbcTemplate jdbcTemplate;

    public NotificationsController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static JwtAuthFilter.JwtUser requireUser() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        return u;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestParam(name = "only_unread", required = false) String onlyUnread) {
        JwtAuthFilter.JwtUser u = requireUser();
        boolean unread = "1".equals(onlyUnread) || "true".equalsIgnoreCase(onlyUnread);
        String where = unread ? "AND is_read = 0" : "";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = ? " + where + " ORDER BY created_at DESC LIMIT 50",
                u.userId
        );
        return ResponseEntity.ok(rows);
    }

    @PatchMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllRead() {
        JwtAuthFilter.JwtUser u = requireUser();
        jdbcTemplate.update("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", u.userId);
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu tất cả thông báo là đã đọc"));
    }
}

