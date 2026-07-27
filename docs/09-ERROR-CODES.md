# 09 - Mã Lỗi

## Mục lục

1. [Định dạng Response — RFC 7807 Problem Details](#1-định-dạng-response--rfc-7807-problem-details)
2. [Cấu trúc Exception](#2-cấu-trúc-exception)
3. [Ánh xạ HTTP Status](#3-ánh-xạ-http-status)
4. [Bảng mã lỗi nghiệp vụ đầy đủ](#4-bảng-mã-lỗi-nghiệp-vụ-đầy-đủ)
5. [Global Exception Handler](#5-global-exception-handler)
6. [Định dạng Validation Exception](#6-định-dạng-validation-exception)
7. [Nguyên tắc chung](#7-nguyên-tắc-chung)

---

## 1. Định dạng Response — RFC 7807 Problem Details

Mọi response lỗi (4xx, 5xx) trả về đúng cấu trúc **RFC 7807 Problem Details**, sử dụng `ProblemDetail` có sẵn trong Spring 6+:

```json
{
  "type": "https://event-ticketing.dev/errors/TICKET_SOLD_OUT",
  "title": "Ticket Sold Out",
  "status": 409,
  "detail": "Loại vé 'Vé VIP' đã hết chỗ.",
  "instance": "/api/v1/tickets/reserve",
  "errorCode": "TICKET_SOLD_OUT"
}
```

| Field | Ý nghĩa |
|---|---|
| `type` | URI định danh loại lỗi (không cần trỏ tới trang thật, dùng làm định danh nhất quán) |
| `title` | Tên ngắn gọn, con người đọc được |
| `status` | HTTP status code, trùng với status code thực tế của response |
| `detail` | Mô tả chi tiết, có thể hiển thị trực tiếp cho người dùng cuối |
| `instance` | Đường dẫn API gây ra lỗi |
| `errorCode` | Field mở rộng riêng của dự án (không thuộc chuẩn RFC 7807 gốc), dạng string, để frontend xử lý logic riêng theo từng loại lỗi |

## 2. Cấu trúc Exception

Hệ thống tách riêng hai loại exception, bắt tập trung tại một Global Exception Handler (`@RestControllerAdvice`) duy nhất — không dùng `try-catch` rải rác ở Controller.

```
┌───────────────────────┐        ┌────────────────────────┐
│  ValidationException  │        │   BusinessException    │
│  (lỗi input)          │        │   (lỗi nghiệp vụ)      │
│  - tự động từ @Valid  │        │   - ném thủ công       │
│  - HTTP 400           │        │   - mang theo errorCode│
└──────────┬────────────┘        └───────────┬────────────┘
           │                                 │
           └──────────────┬──────────────────┘
                           ▼
              GlobalExceptionHandler (@RestControllerAdvice)
                           │
                           ▼
                 ProblemDetail response (mục 1)
```

```java
public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() { return errorCode; }
}
```

`ValidationException` không được ném thủ công trong code nghiệp vụ — được sinh ra tự động khi Bean Validation (`@Valid`) thất bại ở tầng Controller/DTO, được `GlobalExceptionHandler` bắt qua `MethodArgumentNotValidException`.

## 3. Ánh xạ HTTP Status

| HTTP Status | Dùng khi |
|---|---|
| `400 Bad Request` | Lỗi validation input (sai định dạng, thiếu field bắt buộc) |
| `401 Unauthorized` | Chưa đăng nhập / token không hợp lệ / token hết hạn |
| `403 Forbidden` | Đã đăng nhập nhưng không đủ quyền (sai role hoặc vi phạm ownership) |
| `404 Not Found` | Không tìm thấy resource (event, ticket, ticket type...) |
| `409 Conflict` | Xung đột trạng thái (hết vé, đã check-in, đã hết hạn giữ chỗ) |
| `422 Unprocessable Entity` | Vi phạm quy tắc nghiệp vụ hợp lệ về cấu trúc nhưng sai logic (ví dụ: giảm `quantity_total` xuống dưới số đã bán) |
| `500 Internal Server Error` | Lỗi hệ thống không xác định trước (bug, lỗi kết nối DB...) |

## 4. Bảng mã lỗi nghiệp vụ đầy đủ

| `errorCode` | HTTP Status | Mô tả | Xuất hiện tại |
|---|---|---|---|
| `TICKET_SOLD_OUT` | 409 | Loại vé không còn đủ số lượng yêu cầu | Reserve — [`07-BUSINESS-RULES.md#1-chống-oversell`](./07-BUSINESS-RULES.md#1-chống-oversell) |
| `RESERVATION_EXPIRED` | 409 | Thời gian giữ chỗ đã hết hạn | Confirm — [`07-BUSINESS-RULES.md#2-luồng-reserve--confirm`](./07-BUSINESS-RULES.md#2-luồng-reserve--confirm) |
| `TICKET_ALREADY_CHECKED_IN` | 409 | Vé đã được check-in trước đó (quét lại lần 2) | Check-in — [`07-BUSINESS-RULES.md#10-cảnh-báo-quét-lại-vé`](./07-BUSINESS-RULES.md#10-cảnh-báo-quét-lại-vé) |
| `TICKET_INVALID_STATE` | 409 | Vé đang ở trạng thái không hợp lệ để thao tác (ví dụ: check-in vé chưa `CONFIRMED`) | Check-in |
| `TICKET_CANNOT_BE_CANCELLED` | 409 | Không thể huỷ vé (không còn ở trạng thái `RESERVED`) | Cancel — [`07-BUSINESS-RULES.md#4-huỷ-chủ-động`](./07-BUSINESS-RULES.md#4-huỷ-chủ-động) |
| `TICKET_TYPE_QUANTITY_BELOW_SOLD` | 422 | `quantity_total` mới thấp hơn số đã bán/giữ chỗ | Update TicketType — [`07-BUSINESS-RULES.md#9-sửa-quantity_total`](./07-BUSINESS-RULES.md#9-sửa-quantity_total) |
| `TICKET_TYPE_PRICE_LOCKED` | 422 | Không được sửa giá sau khi đã mở bán | Update TicketType — [`07-BUSINESS-RULES.md#8-giá-vé-cố-định`](./07-BUSINESS-RULES.md#8-giá-vé-cố-định) |
| `TICKET_TYPE_SALES_ENDED` | 409 | Loại vé đã hết hạn bán (`sales_end_at` đã qua) | Reserve |
| `TICKET_TYPE_NOT_FOUND` | 404 | Không tìm thấy loại vé | Reserve, Update TicketType |
| `TICKET_NOT_FOUND` | 404 | Không tìm thấy vé (mã QR không hợp lệ) | Confirm, Check-in |
| `TICKET_PURCHASE_LIMIT_EXCEEDED` | 422 | Vượt quá 100 vé/người/loại vé/event | Reserve — [`07-BUSINESS-RULES.md#7-giới-hạn-mua-vé`](./07-BUSINESS-RULES.md#7-giới-hạn-mua-vé) |
| `TICKET_OWNERSHIP_VIOLATION` | 403 | Customer thao tác trên vé không thuộc về mình | Confirm, Cancel |
| `CHECKIN_OUTSIDE_WINDOW` | 409 | Check-in ngoài khung giờ cho phép | Check-in — [`07-BUSINESS-RULES.md#6-check-in-window`](./07-BUSINESS-RULES.md#6-check-in-window) |
| `CHECKIN_STAFF_EVENT_MISMATCH` | 403 | Checkin Staff check-in vé không thuộc event được gán | Check-in — [`06-AUTHENTICATION.md#6-ownership-check`](./06-AUTHENTICATION.md#6-ownership-check) |
| `EVENT_NOT_FOUND` | 404 | Không tìm thấy event | Mọi API liên quan event |
| `EVENT_OWNERSHIP_VIOLATION` | 403 | Organizer thao tác trên event không thuộc về mình | Update/Delete Event — [`06-AUTHENTICATION.md#6-ownership-check`](./06-AUTHENTICATION.md#6-ownership-check) |
| `GATE_NOT_FOUND` | 404 | Không tìm thấy cổng check-in | Check-in, quản lý Gate |
| `INVALID_CREDENTIALS` | 401 | Sai email/mật khẩu | Login |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token không hợp lệ/đã hết hạn | Refresh |
| `REFRESH_TOKEN_REUSE_DETECTED` | 401 | Refresh token đã bị rotate nhưng vẫn bị dùng lại (khả năng bị đánh cắp) | Refresh — [`06-AUTHENTICATION.md#4-refresh-token-rotation`](./06-AUTHENTICATION.md#4-refresh-token-rotation) |
| `EMAIL_ALREADY_EXISTS` | 409 | Email đã được đăng ký | Register |
| `USER_NOT_FOUND` | 404 | Không tìm thấy user | Quản lý user (Admin), tạo Checkin Staff |
| `USER_INACTIVE` | 403 | Tài khoản đã bị khoá | Login |

Bảng trên bao phủ toàn bộ quy tắc nghiệp vụ đã chốt tại [`07-BUSINESS-RULES.md`](./07-BUSINESS-RULES.md). Khi phát sinh quy tắc nghiệp vụ mới trong quá trình phát triển, bắt buộc bổ sung `errorCode` mới vào enum `ErrorCode` và cập nhật bảng này — không tái sử dụng `errorCode` có sẵn cho ý nghĩa khác.

## 5. Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ProblemDetail handleBusinessException(BusinessException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(errorCode.getHttpStatus(), ex.getMessage());
        problem.setTitle(errorCode.getTitle());
        problem.setType(URI.create("https://event-ticketing.dev/errors/" + errorCode.name()));
        problem.setProperty("errorCode", errorCode.name());
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationException(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Dữ liệu đầu vào không hợp lệ.");
        problem.setTitle("Validation Failed");
        problem.setProperty("errorCode", "VALIDATION_FAILED");
        problem.setProperty("fieldErrors", extractFieldErrors(ex));
        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnknownException(Exception ex) {
        log.error("Lỗi hệ thống không xác định", ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống.");
        problem.setTitle("Internal Server Error");
        problem.setProperty("errorCode", "INTERNAL_SERVER_ERROR");
        return problem;
    }
}
```

## 6. Định dạng Validation Exception

Lỗi validation (`400`) bổ sung thêm field `fieldErrors` để frontend highlight đúng field:

```json
{
  "type": "https://event-ticketing.dev/errors/VALIDATION_FAILED",
  "title": "Validation Failed",
  "status": 400,
  "detail": "Dữ liệu đầu vào không hợp lệ.",
  "instance": "/api/v1/events",
  "errorCode": "VALIDATION_FAILED",
  "fieldErrors": [
    { "field": "startTime", "message": "startTime không được để trống" },
    { "field": "name", "message": "name tối đa 255 ký tự" }
  ]
}
```

## 7. Nguyên tắc chung

- Mọi `BusinessException` bắt buộc mang theo `errorCode` — không ném `BusinessException` chung chung không rõ mã lỗi.
- `detail` trong response phải là câu có thể hiển thị trực tiếp cho người dùng cuối (tiếng Việt, dễ hiểu) — không lộ thông tin kỹ thuật nhạy cảm (ví dụ: không lộ tên bảng, câu SQL, stack trace).
- Với `500 Internal Server Error`, luôn ghi log đầy đủ stack trace ở server nhưng không trả stack trace về client.
- `errorCode` là hợp đồng (contract) giữa backend và frontend — khi đổi tên `errorCode` đã tồn tại, phải rà soát toàn bộ chỗ frontend đang so khớp theo chuỗi đó.