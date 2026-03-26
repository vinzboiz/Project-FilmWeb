package com.thungphim.repository;

import com.thungphim.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WatchlistRepository extends JpaRepository<Watchlist, Integer> {
    List<Watchlist> findByProfileIdOrderByAddedAtDesc(Integer profileId);
    Optional<Watchlist> findByProfileIdAndMovieId(Integer profileId, Integer movieId);
    Optional<Watchlist> findByProfileIdAndSeriesId(Integer profileId, Integer seriesId);
    Optional<Watchlist> findByProfileIdAndEpisodeId(Integer profileId, Integer episodeId);
    void deleteByProfileIdAndMovieId(Integer profileId, Integer movieId);
    void deleteByProfileIdAndSeriesId(Integer profileId, Integer seriesId);
    void deleteByProfileIdAndEpisodeId(Integer profileId, Integer episodeId);
}
