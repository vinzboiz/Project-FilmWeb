package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ProfilesService {

    private final JdbcTemplate jdbcTemplate;

    public ProfilesService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> listByUser(int userId) {
        return jdbcTemplate.queryForList("SELECT * FROM profiles WHERE user_id = ?", userId);
    }

    public Map<String, Object> create(int userId, String name, String avatar, Boolean isKids, String maxMaturityRating, String pinCode) {
        jdbcTemplate.update(
                "INSERT INTO profiles (user_id, name, avatar, is_kids, max_maturity_rating, pin_code) VALUES (?, ?, ?, ?, ?, ?)",
                userId,
                name,
                emptyToNull(avatar),
                Boolean.TRUE.equals(isKids) ? 1 : 0,
                (maxMaturityRating != null && !maxMaturityRating.isBlank()) ? maxMaturityRating : "18+",
                emptyToNull(pinCode)
        );
        Integer id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Integer.class);
        return jdbcTemplate.queryForMap("SELECT * FROM profiles WHERE id = ?", id);
    }

    public Map<String, Object> update(int userId, int id, String name, String avatar, Boolean isKids, String maxMaturityRating, String pinCode) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM profiles WHERE id = ? AND user_id = ?", id, userId);
        if (rows.isEmpty()) return null;

        jdbcTemplate.update(
                "UPDATE profiles SET " +
                        "name = COALESCE(?, name), " +
                        "avatar = COALESCE(?, avatar), " +
                        "is_kids = COALESCE(?, is_kids), " +
                        "max_maturity_rating = COALESCE(?, max_maturity_rating), " +
                        "pin_code = COALESCE(?, pin_code) " +
                        "WHERE id = ? AND user_id = ?",
                emptyToNull(name),
                emptyToNull(avatar),
                isKids == null ? null : (Boolean.TRUE.equals(isKids) ? 1 : 0),
                emptyToNull(maxMaturityRating),
                emptyToNull(pinCode),
                id,
                userId
        );

        return jdbcTemplate.queryForMap("SELECT * FROM profiles WHERE id = ?", id);
    }

    public boolean delete(int userId, int id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT id FROM profiles WHERE id = ? AND user_id = ?", id, userId);
        if (rows.isEmpty()) return false;
        jdbcTemplate.update("DELETE FROM profiles WHERE id = ? AND user_id = ?", id, userId);
        return true;
    }

    public VerifyPinResult verifyPin(int userId, int id, String pinCode) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT pin_code FROM profiles WHERE id = ? AND user_id = ?", id, userId);
        if (rows.isEmpty()) return VerifyPinResult.NOT_FOUND;
        Object current = rows.get(0).get("pin_code");
        if (current == null || String.valueOf(current).isBlank()) return VerifyPinResult.NO_PIN;
        if (!String.valueOf(current).equals(String.valueOf(pinCode))) return VerifyPinResult.WRONG;
        return VerifyPinResult.OK;
    }

    public enum VerifyPinResult { OK, NOT_FOUND, NO_PIN, WRONG }

    private static String emptyToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}

