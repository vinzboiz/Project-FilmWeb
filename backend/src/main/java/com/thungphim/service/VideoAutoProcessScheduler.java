package com.thungphim.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@Service
public class VideoAutoProcessScheduler {

    private static final Logger log = LoggerFactory.getLogger(VideoAutoProcessScheduler.class);

    private final JdbcTemplate jdbcTemplate;
    private final VideoProcessService videoProcessService;

    @Value("${app.storage.original:${app.upload.videos}}")
    private String sourceVideosDir;

    @Value("${app.streaming.auto-enabled:true}")
    private boolean autoEnabled;

    public VideoAutoProcessScheduler(JdbcTemplate jdbcTemplate, VideoProcessService videoProcessService) {
        this.jdbcTemplate = jdbcTemplate;
        this.videoProcessService = videoProcessService;
    }

    @Scheduled(fixedDelayString = "${app.streaming.scan-interval-ms:15000}")
    public void autoProcessPendingVideos() {
        if (!autoEnabled) return;

        try {
            scanMovies();
            scanEpisodes();
        } catch (Exception ex) {
            log.warn("Auto HLS scan failed: {}", ex.getMessage());
        }
    }

    private void scanMovies() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, title, video_url FROM movies WHERE video_url LIKE '/uploads/videos/%.mp4'"
        );
        for (Map<String, Object> row : rows) {
            String videoUrl = asString(row.get("video_url"));
            if (videoUrl == null) continue;

            Path source = resolveSourcePath(videoUrl);
            if (source == null || !Files.exists(source)) continue;

            videoProcessService.processToHlsAsync(videoUrl, source);
        }
    }

    private void scanEpisodes() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, title, video_url FROM episodes WHERE video_url LIKE '/uploads/videos/%.mp4'"
        );
        for (Map<String, Object> row : rows) {
            String videoUrl = asString(row.get("video_url"));
            if (videoUrl == null) continue;

            Path source = resolveSourcePath(videoUrl);
            if (source == null || !Files.exists(source)) continue;

            videoProcessService.processToHlsAsync(videoUrl, source);
        }
    }

    private Path resolveSourcePath(String videoUrl) {
        if (!videoUrl.startsWith("/uploads/videos/")) return null;
        String filename = videoUrl.substring("/uploads/videos/".length());
        return Paths.get(sourceVideosDir, filename).toAbsolutePath().normalize();
    }

    private static String asString(Object value) {
        if (value == null) return null;
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }
}
