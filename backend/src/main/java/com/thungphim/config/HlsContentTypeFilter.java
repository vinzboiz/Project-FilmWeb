package com.thungphim.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class HlsContentTypeFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri == null || !uri.startsWith("/hls/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        if (uri != null) {
            if (uri.endsWith(".m3u8")) {
                response.setContentType("application/x-mpegURL");
            } else if (uri.endsWith(".ts")) {
                response.setContentType("video/MP2T");
            }
            response.setHeader("Cache-Control", "public, max-age=30");
            response.setHeader("X-Content-Type-Options", "nosniff");
        }

        filterChain.doFilter(request, response);
    }
}
