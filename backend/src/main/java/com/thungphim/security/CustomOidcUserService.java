package com.thungphim.security;

import java.util.Set;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

@Service
public class CustomOidcUserService extends OidcUserService {

    private final UserRoleMapper userRoleMapper;

    public CustomOidcUserService(UserRoleMapper userRoleMapper) {
        this.userRoleMapper = userRoleMapper;
    }

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);

        String email = oidcUser.getEmail();
        if (email == null || email.isBlank()) {
            OAuth2Error error = new OAuth2Error("invalid_user_info", "Google account does not expose email", null);
            throw new OAuth2AuthenticationException(error);
        }

        String fullName = userRoleMapper.resolveDisplayName(email, oidcUser.getFullName());
        String avatarUrl = (String) oidcUser.getClaims().get("picture");

        Set<GrantedAuthority> authorities;
        try {
            authorities = userRoleMapper.syncUserAndMapAuthorities(
                    email,
                    fullName,
                    avatarUrl,
                    oidcUser.getAuthorities());
        } catch (Exception ex) {
            OAuth2Error error = new OAuth2Error("user_sync_failed",
                    "Cannot save Google user into current database. Check DB schema/users table.", null);
            throw new OAuth2AuthenticationException(error, ex);
        }

        return new DefaultOidcUser(authorities, oidcUser.getIdToken(), oidcUser.getUserInfo(), "email");
    }
}
