package com.thungphim.security;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.thungphim.entity.User;
import com.thungphim.repository.UserRepository;

@Component
public class UserRoleMapper {

    private final UserRepository userRepository;

    public UserRoleMapper(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public Set<GrantedAuthority> syncUserAndMapAuthorities(String email,
            String fullName,
            String avatarUrl,
            Collection<? extends GrantedAuthority> upstreamAuthorities) {
        User user = userRepository.findByEmail(email)
                .map(existing -> updateExistingUser(existing, fullName, avatarUrl))
                .orElseGet(() -> createNewUser(email, fullName, avatarUrl));

        user.setLastLoginAt(LocalDateTime.now());
        User savedUser = userRepository.save(user);

        Set<GrantedAuthority> authorities = new HashSet<>(upstreamAuthorities);
        authorities.add(new SimpleGrantedAuthority(savedUser.isAdmin() ? "ROLE_ADMIN" : "ROLE_USER"));
        return authorities;
    }

    private User updateExistingUser(User existingUser, String fullName, String avatarUrl) {
        existingUser.setFullName(fullName);
        existingUser.setAvatarUrl(avatarUrl);
        return existingUser;
    }

    private User createNewUser(String email, String fullName, String avatarUrl) {
        User newUser = new User();
        newUser.setEmail(email);
        // The existing schema requires password_hash not null. Keep a generated placeholder for OAuth-only users.
        newUser.setPasswordHash("oauth2:" + UUID.randomUUID());
        newUser.setFullName(fullName);
        newUser.setAvatarUrl(avatarUrl);
        newUser.setAdmin(false);
        newUser.setLocked(false);
        newUser.setPreferredLang("vi");
        newUser.setPreferredTheme("light");
        return newUser;
    }

    public String resolveDisplayName(String email, String name) {
        return Optional.ofNullable(name)
                .filter(value -> !value.isBlank())
                .orElseGet(() -> email.split("@")[0]);
    }
}
