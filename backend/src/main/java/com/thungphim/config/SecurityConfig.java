package com.thungphim.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

import com.thungphim.security.CustomOAuth2UserService;
import com.thungphim.security.CustomOidcUserService;
import com.thungphim.security.RoleBasedOAuth2SuccessHandler;

@Configuration
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final CustomOidcUserService customOidcUserService;
    private final RoleBasedOAuth2SuccessHandler roleBasedOAuth2SuccessHandler;

    public SecurityConfig(CustomOAuth2UserService customOAuth2UserService,
            CustomOidcUserService customOidcUserService,
            RoleBasedOAuth2SuccessHandler roleBasedOAuth2SuccessHandler) {
        this.customOAuth2UserService = customOAuth2UserService;
        this.customOidcUserService = customOidcUserService;
        this.roleBasedOAuth2SuccessHandler = roleBasedOAuth2SuccessHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/", "/login", "/error", "/access-denied", "/css/**", "/js/**", "/images/**").permitAll()
                .requestMatchers("/admin/**", "/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/user/**", "/api/user/**").hasAnyRole("USER", "ADMIN")
                .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                .loginPage("/login")
                .failureUrl("/login?oauthError=true")
                .userInfoEndpoint(userInfo -> userInfo
                .userService(customOAuth2UserService)
                .oidcUserService(customOidcUserService))
                .successHandler(roleBasedOAuth2SuccessHandler)
                )
                .logout(logout -> logout
                .logoutSuccessUrl("/")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("JSESSIONID")
                )
                .exceptionHandling(exception -> exception
                .accessDeniedPage("/access-denied")
                );

        return http.build();
    }
}
