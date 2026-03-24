package com.thungphim.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret:dev_secret_key}")
    private String secret;

    @Value("${jwt.expiration-ms:604800000}")
    private long expirationMs;

    private SecretKey getSigningKey() {
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        // JJWT requires >= 256-bit key for HS256. Derive a stable 256-bit key if secret is shorter.
        if (raw.length < 32) {
            try {
                raw = MessageDigest.getInstance("SHA-256").digest(raw);
            } catch (NoSuchAlgorithmException e) {
                // Should never happen on modern JDKs; fallback to zero-pad
                byte[] padded = new byte[32];
                System.arraycopy(raw, 0, padded, 0, Math.min(raw.length, 32));
                raw = padded;
            }
        }
        return Keys.hmacShaKeyFor(raw);
    }

    public String generateToken(Integer userId, String email, boolean isAdmin) {
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("userId", userId)
                .claim("email", email)
                .claim("isAdmin", isAdmin)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Integer getUserIdFromToken(String token) {
        Claims claims = parseToken(token);
        Object userId = claims.get("userId");
        if (userId instanceof Integer) return (Integer) userId;
        if (userId instanceof Number) return ((Number) userId).intValue();
        return Integer.parseInt(claims.getSubject());
    }

    public boolean isAdminFromToken(String token) {
        Claims claims = parseToken(token);
        Object admin = claims.get("isAdmin");
        return Boolean.TRUE.equals(admin);
    }
}
