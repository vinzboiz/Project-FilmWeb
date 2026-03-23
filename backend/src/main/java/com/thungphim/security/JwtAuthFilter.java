package com.thungphim.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        String token = (authHeader != null && authHeader.startsWith("Bearer ")) ? authHeader.substring(7) : null;

        if (token != null && !token.isBlank()) {
            try {
                Integer userId = jwtUtil.getUserIdFromToken(token);
                boolean isAdmin = jwtUtil.isAdminFromToken(token);
                JwtUser jwtUser = new JwtUser(userId, isAdmin);
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        jwtUser, null, Collections.emptyList());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception e) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"message\":\"Token không hợp lệ\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    public static class JwtUser {
        public final int userId;
        public final boolean isAdmin;

        public JwtUser(int userId, boolean isAdmin) {
            this.userId = userId;
            this.isAdmin = isAdmin;
        }
    }

    public static JwtUser getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof JwtUser u) {
            return u;
        }
        return null;
    }
}
