package com.thungphim.repository;

import com.thungphim.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Integer> {
    List<Favorite> findByProfileIdOrderByAddedAtDesc(Integer profileId);
    Optional<Favorite> findByProfileIdAndMovieId(Integer profileId, Integer movieId);
    void deleteByProfileIdAndMovieId(Integer profileId, Integer movieId);
}
