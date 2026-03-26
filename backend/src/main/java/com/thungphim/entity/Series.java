package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "series")
@Data
public class Series {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "banner_url")
    private String bannerUrl;

    @Column(name = "trailer_url")
    private String trailerUrl;

    @Column(name = "trailer_youtube_url")
    private String trailerYoutubeUrl;

    @Column(name = "age_rating")
    private String ageRating;

    @Column(name = "release_year")
    private Integer releaseYear;

    @Column(name = "country_code", length = 10)
    private String countryCode;

    @Column(name = "is_featured", nullable = false)
    private Boolean isFeatured = false;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Column(precision = 3, scale = 1)
    private BigDecimal rating;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
