package com.thungphim.config;

import com.thungphim.service.StreamingTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class StreamingAccessFilter extends OncePerRequestFilter {

    private final StreamingTokenService streamingTokenService;

    @Value("${app.streaming.allowed-origin:http://localhost:8080}")
    private String allowedOrigin;

    @Value("${app.streaming.allowed-referer-prefix:http://localhost:8080/}")
    private String allowedRefererPrefix;

    public StreamingAccessFilter(StreamingTokenService streamingTokenService) {
        this.streamingTokenService = streamingTokenService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null) return true;
        return !(uri.startsWith("/hls/") || uri.startsWith("/api/v1/streaming/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!isOriginAllowed(request)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.getWriter().write("Forbidden origin/referer");
            return;
        }

        String uri = request.getRequestURI();
        boolean isSegment = uri.startsWith("/hls/") && uri.endsWith(".ts");
        boolean isKey = uri.equals("/api/v1/streaming/key");

        if (isSegment) {
            if (!validateTokenForSegment(request)) {
                response.setStatus(HttpStatus.FORBIDDEN.value());
                response.getWriter().write("Invalid or expired segment token");
                return;
            }
        }

        if (isKey) {
            if (!validateTokenForKey(request)) {
                response.setStatus(HttpStatus.FORBIDDEN.value());
                response.getWriter().write("Invalid or expired key token");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isOriginAllowed(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        String referer = request.getHeader("Referer");

        // Enforce when headers are present. If browser omits one/both headers,
        // do not hard-fail as signed token checks still protect segment/key access.
        if (origin != null && !origin.equalsIgnoreCase(allowedOrigin)) {
            return false;
        }
        if (referer != null && !referer.startsWith(allowedRefererPrefix)) {
            return false;
        }
        return true;
    }

    private boolean validateTokenForSegment(HttpServletRequest request) {
        String token = request.getParameter("token");
        String expRaw = request.getParameter("exp");
        if (token == null || expRaw == null) return false;

        long exp;
        try {
            exp = Long.parseLong(expRaw);
        } catch (Exception ex) {
            return false;
        }

        String canonical = request.getRequestURI();
        return streamingTokenService.verify(canonical, exp, token);
    }

    private boolean validateTokenForKey(HttpServletRequest request) {
        String stream = request.getParameter("stream");
        String kid = request.getParameter("kid");
        String token = request.getParameter("token");
        String expRaw = request.getParameter("exp");
        if (stream == null || kid == null || token == null || expRaw == null) return false;

        long exp;
        try {
            exp = Long.parseLong(expRaw);
        } catch (Exception ex) {
            return false;
        }

        String canonical = "/api/v1/streaming/key?stream=" + stream + "&kid=" + kid;
        return streamingTokenService.verify(canonical, exp, token);
    }
}
