package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

@Entity
@Table(name = "watch_history")
@Data
public class WatchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "profile_id", nullable = false)
    private Integer profileId;

    @Column(name = "movie_id")
    private Integer movieId;

    @Column(name = "episode_id")
    private Integer episodeId;

    @Column(name = "progress_seconds", nullable = false)
    private Integer progressSeconds = 0;

    @Column(name = "watched_at")
    private Instant watchedAt;
}
