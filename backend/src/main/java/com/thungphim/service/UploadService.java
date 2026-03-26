package com.thungphim.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class UploadService {

    @Value("${app.upload.images}")
    private String imagesDir;

    @Value("${app.upload.videos}")
    private String videosDir;

    public String saveImage(MultipartFile file) throws IOException {
        return save(file, imagesDir, "/uploads/images/");
    }

    public String saveVideo(MultipartFile file) throws IOException {
        return save(file, videosDir, "/uploads/videos/");
    }

    /** Resolve đường dẫn file từ URL (vd: /uploads/videos/xxx.mp4) -> Path tuyệt đối */
    public Path resolvePathFromUrl(String url) {
        if (url == null || url.isBlank()) return null;
        String rel = url.startsWith("/") ? url.substring(1) : url;
        if (rel.startsWith("uploads/videos/")) {
            String filename = rel.substring("uploads/videos/".length());
            return Paths.get(videosDir, filename).toAbsolutePath().normalize();
        }
        if (rel.startsWith("uploads/images/")) {
            String filename = rel.substring("uploads/images/".length());
            return Paths.get(imagesDir, filename).toAbsolutePath().normalize();
        }
        return Paths.get(rel).toAbsolutePath().normalize();
    }

    public Path getImagesDirPath() {
        return Paths.get(imagesDir).toAbsolutePath().normalize();
    }

    private String save(MultipartFile file, String dir, String urlPrefix) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }
        Path folder = Paths.get(dir).toAbsolutePath().normalize();
        Files.createDirectories(folder);

        String original = file.getOriginalFilename();
        String ext = "";
        if (StringUtils.hasText(original) && original.contains(".")) {
            ext = original.substring(original.lastIndexOf('.')).toLowerCase(Locale.ROOT);
            if (ext.length() > 10) ext = "";
        }
        String filename = System.currentTimeMillis() + "-" + ThreadLocalRandom.current().nextInt(1_000_000_000) + ext;
        Path target = folder.resolve(filename).normalize();
        file.transferTo(target);
        return urlPrefix + filename;
    }
}

