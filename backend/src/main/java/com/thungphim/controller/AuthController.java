package com.thungphim.controller;

import com.thungphim.dto.LoginResponse;
import com.thungphim.entity.User;
import com.thungphim.repository.UserRepository;
import com.thungphim.security.JwtAuthFilter;
import com.thungphim.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        String fullName = body.get("full_name");
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(email, password, fullName));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        return ResponseEntity.ok(authService.login(email, password));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe() {
        JwtAuthFilter.JwtUser jwtUser = JwtAuthFilter.getCurrentUser();
        if (jwtUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token");
        }
        User user = userRepository.findById(jwtUser.userId).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User không tồn tại"));
        return ResponseEntity.ok(authService.getMe(user));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email là bắt buộc");
        }
        boolean exists = userRepository.existsByEmail(email.trim());
        if (!exists) {
            return ResponseEntity.ok(Map.of("message", "Nếu email tồn tại, link reset sẽ được gửi (demo: không gửi thật)."));
        }
        return ResponseEntity.ok(Map.of("message", "Demo: yêu cầu reset mật khẩu đã được ghi nhận (không gửi email thật)."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String newPassword = body.get("new_password");
        if (email == null || email.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email và new_password là bắt buộc");
        }
        authService.resetPassword(email.trim(), newPassword);
        return ResponseEntity.ok(Map.of("message", "Đã đặt lại mật khẩu"));
    }
}
