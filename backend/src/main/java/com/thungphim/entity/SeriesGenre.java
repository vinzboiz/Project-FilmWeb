package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.io.Serializable;

@Entity
@Table(name = "series_genres")
@Data
@IdClass(SeriesGenre.SeriesGenreId.class)
public class SeriesGenre {

    @Id
    @Column(name = "series_id")
    private Integer seriesId;

    @Id
    @Column(name = "genre_id")
    private Integer genreId;

    @Data
    public static class SeriesGenreId implements Serializable {
        private Integer seriesId;
        private Integer genreId;
    }
}
