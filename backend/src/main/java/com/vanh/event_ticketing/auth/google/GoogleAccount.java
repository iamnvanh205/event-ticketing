package com.vanh.event_ticketing.auth.google;

public record GoogleAccount(
        String subject,
        String email,
        String name,
        String picture,
        boolean emailVerified
) {
}
