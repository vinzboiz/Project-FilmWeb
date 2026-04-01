package com.thungphim.controller;

import com.thungphim.service.StreamingTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/streaming")
public class KeyManagementController {

    private static final Pattern KEY_URI_PATTERN = Pattern.compile("URI=\"([^\"]+)\"");

    @Value("${app.storage.keys:../private_uploads/hls-keys}")
    private String keyStorageDir;

    @Value("${app.storage.hls:../streaming_video}")
    private String hlsStorageDir;

    private final StreamingTokenService streamingTokenService;

    public KeyManagementController(StreamingTokenService streamingTokenService) {
        this.streamingTokenService = streamingTokenService;
    }

    @GetMapping("/playlist/{stream}")
    public ResponseEntity<String> getTokenizedPlaylist(@PathVariable("stream") String stream) {
        String streamName = sanitizeStream(stream);
        if (streamName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stream không hợp lệ");
        }

        Path playlistPath = Paths.get(hlsStorageDir)
                .toAbsolutePath()
                .normalize()
                .resolve(streamName)
                .resolve("index.m3u8")
                .normalize();

        if (!Files.exists(playlistPath) || !Files.isRegularFile(playlistPath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy playlist HLS");
        }

        try {
            String raw = Files.readString(playlistPath, StandardCharsets.UTF_8);
            String tokenized = tokenizePlaylist(streamName, raw);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/x-mpegURL"));
            headers.setCacheControl("no-store, no-cache, must-revalidate, max-age=0");
            headers.add("Pragma", "no-cache");
            return new ResponseEntity<>(tokenized, headers, HttpStatus.OK);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không đọc được playlist");
        }
    }

    @GetMapping("/key")
    public ResponseEntity<Resource> getStreamingKey(
            @RequestParam("stream") String stream,
            @RequestParam(name = "kid", defaultValue = "0") String kid
    ) {
        String streamName = sanitizeStream(stream);
        String keyId = sanitizeKid(kid);
        if (streamName == null || keyId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stream không hợp lệ");
        }

        Path keyPath = Paths.get(keyStorageDir)
                .toAbsolutePath()
                .normalize()
                .resolve(streamName)
                .resolve(keyId + ".key")
                .normalize();
        if (!Files.exists(keyPath) || !Files.isRegularFile(keyPath)) {
            // Backward compatible for legacy single-key layout: <keyStorageDir>/<stream>.key
            Path legacy = Paths.get(keyStorageDir)
                    .toAbsolutePath()
                    .normalize()
                    .resolve(streamName + ".key")
                    .normalize();
            if (Files.exists(legacy) && Files.isRegularFile(legacy)) {
                keyPath = legacy;
            }
        }
        if (!Files.exists(keyPath) || !Files.isRegularFile(keyPath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy key stream");
        }

        try {
            byte[] keyBytes = Files.readAllBytes(keyPath);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setCacheControl("no-store, no-cache, must-revalidate, max-age=0");
            headers.add("Pragma", "no-cache");
            return new ResponseEntity<>(new ByteArrayResource(keyBytes), headers, HttpStatus.OK);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không đọc được key");
        }
    }

    private String tokenizePlaylist(String streamName, String raw) {
        StringBuilder out = new StringBuilder();
        String[] lines = raw.replace("\r\n", "\n").split("\n", -1);

        for (String line : lines) {
            if (line == null || line.isEmpty()) {
                out.append(line == null ? "" : line).append('\n');
                continue;
            }

            if (line.startsWith("#EXT-X-KEY")) {
                out.append(tokenizeKeyLine(streamName, line)).append('\n');
                continue;
            }

            if (!line.startsWith("#") && line.endsWith(".ts")) {
                String canonical = "/hls/" + streamName + "/" + line;
                long exp = streamingTokenService.newExpiryEpochSeconds();
                String token = streamingTokenService.sign(canonical, exp);
                out.append(canonical)
                        .append("?exp=")
                        .append(exp)
                        .append("&token=")
                        .append(token)
                        .append('\n');
                continue;
            }

            out.append(line).append('\n');
        }

        return out.toString();
    }

    private String tokenizeKeyLine(String streamName, String keyLine) {
        Matcher matcher = KEY_URI_PATTERN.matcher(keyLine);
        if (!matcher.find()) return keyLine;

        String kid = extractKidFromKeyUri(matcher.group(1));
        if (kid == null) kid = "0";

        String canonical = "/api/v1/streaming/key?stream=" + streamName + "&kid=" + kid;
        long exp = streamingTokenService.newExpiryEpochSeconds();
        String token = streamingTokenService.sign(canonical, exp);

        String tokenizedUri = canonical + "&exp=" + exp + "&token=" + token;
        return keyLine.replace(matcher.group(1), tokenizedUri);
    }

    private static String extractKidFromKeyUri(String keyUri) {
        if (keyUri == null || keyUri.isBlank()) return null;
        int idx = keyUri.indexOf("kid=");
        if (idx < 0) return null;
        String part = keyUri.substring(idx + 4);
        int amp = part.indexOf('&');
        return amp >= 0 ? part.substring(0, amp) : part;
    }

    private static String sanitizeStream(String stream) {
        if (stream == null) return null;
        String s = stream.trim();
        if (s.isEmpty()) return null;
        if (!s.matches("[a-zA-Z0-9._-]+")) return null;
        return s;
    }

    private static String sanitizeKid(String kid) {
        if (kid == null) return null;
        String k = kid.trim();
        if (!k.matches("\\d+")) return null;
        return k;
    }
}
