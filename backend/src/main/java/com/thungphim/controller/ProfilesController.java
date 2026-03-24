package com.thungphim.controller;

import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.ProfilesService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/profiles")
public class ProfilesController {

    private final ProfilesService profilesService;

    public ProfilesController(ProfilesService profilesService) {
        this.profilesService = profilesService;
    }

    private static JwtAuthFilter.JwtUser requireUser() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        return u;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        JwtAuthFilter.JwtUser u = requireUser();
        return ResponseEntity.ok(profilesService.listByUser(u.userId));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        JwtAuthFilter.JwtUser u = requireUser();
        String name = asString(body.get("name"));
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name là bắt buộc");
        }
        String avatar = asString(body.get("avatar"));
        Boolean isKids = asBoolean(body.get("is_kids"));
        String maxMaturity = asString(body.get("max_maturity_rating"));
        String pinCode = asString(body.get("pin_code"));
        Map<String, Object> created = profilesService.create(u.userId, name, avatar, isKids, maxMaturity, pinCode);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable int id, @RequestBody Map<String, Object> body) {
        JwtAuthFilter.JwtUser u = requireUser();
        String name = asString(body.get("name"));
        String avatar = asString(body.get("avatar"));
        Boolean isKids = asBoolean(body.get("is_kids"));
        String maxMaturity = asString(body.get("max_maturity_rating"));
        String pinCode = asString(body.get("pin_code"));

        Map<String, Object> updated = profilesService.update(u.userId, id, name, avatar, isKids, maxMaturity, pinCode);
        if (updated == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile không tồn tại");
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable int id) {
        JwtAuthFilter.JwtUser u = requireUser();
        boolean ok = profilesService.delete(u.userId, id);
        if (!ok) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile không tồn tại");
        return ResponseEntity.ok(Map.of("message", "Đã xoá profile"));
    }

    @PostMapping("/{id}/verify-pin")
    public ResponseEntity<Map<String, String>> verifyPin(@PathVariable int id, @RequestBody Map<String, Object> body) {
        JwtAuthFilter.JwtUser u = requireUser();
        String pinCode = asString(body.get("pin_code"));
        if (pinCode == null || pinCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pin_code là bắt buộc");
        }
        ProfilesService.VerifyPinResult r = profilesService.verifyPin(u.userId, id, pinCode);
        return switch (r) {
            case NOT_FOUND -> throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile không tồn tại");
            case NO_PIN -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile này chưa thiết lập PIN");
            case WRONG -> throw new ResponseStatusException(HttpStatus.FORBIDDEN, "PIN không đúng");
            case OK -> ResponseEntity.ok(Map.of("message", "PIN hợp lệ"));
        };
    }

    private static String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static Boolean asBoolean(Object o) {
        if (o == null) return null;
        if (o instanceof Boolean b) return b;
        String s = String.valueOf(o).trim().toLowerCase();
        if ("true".equals(s) || "1".equals(s)) return true;
        if ("false".equals(s) || "0".equals(s)) return false;
        return null;
    }
}

