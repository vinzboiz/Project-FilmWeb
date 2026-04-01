package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Entity
@Table(name = "profiles")
@Data
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(nullable = false)
    private String name;

    private String avatar;

    @Column(name = "is_kids", nullable = false)
    private Boolean isKids = false;

    @Column(name = "max_maturity_rating")
    private String maxMaturityRating = "18+";

    @Column(name = "pin_code")
    private String pinCode;

    @Column(name = "created_at")
    private Instant createdAt;
}
