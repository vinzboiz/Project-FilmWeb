package com.thungphim.repository;

import com.thungphim.entity.Episode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EpisodeRepository extends JpaRepository<Episode, Integer> {
    List<Episode> findBySeriesIdOrderBySeasonIdAscEpisodeNumberAsc(Integer seriesId);
}
