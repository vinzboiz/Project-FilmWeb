package com.thungphim.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class RoleDemoApiController {

    @GetMapping("/user/me")
    public Map<String, Object> userMe(Authentication authentication) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("email", authentication.getName());
        response.put("authorities", toAuthorities(authentication));
        return response;
    }

    @GetMapping("/admin/ping")
    public Map<String, Object> adminPing(Authentication authentication) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        response.put("by", authentication.getName());
        response.put("authorities", toAuthorities(authentication));
        return response;
    }

    private List<String> toAuthorities(Authentication authentication) {
        return authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
    }
}
