package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Entity
@Table(name = "favorites")
@Data
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "profile_id", nullable = false)
    private Integer profileId;

    @Column(name = "movie_id", nullable = false)
    private Integer movieId;

    @Column(name = "added_at")
    private Instant addedAt;
}
