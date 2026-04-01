package com.thungphim.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "content_likes")
@Data
@IdClass(ContentLike.ContentLikeId.class)
public class ContentLike {

    @Id
    @Column(name = "profile_id")
    private Integer profileId;

    @Id
    @Column(name = "content_type", length = 10)
    private String contentType;

    @Id
    @Column(name = "content_id")
    private Integer contentId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Data
    public static class ContentLikeId implements Serializable {
        private Integer profileId;
        private String contentType;
        private Integer contentId;
    }
}
