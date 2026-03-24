package com.thungphim.repository;

import com.thungphim.entity.MovieGenre;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MovieGenreRepository extends JpaRepository<MovieGenre, MovieGenre.MovieGenreId> {
    List<MovieGenre> findByMovieId(Integer movieId);
    void deleteByMovieId(Integer movieId);
}
