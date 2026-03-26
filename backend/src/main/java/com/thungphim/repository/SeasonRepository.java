package com.thungphim.repository;

import com.thungphim.entity.Season;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeasonRepository extends JpaRepository<Season, Integer> {
    List<Season> findBySeriesIdOrderBySeasonNumberAsc(Integer seriesId);
}
