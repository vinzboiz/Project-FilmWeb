package com.thungphim.repository;

import com.thungphim.entity.Movie;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MovieRepository extends JpaRepository<Movie, Integer> {

    @Query("SELECT m FROM Movie m WHERE m.trailerUrl IS NOT NULL AND m.trailerUrl != '' AND m.trailerUrl LIKE '/uploads/%' ORDER BY FUNCTION('RAND')")
    List<Movie> findRandomWithTrailer(Pageable pageable);

    @Query("SELECT m FROM Movie m ORDER BY m.rating DESC")
    List<Movie> findTopByRating(Pageable pageable);

    @Query("SELECT m FROM Movie m ORDER BY m.viewCount DESC")
    List<Movie> findTrending(Pageable pageable);
}
