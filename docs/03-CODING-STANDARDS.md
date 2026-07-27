# 03 - Quy Ước Lập Trình

## Mục lục

1. [Quy ước đặt tên Package](#1-quy-ước-đặt-tên-package)
2. [Quy ước đặt tên tổng quát](#2-quy-ước-đặt-tên-tổng-quát)
3. [Quy ước đặt tên Class theo Layer](#3-quy-ước-đặt-tên-class-theo-layer)
4. [Định dạng Response](#4-định-dạng-response)
5. [Validation](#5-validation)
6. [Mapper](#6-mapper)
7. [Logging](#7-logging)
8. [Exception](#8-exception)
9. [Comment](#9-comment)
10. [Quy ước Frontend](#10-quy-ước-frontend)
11. [Nguyên tắc chung](#11-nguyên-tắc-chung)

---

## 1. Quy ước đặt tên Package

Package gốc: **`com.vanh.eventticketing`**

Mỗi module domain là một sub-package:

```
com.vanh.eventticketing.auth
com.vanh.eventticketing.event
com.vanh.eventticketing.ticket
com.vanh.eventticketing.checkin
com.vanh.eventticketing.gate
com.vanh.eventticketing.dashboard
com.vanh.eventticketing.common
```

Trong mỗi module, sub-package được tổ chức theo layer: `.controller`, `.service`, `.repository`, `.entity`, `.dto`, `.mapper`.

Ví dụ đầy đủ: `com.vanh.eventticketing.ticket.service.TicketServiceImpl`

## 2. Quy ước đặt tên tổng quát

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| Class / Interface | `PascalCase` | `TicketService`, `EventController` |
| Method / field | `camelCase` | `reserveTicket()`, `quantityRemaining` |
| Hằng số (constant) | `UPPER_SNAKE_CASE` | `DEFAULT_RESERVATION_MINUTES` |
| Bảng DB | `snake_case`, số nhiều | `ticket_types`, `checkin_logs` |
| Cột DB | `snake_case` | `quantity_remaining`, `created_at` |
| REST endpoint (URL) | `kebab-case`, số nhiều | `/api/v1/ticket-types` |
| JSON field (response) | `camelCase` | `"quantityRemaining"` |
| Branch Git | xem [`12-CONTRIBUTING.md`](./12-CONTRIBUTING.md) | `feature/ticket-reservation` |

## 3. Quy ước đặt tên Class theo Layer

| Layer | Hậu tố (suffix) | Ví dụ |
|---|---|---|
| Entity | *(không hậu tố, danh từ số ít)* | `Ticket`, `Event` (không phải `Tickets`) |
| DTO — request | `Request` | `ReserveRequest`, `EventRequest` |
| DTO — response | `Response` | `TicketResponse`, `EventResponse` |
| Repository | `Repository` | `TicketRepository` |
| Service — interface | `Service` | `TicketService` |
| Service — implementation | `ServiceImpl` | `TicketServiceImpl` |
| Controller | `Controller` | `TicketController` |
| Mapper | `Mapper` | `TicketMapper` |
| Business Exception | `Exception` | `BusinessException`, `ValidationException` |

**Quy tắc đã chốt:** Service luôn tách interface và implementation. Mọi module đều có `XxxService` (interface) và `XxxServiceImpl` (implementation), Controller chỉ phụ thuộc vào interface.

```java
public interface TicketService {
    TicketResponse reserve(ReserveRequest request, Long customerId);
    TicketResponse confirm(Long ticketId, Long customerId);
}

@Service
@RequiredArgsConstructor
public class TicketServiceImpl implements TicketService {
    private final TicketRepository ticketRepository;
    private final TicketTypeRepository ticketTypeRepository;

    @Override
    @Transactional
    public TicketResponse reserve(ReserveRequest request, Long customerId) {
        // ...
    }
}
```

## 4. Định dạng Response

Hệ thống áp dụng chuẩn REST thuần — không bọc envelope cho response thành công:

```http
GET /api/v1/events/42

200 OK
{
  "id": 42,
  "name": "Tech Conference 2026",
  "startTime": "2026-09-01T09:00:00Z",
  "status": "PUBLISHED"
}
```

```http
GET /api/v1/events?page=0&size=20

200 OK
{
  "content": [ { "id": 42, "name": "..." }, ... ],
  "page": 0,
  "size": 20,
  "totalElements": 57,
  "totalPages": 3
}
```

Response lỗi tuân theo chuẩn **RFC 7807 Problem Details** — chi tiết đầy đủ tại [`09-ERROR-CODES.md`](./09-ERROR-CODES.md):

```json
{
  "type": "https://event-ticketing.dev/errors/TICKET_SOLD_OUT",
  "title": "Ticket Sold Out",
  "status": 409,
  "detail": "Loại vé 'VIP' đã hết chỗ.",
  "instance": "/api/v1/tickets/reserve",
  "errorCode": "TICKET_SOLD_OUT"
}
```

## 5. Validation

Hệ thống áp dụng hai tầng validate riêng biệt:

| Tầng | Dùng cho | Cơ chế |
|---|---|---|
| Controller / DTO | Validate cấu trúc dữ liệu cơ bản (bắt buộc nhập, đúng kiểu, đúng định dạng, giới hạn độ dài...) | Bean Validation (`@Valid`, `@NotNull`, `@NotBlank`, `@Positive`, `@Email`...) |
| Service | Business rule phức tạp (ví dụ: "vé chỉ được check-in trong khung giờ sự kiện", "loại vé đã hết hạn bán") | Ném `BusinessException` riêng, có `errorCode` |

```java
public record ReserveRequest(
    @NotNull Long ticketTypeId,
    @Positive @Max(100) Integer quantity
) {}
```

```java
@PostMapping("/reserve")
public ResponseEntity<TicketResponse> reserve(@Valid @RequestBody ReserveRequest request,
                                               @AuthenticationPrincipal CustomUserDetails user) {
    return ResponseEntity.ok(ticketService.reserve(request, user.getId()));
}
```

```java
// Business rule phức tạp → xử lý ở Service, không ở Controller/DTO
if (ticketType.getSalesEndAt().isBefore(Instant.now())) {
    throw new BusinessException(ErrorCode.TICKET_TYPE_SALES_ENDED);
}
```

## 6. Mapper

Mỗi module có `Mapper` riêng để chuyển đổi giữa Entity và DTO, tránh trộn business logic vào Controller.

```java
@Component
public class TicketMapper {
    public TicketResponse toResponse(Ticket ticket) {
        return new TicketResponse(
            ticket.getId(),
            ticket.getStatus().name(),
            ticket.getQrCode(),
            ticket.getExpiresAt()
        );
    }
}
```

**Khuyến nghị:** viết Mapper thủ công (plain Java) thay vì dùng MapStruct, do dự án quy mô nhỏ, ưu tiên đơn giản, dễ đọc, không cần thêm annotation processor.

## 7. Logging

Log được ghi dạng text thông thường (không cần structured JSON logging), sử dụng **SLF4J + Logback** mặc định của Spring Boot.

```java
private static final Logger log = LoggerFactory.getLogger(TicketServiceImpl.class);

log.info("Reserve thành công: ticketId={}, ticketTypeId={}, customerId={}",
          ticket.getId(), ticketType.getId(), customerId);

log.warn("Từ chối check-in do đã check-in trước đó: ticketId={}, gateId={}", ticketId, gateId);

log.error("Lỗi không xác định khi xử lý reserve", exception);
```

Quy tắc mức log:

| Level | Dùng khi |
|---|---|
| `INFO` | Sự kiện nghiệp vụ quan trọng thành công (reserve, confirm, check-in thành công) |
| `WARN` | Business exception có thể đoán trước (sold out, đã check-in, hết hạn) |
| `ERROR` | Lỗi hệ thống ngoài dự đoán (exception không xử lý được, lỗi kết nối DB...) |
| `DEBUG` | Chi tiết kỹ thuật khi cần trace, tắt ở môi trường production |

## 8. Exception

Chi tiết đầy đủ được mô tả tại [`09-ERROR-CODES.md`](./09-ERROR-CODES.md). Quy ước tóm tắt:

```java
public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
    }
}
```

- `ValidationException`: lỗi input, được sinh tự động từ `@Valid` (không tự ném thủ công).
- `BusinessException`: lỗi nghiệp vụ, luôn mang theo `errorCode` (enum `ErrorCode`).
- Toàn bộ exception được bắt tập trung tại một nơi duy nhất: `GlobalExceptionHandler` (`@RestControllerAdvice`), không sử dụng `try-catch` rải rác để format lỗi trong Controller.

## 9. Comment

- Comment có thể viết bằng tiếng Việt hoặc tiếng Anh, ưu tiên nhất quán trong cùng một file.
- Comment bắt buộc giải thích lý do (why), không lặp lại điều code đã tự thể hiện (what).
- Bắt buộc có comment tại mọi đoạn code liên quan đến concurrency (lock, conditional update, scheduled job) để giải thích rõ cơ chế — đây là phần dễ gây hiểu nhầm nhất của dự án.

```java
// Dùng FOR UPDATE để khoá dòng ticket_type ngay từ đầu transaction,
// đảm bảo các request Reserve đồng thời khác phải chờ, tránh oversell.
TicketType ticketType = ticketTypeRepository.findByIdForUpdate(id)...
```

## 10. Quy ước Frontend

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| Component | `PascalCase`, file trùng tên component | `ReserveButton.tsx` |
| Hook | `camelCase`, tiền tố `use` | `useTicketReservation.ts` |
| API function | `camelCase`, hậu tố mô tả hành động | `reserveTicket()`, `confirmTicket()` |
| Type/Interface | `PascalCase` | `TicketResponse`, `EventFormValues` |
| File API theo feature | `<feature>Api.ts` | `ticketApi.ts` |

- Component chỉ chứa UI và gọi hook, không gọi trực tiếp API trong component — luôn thông qua hook (`useXxx`) để tách logic khỏi UI.
- State server (dữ liệu từ API) và state UI cục bộ được tách biệt rõ ràng.

## 11. Nguyên tắc chung

- Không đặt business logic trong Controller — Controller mỏng, Service dày.
- Không truy cập trực tiếp Repository của module khác (xem [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md#4-ranh-giới-module-module-boundaries)).
- Mọi API thay đổi dữ liệu quan trọng (reserve, confirm, check-in) phải áp dụng idempotency — xem [`07-BUSINESS-RULES.md`](./07-BUSINESS-RULES.md#idempotency).
- Entity không được lộ trực tiếp ra Controller/response — luôn đi qua Mapper để chuyển thành DTO.
- Không hardcode magic number — sử dụng constant có tên rõ nghĩa (ví dụ: `DEFAULT_RESERVATION_MINUTES = 7`).