package com.thungphim.security;

import java.util.Set;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserRoleMapper userRoleMapper;
    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();

    public CustomOAuth2UserService(UserRoleMapper userRoleMapper) {
        this.userRoleMapper = userRoleMapper;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = delegate.loadUser(userRequest);

        String email = oauth2User.getAttribute("email");
        if (email == null || email.isBlank()) {
            OAuth2Error error = new OAuth2Error("invalid_user_info", "Google account does not expose email", null);
            throw new OAuth2AuthenticationException(error);
        }

        String fullName = userRoleMapper.resolveDisplayName(email, oauth2User.getAttribute("name"));

        String avatarUrl = oauth2User.getAttribute("picture");

        Set<GrantedAuthority> authorities;
        try {
            authorities = userRoleMapper.syncUserAndMapAuthorities(
                    email,
                    fullName,
                    avatarUrl,
                    oauth2User.getAuthorities());
        } catch (Exception ex) {
            OAuth2Error error = new OAuth2Error("user_sync_failed",
                    "Cannot save Google user into current database. Check DB schema/users table.", null);
            throw new OAuth2AuthenticationException(error, ex);
        }

        return new DefaultOAuth2User(authorities, oauth2User.getAttributes(), "email");
    }
}
