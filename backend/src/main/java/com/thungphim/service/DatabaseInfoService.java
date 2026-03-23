package com.thungphim.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class DatabaseInfoService {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseInfoService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String getCurrentDatabaseName() {
        try {
            String dbName = jdbcTemplate.queryForObject("SELECT DATABASE()", String.class);
            return dbName == null || dbName.isBlank() ? "(unknown)" : dbName;
        } catch (Exception ex) {
            return "(db-unavailable)";
        }
    }

    public boolean isUsersTableReady() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'",
                    Integer.class);
            return count != null && count > 0;
        } catch (Exception ex) {
            return false;
        }
    }
}
