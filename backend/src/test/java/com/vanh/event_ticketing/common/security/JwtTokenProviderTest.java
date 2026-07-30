package com.vanh.event_ticketing.common.security;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.vanh.event_ticketing.auth.entity.AuthProvider;
import com.vanh.event_ticketing.auth.entity.Role;
import com.vanh.event_ticketing.auth.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;

class JwtTokenProviderTest {
    @Test
    void generateAccessToken_shouldIncludeUserClaims() {
        JwtTokenProvider provider = new JwtTokenProvider("test-secret-value-must-be-at-least-32-chars-long", 900000);
        User user = user();

        String token = provider.generateAccessToken(user);
        SecretKey key = Keys.hmacShaKeyFor("test-secret-value-must-be-at-least-32-chars-long".getBytes(StandardCharsets.UTF_8));
        var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();

        assertEquals("42", claims.getSubject());
        assertEquals(42L, claims.get("userId", Long.class));
        assertEquals("alice@example.com", claims.get("email", String.class));
        assertEquals("CUSTOMER", claims.get("role", String.class));
        assertEquals("GOOGLE", claims.get("provider", String.class));
    }

    private static User user() {
        User user = new User();
        user.setId(42L);
        user.setEmail("alice@example.com");
        user.setProvider(AuthProvider.GOOGLE);
        Role role = new Role();
        role.setName("CUSTOMER");
        user.setRole(role);
        return user;
    }
}
