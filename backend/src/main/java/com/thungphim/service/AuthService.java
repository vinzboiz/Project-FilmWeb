package com.thungphim.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thungphim.dto.LoginResponse;
import com.thungphim.entity.User;
import com.thungphim.repository.UserRepository;
import com.thungphim.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    private static final String OAUTH_PLACEHOLDER = "OAUTH_GOOGLE";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final NotificationService notificationService;
    private final String googleClientId;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil, NotificationService notificationService,
                       @Value("${app.google.client-id:}") String googleClientId) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.notificationService = notificationService;
        this.googleClientId = googleClientId != null ? googleClientId.trim() : "";
    }

    public Map<String, Object> register(String email, String password, String fullName) {
        if (email == null || email.isBlank() || password == null || password.isBlank() || fullName == null || fullName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email, password, full_name là bắt buộc");
        }
        if (userRepository.existsByEmail(email.trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã tồn tại");
        }
        User user = new User();
        user.setEmail(email.trim());
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName.trim());
        user.setIsAdmin(false);
        user.setLocked(false);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        user = userRepository.save(user);

        Map<String, Object> body = new HashMap<>();
        body.put("id", user.getId());
        body.put("email", user.getEmail());
        body.put("full_name", user.getFullName());
        return body;
    }

    public LoginResponse login(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email và password là bắt buộc");
        }
        User user = userRepository.findByEmail(email.trim()).orElse(null);
        String passwordHash = user != null ? user.getPasswordHash() : null;
        if (user == null || passwordHash == null || passwordHash.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai email hoặc mật khẩu");
        }
        if (OAUTH_PLACEHOLDER.equals(passwordHash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản này dùng Google. Vui lòng chọn Đăng nhập bằng Google.");
        }
        if (!passwordEncoder.matches(password, passwordHash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai email hoặc mật khẩu");
        }
        if (Boolean.TRUE.equals(user.getLocked())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa. Liên hệ quản trị viên.");
        }
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), Boolean.TRUE.equals(user.getIsAdmin()));
        // Best-effort like legacy Node backend (do not block login on notification failure)
        try {
            notificationService.createNotification(user.getId(), "login", "Bạn đã đăng nhập vào ThungPhim.");
        } catch (Exception ignored) {
        }
        return new LoginResponse(token, new LoginResponse.UserInfo(
                user.getId(), user.getEmail(), user.getFullName(), Boolean.TRUE.equals(user.getIsAdmin())));
    }

    public Map<String, Object> getMe(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("email", user.getEmail());
        map.put("full_name", user.getFullName());
        map.put("is_admin", user.getIsAdmin());
        map.put("avatar_url", user.getAvatarUrl());
        map.put("preferred_lang", user.getPreferredLang());
        map.put("preferred_theme", user.getPreferredTheme());
        return map;
    }

    /**
     * Xác thực bằng máy chủ phụ trợ: Frontend gửi id_token (credential) từ Google → Backend verify qua tokeninfo API.
     * Kiểm tra aud, iss, exp; không dùng getId() hay thông tin client-side.
     */
    public LoginResponse loginWithGoogle(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "id_token là bắt buộc");
        }
        if (googleClientId.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Google đăng nhập chưa cấu hình. Thêm app.google.client-id vào application.properties.");
        }
        try {
            // tokeninfo API verify chữ ký, iss, exp; ta kiểm tra aud = client_id
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken))
                    .GET()
                    .build();
            var response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token Google không hợp lệ");
            }
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(response.body());
            String aud = node.has("aud") ? node.get("aud").asText() : "";
            if (!googleClientId.equals(aud)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token không khớp ứng dụng");
            }
            String email = node.has("email") ? node.get("email").asText() : null;
            String name = node.has("name") ? node.get("name").asText() : null;
            String picture = node.has("picture") ? node.get("picture").asText() : null;
            if (email == null || email.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google không trả về email");
            }
            User user = userRepository.findByEmail(email.trim()).orElse(null);
            if (user == null) {
                user = new User();
                user.setEmail(email.trim());
                user.setFullName(name != null && !name.isBlank() ? name.trim() : email);
                user.setPasswordHash(OAUTH_PLACEHOLDER);
                user.setAvatarUrl(picture);
                user.setIsAdmin(false);
                user.setLocked(false);
                user.setCreatedAt(Instant.now());
                user.setUpdatedAt(Instant.now());
                user = userRepository.save(user);
            } else {
                if (name != null && !name.isBlank()) user.setFullName(name.trim());
                if (picture != null && !picture.isBlank()) user.setAvatarUrl(picture);
                user.setLastLoginAt(Instant.now());
                user.setUpdatedAt(Instant.now());
                user = userRepository.save(user);
            }
            if (Boolean.TRUE.equals(user.getLocked())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa. Liên hệ quản trị viên.");
            }
            String token = jwtUtil.generateToken(user.getId(), user.getEmail(), Boolean.TRUE.equals(user.getIsAdmin()));
            try {
                notificationService.createNotification(user.getId(), "login", "Bạn đã đăng nhập vào ThungPhim (Google).");
            } catch (Exception ignored) {}
            return new LoginResponse(token, new LoginResponse.UserInfo(
                    user.getId(), user.getEmail(), user.getFullName(), Boolean.TRUE.equals(user.getIsAdmin())));
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            if (e.getCause() instanceof ResponseStatusException rse) throw rse;
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Xác thực Google thất bại");
        }
    }

    public void resetPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại");
        }
        if (OAUTH_PLACEHOLDER.equals(user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài khoản Google không dùng mật khẩu.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }
}
