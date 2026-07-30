package com.vanh.event_ticketing.auth.dto;

public record UserResponse(
        Long id,
        String email,
        String role,
        String provider,
        String fullName,
        String avatarUrl,
        Long assignedEventId,
        boolean active
) {
}
