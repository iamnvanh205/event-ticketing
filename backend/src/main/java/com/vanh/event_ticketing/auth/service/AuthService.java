package com.vanh.event_ticketing.auth.service;

import com.vanh.event_ticketing.auth.dto.LoginRequest;
import com.vanh.event_ticketing.auth.dto.LoginResponse;
import com.vanh.event_ticketing.auth.dto.RegisterRequest;
import com.vanh.event_ticketing.auth.dto.UserResponse;
import com.vanh.event_ticketing.common.security.CustomUserDetails;
import com.vanh.event_ticketing.common.util.PageResponse;
import java.util.List;
import org.springframework.data.domain.Pageable;

public interface AuthService {
    AuthResult register(RegisterRequest request);

    AuthResult login(LoginRequest request);

    AuthResult googleLogin(String idToken);

    AuthResult refresh(String refreshToken);

    void logout(String refreshToken);

    UserResponse me(CustomUserDetails userDetails);

    UserResponse createStaff(Long eventId, RegisterRequest request, CustomUserDetails userDetails);

    List<UserResponse> listStaff(Long eventId, CustomUserDetails userDetails);

    void removeStaff(Long eventId, Long userId, CustomUserDetails userDetails);

    PageResponse<UserResponse> listUsers(Pageable pageable);

    UserResponse setUserStatus(Long id, boolean active);

    record AuthResult(LoginResponse loginResponse, String refreshToken) {
    }
}
