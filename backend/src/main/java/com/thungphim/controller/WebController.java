package com.thungphim.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.thungphim.entity.Genre;
import com.thungphim.entity.User;
import com.thungphim.repository.GenreRepository;
import com.thungphim.repository.UserRepository;
import com.thungphim.service.DatabaseInfoService;

@Controller
public class WebController {

    private final DatabaseInfoService databaseInfoService;
    private final UserRepository userRepository;
    private final GenreRepository genreRepository;
    private final Path imageUploadDir;
    private final boolean oauthConfigured;

    public WebController(DatabaseInfoService databaseInfoService,
            UserRepository userRepository,
            GenreRepository genreRepository,
            @Value("${app.upload.images:../uploads/images}") String imageUploadDir,
            @Value("${spring.security.oauth2.client.registration.google.client-id:}") String googleClientId,
            @Value("${spring.security.oauth2.client.registration.google.client-secret:}") String googleClientSecret) {
        this.databaseInfoService = databaseInfoService;
        this.userRepository = userRepository;
        this.genreRepository = genreRepository;
        this.imageUploadDir = Paths.get(imageUploadDir).toAbsolutePath().normalize();
        this.oauthConfigured = isValidGoogleClientId(googleClientId) && isValidGoogleClientSecret(googleClientSecret);
    }

    @GetMapping({"/", "/login"})
    public String loginPage(@RequestParam(value = "oauthError", required = false) Boolean oauthError,
            Authentication authentication,
            Model model) {
        AuthViewState state = buildAuthViewState(authentication);
        model.addAttribute("authenticated", state.authenticated());
        model.addAttribute("displayName", state.displayName());
        model.addAttribute("admin", state.admin());
        model.addAttribute("oauthConfigured", oauthConfigured);
        model.addAttribute("oauthError", Boolean.TRUE.equals(oauthError));
        model.addAttribute("connectedDb", databaseInfoService.getCurrentDatabaseName());
        model.addAttribute("usersTableReady", databaseInfoService.isUsersTableReady());
        return "index";
    }

    @GetMapping("/user/dashboard")
    public String userDashboard(Authentication authentication, Model model) {
        AuthViewState state = buildAuthViewState(authentication);
        model.addAttribute("displayName", state.displayName());
        model.addAttribute("admin", state.admin());
        model.addAttribute("connectedDb", databaseInfoService.getCurrentDatabaseName());
        model.addAttribute("usersTableReady", databaseInfoService.isUsersTableReady());
        return "user-dashboard";
    }

    @GetMapping("/admin/dashboard")
    public String adminDashboard(Authentication authentication, Model model) {
        AuthViewState state = buildAuthViewState(authentication);
        model.addAttribute("displayName", state.displayName());
        model.addAttribute("admin", state.admin());
        model.addAttribute("connectedDb", databaseInfoService.getCurrentDatabaseName());
        model.addAttribute("usersTableReady", databaseInfoService.isUsersTableReady());
        model.addAttribute("genres", genreRepository.findAll());
        return "admin-dashboard";
    }

    @PostMapping("/admin/genres")
    public String createGenre(@RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "thumbnailFile", required = false) MultipartFile thumbnailFile,
            RedirectAttributes redirectAttributes) {
        String normalizedName = normalize(name);
        if (normalizedName.isBlank()) {
            redirectAttributes.addFlashAttribute("genreError", "Tên thể loại không được để trống.");
            return "redirect:/admin/dashboard";
        }

        if (genreRepository.existsByNameIgnoreCase(normalizedName)) {
            redirectAttributes.addFlashAttribute("genreError", "Tên thể loại đã tồn tại.");
            return "redirect:/admin/dashboard";
        }

        Genre genre = new Genre();
        genre.setName(normalizedName);
        genre.setDescription(normalize(description));
        try {
            genre.setThumbnailUrl(saveUploadedImage(thumbnailFile));
        } catch (IOException ex) {
            redirectAttributes.addFlashAttribute("genreError", "Không thể tải ảnh lên. Vui lòng thử lại.");
            return "redirect:/admin/dashboard";
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("genreError", ex.getMessage());
            return "redirect:/admin/dashboard";
        }
        genreRepository.save(genre);

        redirectAttributes.addFlashAttribute("genreSuccess", "Đã tạo thể loại mới.");
        return "redirect:/admin/dashboard";
    }

    @PostMapping("/admin/genres/{id}/update")
    public String updateGenre(@PathVariable("id") Integer id,
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "thumbnailFile", required = false) MultipartFile thumbnailFile,
            RedirectAttributes redirectAttributes) {
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Genre not found: " + id));

        String normalizedName = normalize(name);
        if (normalizedName.isBlank()) {
            redirectAttributes.addFlashAttribute("genreError", "Tên thể loại không được để trống.");
            return "redirect:/admin/dashboard";
        }

        if (genreRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id)) {
            redirectAttributes.addFlashAttribute("genreError", "Tên thể loại đã tồn tại.");
            return "redirect:/admin/dashboard";
        }

        genre.setName(normalizedName);
        genre.setDescription(normalize(description));
        try {
            String uploadedImageUrl = saveUploadedImage(thumbnailFile);
            if (!uploadedImageUrl.isBlank()) {
                genre.setThumbnailUrl(uploadedImageUrl);
            }
        } catch (IOException ex) {
            redirectAttributes.addFlashAttribute("genreError", "Không thể tải ảnh lên. Vui lòng thử lại.");
            return "redirect:/admin/dashboard";
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("genreError", ex.getMessage());
            return "redirect:/admin/dashboard";
        }
        genreRepository.save(genre);

        redirectAttributes.addFlashAttribute("genreSuccess", "Đã cập nhật thể loại.");
        return "redirect:/admin/dashboard";
    }

    @PostMapping("/admin/genres/{id}/delete")
    public String deleteGenre(@PathVariable("id") Integer id, RedirectAttributes redirectAttributes) {
        if (genreRepository.existsById(id)) {
            genreRepository.deleteById(id);
            redirectAttributes.addFlashAttribute("genreSuccess", "Đã xóa thể loại.");
        } else {
            redirectAttributes.addFlashAttribute("genreError", "Không tìm thấy thể loại để xóa.");
        }
        return "redirect:/admin/dashboard";
    }

    @GetMapping("/access-denied")
    public String accessDenied() {
        return "access-denied";
    }

    @GetMapping("/profile")
    public String profile(Authentication authentication, Model model) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);

        model.addAttribute("displayName", user != null ? user.getFullName() : email);
        model.addAttribute("user", user);
        model.addAttribute("admin", user != null && user.isAdmin());
        model.addAttribute("connectedDb", databaseInfoService.getCurrentDatabaseName());
        return "profile";
    }

    private AuthViewState buildAuthViewState(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return new AuthViewState(false, null, false);
        }

        Set<String> roles = authentication.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        boolean isAdmin = roles.contains("ROLE_ADMIN");
        String displayName = userRepository.findByEmail(authentication.getName())
                .map(User::getFullName)
                .orElse(authentication.getName());

        return new AuthViewState(true, displayName, isAdmin);
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim();
    }

    private String saveUploadedImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return "";
        }

        String contentType = normalize(file.getContentType()).toLowerCase();
        if (!contentType.startsWith("image/")) {
            throw new IllegalArgumentException("File ảnh không hợp lệ. Chỉ chấp nhận định dạng image/*.");
        }

        String originalName = normalize(file.getOriginalFilename());
        String extension = getFileExtension(originalName);
        if (extension.isBlank()) {
            extension = "png";
        }

        Files.createDirectories(imageUploadDir);
        String fileName = "genre-" + UUID.randomUUID() + "." + extension;
        Path target = imageUploadDir.resolve(fileName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/images/" + fileName;
    }

    private String getFileExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dotIndex + 1).replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
    }

    private boolean isRealOAuthValue(String value) {
        String normalized = normalize(value);
        return !normalized.isBlank()
                && !normalized.startsWith("replace-with-")
                && !normalized.equals("local-google-client-id")
                && !normalized.equals("local-google-client-secret");
    }

    private boolean isValidGoogleClientId(String value) {
        String normalized = normalize(value);
        return isRealOAuthValue(normalized) && normalized.endsWith(".apps.googleusercontent.com");
    }

    private boolean isValidGoogleClientSecret(String value) {
        return isRealOAuthValue(value);
    }

    private record AuthViewState(boolean authenticated, String displayName, boolean admin) {

    }
}
