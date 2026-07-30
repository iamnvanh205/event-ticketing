package com.vanh.event_ticketing.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vanh.event_ticketing.auth.dto.LoginResponse;
import com.vanh.event_ticketing.auth.entity.AuthProvider;
import com.vanh.event_ticketing.auth.entity.RefreshToken;
import com.vanh.event_ticketing.auth.entity.Role;
import com.vanh.event_ticketing.auth.entity.User;
import com.vanh.event_ticketing.auth.google.GoogleAccount;
import com.vanh.event_ticketing.auth.google.GoogleTokenVerifier;
import com.vanh.event_ticketing.auth.mapper.UserMapper;
import com.vanh.event_ticketing.auth.repository.RefreshTokenRepository;
import com.vanh.event_ticketing.auth.repository.RoleRepository;
import com.vanh.event_ticketing.auth.repository.UserRepository;
import com.vanh.event_ticketing.auth.service.AuthService.AuthResult;
import com.vanh.event_ticketing.auth.service.AuthServiceImpl;
import com.vanh.event_ticketing.common.security.JwtTokenProvider;
import com.vanh.event_ticketing.auth.dto.UserResponse;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceGoogleTest {
    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private UserMapper userMapper;
    @Mock private GoogleTokenVerifier googleTokenVerifier;

    @Test
    void googleLogin_shouldLinkExistingLocalUser() {
        AuthServiceImpl service = new AuthServiceImpl(
                userRepository,
                roleRepository,
                refreshTokenRepository,
                null,
                passwordEncoder,
                jwtTokenProvider,
                userMapper,
                googleTokenVerifier
        );
        GoogleAccount account = new GoogleAccount("google-sub-1", "alice@example.com", "Alice", "https://example.com/avatar.png", true);
        User user = localUser();
        when(googleTokenVerifier.verify("token")).thenReturn(account);
        when(userRepository.findByGoogleId("google-sub-1")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken(user)).thenReturn("jwt");
        when(userMapper.toResponse(user)).thenReturn(new UserResponse(1L, "alice@example.com", "CUSTOMER", "GOOGLE", "Alice", "https://example.com/avatar.png", null, true));
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthResult result = service.googleLogin("token");

        assertNotNull(result);
        assertEquals("jwt", result.loginResponse().accessToken());
        assertEquals(AuthProvider.GOOGLE, user.getProvider());
        assertEquals("google-sub-1", user.getGoogleId());
        assertEquals("Alice", user.getFullName());
        assertEquals("https://example.com/avatar.png", user.getAvatarUrl());
    }

    @Test
    void googleLogin_shouldCreateNewUserWhenNoLocalMatchExists() {
        AuthServiceImpl service = new AuthServiceImpl(
                userRepository,
                roleRepository,
                refreshTokenRepository,
                null,
                passwordEncoder,
                jwtTokenProvider,
                userMapper,
                googleTokenVerifier
        );
        GoogleAccount account = new GoogleAccount("google-sub-2", "bob@example.com", "Bob", null, true);
        Role role = customerRole();
        when(googleTokenVerifier.verify("token")).thenReturn(account);
        when(userRepository.findByGoogleId("google-sub-2")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.empty());
        when(roleRepository.findByName("CUSTOMER")).thenReturn(Optional.of(role));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateAccessToken(any())).thenReturn("jwt");
        when(userMapper.toResponse(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return new UserResponse(2L, u.getEmail(), u.getRole().getName(), u.getProvider().name(), u.getFullName(), u.getAvatarUrl(), null, true);
        });
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthResult result = service.googleLogin("token");

        assertEquals("jwt", result.loginResponse().accessToken());
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("bob@example.com", saved.getEmail());
        assertEquals("google-sub-2", saved.getGoogleId());
        assertEquals(AuthProvider.GOOGLE, saved.getProvider());
    }

    private static User localUser() {
        User user = new User();
        user.setId(1L);
        user.setEmail("alice@example.com");
        user.setFullName("Alice Local");
        user.setProvider(AuthProvider.LOCAL);
        user.setActive(true);
        return user;
    }

    private static Role customerRole() {
        Role role = new Role();
        role.setName("CUSTOMER");
        return role;
    }
}
