package com.thungphim.repository;

import com.thungphim.entity.ContentLike;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContentLikeRepository extends JpaRepository<ContentLike, ContentLike.ContentLikeId> {
    boolean existsByProfileIdAndContentTypeAndContentId(Integer profileId, String contentType, Integer contentId);
    void deleteByProfileIdAndContentTypeAndContentId(Integer profileId, String contentType, Integer contentId);
}
