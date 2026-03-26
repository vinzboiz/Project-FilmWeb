package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "seasons")
@Data
public class Season {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "series_id", nullable = false)
    private Integer seriesId;

    @Column(name = "season_number", nullable = false)
    private Integer seasonNumber;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;
}
