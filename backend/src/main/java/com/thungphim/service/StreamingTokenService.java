package com.thungphim.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

@Service
public class StreamingTokenService {

    @Value("${app.streaming.token-secret:thungphim-streaming-secret}")
    private String tokenSecret;

    @Value("${app.streaming.token-ttl-seconds:120}")
    private long tokenTtlSeconds;

    public long newExpiryEpochSeconds() {
        return Instant.now().getEpochSecond() + Math.max(10, tokenTtlSeconds);
    }

    public String sign(String canonicalResource, long exp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(tokenSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String payload = canonicalResource + "|" + exp;
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot sign streaming token", ex);
        }
    }

    public boolean verify(String canonicalResource, long exp, String token) {
        if (token == null || token.isBlank()) return false;
        long now = Instant.now().getEpochSecond();
        if (exp < now) return false;

        String expected = sign(canonicalResource, exp);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                token.getBytes(StandardCharsets.UTF_8)
        );
    }
}
