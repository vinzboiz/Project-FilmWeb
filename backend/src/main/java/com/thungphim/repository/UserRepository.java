package com.thungphim.repository;

import com.thungphim.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    /** Lấy trạng thái khóa trực tiếp từ DB (tránh cache) */
    @Query("SELECT u.locked FROM User u WHERE u.id = :id")
    Optional<Boolean> findLockedById(@Param("id") Integer id);
}
