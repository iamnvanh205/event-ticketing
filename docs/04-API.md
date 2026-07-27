# 04 - Đặc Tả API

## Mục lục

1. [Quy ước chung](#1-quy-ước-chung)
2. [Versioning](#2-versioning)
3. [Pagination, Sorting, Filtering](#3-pagination-sorting-filtering)
4. [Module: auth](#4-module-auth)
5. [Module: event](#5-module-event)
6. [Module: ticket-type](#6-module-ticket-type)
7. [Module: ticket](#7-module-ticket)
8. [Module: checkin](#8-module-checkin)
9. [Module: gate](#9-module-gate)
10. [Module: dashboard](#10-module-dashboard)
11. [Module: user/staff](#11-module-userstaff)
12. [File Upload](#12-file-upload)
13. [Rate Limit](#13-rate-limit)

---

## 1. Quy ước chung

- Base URL: `https://api.event-ticketing.dev/api/v1` (production), `http://localhost:8080/api/v1` (local)
- Content-Type: `application/json` (trừ upload file: `multipart/form-data`)
- Xác thực: header `Authorization: Bearer <access_token>` cho mọi endpoint trừ đăng nhập/đăng ký/refresh
- Response thành công: trả thẳng `data`, không bọc envelope (xem [`03-CODING-STANDARDS.md`](./03-CODING-STANDARDS.md#4-định-dạng-response))
- Response lỗi: RFC 7807 Problem Details (xem [`09-ERROR-CODES.md`](./09-ERROR-CODES.md))
- Timestamp: ISO-8601 UTC (`2026-09-01T09:00:00Z`)

## 2. Versioning

Version nằm trong URL: `/api/v1/...`. Khi có breaking change, tạo `/api/v2/...` song song, không sửa trực tiếp `v1`.

## 3. Pagination, Sorting, Filtering

Sử dụng **Spring Data `Pageable`** mặc định cho mọi endpoint danh sách:

```
GET /api/v1/events?page=0&size=20&sort=startTime,desc
```

| Param | Mô tả | Mặc định |
|---|---|---|
| `page` | Số trang, bắt đầu từ 0 | `0` |
| `size` | Số item/trang | `20` (tối đa `100`) |
| `sort` | `<field>,<asc\|desc>`, có thể lặp nhiều lần | tuỳ endpoint |

Response danh sách:

```json
{
  "content": [ { "...": "..." } ],
  "page": 0,
  "size": 20,
  "totalElements": 57,
  "totalPages": 3
}
```

Filtering: sử dụng query param riêng theo từng field hỗ trợ, khai báo tại từng endpoint tương ứng bên dưới (ví dụ: `status`, `organizerId`).

---

## 4. Module: auth

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Đăng ký tài khoản (Customer, email/password) |
| `POST` | `/auth/login` | Public | Đăng nhập email/password |
| `GET` | `/auth/google` | Public | Bắt đầu luồng Google OAuth2 (redirect) |
| `GET` | `/auth/google/callback` | Public | Callback Google OAuth2, trả JWT |
| `POST` | `/auth/refresh` | Public (cần cookie refresh token) | Cấp access token mới, rotate refresh token |
| `POST` | `/auth/logout` | Authenticated | Vô hiệu hoá refresh token hiện tại |
| `GET` | `/auth/me` | Authenticated | Lấy thông tin user hiện tại |

**Design Consideration:** phương thức đăng nhập cho `ORGANIZER`/`ADMIN`/`CHECKIN_STAFF` được giả định là email/password (không qua Google OAuth2, vốn chỉ dành cho `CUSTOMER`). Giả định này cần được xác nhận chính thức trước khi triển khai — nếu đúng, `/auth/register` public chỉ áp dụng cho `CUSTOMER`; tài khoản `ORGANIZER`/`ADMIN`/`CHECKIN_STAFF` được tạo qua kênh khác (xem mục 11).

### POST /auth/login

```json
// Request
{ "email": "customer@example.com", "password": "SecurePass1" }

// 200 OK
{
  "accessToken": "eyJhbGciOi...",
  "user": { "id": 10, "email": "customer@example.com", "role": "CUSTOMER", "fullName": "Nguyen Van A" }
}
// Refresh token được set qua Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict
```

### POST /auth/refresh

```json
// Request: không cần body, refresh token lấy từ cookie HttpOnly
// 200 OK
{
  "accessToken": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "email": "organizer@example.com",
    "role": "ORGANIZER",
    "fullName": "Organizer"
  }
}
// Set-Cookie: refresh_token=<token_mới>; ... (rotation — token cũ bị vô hiệu hoá)
```

Chi tiết TTL, rotation, RBAC: xem [`06-AUTHENTICATION.md`](./06-AUTHENTICATION.md).

---

## 5. Module: event

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| `POST` | `/events` | ORGANIZER | Tạo event mới |
| `GET` | `/events` | Public/Authenticated | Danh sách event (filter `status`, `organizerId`) |
| `GET` | `/events/{id}` | Public/Authenticated | Chi tiết event |
| `PUT` | `/events/{id}` | ORGANIZER (owner) | Cập nhật event |
| `DELETE` | `/events/{id}` | ORGANIZER (owner) | Soft delete event |
| `POST` | `/events/{id}/banner` | ORGANIZER (owner) | Upload banner (xem mục 12) |

### POST /events

```json
// Request
{
  "name": "Tech Conference 2026",
  "description": "Sự kiện công nghệ thường niên",
  "location": "Hanoi, Vietnam",
  "startTime": "2026-09-01T09:00:00Z",
  "endTime": "2026-09-01T18:00:00Z"
}

// 201 Created
{
  "id": 42,
  "name": "Tech Conference 2026",
  "organizerId": 5,
  "status": "DRAFT",
  "startTime": "2026-09-01T09:00:00Z",
  "endTime": "2026-09-01T18:00:00Z",
  "bannerUrl": null,
  "createdAt": "2026-07-01T10:00:00Z"
}
```

### PUT /events/{id} — Kiểm tra ownership

Chỉ `ORGANIZER` là chủ sở hữu event mới được sửa/xoá. `ORGANIZER` khác nhận `403 Forbidden` (`errorCode: EVENT_OWNERSHIP_VIOLATION`) dù cùng role. Xem [`06-AUTHENTICATION.md`](./06-AUTHENTICATION.md#6-ownership-check).

---

## 6. Module: ticket-type

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| `POST` | `/events/{eventId}/ticket-types` | ORGANIZER (owner) | Tạo loại vé cho event |
| `GET` | `/events/{eventId}/ticket-types` | Public/Authenticated | Danh sách loại vé của event |
| `GET` | `/ticket-types/{id}` | Public/Authenticated | Chi tiết loại vé |
| `PUT` | `/ticket-types/{id}` | ORGANIZER (owner) | Cập nhật loại vé (giá không đổi sau khi mở bán — xem quy tắc nghiệp vụ) |

### POST /events/{eventId}/ticket-types

```json
// Request
{ "name": "Vé VIP", "price": 500000, "quantityTotal": 20,
  "salesStartAt": "2026-07-15T00:00:00Z", "salesEndAt": "2026-08-31T23:59:59Z" }

// 201 Created
{
  "id": 101, "eventId": 42, "name": "Vé VIP",
  "price": 500000, "quantityTotal": 20, "quantityRemaining": 20,
  "salesStartAt": "2026-07-15T00:00:00Z", "salesEndAt": "2026-08-31T23:59:59Z"
}
```

Quy tắc sửa `quantityTotal` (không cho giảm dưới số đã bán/giữ chỗ), giá vé cố định sau khi mở bán: xem [`07-BUSINESS-RULES.md`](./07-BUSINESS-RULES.md).

---

## 7. Module: ticket

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| `POST` | `/tickets/reserve` | CUSTOMER | Giữ chỗ vé (bước 1) |
| `POST` | `/tickets/{id}/confirm` | CUSTOMER (owner) | Xác nhận vé (bước 2), sinh QR |
| `POST` | `/tickets/{id}/cancel` | CUSTOMER (owner) | Huỷ chủ động khi đang `RESERVED` |
| `GET` | `/tickets/my` | CUSTOMER | Danh sách vé của khách hàng hiện tại |
| `GET` | `/tickets/{id}` | CUSTOMER (owner) | Chi tiết vé |
| `GET` | `/tickets/{id}/qr` | CUSTOMER (owner) | Ảnh QR sinh on-the-fly (PNG) |

### POST /tickets/reserve

**Header bắt buộc:** `Idempotency-Key: <uuid>` (xem [`07-BUSINESS-RULES.md#5-idempotency`](./07-BUSINESS-RULES.md#5-idempotency))

```json
// Request
{ "ticketTypeId": 101, "quantity": 2 }

// 201 Created
{
  "id": 5001, "ticketTypeId": 101, "status": "RESERVED",
  "quantity": 2, "expiresAt": "2026-08-20T10:07:00Z",
  "reservedAt": "2026-08-20T10:00:00Z"
}

// 409 Conflict (hết vé)
{
  "type": "https://event-ticketing.dev/errors/TICKET_SOLD_OUT",
  "title": "Ticket Sold Out", "status": 409,
  "detail": "Loại vé 'Vé VIP' không còn đủ số lượng yêu cầu.",
  "instance": "/api/v1/tickets/reserve", "errorCode": "TICKET_SOLD_OUT"
}
```

### POST /tickets/{id}/confirm

```json
// 200 OK
{
  "id": 5001, "status": "CONFIRMED", "qrCode": "a1b2c3d4-...-uuid",
  "confirmedAt": "2026-08-20T10:05:00Z"
}

// 409 Conflict (đã hết hạn)
{
  "type": "https://event-ticketing.dev/errors/RESERVATION_EXPIRED",
  "title": "Reservation Expired", "status": 409,
  "detail": "Thời gian giữ chỗ đã hết hạn, vui lòng đặt lại.",
  "instance": "/api/v1/tickets/5001/confirm", "errorCode": "RESERVATION_EXPIRED"
}
```

Toàn bộ luồng Reserve → Confirm và cơ chế chống oversell được mô tả tại [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md#6-luồng-đặt-vé-reserve--confirm).

---

## 8. Module: checkin

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| `POST` | `/checkin` | CHECKIN_STAFF | Check-in bằng mã QR quét được |
| `GET` | `/checkin/logs` | ORGANIZER (owner)/CHECKIN_STAFF | Lịch sử check-in (filter `gateId`, `from`, `to`) |

### POST /checkin

```json
// Request
{ "qrCode": "a1b2c3d4-...-uuid", "gateId": 7 }

// 200 OK
{ "ticketId": 5001, "status": "CHECKED_IN", "checkedInAt": "2026-09-01T09:03:00Z", "gateId": 7 }

// 409 Conflict (quét lại lần 2)
{
  "type": "https://event-ticketing.dev/errors/TICKET_ALREADY_CHECKED_IN",
  "title": "Ticket Already Checked In", "status": 409,
  "detail": "Vé này đã được check-in trước đó lúc 09:01:12.",
  "instance": "/api/v1/checkin", "errorCode": "TICKET_ALREADY_CHECKED_IN"
}
```

`CHECKIN_STAFF` chỉ được check-in vé thuộc event mình được gán — vi phạm trả về `403` (`errorCode: CHECKIN_STAFF_EVENT_MISMATCH`). Xem [`06-AUTHENTICATION.md`](./06-AUTHENTICATION.md#6-ownership-check).

### GET /checkin/logs

```
GET /api/v1/checkin/logs?gateId=7&from=2026-09-01T00:00:00Z&to=2026-09-01T23:59:59Z&page=0&size=20
```

```json
{
  "content": [
    { "id": 9001, "ticketId": 5001, "gateId": 7, "staffId": 12,
      "result": "SUCCESS", "checkedInAt": "2026-09-01T09:03:00Z" },
    { "id": 9002, "ticketId": 5001, "gateId": 7, "staffId": 13,
      "result": "DUPLICATE", "checkedInAt": "2026-09-01T09:05:00Z" }
  ],
  "page": 0, "size": 20, "totalElements": 2, "totalPages": 1
}
```

---

## 9. Module: gate

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| `POST` | `/events/{eventId}/gates` | ORGANIZER (owner) | Tạo cổng check-in cho event |
| `GET` | `/events/{eventId}/gates` | ORGANIZER (owner)/CHECKIN_STAFF | Danh sách cổng của event |
| `PUT` | `/gates/{id}` | ORGANIZER (owner) | Cập nhật tên cổng |
| `DELETE` | `/gates/{id}` | ORGANIZER (owner) | Xoá cổng |

```json
// POST /events/42/gates
// Request
{ "name": "Cổng A" }

// 201 Created
{ "id": 7, "eventId": 42, "name": "Cổng A" }
```

---

## 10. Module: dashboard

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| `GET` | `/events/{eventId}/dashboard` | ORGANIZER (owner) | Snapshot số liệu hiện tại (REST, dùng khi mới tải trang) |
| WebSocket (STOMP) | `/topic/dashboard/{eventId}` | ORGANIZER (owner) | Đẩy số liệu real-time toàn event |
| WebSocket (STOMP) | `/topic/dashboard/{eventId}/{gateId}` | ORGANIZER (owner) | Đẩy số liệu real-time theo cổng |

### GET /events/{eventId}/dashboard

```json
{
  "eventId": 42,
  "totalTicketsSold": 850,
  "totalCheckedIn": 320,
  "totalRemaining": 150,
  "byGate": [
    { "gateId": 7, "gateName": "Cổng A", "checkedIn": 200 },
    { "gateId": 8, "gateName": "Cổng B", "checkedIn": 120 }
  ]
}
```

### WebSocket message (STOMP frame gửi tới `/topic/dashboard/42`)

```json
{
  "eventId": 42, "gateId": 7,
  "totalCheckedIn": 321, "gateCheckedIn": 201,
  "timestamp": "2026-09-01T09:03:00Z"
}
```

Kết nối WebSocket yêu cầu access token qua header STOMP CONNECT (`Authorization: Bearer <token>`). Xem cấu hình tại [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md#10-dashboard-real-time-websocketstomp).

---

## 11. Module: user/staff

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| `POST` | `/events/{eventId}/staff` | ORGANIZER (owner) | Tạo tài khoản `CHECKIN_STAFF`, gán vào event này |
| `GET` | `/events/{eventId}/staff` | ORGANIZER (owner) | Danh sách staff của event |
| `DELETE` | `/events/{eventId}/staff/{userId}` | ORGANIZER (owner) | Gỡ/xoá staff khỏi event |
| `GET` | `/users` | ADMIN | Danh sách toàn bộ user hệ thống |
| `PUT` | `/users/{id}/status` | ADMIN | Khoá/mở khoá tài khoản |

### POST /events/{eventId}/staff

```json
// Request
{ "email": "staff1@example.com", "password": "TempPass123", "fullName": "Tran Thi B" }

// 201 Created
{ "id": 30, "email": "staff1@example.com", "role": "CHECKIN_STAFF", "assignedEventId": 42 }
```

Xem Design Consideration ở mục 4 liên quan tới phương thức xác thực của role này.

---

## 12. File Upload

Upload banner sự kiện, lưu trữ trên **Cloudinary** (backend nhận file, upload lên Cloudinary, lưu `bannerUrl` trả về vào `events.banner_url`).

```
POST /api/v1/events/{id}/banner
Content-Type: multipart/form-data

file: <binary image, jpg/png, tối đa 5MB>
```

```json
// 200 OK
{ "id": 42, "bannerUrl": "https://res.cloudinary.com/.../event-42-banner.jpg" }
```

## 13. Rate Limit

**Known Limitations:** giá trị rate limit cụ thể cho MVP chưa được chốt chính thức (dự án quy mô nhỏ, phục vụ cá nhân và người dùng thử nghiệm). Bảng dưới đây là đề xuất tạm thời, cần xác nhận trước khi áp dụng:

| Endpoint nhóm | Đề xuất |
|---|---|
| `/auth/login`, `/auth/register` | 10 request/phút/IP |
| `/tickets/reserve` | 20 request/phút/user |
| `/checkin` | không giới hạn (thiết bị nội bộ tại cổng) |

Có thể triển khai bằng Bucket4j hoặc filter đơn giản ở tầng Spring Security nếu được xác nhận cần thiết cho MVP.