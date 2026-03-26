package com.thungphim.repository;

import com.thungphim.entity.SeriesGenre;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeriesGenreRepository extends JpaRepository<SeriesGenre, SeriesGenre.SeriesGenreId> {
    List<SeriesGenre> findBySeriesId(Integer seriesId);
    void deleteBySeriesId(Integer seriesId);
}
