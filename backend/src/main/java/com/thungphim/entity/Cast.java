package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "cast")
@Data
public class Cast {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "movie_id")
    private Integer movieId;

    @Column(name = "episode_id")
    private Integer episodeId;

    @Column(name = "person_id", nullable = false)
    private Integer personId;

    @Column(nullable = false)
    private String role;
}
