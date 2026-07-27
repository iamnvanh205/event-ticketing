# 07 - Quy Tắc Nghiệp Vụ

## Mục lục

1. [Chống Oversell](#1-chống-oversell)
2. [Luồng Reserve → Confirm](#2-luồng-reserve--confirm)
3. [Giải phóng chỗ hết hạn](#3-giải-phóng-chỗ-hết-hạn)
4. [Huỷ chủ động](#4-huỷ-chủ-động)
5. [Idempotency](#5-idempotency)
6. [Check-in Window](#6-check-in-window)
7. [Giới hạn mua vé](#7-giới-hạn-mua-vé)
8. [Giá vé cố định](#8-giá-vé-cố-định)
9. [Sửa quantity_total](#9-sửa-quantity_total)
10. [Cảnh báo quét lại vé](#10-cảnh-báo-quét-lại-vé)
11. [RBAC + Ownership](#11-rbac--ownership)
12. [Trường hợp biên (Edge Cases)](#12-trường-hợp-biên-edge-cases)
13. [State Machine của Ticket](#13-state-machine-của-ticket)

---

## 1. Chống Oversell

**Quy tắc:** Không được đặt vé vượt quá `quantity_remaining` của một `TicketType`, kể cả khi nhiều request đến đồng thời.

**Cơ chế:** Transaction kết hợp `SELECT ticket_type FOR UPDATE`. Hệ thống cho phép đặt nhiều vé cùng loại trong một request (`quantity` > 1), miễn là còn đủ chỗ tại thời điểm lock.

```java
@Transactional
public Ticket reserve(Long ticketTypeId, int quantity, Long customerId) {
    TicketType tt = ticketTypeRepository.findByIdForUpdate(ticketTypeId)
            .orElseThrow(() -> new BusinessException(TICKET_TYPE_NOT_FOUND));

    if (tt.getQuantityRemaining() < quantity) {
        throw new BusinessException(TICKET_SOLD_OUT);
    }

    tt.setQuantityRemaining(tt.getQuantityRemaining() - quantity);
    // tạo Ticket(s) RESERVED, expires_at = now + RESERVATION_MINUTES
}
```

Chi tiết cơ chế lock đầy đủ được mô tả tại [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md#8-concurrency-control--chống-oversell).

## 2. Luồng Reserve → Confirm

```
RESERVE                          CONFIRM                        (nếu không confirm kịp)
┌──────────────────┐   customer   ┌─────────────────┐            ┌─────────────────┐
│ Trừ chỗ ngay     │──bấm xác────▶│ status=CONFIRMED│            │ status=EXPIRED  │
│ status=RESERVED  │   nhận       │ sinh qr_code    │            │ trả chỗ lại     │
│ expires_at=+5-10p│              └─────────────────┘            └─────────────────┘
└────────┬─────────┘
         │ hết hạn (5-10 phút) mà chưa confirm
         └─────────────────────────────────────────────────────▶ tự động EXPIRED
```

- **Reserve**: trừ chỗ ngay lập tức (không chờ confirm), tạo `Ticket` trạng thái `RESERVED`, `expires_at` = thời điểm reserve + 5–10 phút (mặc định khuyến nghị **7 phút**, cấu hình qua `application.yml`).
- Customer chủ động bấm "Xác nhận" trong thời hạn → chuyển trạng thái `CONFIRMED`, sinh `qr_code` (UUID).
- Không xác nhận kịp → vé tự động coi là `EXPIRED` (qua lazy check hoặc scheduled job — xem mục 3), chỗ được trả lại `quantity_remaining`.

## 3. Giải phóng chỗ hết hạn

Thao tác này thực hiện trong transaction có lock tương tự luồng Reserve (`SELECT ticket_type FOR UPDATE`), tránh lệch số liệu giữa `quantity_remaining` và số vé thực tế đang `RESERVED`/`EXPIRED`.

Hai cơ chế song song (chi tiết kỹ thuật: [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md#7-cơ-chế-hết-hạn-giữ-chỗ-reservation-expiry)):

1. **Lazy check**: mỗi khi có request chạm tới ticket `RESERVED` đã hết hạn, giải phóng ngay trong transaction hiện tại.
2. **Scheduled job** (`@Scheduled`): quét định kỳ (mỗi 60 giây) dọn các `RESERVED` hết hạn còn sót lại, đảm bảo dữ liệu sạch và số liệu dashboard đúng dù không có request nào chạm tới.

## 4. Huỷ chủ động

Customer có thể chủ động huỷ vé khi đang ở trạng thái `RESERVED` (chưa `CONFIRMED`), qua `POST /tickets/{id}/cancel`. Chỗ được trả lại ngay lập tức cho `quantity_remaining` (cùng cơ chế lock như mục 1).

```java
@Transactional
public void cancel(Long ticketId, Long customerId) {
    Ticket ticket = ticketRepository.findById(ticketId).orElseThrow(...);

    if (!ticket.getCustomerId().equals(customerId)) {
        throw new BusinessException(TICKET_OWNERSHIP_VIOLATION);
    }
    if (ticket.getStatus() != RESERVED) {
        throw new BusinessException(TICKET_CANNOT_BE_CANCELLED); // đã CONFIRMED/EXPIRED/CANCELLED
    }

    TicketType tt = ticketTypeRepository.findByIdForUpdate(ticket.getTicketTypeId()).orElseThrow();
    tt.setQuantityRemaining(tt.getQuantityRemaining() + 1);
    ticket.setStatus(CANCELLED);
}
```

**Known Limitations:** huỷ vé đã ở trạng thái `CONFIRMED` (refund) không thuộc phạm vi MVP — xem [`00-OVERVIEW.md`](./00-OVERVIEW.md#8-ngoài-phạm-vi-mvp-post-mvp).

## 5. Idempotency

Áp dụng cho ba luồng quan trọng nhất: Reserve, Confirm, Check-in, nhằm chống double-submit khi client bấm hai lần do mạng chậm/timeout.

| Luồng | Cơ chế idempotency |
|---|---|
| **Reserve** | Client gửi header `Idempotency-Key: <uuid>` (sinh mới mỗi lần thao tác, giữ nguyên khi retry). Backend lưu unique index `(customer_id, idempotency_key)` trên `tickets` — nếu key đã tồn tại, trả lại kết quả của request đầu tiên thay vì tạo mới |
| **Confirm** | Tự nhiên idempotent theo `ticket_id` và trạng thái hiện tại: gọi lại `confirm` khi đã `CONFIRMED` → trả về cùng kết quả (không lỗi, không sinh QR mới) |
| **Check-in** | Tự nhiên idempotent nhờ conditional update (`WHERE status = 'CONFIRMED'`) — gọi lại khi đã `CHECKED_IN` sẽ nhận `TICKET_ALREADY_CHECKED_IN`, không có tác dụng phụ ngoài ý muốn |

```java
@Transactional
public TicketResponse reserve(ReserveRequest request, Long customerId, String idempotencyKey) {
    Optional<Ticket> existing = ticketRepository.findByCustomerIdAndIdempotencyKey(customerId, idempotencyKey);
    if (existing.isPresent()) {
        return ticketMapper.toResponse(existing.get()); // trả lại kết quả cũ, không tạo mới
    }
    // ... luồng reserve bình thường (mục 1), lưu kèm idempotencyKey
}
```

## 6. Check-in Window

Vé chỉ được check-in trong khung giờ: từ `event.start_time − 1 giờ` đến hết `event.end_time`.

```java
Instant checkinWindowStart = event.getStartTime().minus(1, ChronoUnit.HOURS);
if (Instant.now().isBefore(checkinWindowStart) || Instant.now().isAfter(event.getEndTime())) {
    throw new BusinessException(CHECKIN_OUTSIDE_WINDOW);
}
```

## 7. Giới hạn mua vé

Tối đa 100 vé/người/loại vé/event — kiểm tra tổng số vé (`RESERVED` + `CONFIRMED`, không tính `CANCELLED`/`EXPIRED`) mà customer đã có trên cùng `ticket_type_id`.

```java
int alreadyOwned = ticketRepository.countActiveByCustomerAndTicketType(customerId, ticketTypeId);
if (alreadyOwned + request.getQuantity() > MAX_TICKETS_PER_CUSTOMER_PER_TYPE) { // = 100
    throw new BusinessException(TICKET_PURCHASE_LIMIT_EXCEEDED);
}
```

## 8. Giá vé cố định

`price` của `TicketType` cố định tại thời điểm tạo, không cho sửa sau khi đã bắt đầu bán (`sales_start_at` đã qua).

```java
@Transactional
public TicketTypeResponse update(Long id, TicketTypeRequest request) {
    TicketType tt = ticketTypeRepository.findById(id).orElseThrow(...);

    boolean salesStarted = tt.getSalesStartAt() != null && tt.getSalesStartAt().isBefore(Instant.now());
    if (salesStarted && !tt.getPrice().equals(request.getPrice())) {
        throw new BusinessException(TICKET_TYPE_PRICE_LOCKED);
    }
    // ... các field khác vẫn có thể sửa (tên, mô tả...) tuỳ quy tắc riêng
}
```

## 9. Sửa quantity_total

- Không cho giảm `quantity_total` xuống thấp hơn số đã bán/đã giữ chỗ (`quantity_total - quantity_remaining`) — chặn ở tầng Service, báo lỗi rõ ràng.
- Cho phép tăng thoải mái (tăng `quantity_total` đồng thời tăng `quantity_remaining` tương ứng).

```java
int sold = tt.getQuantityTotal() - tt.getQuantityRemaining(); // số đã bán/giữ chỗ
if (request.getQuantityTotal() < sold) {
    throw new BusinessException(TICKET_TYPE_QUANTITY_BELOW_SOLD);
}
int delta = request.getQuantityTotal() - tt.getQuantityTotal();
tt.setQuantityTotal(request.getQuantityTotal());
tt.setQuantityRemaining(tt.getQuantityRemaining() + delta); // delta có thể âm nhưng đã đảm bảo >= sold ở trên
```

## 10. Cảnh báo quét lại vé

Khi một vé bị quét lần 2 trở đi (`status` đã là `CHECKED_IN`): hệ thống từ chối (trả lỗi `TICKET_ALREADY_CHECKED_IN`) và ghi log riêng vào `checkin_logs` với `result = DUPLICATE` (không chỉ ghi log lần thành công, phải ghi cả lần thất bại để phục vụ tính năng cảnh báo/lịch sử).

```java
int updated = ticketRepository.checkInIfConfirmed(ticketId);
if (updated == 0) {
    Ticket ticket = ticketRepository.findById(ticketId).orElseThrow();
    CheckInResult resultType = ticket.getStatus() == CHECKED_IN ? DUPLICATE : INVALID;
    checkInLogRepository.save(CheckInLog.of(ticket, gateId, staffId, resultType));
    throw new BusinessException(resultType == DUPLICATE ? TICKET_ALREADY_CHECKED_IN : TICKET_INVALID_STATE);
}
```

Frontend hiển thị cảnh báo rõ ràng (ví dụ: nền đỏ kèm âm thanh) khi nhận `TICKET_ALREADY_CHECKED_IN` để nhân viên tại cổng nhận biết ngay dấu hiệu vé giả/chia sẻ QR.

## 11. RBAC + Ownership

Hệ thống kết hợp role cố định (4 role) với kiểm tra ownership ở tầng Service — chi tiết đầy đủ tại [`06-AUTHENTICATION.md`](./06-AUTHENTICATION.md#6-ownership-check):

- Organizer chỉ thao tác trên event của chính mình.
- Checkin Staff chỉ check-in vé thuộc event được gán.

## 12. Trường hợp biên (Edge Cases)

| Tình huống | Xử lý |
|---|---|
| 2 request Reserve cùng lúc, chỉ còn 1 chỗ | Chỉ 1 request thành công, request kia nhận `TICKET_SOLD_OUT` (mục 1) |
| Customer bấm Confirm 2 lần liên tiếp | Idempotent theo trạng thái, lần 2 trả về cùng kết quả (mục 5) |
| Confirm sau khi đã hết hạn giữ chỗ | Trả lỗi `RESERVATION_EXPIRED`, không cho confirm |
| Cancel 1 vé đã `CONFIRMED` | Từ chối — `cancel` chỉ áp dụng cho `RESERVED` (mục 4) |
| 2 Checkin Staff quét cùng 1 QR cùng lúc (2 cổng khác nhau) | Chỉ 1 thành công (`SUCCESS`), người còn lại nhận `DUPLICATE` (mục 10, cơ chế atomic update) |
| Organizer sửa `quantity_total` xuống thấp hơn số đã bán | Từ chối, báo lỗi `TICKET_TYPE_QUANTITY_BELOW_SOLD` (mục 9) |
| Check-in trước giờ mở cổng (`start_time - 1h`) | Từ chối, `CHECKIN_OUTSIDE_WINDOW` (mục 6) |
| Customer cố mua vé thứ 101 cùng loại | Từ chối, `TICKET_PURCHASE_LIMIT_EXCEEDED` (mục 7) |
| Reserve nhưng chưa từng Confirm, hết hạn tự nhiên | Job dọn định kỳ tự chuyển `EXPIRED`, trả chỗ (mục 3) |
| Organizer sửa giá vé sau khi đã mở bán | Từ chối, `TICKET_TYPE_PRICE_LOCKED` (mục 8) |

## 13. State Machine của Ticket

```
                 reserve()
   (chưa tồn tại) ────────▶ RESERVED
                              │  │
                    confirm() │  │ hết hạn (lazy check / scheduled job)
                              │  │        hoặc cancel()
                              ▼  ▼
                        CONFIRMED   EXPIRED / CANCELLED  (trạng thái cuối,
                              │                            trả lại quantity_remaining)
                    checkin() │  (chỉ áp dụng khi status = CONFIRMED)
                              ▼
                         CHECKED_IN  (trạng thái cuối)
```

- `RESERVED → CONFIRMED`: qua `confirm()`, còn hạn.
- `RESERVED → EXPIRED`: tự động, hết hạn giữ chỗ.
- `RESERVED → CANCELLED`: qua `cancel()`, chủ động.
- `CONFIRMED → CHECKED_IN`: qua `checkin()`, đúng một lần (conditional update).
- Không có transition nào đi ngược lại — mọi trạng thái cuối (`EXPIRED`, `CANCELLED`, `CHECKED_IN`) đều bất biến (immutable) sau khi đạt tới.