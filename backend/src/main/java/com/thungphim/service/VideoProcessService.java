package com.thungphim.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VideoProcessService {

    private static final Logger log = LoggerFactory.getLogger(VideoProcessService.class);

    private final JdbcTemplate jdbcTemplate;
    private final Set<String> processingVideos = ConcurrentHashMap.newKeySet();

    @Value("${app.storage.hls:uploads/hls}")
    private String hlsStorageDir;

    @Value("${app.storage.keys:../private_uploads/hls-keys}")
    private String hlsKeyStorageDir;

    @Value("${app.ffmpeg.command:ffmpeg}")
    private String ffmpegCommand;

    public VideoProcessService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Async
    public CompletableFuture<Void> processToHlsAsync(String sourceVideoUrl, Path sourceVideoPath) {
        if (sourceVideoUrl == null || sourceVideoUrl.isBlank() || sourceVideoPath == null) {
            return CompletableFuture.completedFuture(null);
        }

        String lower = sourceVideoUrl.toLowerCase(Locale.ROOT);
        if (!lower.endsWith(".mp4")) {
            return CompletableFuture.completedFuture(null);
        }

        if (!processingVideos.add(sourceVideoUrl)) {
            return CompletableFuture.completedFuture(null);
        }

        try {
            Path normalizedSource = sourceVideoPath.toAbsolutePath().normalize();
            if (!Files.exists(normalizedSource)) {
                log.warn("Skip HLS processing because source does not exist: {}", normalizedSource);
                return CompletableFuture.completedFuture(null);
            }

            String baseName = getBaseName(normalizedSource.getFileName().toString());
            String streamFolder = resolveStreamFolderName(sourceVideoUrl, baseName);
            Path hlsBasePath = Paths.get(hlsStorageDir).toAbsolutePath().normalize();
            Path outputDir = hlsBasePath.resolve(streamFolder).normalize();
            Files.createDirectories(outputDir);

            Path playlistPath = outputDir.resolve("index.m3u8");
            String hlsUrl = "/hls/" + streamFolder + "/index.m3u8";
            if (Files.exists(playlistPath)) {
                int movieUpdated = jdbcTemplate.update(
                    "UPDATE movies SET video_url = ?, updated_at = NOW(3) WHERE video_url = ?",
                    hlsUrl, sourceVideoUrl
                );
                markMovieReady(hlsUrl);
                int episodeUpdated = jdbcTemplate.update(
                    "UPDATE episodes SET video_url = ?, updated_at = NOW(3) WHERE video_url = ?",
                    hlsUrl, sourceVideoUrl
                );
                log.info("Reuse existing HLS for {} -> {} (movies: {}, episodes: {})", sourceVideoUrl, hlsUrl, movieUpdated, episodeUpdated);
                return CompletableFuture.completedFuture(null);
            }

            Path keyStoragePath = Paths.get(hlsKeyStorageDir).toAbsolutePath().normalize();
            Path streamKeyDir = keyStoragePath.resolve(streamFolder).normalize();
            Files.createDirectories(streamKeyDir);
                Path keyPath = streamKeyDir.resolve("0.key");
                writeAes128Key(keyPath);

                Path keyInfoPath = outputDir.resolve("enc.keyinfo");
                String keyUri = "/api/v1/streaming/key?stream=" + streamFolder + "&kid=0";
                String keyInfo = keyUri + System.lineSeparator() + keyPath.toString() + System.lineSeparator();
                Files.writeString(keyInfoPath, keyInfo, StandardCharsets.UTF_8);

            Path segmentPattern = outputDir.resolve("segment_%05d.ts");

            ProcessBuilder pb = new ProcessBuilder(
                    resolveFfmpegCommand(),
                    "-y",
                    "-i", normalizedSource.toString(),
                    "-hls_time", "5",
                    "-hls_playlist_type", "vod",
                    "-hls_segment_filename", segmentPattern.toString(),
                    "-hls_key_info_file", keyInfoPath.toString(),
                    playlistPath.toString()
            );
            pb.redirectErrorStream(true);
            pb.directory(outputDir.toFile());

            Process process = pb.start();
            String ffmpegOutput = readProcessOutput(process);
            int exitCode = process.waitFor();

            if (exitCode != 0 || !Files.exists(playlistPath)) {
                String msg = ffmpegOutput.length() > 500 ? ffmpegOutput.substring(0, 500) + "..." : ffmpegOutput;
                log.warn("ffmpeg failed for {} with code {}: {}", sourceVideoUrl, exitCode, msg);
                return CompletableFuture.completedFuture(null);
            }

            int movieUpdated = jdbcTemplate.update(
                    "UPDATE movies SET video_url = ?, updated_at = NOW(3) WHERE video_url = ?",
                    hlsUrl, sourceVideoUrl
            );
                markMovieReady(hlsUrl);
            int episodeUpdated = jdbcTemplate.update(
                    "UPDATE episodes SET video_url = ?, updated_at = NOW(3) WHERE video_url = ?",
                    hlsUrl, sourceVideoUrl
            );

            log.info("HLS ready for {} -> {} (movies: {}, episodes: {})", sourceVideoUrl, hlsUrl, movieUpdated, episodeUpdated);
        } catch (Exception ex) {
            markMovieFailed(sourceVideoUrl);
            log.error("Failed HLS processing for {}", sourceVideoUrl, ex);
        } finally {
            processingVideos.remove(sourceVideoUrl);
        }

        return CompletableFuture.completedFuture(null);
    }

    private String resolveFfmpegCommand() {
        if (ffmpegCommand == null || ffmpegCommand.isBlank()) {
            return isWindows() ? "ffmpeg.exe" : "ffmpeg";
        }
        return ffmpegCommand;
    }

    private static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
    }

    private static String getBaseName(String filename) {
        if (filename == null || filename.isBlank()) return "video-unknown";
        int dot = filename.lastIndexOf('.');
        if (dot <= 0) return filename;
        return filename.substring(0, dot);
    }

    private String resolveStreamFolderName(String sourceVideoUrl, String fallbackBaseName) {
        String movieTitle = jdbcTemplate.query(
                "SELECT title FROM movies WHERE video_url = ? ORDER BY id DESC LIMIT 1",
                rs -> rs.next() ? rs.getString(1) : null,
                sourceVideoUrl
        );
        if (movieTitle != null && !movieTitle.isBlank()) {
            return toFolderName(movieTitle, fallbackBaseName);
        }

        String episodeTitle = jdbcTemplate.query(
                "SELECT title FROM episodes WHERE video_url = ? ORDER BY id DESC LIMIT 1",
                rs -> rs.next() ? rs.getString(1) : null,
                sourceVideoUrl
        );
        if (episodeTitle != null && !episodeTitle.isBlank()) {
            return toFolderName(episodeTitle, fallbackBaseName);
        }

        return toFolderName(fallbackBaseName, "video-unknown");
    }

    private static String toFolderName(String input, String fallback) {
        if (input == null || input.isBlank()) return fallback;
        String s = Normalizer.normalize(input.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-z0-9_-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("(^-|-$)", "");
        if (s.isBlank()) return fallback;
        return s;
    }

    private static void writeAes128Key(Path keyPath) throws IOException {
        byte[] key = new byte[16];
        new SecureRandom().nextBytes(key);
        Files.write(keyPath, key);
    }

    private static String readProcessOutput(Process process) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }
        }
        return sb.toString();
    }

    private void markMovieReady(String hlsUrl) {
        try {
            jdbcTemplate.update("UPDATE movies SET status = 'READY', updated_at = NOW(3) WHERE video_url = ?", hlsUrl);
        } catch (Exception ignored) {
            // Backward compatible when DB does not have status column/value constraints.
        }
    }

    private void markMovieFailed(String sourceVideoUrl) {
        try {
            jdbcTemplate.update("UPDATE movies SET status = 'FAILED', updated_at = NOW(3) WHERE video_url = ?", sourceVideoUrl);
        } catch (Exception ignored) {
            // Backward compatible when DB does not have status column/value constraints.
        }
    }
}
