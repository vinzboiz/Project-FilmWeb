package com.thungphim.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class LoginResponse {
    private String token;
    private UserInfo user;

    public LoginResponse() {
    }

    public LoginResponse(String token, UserInfo user) {
        this.token = token;
        this.user = user;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UserInfo getUser() {
        return user;
    }

    public void setUser(UserInfo user) {
        this.user = user;
    }

    public static class UserInfo {
        private Integer id;
        private String email;
        @JsonProperty("full_name")
        private String fullName;
        @JsonProperty("is_admin")
        private Boolean isAdmin;

        public UserInfo() {
        }

        public UserInfo(Integer id, String email, String fullName, Boolean isAdmin) {
            this.id = id;
            this.email = email;
            this.fullName = fullName;
            this.isAdmin = isAdmin;
        }

        public Integer getId() {
            return id;
        }

        public void setId(Integer id) {
            this.id = id;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getFullName() {
            return fullName;
        }

        public void setFullName(String fullName) {
            this.fullName = fullName;
        }

        public Boolean getIsAdmin() {
            return isAdmin;
        }

        public void setIsAdmin(Boolean admin) {
            isAdmin = admin;
        }
    }
}
