# 01 - Kiến Trúc Hệ Thống

## Mục lục

1. [Kiến trúc tổng thể](#1-kiến-trúc-tổng-thể)
2. [Lý do lựa chọn Modular Monolith](#2-lý-do-lựa-chọn-modular-monolith)
3. [Sơ đồ kiến trúc tổng thể](#3-sơ-đồ-kiến-trúc-tổng-thể)
4. [Ranh giới module (module boundaries)](#4-ranh-giới-module-module-boundaries)
5. [Layered Architecture trong từng module](#5-layered-architecture-trong-từng-module)
6. [Luồng đặt vé: Reserve → Confirm](#6-luồng-đặt-vé-reserve--confirm)
7. [Cơ chế hết hạn giữ chỗ (reservation expiry)](#7-cơ-chế-hết-hạn-giữ-chỗ-reservation-expiry)
8. [Concurrency control — chống oversell](#8-concurrency-control--chống-oversell)
9. [Concurrency control — chống double check-in](#9-concurrency-control--chống-double-check-in)
10. [Dashboard real-time (WebSocket/STOMP)](#10-dashboard-real-time-websocketstomp)
11. [Định hướng tách Microservices trong tương lai](#11-định-hướng-tách-microservices-trong-tương-lai)
12. [Nguyên tắc thiết kế bắt buộc](#12-nguyên-tắc-thiết-kế-bắt-buộc)

---

## 1. Kiến trúc tổng thể

Hệ thống được thiết kế theo mô hình **Modular Monolith** — một service Spring Boot duy nhất, chạy trong một tiến trình (process), với code được tổ chức thành các module domain rõ ràng, tách biệt: `event`, `ticket`, `checkin`, `auth`, `dashboard`, `gate`.

Bên trong mỗi module áp dụng **Layered Architecture đơn giản**: `Controller → Service → Repository`.

| Đặc tính | Giá trị |
|---|---|
| Kiểu kiến trúc | Modular Monolith |
| Số service khi deploy | 1 (backend) + 1 (frontend, tách riêng) |
| Kiểu phân lớp nội bộ | Layered (Controller → Service → Repository) |
| Database | 1 database PostgreSQL duy nhất, dùng chung transaction |

## 2. Lý do lựa chọn Modular Monolith

Lý do kỹ thuật cốt lõi là duy trì cơ chế **pessimistic lock** (`SELECT ... FOR UPDATE`) hoạt động trong đúng một database transaction Postgres duy nhất — đây là nền tảng của cơ chế chống oversell và chống double check-in, vốn là trọng tâm kỹ thuật của dự án.

Trong trường hợp tách thành Microservices thật sự (ví dụ: `ticket-service` và `checkin-service` là hai process với hai database riêng), thao tác lock và transaction sẽ bị phá vỡ, cần áp dụng **distributed lock** hoặc **Saga pattern** để đảm bảo tính nhất quán. Điều này làm tăng độ phức tạp không cần thiết và lệch trọng tâm kỹ thuật hiện tại (concurrency control ở tầng database, không phải distributed systems).

Kiến trúc Modular Monolith vẫn giữ ranh giới module rõ ràng ngay từ đầu (xem mục 4), nhằm đảm bảo việc tách thành Microservices trong tương lai (nếu cần) chỉ là thao tác "cắt" module ra thành service riêng, không phải viết lại từ đầu.

## 3. Sơ đồ kiến trúc tổng thể

```
                              ┌──────────────────────────────┐
                              │        Frontend (SPA)        │
                              │  React + Vite + TypeScript   │
                              │  Tailwind + shadcn/ui        │
                              │  @stomp/stompjs (WS client)  │
                              └──────────────┬───────────────┘
                                             │ HTTPS (REST /api/v1/*)
                                             │ WSS (STOMP /ws)
                                             ▼
                    ┌───────────────────────────────────────────────────┐
                    │             Backend — Spring Boot 3.5 (1 process) │
                    │                                                   │
                    │   ┌───────────┐  ┌───────────┐  ┌───────────┐     │
                    │   │   auth    │  │   event   │  │  ticket   │     │
                    │   │  module   │  │  module   │  │  module   │     │
                    │   └───────────┘  └───────────┘  └───────────┘     │
                    │   ┌───────────┐  ┌───────────┐  ┌───────────┐     │
                    │   │  checkin  │  │dashboard  │  │   gate    │     │
                    │   │  module   │  │  module   │  │  module   │     │
                    │   └───────────┘  └───────────┘  └───────────┘     │
                    │                                                   │
                    │   ┌─────────────────────────────────────────┐     │
                    │   │   common/shared (exception handler,     │     │
                    │   │   security config, base entity, util)   │     │
                    │   └─────────────────────────────────────────┘     │
                    │                                                   │
                    │   In-memory STOMP broker (Spring built-in)        │
                    └───────────────────────┬───────────────────────────┘
                                             │ JDBC (connection pool)
                                             ▼
                              ┌────────────────────────────┐
                              │   PostgreSQL (Neon)        │
                              │   - pooled conn (runtime)  │
                              │   - direct conn (migration)│
                              └────────────────────────────┘

                    External services: Google OAuth2, Cloudinary (banner ảnh)
```

## 4. Ranh giới module (module boundaries)

| Module | Trách nhiệm | Entity chính |
|---|---|---|
| `auth` | Đăng nhập/đăng ký, JWT issue/refresh, Google OAuth2, quản lý user/role | `User`, `Role` |
| `event` | CRUD Event, quản lý loại vé (`TicketType`) | `Event`, `TicketType` |
| `ticket` | Reserve/Confirm/Cancel vé, sinh QR | `Ticket` |
| `checkin` | Xử lý quét QR, ghi `CheckInLog`, chống double check-in | `CheckInLog` |
| `gate` | Quản lý cổng check-in của event | `Gate` |
| `dashboard` | Tổng hợp số liệu real-time, đẩy WebSocket | (đọc từ các module khác, không có entity riêng) |

**Quy tắc bắt buộc:** module không được truy cập trực tiếp Repository của module khác. Nếu module A cần dữ liệu của module B, phải gọi qua Service interface public của module B. Quy tắc này đảm bảo việc tách Microservices sau này (nếu cần) chỉ cần thay lời gọi Service nội bộ bằng lời gọi REST/message queue.

## 5. Layered Architecture trong từng module

```
Controller  →  Service (interface + Impl)  →  Repository  →  Database
    │                    │
    │                    └─▶ ném BusinessException khi vi phạm quy tắc nghiệp vụ
    │
    └─▶ nhận request, validate cấu trúc (@Valid), map DTO ↔ Entity qua Mapper
```

- **Controller**: chỉ nhận request, validate cấu trúc dữ liệu cơ bản (Bean Validation), gọi Service, trả response. Không chứa business logic.
- **Service**: chứa toàn bộ business logic, transaction boundary (`@Transactional`), kiểm tra ownership, ném `BusinessException` khi vi phạm quy tắc nghiệp vụ.
- **Repository**: Spring Data JPA, chỉ chứa truy vấn dữ liệu (bao gồm các câu lock query đặc biệt như `SELECT ... FOR UPDATE`).

Chi tiết quy ước đặt tên của từng layer được mô tả tại [`03-CODING-STANDARDS.md`](./03-CODING-STANDARDS.md).

## 6. Luồng đặt vé: Reserve → Confirm

Việc đặt vé không thực hiện trong một bước duy nhất, mà tách thành hai bước nhằm tránh giữ transaction quá lâu và cho phép khách hàng có thời gian xác nhận:

```
Customer                Backend                             Database
   │                       │                                   │
   │──POST /reserve───────▶│                                   │
   │                       │──BEGIN TX────────────────────────▶│
   │                       │──SELECT ticket_type FOR UPDATE───▶│
   │                       │──kiểm tra quantity_remaining──────│
   │                       │──trừ quantity_remaining──────────▶│
   │                       │──INSERT ticket (status=RESERVED,  │
   │                       │   expires_at = now()+5..10min)───▶│
   │                       │──COMMIT TX───────────────────────▶│
   │◀──201 Created─────────│                                   │
   │   (ticket RESERVED)   │                                   │
   │                       │                                   │
   │──POST /confirm───────▶│                                   │
   │                       │──kiểm tra chưa hết hạn────────────│
   │                       │──UPDATE status=CONFIRMED─────────▶│
   │                       │──sinh qr_code (UUID)─────────────▶│
   │◀──200 OK──────────────│                                   │
   │   (ticket CONFIRMED,  │                                   │
   │    QR sẵn sàng)       │                                   │
```

- **Reserve**: trừ tạm `quantity_remaining`, tạo `Ticket` trạng thái `RESERVED`, đặt `expires_at` = thời điểm reserve + 5–10 phút (giá trị có thể cấu hình, mặc định khuyến nghị **7 phút**).
- **Confirm**: khách hàng chủ động xác nhận trong thời hạn giữ chỗ, hệ thống chuyển trạng thái sang `CONFIRMED`, sinh `qr_code`.
- Trường hợp không confirm kịp trong thời hạn, vé tự động chuyển trạng thái `EXPIRED`, chỗ được trả lại cho loại vé tương ứng (xem mục 7).

Chi tiết đầy đủ về quy tắc nghiệp vụ (giới hạn mua vé, huỷ chủ động...) được mô tả tại [`07-BUSINESS-RULES.md`](./07-BUSINESS-RULES.md).

## 7. Cơ chế hết hạn giữ chỗ (reservation expiry)

Hệ thống áp dụng kết hợp cả hai cơ chế nhằm đảm bảo tính đúng đắn của dữ liệu ngay khi có truy vấn, đồng thời đảm bảo dữ liệu sạch kể cả khi không có request nào chạm tới:

### 7.1. Lazy check tại thời điểm truy vấn

Mỗi khi có request chạm tới một `Ticket` đang ở trạng thái `RESERVED` (ví dụ: request Confirm, hoặc request Reserve khác đọc `quantity_remaining`), backend kiểm tra `expires_at`:

```java
if (ticket.getStatus() == RESERVED && ticket.getExpiresAt().isBefore(Instant.now())) {
    // Coi như đã hết hạn, giải phóng ngay trong transaction hiện tại
    ticket.setStatus(EXPIRED);
    ticketType.setQuantityRemaining(ticketType.getQuantityRemaining() + 1);
}
```

### 7.2. Scheduled job dọn định kỳ

```java
@Scheduled(fixedRate = 60_000) // chạy mỗi 60 giây
@Transactional
public void releaseExpiredReservations() {
    // SELECT các ticket RESERVED có expires_at < now(), FOR UPDATE theo ticket_type
    // để đảm bảo cùng cơ chế lock với luồng Reserve chính
}
```

Job này đảm bảo số liệu dashboard luôn chính xác (số vé còn lại), kể cả khi không có request nào chạm tới các vé đã hết hạn giữ chỗ.

**Lưu ý:** cả hai luồng (lazy check và scheduled job) đều phải khoá `ticket_type` bằng `SELECT ... FOR UPDATE` khi cộng trả lại `quantity_remaining`, nhằm tránh race condition với luồng Reserve khác đang chạy song song.

## 8. Concurrency control — chống oversell

Cơ chế áp dụng: **Pessimistic Lock** trong một database transaction.

```sql
BEGIN;

SELECT * FROM ticket_types WHERE id = :ticketTypeId FOR UPDATE;
-- request khác cùng ticket_type sẽ bị chặn (blocked) tại đây cho đến khi transaction này COMMIT/ROLLBACK

-- kiểm tra quantity_remaining >= số lượng yêu cầu
-- nếu đủ: UPDATE ticket_types SET quantity_remaining = quantity_remaining - :qty WHERE id = :ticketTypeId;
--         INSERT INTO tickets (...) VALUES (...);
-- nếu không đủ: ROLLBACK, trả lỗi TICKET_SOLD_OUT

COMMIT;
```

```java
@Transactional
public Ticket reserve(ReserveRequest request) {
    TicketType ticketType = ticketTypeRepository.findByIdForUpdate(request.getTicketTypeId())
            .orElseThrow(() -> new BusinessException(TICKET_TYPE_NOT_FOUND));

    if (ticketType.getQuantityRemaining() < request.getQuantity()) {
        throw new BusinessException(TICKET_SOLD_OUT);
    }

    ticketType.setQuantityRemaining(ticketType.getQuantityRemaining() - request.getQuantity());
    // tạo Ticket(s) trạng thái RESERVED...
}
```

```java
public interface TicketTypeRepository extends JpaRepository<TicketType, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TicketType t WHERE t.id = :id")
    Optional<TicketType> findByIdForUpdate(@Param("id") Long id);
}
```

Trong kịch bản chuẩn của dự án (1 vé cuối, 50 request đồng thời): 49 request sẽ bị chặn tuần tự tại `SELECT ... FOR UPDATE`, lần lượt kiểm tra `quantity_remaining` sau khi transaction trước đó commit. Kết quả là đúng 1 request thấy còn đủ chỗ và thành công, 49 request còn lại nhận lỗi `TICKET_SOLD_OUT`.

## 9. Concurrency control — chống double check-in

Cơ chế áp dụng: **Update có điều kiện** (conditional update), dựa vào số dòng bị ảnh hưởng (affected rows), không sử dụng mẫu "SELECT rồi UPDATE" (không an toàn khi có concurrent request vì tồn tại khoảng hở giữa thao tác đọc và ghi).

```sql
UPDATE tickets
SET status = 'CHECKED_IN', checked_in_at = now()
WHERE id = :ticketId AND status = 'CONFIRMED';
-- Nếu affected rows = 1 → check-in thành công (chính request này là request thắng)
-- Nếu affected rows = 0 → vé đã được check-in trước đó (bởi request khác) → từ chối
```

```java
@Modifying
@Query("UPDATE Ticket t SET t.status = 'CHECKED_IN', t.checkedInAt = CURRENT_TIMESTAMP " +
       "WHERE t.id = :id AND t.status = 'CONFIRMED'")
int checkInIfConfirmed(@Param("id") Long ticketId);
```

```java
@Transactional
public CheckInResult checkIn(String qrCode, Long gateId, Long staffId) {
    Ticket ticket = ticketRepository.findByQrCode(qrCode)
            .orElseThrow(() -> new BusinessException(TICKET_NOT_FOUND));

    int updated = ticketRepository.checkInIfConfirmed(ticket.getId());

    if (updated == 0) {
        checkInLogRepository.save(CheckInLog.failed(ticket, gateId, staffId, TICKET_ALREADY_CHECKED_IN));
        throw new BusinessException(TICKET_ALREADY_CHECKED_IN);
    }

    checkInLogRepository.save(CheckInLog.success(ticket, gateId, staffId));
    dashboardEventPublisher.publishCheckIn(ticket, gateId); // đẩy WebSocket
    return CheckInResult.success(ticket);
}
```

Cơ chế này đảm bảo an toàn tuyệt đối với nhiều thread/nhiều máy quét cùng lúc: câu lệnh `UPDATE ... WHERE status = 'CONFIRMED'` là một câu lệnh nguyên tử (atomic) ở tầng database, đảm bảo chỉ đúng một trong số các request đồng thời có `affected rows = 1`.

## 10. Dashboard real-time (WebSocket/STOMP)

Hệ thống sử dụng **Spring Simple Broker** (in-memory, có sẵn trong `spring-boot-starter-websocket`), không cần cài đặt thêm message broker ngoài (RabbitMQ/ActiveMQ) — phù hợp với quy mô 10 event / 1.000 vé của dự án.

```
Backend: mỗi khi check-in thành công → publish message tới topic:
  /topic/dashboard/{eventId}/{gateId}

Frontend Organizer: subscribe:
  /topic/dashboard/{eventId}          → tổng số liệu toàn event
  /topic/dashboard/{eventId}/{gateId} → số liệu riêng từng cổng
```

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic"); // in-memory broker
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS();
    }
}
```

**Giới hạn đã biết:** Simple Broker chỉ hoạt động trong một process — nếu sau này cần mở rộng backend ra nhiều instance, cần chuyển sang STOMP relay (RabbitMQ) hoặc Redis Pub/Sub. Không cần thiết ở giai đoạn MVP.

## 11. Định hướng tách Microservices trong tương lai

Ranh giới module (mục 4) được thiết kế để nếu cần tách trong tương lai:

- Module `ticket` → tách thành `ticket-service` riêng, cần thay pessimistic lock DB bằng **distributed lock** (ví dụ: Redis Redlock) hoặc **Saga pattern**.
- Module `checkin` → tách thành `checkin-service` riêng, giữ nguyên cơ chế conditional update vì vẫn thao tác trên một bảng `tickets`.
- Module `dashboard` → tách thành `dashboard-service`, chuyển từ đọc trực tiếp database sang consume event từ message queue (Kafka/RabbitMQ).

Định hướng này không triển khai ở giai đoạn hiện tại — chỉ được ghi nhận để đảm bảo code hiện tại không vô tình phá vỡ ranh giới module.

## 12. Nguyên tắc thiết kế bắt buộc

- Câu lệnh `SELECT ... FOR UPDATE` luôn là câu lệnh đầu tiên chạm tới `ticket_type`/`ticket` trong transaction, nhằm giữ thời gian lock ngắn nhất có thể.
- Transaction chứa lock phải ngắn gọn — không gọi API bên ngoài (Cloudinary, gửi email...) bên trong transaction có lock.
- Không sử dụng `@Transactional(readOnly = true)` cho các luồng có `FOR UPDATE`.
- Mọi thay đổi liên quan đến luồng Reserve/Check-in bắt buộc có test concurrency thật (`ExecutorService` + `CountDownLatch`) — xem [`10-TESTING.md`](./10-TESTING.md).
- Không sử dụng H2 để kiểm thử các luồng có lock — hành vi lock của H2 khác Postgres, bắt buộc dùng Testcontainers với Postgres thật.