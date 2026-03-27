package com.thungphim.service;

import com.thungphim.entity.Notification;
import com.thungphim.repository.NotificationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public void createNotification(Integer userId, String type, String message) {
        if (userId == null) return;
        try {
            Notification n = new Notification();
            n.setUserId(userId);
            n.setType(type);
            n.setMessage(message);
            n.setIsRead(false);
            n.setCreatedAt(Instant.now());
            notificationRepository.save(n);
        } catch (Exception ignored) {}
    }

    public List<Notification> listByUser(Integer userId, boolean onlyUnread) {
        if (onlyUnread) {
            return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, PageRequest.of(0, 50));
        }
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 50));
    }

    public void markAllRead(Integer userId) {
        List<Notification> list = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, PageRequest.of(0, 1000));
        list.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(list);
    }
}
