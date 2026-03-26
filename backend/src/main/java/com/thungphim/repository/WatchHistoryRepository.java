package com.thungphim.repository;

import com.thungphim.entity.WatchHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WatchHistoryRepository extends JpaRepository<WatchHistory, Integer> {
    List<WatchHistory> findByProfileIdOrderByWatchedAtDesc(Integer profileId, org.springframework.data.domain.Pageable pageable);
    Optional<WatchHistory> findByProfileIdAndMovieId(Integer profileId, Integer movieId);
    Optional<WatchHistory> findByProfileIdAndEpisodeId(Integer profileId, Integer episodeId);
}
