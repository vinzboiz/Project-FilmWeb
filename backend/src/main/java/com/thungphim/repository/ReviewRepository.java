package com.thungphim.repository;

import com.thungphim.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Integer> {
    List<Review> findByMovieIdOrderByCreatedAtDesc(Integer movieId);
    List<Review> findByEpisodeIdOrderByCreatedAtDesc(Integer episodeId);
    Optional<Review> findByProfileIdAndMovieId(Integer profileId, Integer movieId);
    Optional<Review> findByProfileIdAndEpisodeId(Integer profileId, Integer episodeId);
}
