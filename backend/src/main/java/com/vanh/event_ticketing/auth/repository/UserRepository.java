package com.vanh.event_ticketing.auth.repository;

import com.vanh.event_ticketing.auth.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = "role")
    Optional<User> findById(Long id);

    @EntityGraph(attributePaths = "role")
    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = "role")
    Optional<User> findByGoogleId(String googleId);

    @EntityGraph(attributePaths = "role")
    List<User> findByAssignedEventIdAndRole_NameAndActiveTrue(Long assignedEventId, String roleName);

    @EntityGraph(attributePaths = "role")
    Page<User> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
