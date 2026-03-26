package com.thungphim.repository;

import com.thungphim.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Integer userId, org.springframework.data.domain.Pageable pageable);
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Integer userId, org.springframework.data.domain.Pageable pageable);
}
