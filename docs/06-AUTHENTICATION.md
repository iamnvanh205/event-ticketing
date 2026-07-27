# 06 - Xác Thực & Phân Quyền

## Mục lục

1. [Tổng quan cơ chế](#1-tổng-quan-cơ-chế)
2. [JWT — Access Token & Refresh Token](#2-jwt--access-token--refresh-token)
3. [Google OAuth2 (Customer)](#3-google-oauth2-customer)
4. [Refresh Token Rotation](#4-refresh-token-rotation)
5. [RBAC — Role-Based Access Control](#5-rbac--role-based-access-control)
6. [Ownership Check](#6-ownership-check)
7. [Password Policy](#7-password-policy)
8. [Quản lý tài khoản CHECKIN_STAFF](#8-quản-lý-tài-khoản-checkin_staff)
9. [Security Rules chung](#9-security-rules-chung)
10. [Nguyên tắc chung](#10-nguyên-tắc-chung)

---

## 1. Tổng quan cơ chế

| Thành phần | Lựa chọn |
|---|---|
| Cơ chế xác thực | JWT (access token + refresh token) |
| Đăng nhập Customer | Google OAuth2 hoặc email/password |
| Đăng nhập Organizer/Admin/Checkin Staff | Email/password |
| Access token TTL | 15 phút |
| Refresh token TTL | 7 ngày |
| Refresh token storage | Cookie `HttpOnly` |
| Refresh token rotation | Có |
| Phân quyền | RBAC theo 4 role cố định + kiểm tra ownership ở tầng Service |

**Design Consideration:** phương thức đăng nhập email/password cho `ORGANIZER`/`ADMIN`/`CHECKIN_STAFF` là giả định hợp lý dựa trên ngữ cảnh dự án, cần được xác nhận chính thức trước khi triển khai, vì nghiên cứu ban đầu chỉ chốt chắc chắn phần Customer dùng Google OAuth2.

## 2. JWT — Access Token & Refresh Token

| Token | TTL | Lưu ở đâu | Dùng để |
|---|---|---|---|
| **Access Token** | 15 phút | Bộ nhớ frontend (JS variable/state, không dùng localStorage) | Gửi kèm mọi API request qua header `Authorization: Bearer <token>` |
| **Refresh Token** | 7 ngày | Cookie `HttpOnly`, `Secure`, `SameSite=Strict` | Gọi `/auth/refresh` để lấy access token mới khi hết hạn |

```java
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secret;

    private static final long ACCESS_TOKEN_TTL = Duration.ofMinutes(15).toMillis();
    private static final long REFRESH_TOKEN_TTL = Duration.ofDays(7).toMillis();

    public String generateAccessToken(User user) {
        return Jwts.builder()
                .setSubject(user.getId().toString())
                .claim("role", user.getRole().getName())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + ACCESS_TOKEN_TTL))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }
}
```

Access token không được lưu tại `localStorage`/`sessionStorage` nhằm giảm rủi ro XSS — được giữ trong state của ứng dụng (React state/context), chấp nhận mất khi tải lại trang (tự động lấy lại qua `/auth/refresh` nhờ cookie).

## 3. Google OAuth2 (Customer)

Luồng Authorization Code chuẩn, sử dụng Spring Security OAuth2 Client:

```
Customer bấm "Đăng nhập với Google"
   → GET /auth/google (redirect tới Google consent screen)
   → Google redirect về GET /auth/google/callback?code=...
   → Backend đổi code lấy Google profile (email, name)
   → Tìm hoặc tạo User (role = CUSTOMER, google_id = <id Google>)
   → Sinh access token + refresh token như luồng thường
   → Redirect về frontend kèm access token (hoặc set cookie + redirect)
```

```yaml
# application.yml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope: [ email, profile ]
```

Tài khoản đăng ký qua Google OAuth2 có `password_hash = NULL`, `google_id` = ID Google. Nếu email đã tồn tại qua đăng ký thường (có `password_hash`), khuyến nghị liên kết tài khoản theo `email` thay vì tạo user trùng.

**Known Limitations:** chi tiết xử lý xung đột khi email đã tồn tại qua kênh đăng ký khác cần được xác nhận thêm khi triển khai thực tế.

## 4. Refresh Token Rotation

Mỗi lần gọi `/auth/refresh`, hệ thống cấp refresh token mới và vô hiệu hoá refresh token cũ ngay lập tức. Nếu một refresh token cũ (đã bị vô hiệu hoá) bị dùng lại, đây là dấu hiệu token bị đánh cắp, hệ thống sẽ từ chối toàn bộ và yêu cầu đăng nhập lại.

```java
@Transactional
public RefreshResult refresh(String oldRefreshToken) {
    RefreshToken stored = refreshTokenRepository.findByTokenHash(hash(oldRefreshToken))
            .orElseThrow(() -> new BusinessException(INVALID_REFRESH_TOKEN));

    if (stored.isRevoked()) {
        // token cũ đã bị rotate trước đó nhưng vẫn bị dùng lại → khả năng bị đánh cắp
        refreshTokenRepository.revokeAllForUser(stored.getUserId());
        throw new BusinessException(REFRESH_TOKEN_REUSE_DETECTED);
    }

    stored.setRevoked(true); // vô hiệu hoá token cũ
    RefreshToken newToken = issueNewRefreshToken(stored.getUserId());

    String newAccessToken = jwtTokenProvider.generateAccessToken(userService.getById(stored.getUserId()));
    return new RefreshResult(newAccessToken, newToken.getRawValue());
}
```

**Design Consideration:** khuyến nghị lưu hash (không lưu plaintext) của refresh token trong bảng riêng (ví dụ: `refresh_tokens`), có cột `revoked`, `expires_at`, `user_id`.

**Known Limitations:** bảng `refresh_tokens` chưa được liệt kê trong [`05-DATABASE.md`](./05-DATABASE.md) — cần bổ sung schema chi tiết khi triển khai.

## 5. RBAC — Role-Based Access Control

Hệ thống có 4 role cố định, mỗi role có tập quyền cố định (không phân quyền động/tuỳ biến):

| Role | Quyền chính |
|---|---|
| `ADMIN` | Toàn quyền: quản lý user, khoá/mở tài khoản, xem toàn bộ event |
| `ORGANIZER` | CRUD event/ticket-type của chính mình, tạo Checkin Staff, xem dashboard event của mình |
| `CHECKIN_STAFF` | Check-in vé thuộc event được gán, xem lịch sử check-in của event đó |
| `CUSTOMER` | Đặt vé, xem vé của chính mình |

```java
@PreAuthorize("hasRole('ORGANIZER')")
@PostMapping("/events")
public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventRequest request) { ... }

@PreAuthorize("hasAnyRole('ADMIN')")
@GetMapping("/users")
public ResponseEntity<PageResponse<UserResponse>> listUsers(Pageable pageable) { ... }
```

## 6. Ownership Check

Cơ chế RBAC theo role là chưa đủ — hệ thống áp dụng thêm 2 tình huống bắt buộc kiểm tra quyền sở hữu ở tầng Service, không chỉ dựa vào `@PreAuthorize` theo role:

### 6.1. Organizer chỉ sửa/xoá event của chính mình

```java
@Transactional
public EventResponse updateEvent(Long eventId, EventRequest request, Long currentUserId) {
    Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new BusinessException(EVENT_NOT_FOUND));

    if (!event.getOrganizerId().equals(currentUserId)) {
        throw new BusinessException(EVENT_OWNERSHIP_VIOLATION); // 403
    }
    // ... cập nhật
}
```

Organizer A không được sửa/xoá event của Organizer B, dù cả hai cùng role `ORGANIZER`.

### 6.2. Checkin Staff chỉ check-in vé thuộc event được gán

```java
@Transactional
public CheckInResult checkIn(CheckInRequest request, Long staffId) {
    User staff = userRepository.findById(staffId).orElseThrow();
    Ticket ticket = ticketRepository.findByQrCode(request.getQrCode())
            .orElseThrow(() -> new BusinessException(TICKET_NOT_FOUND));

    Long ticketEventId = ticket.getTicketType().getEvent().getId();
    if (!ticketEventId.equals(staff.getAssignedEventId())) {
        throw new BusinessException(CHECKIN_STAFF_EVENT_MISMATCH); // 403
    }
    // ... tiếp tục luồng check-in (conditional update)
}
```

Checkin Staff chỉ được check-in vé thuộc event mà mình được gán, không được check-in vé của event khác — kể cả khi biết mã QR hợp lệ của event khác.

## 7. Password Policy

Áp dụng mức tối thiểu hợp lý (dự án cá nhân, không cần chính sách nặng nề):

- Tối thiểu 8 ký tự
- Không yêu cầu bắt buộc ký tự đặc biệt/hoa/số
- Hash bằng BCrypt (`BCryptPasswordEncoder`, strength mặc định 10)

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

```java
public record RegisterRequest(
    @Email @NotBlank String email,
    @NotBlank @Size(min = 8) String password,
    @NotBlank String fullName
) {}
```

## 8. Quản lý tài khoản CHECKIN_STAFF

- `CHECKIN_STAFF` không tự đăng ký. Tài khoản được ORGANIZER chủ động tạo, gán ngay vào một event cụ thể của mình (`POST /events/{eventId}/staff`, xem [`04-API.md`](./04-API.md#11-module-userstaff)).
- Mỗi `CHECKIN_STAFF` gắn với đúng một event tại một thời điểm (cột `users.assigned_event_id`), phù hợp với MVP. Phân quyền theo nhiều cổng cụ thể (multi-gate) được để ở giai đoạn mở rộng sau (`staff_gate_assignments`, xem [`05-DATABASE.md`](./05-DATABASE.md#15-định-hướng-mở-rộng-staff_gate_assignments)).

## 9. Security Rules chung

- Mọi endpoint mặc định yêu cầu xác thực, trừ khi khai báo rõ `permitAll()` (ví dụ: `/auth/login`, `/auth/register`, `GET /events` công khai).
- CORS: chỉ cho phép origin của frontend (`https://event-ticketing.vercel.app` production, `http://localhost:5173` local).
- Mọi secret (JWT signing key, Google Client Secret, Cloudinary key) lấy từ biến môi trường, không hardcode, không commit vào Git — xem [`11-DEPLOYMENT.md`](./11-DEPLOYMENT.md#6-secrets-management).
- Access token ký bằng thuật toán HS256 với secret đủ mạnh (tối thiểu 256-bit), đọc từ biến môi trường `JWT_SECRET`.

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable) // dùng JWT, không cần CSRF token cho API stateless
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/events/**").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

## 10. Nguyên tắc chung

- Không tin `role` gửi lên từ client — luôn lấy `role` từ JWT claim đã ký, không từ request body.
- Ownership check luôn thực hiện ở tầng Service, không ở Controller, để đảm bảo áp dụng nhất quán kể cả khi có nhiều entrypoint gọi cùng Service.
- Refresh token luôn dùng cookie `HttpOnly` + `Secure` (bắt buộc HTTPS ở production) — không bao giờ trả refresh token trong JSON body.
- Ghi log (`WARN`) mọi lần từ chối do ownership/permission để dễ điều tra khi có hành vi bất thường.