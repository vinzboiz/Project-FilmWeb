package com.thungphim.controller;

import com.thungphim.entity.Episode;
import com.thungphim.repository.EpisodeRepository;
import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.UploadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final Logger log = LoggerFactory.getLogger(UploadController.class);

    private final UploadService uploadService;
    private final EpisodeRepository episodeRepository;
    private final JdbcTemplate jdbcTemplate;

    public UploadController(UploadService uploadService, EpisodeRepository episodeRepository, JdbcTemplate jdbcTemplate) {
        this.uploadService = uploadService;
        this.episodeRepository = episodeRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    private static JwtAuthFilter.JwtUser requireUser() {
        JwtAuthFilter.JwtUser u = JwtAuthFilter.getCurrentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token");
        return u;
    }

    private static void requireAdmin() {
        JwtAuthFilter.JwtUser u = requireUser();
        if (!u.isAdmin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ admin mới được phép thao tác");
    }

    @PostMapping("/video")
    public ResponseEntity<Map<String, String>> uploadVideo(@RequestParam(value = "video", required = false) MultipartFile video) {
        requireAdmin();
        try {
            String url = uploadService.saveVideo(video);
            if (url == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không có file nào được upload");
            return ResponseEntity.ok(Map.of("video_url", url));
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    @PostMapping("/image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam(value = "image", required = false) MultipartFile image) {
        requireAdmin();
        try {
            String url = uploadService.saveImage(image);
            if (url == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không có file nào được upload");
            return ResponseEntity.ok(Map.of("image_url", url));
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    @PostMapping("/episode-video/{episodeId}")
    public ResponseEntity<Map<String, Object>> uploadEpisodeVideo(
            @PathVariable Integer episodeId,
            @RequestParam(value = "video", required = false) MultipartFile video
    ) {
        requireAdmin();
        try {
            String url = uploadService.saveVideo(video);
            if (url == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không có file nào được upload");

            int updated = jdbcTemplate.update("UPDATE episodes SET video_url = ?, updated_at = NOW(3) WHERE id = ?", url, episodeId);
            if (updated == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Episode not found");

            return ResponseEntity.ok(Map.of(
                    "episode_id", episodeId,
                    "video_url", url
            ));
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    @PostMapping("/episode-thumbnail-from-video/{episodeId}")
    public ResponseEntity<Map<String, Object>> thumbnailFromVideo(@PathVariable Integer episodeId) {
        requireAdmin();
        try {
            Episode ep = episodeRepository.findById(episodeId).orElse(null);
            if (ep == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Episode not found");

            String videoUrl = ep.getVideoUrl();
            if (videoUrl == null || videoUrl.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tập này chưa có video để cắt ảnh bìa");
            }
            String lower = videoUrl.toLowerCase();
            if (lower.startsWith("http://") || lower.startsWith("https://")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ video lưu local trong thư mục uploads");
            }

            Path videoPath = uploadService.resolvePathFromUrl(videoUrl);
            if (videoPath == null || !Files.exists(videoPath)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không tìm thấy file video: " + videoUrl);
            }

            String fileName = "ep-" + episodeId + "-" + System.currentTimeMillis() + "-" + ThreadLocalRandom.current().nextInt(1_000_000) + ".jpg";
            String imageUrl = "/uploads/images/" + fileName;
            Path imagesDir = uploadService.getImagesDirPath();
            Files.createDirectories(imagesDir);
            Path outputPath = imagesDir.resolve(fileName);

            int randomSeconds = 5 + ThreadLocalRandom.current().nextInt(20);

            // Trên Windows dùng ffmpeg.exe nếu cần
            String ffmpegCmd = System.getProperty("os.name", "").toLowerCase().contains("win") ? "ffmpeg.exe" : "ffmpeg";
            ProcessBuilder pb = new ProcessBuilder(
                    ffmpegCmd,
                    "-y",
                    "-ss", String.valueOf(randomSeconds),
                    "-i", videoPath.toAbsolutePath().toString(),
                    "-frames:v", "1",
                    "-q:v", "2",
                    outputPath.toAbsolutePath().toString()
            );
            pb.redirectErrorStream(true);
            pb.directory(imagesDir.toFile());
            Process p = pb.start();

            StringBuilder stderr = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) {
                    stderr.append(line).append("\n");
                }
            }
            int code = p.waitFor();
            if (code != 0) {
                log.warn("ffmpeg exit {} for episode {}: {}", code, episodeId, stderr);
                String errMsg = stderr.length() > 200 ? stderr.substring(0, 200) + "..." : stderr.toString();
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "ffmpeg lỗi (code " + code + "). Kiểm tra ffmpeg đã cài và có trong PATH. " + errMsg);
            }

            if (!Files.exists(outputPath)) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "ffmpeg chạy xong nhưng không tạo được file ảnh");
            }

            jdbcTemplate.update("UPDATE episodes SET thumbnail_url = ?, updated_at = NOW(3) WHERE id = ?", imageUrl, episodeId);

            return ResponseEntity.ok(Map.of(
                    "episode_id", episodeId,
                    "image_url", imageUrl
            ));
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Thumbnail from video failed for episode " + episodeId, ex);
            String msg = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
            if (msg.contains("Cannot run program") || msg.contains("ffmpeg")) {
                msg = "Không tìm thấy ffmpeg. Cài ffmpeg và thêm vào PATH: https://ffmpeg.org/download.html";
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, msg);
        }
    }
}

