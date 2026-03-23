package com.thungphim.service;

import com.thungphim.dto.LoginResponse;
import com.thungphim.entity.User;
import com.thungphim.repository.UserRepository;
import com.thungphim.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final NotificationService notificationService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil, NotificationService notificationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.notificationService = notificationService;
    }

    public Map<String, Object> register(String email, String password, String fullName) {
        if (email == null || email.isBlank() || password == null || password.isBlank() || fullName == null || fullName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email, password, full_name là bắt buộc");
        }
        if (userRepository.existsByEmail(email)) {
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
        if (user == null || passwordHash == null || passwordHash.isBlank() || !passwordEncoder.matches(password, passwordHash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai email hoặc mật khẩu");
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

    public void resetPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User không tồn tại");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }
}
