package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Entity
@Table(name = "watchlist")
@Data
public class Watchlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "profile_id", nullable = false)
    private Integer profileId;

    @Column(name = "movie_id")
    private Integer movieId;

    @Column(name = "series_id")
    private Integer seriesId;

    @Column(name = "episode_id")
    private Integer episodeId;

    @Column(name = "added_at")
    private Instant addedAt;
}
