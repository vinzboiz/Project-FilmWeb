package com.thungphim.repository;

import com.thungphim.entity.Cast;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CastRepository extends JpaRepository<Cast, Integer> {
    List<Cast> findByMovieId(Integer movieId);
    List<Cast> findByEpisodeId(Integer episodeId);
}
