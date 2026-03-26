package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.io.Serializable;

@Entity
@Table(name = "movie_genres")
@Data
@IdClass(MovieGenre.MovieGenreId.class)
public class MovieGenre {

    @Id
    @Column(name = "movie_id")
    private Integer movieId;

    @Id
    @Column(name = "genre_id")
    private Integer genreId;

    @Data
    public static class MovieGenreId implements Serializable {
        private Integer movieId;
        private Integer genreId;
    }
}
