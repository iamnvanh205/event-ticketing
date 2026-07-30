package com.vanh.event_ticketing.auth.service;

import com.vanh.event_ticketing.auth.dto.LoginRequest;
import com.vanh.event_ticketing.auth.dto.LoginResponse;
import com.vanh.event_ticketing.auth.dto.RegisterRequest;
import com.vanh.event_ticketing.auth.dto.UserResponse;
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
import com.vanh.event_ticketing.common.exception.BusinessException;
import com.vanh.event_ticketing.common.exception.ErrorCode;
import com.vanh.event_ticketing.common.security.CustomUserDetails;
import com.vanh.event_ticketing.common.security.JwtTokenProvider;
import com.vanh.event_ticketing.common.util.PageResponse;
import com.vanh.event_ticketing.event.entity.Event;
import com.vanh.event_ticketing.event.repository.EventRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private static final String CUSTOMER_ROLE = "CUSTOMER";
    private static final String CHECKIN_STAFF_ROLE = "CHECKIN_STAFF";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EventRepository eventRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserMapper userMapper;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    @Override
    @Transactional
    public AuthResult register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        Role customerRole = roleRepository.findByName(CUSTOMER_ROLE)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setProvider(AuthProvider.LOCAL);
        user.setFullName(request.fullName().trim());
        user.setRole(customerRole);
        user.setActive(true);
        userRepository.save(user);
        return issueTokens(user);
    }

    @Override
    @Transactional
    public AuthResult login(LoginRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));

        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.USER_INACTIVE);
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        return issueTokens(user);
    }

    @Override
    @Transactional
    public AuthResult googleLogin(String idToken) {
        GoogleAccount account = googleTokenVerifier.verify(idToken);
        User user = findOrCreateGoogleUser(account);
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.USER_INACTIVE);
        }

        user.setGoogleId(account.subject());
        user.setProvider(AuthProvider.GOOGLE);
        user.setEmail(normalizeEmail(account.email()));
        user.setFullName(displayName(account));
        user.setAvatarUrl(account.picture());
        user.setLastLoginAt(Instant.now());
        return issueTokens(user);
    }

    @Override
    @Transactional
    public AuthResult refresh(String refreshToken) {
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash(refreshToken))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));

        if (stored.isRevoked()) {
            refreshTokenRepository.revokeAllForUser(stored.getUser().getId());
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_REUSE_DETECTED);
        }
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            stored.setRevoked(true);
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        if (!stored.getUser().isActive()) {
            throw new BusinessException(ErrorCode.USER_INACTIVE);
        }

        stored.setRevoked(true);
        return issueTokens(stored.getUser());
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(hash(refreshToken)).ifPresent(token -> token.setRevoked(true));
    }

    @Override
    public UserResponse me(CustomUserDetails userDetails) {
        return userMapper.toResponse(userDetails.getUser());
    }

    @Override
    @Transactional
    public UserResponse createStaff(Long eventId, RegisterRequest request, CustomUserDetails userDetails) {
        Event event = ownedEvent(eventId, userDetails);
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        Role role = roleRepository.findByName(CHECKIN_STAFF_ROLE)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setProvider(AuthProvider.LOCAL);
        user.setFullName(request.fullName().trim());
        user.setRole(role);
        user.setAssignedEventId(event.getId());
        user.setActive(true);
        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> listStaff(Long eventId, CustomUserDetails userDetails) {
        ownedEvent(eventId, userDetails);
        return userRepository.findByAssignedEventIdAndRole_NameAndActiveTrue(eventId, CHECKIN_STAFF_ROLE).stream()
                .map(userMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void removeStaff(Long eventId, Long userId, CustomUserDetails userDetails) {
        ownedEvent(eventId, userDetails);
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!CHECKIN_STAFF_ROLE.equals(user.getRole().getName()) || !eventId.equals(user.getAssignedEventId())) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        user.setActive(false);
        user.setAssignedEventId(null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> listUsers(Pageable pageable) {
        return PageResponse.from(userRepository.findAllByOrderByCreatedAtDesc(pageable).map(userMapper::toResponse));
    }

    @Override
    @Transactional
    public UserResponse setUserStatus(Long id, boolean active) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        user.setActive(active);
        return userMapper.toResponse(user);
    }

    private AuthResult issueTokens(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = newRefreshToken();

        RefreshToken entity = new RefreshToken();
        entity.setUser(user);
        entity.setTokenHash(hash(refreshToken));
        entity.setExpiresAt(Instant.now().plusMillis(refreshTokenExpirationMs));
        refreshTokenRepository.save(entity);

        return new AuthResult(new LoginResponse(accessToken, userMapper.toResponse(user)), refreshToken);
    }

    private String newRefreshToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private User findOrCreateGoogleUser(GoogleAccount account) {
        String email = normalizeEmail(account.email());
        Optional<User> byGoogleId = userRepository.findByGoogleId(account.subject());
        Optional<User> byEmail = userRepository.findByEmail(email);

        if (byGoogleId.isPresent() && byEmail.isPresent() && !byGoogleId.get().getId().equals(byEmail.get().getId())) {
            throw new BusinessException(ErrorCode.GOOGLE_ACCOUNT_CONFLICT);
        }
        if (byGoogleId.isPresent()) {
            return byGoogleId.get();
        }
        if (byEmail.isPresent()) {
            User user = byEmail.get();
            if (user.getGoogleId() != null && !user.getGoogleId().equals(account.subject())) {
                throw new BusinessException(ErrorCode.GOOGLE_ACCOUNT_CONFLICT);
            }
            return user;
        }

        Role customerRole = roleRepository.findByName(CUSTOMER_ROLE)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        User user = new User();
        user.setEmail(email);
        user.setGoogleId(account.subject());
        user.setProvider(AuthProvider.GOOGLE);
        user.setFullName(displayName(account));
        user.setAvatarUrl(account.picture());
        user.setLastLoginAt(Instant.now());
        user.setRole(customerRole);
        user.setActive(true);
        return userRepository.save(user);
    }

    private String displayName(GoogleAccount account) {
        if (account.name() != null && !account.name().isBlank()) {
            return account.name().trim();
        }
        String email = normalizeEmail(account.email());
        int atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : email;
    }

    private Event ownedEvent(Long eventId, CustomUserDetails userDetails) {
        Event event = eventRepository.findById(eventId).orElseThrow(() -> new BusinessException(ErrorCode.EVENT_NOT_FOUND));
        if (event.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.EVENT_NOT_FOUND);
        }
        if (!event.getOrganizer().getId().equals(userDetails.getId())) {
            throw new BusinessException(ErrorCode.EVENT_OWNERSHIP_VIOLATION);
        }
        return event;
    }
}
