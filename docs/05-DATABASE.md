# 05 - Cơ Sở Dữ Liệu

## Mục lục

1. [DBMS](#1-dbms)
2. [ERD tổng quan](#2-erd-tổng-quan)
3. [Quy ước đặt tên](#3-quy-ước-đặt-tên)
4. [Bảng: roles](#4-bảng-roles)
5. [Bảng: users](#5-bảng-users)
6. [Bảng: events](#6-bảng-events)
7. [Bảng: ticket_types](#7-bảng-ticket_types)
8. [Bảng: tickets](#8-bảng-tickets)
9. [Bảng: gates](#9-bảng-gates)
10. [Bảng: checkin_logs](#10-bảng-checkin_logs)
11. [Locking Strategy tổng hợp](#11-locking-strategy-tổng-hợp)
12. [Soft Delete](#12-soft-delete)
13. [Migration (Flyway)](#13-migration-flyway)
14. [Seed Data](#14-seed-data)
15. [Định hướng mở rộng: staff_gate_assignments](#15-định-hướng-mở-rộng-staff_gate_assignments)

---

## 1. DBMS

Hệ quản trị cơ sở dữ liệu: **PostgreSQL**, hosted trên **Neon**.

- **Runtime (application)**: sử dụng pooled connection string của Neon (qua PgBouncer), phù hợp cho nhiều connection ngắn hạn từ Spring Boot connection pool (HikariCP).
- **Migration (Flyway)**: sử dụng direct connection string (không qua pooler), do một số thao tác DDL/lock migration cần connection trực tiếp.

```yaml
# application-prod.yml (minh hoạ, giá trị thật lấy từ biến môi trường)
spring:
  datasource:
    url: ${DATABASE_URL}          # Neon pooled connection — dùng runtime
  flyway:
    url: ${DATABASE_URL_DIRECT}   # Neon direct connection — chỉ dùng migration
```

## 2. ERD tổng quan

```
┌───────────┐        ┌──────────────┐        ┌──────────────┐
│   roles   │1      *│    users     │1      *│    events    │
│───────────│────────│──────────────│────────│──────────────│
│ id        │        │ id           │        │ id           │
│ name      │        │ email        │        │ organizer_id │───┐
└───────────┘        │ password_hash│        │ name         │   │ FK → users.id
                     │ google_id    │        │ start_time   │   │
                     │ role_id      │──┐     │ end_time     │   │
                     │ assigned_    │  │FK   │ status       │   │
                     │ event_id     |──┼─────│ deleted_at   │   │
                     └──────────────┘  │     └──────┬───────┘   │
                                       │            │1          │
                                       │            │*          │
                                       │     ┌──────▼───────┐   │
                                       │     │ ticket_types │   │
                                       │     │──────────────│   │
                                       │     │ id           │   │
                                       │     │ event_id     │   │
                                       │     │ price        │   │
                                       │     │ quantity_*   │   │
                                       │     └──────┬───────┘   │
                                       │            │1          │
                                       │            │*          │
                                       │     ┌──────▼────────┐  │
                                       │     │   tickets     │  │
                                       │     │───────────────│  │
                                       │     │ id            │  │
                                       │     │ ticket_type_id│  │
                                       │     │ customer_id   |──┘ FK → users.id
                                       │     │ qr_code       │
                                       │     │ status        │
                                       │     └──────┬────────┘
                                       │            │1
                                       │            │*
                                  ┌────▼────┐  ┌────▼─────────┐
                                  │  gates  │1*│ checkin_logs │
                                  │─────────│──│──────────────│
                                  │ id      │  │ id           │
                                  │ event_id│  │ ticket_id    │
                                  │ name    │  │ gate_id      │
                                  └─────────┘  │ staff_id     |──▶ users.id
                                               │ result       │
                                               └──────────────┘
```

## 3. Quy ước đặt tên

- Bảng: `snake_case`, số nhiều (`ticket_types`, `checkin_logs`)
- Cột: `snake_case` (`quantity_remaining`, `created_at`)
- Khoá chính: `id` (kiểu `BIGSERIAL` / `BIGINT GENERATED ALWAYS AS IDENTITY`)
- Khoá ngoại: `<tên_bảng_số_ít>_id` (ví dụ: `event_id`, `ticket_type_id`, `gate_id`, `staff_id`, `organizer_id`, `customer_id`)
- Mọi bảng nghiệp vụ có `created_at`, `updated_at` (trừ `checkin_logs` chỉ cần `created_at` vì log không sửa)
- Cột optimistic lock: `version` (kiểu `INT`, mặc định `0`)

## 4. Bảng: roles

Bảng lookup, dữ liệu tĩnh (seed sẵn), quan hệ 1 user – 1 role qua `role_id`.

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | `BIGINT` | PK |
| `name` | `VARCHAR(20)` | `UNIQUE NOT NULL` — giá trị: `ADMIN`, `ORGANIZER`, `CHECKIN_STAFF`, `CUSTOMER` |

```sql
CREATE TABLE roles (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);
```

## 5. Bảng: users

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | `BIGINT` | PK | |
| `email` | `VARCHAR(255)` | `UNIQUE NOT NULL` | |
| `password_hash` | `VARCHAR(255)` | `NULL` | NULL nếu tài khoản chỉ đăng nhập qua Google OAuth2 |
| `google_id` | `VARCHAR(255)` | `UNIQUE NULL` | ID tài khoản Google, NULL nếu đăng ký email/password |
| `full_name` | `VARCHAR(255)` | `NOT NULL` | |
| `role_id` | `BIGINT` | `FK → roles.id NOT NULL` | |
| `assigned_event_id` | `BIGINT` | `FK → events.id NULL` | Chỉ có giá trị khi `role = CHECKIN_STAFF`; xác định event mà staff được gán |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Khoá tài khoản (thao tác bởi ADMIN) |
| `version` | `INT` | `NOT NULL DEFAULT 0` | Optimistic lock |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

```sql
CREATE TABLE users (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email              VARCHAR(255) NOT NULL UNIQUE,
    password_hash      VARCHAR(255),
    google_id          VARCHAR(255) UNIQUE,
    full_name          VARCHAR(255) NOT NULL,
    role_id            BIGINT NOT NULL REFERENCES roles(id),
    assigned_event_id  BIGINT REFERENCES events(id),
    is_active          BOOLEAN NOT NULL DEFAULT true,
    version            INT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_assigned_event_id ON users(assigned_event_id);
```

**Design Consideration:** ràng buộc `assigned_event_id` chỉ có ý nghĩa với `CHECKIN_STAFF`, được xử lý ở tầng ứng dụng (Bean Validation/Service), không dùng `CHECK constraint` phụ thuộc bảng khác ở mức DB để giữ đơn giản.

**Known Limitations:** bảng `users` hiện có cả `password_hash` và `google_id` để hỗ trợ hai kiểu đăng nhập (email/password cho Organizer/Admin/Checkin Staff, Google OAuth2 cho Customer) theo giả định tại [`04-API.md`](./04-API.md#4-module-auth). Giả định này cần được xác nhận chính thức trước khi thực hiện migration.

## 6. Bảng: events

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | `BIGINT` | PK | |
| `organizer_id` | `BIGINT` | `FK → users.id NOT NULL` | |
| `name` | `VARCHAR(255)` | `NOT NULL` | |
| `description` | `TEXT` | `NULL` | |
| `banner_url` | `VARCHAR(500)` | `NULL` | URL ảnh trên Cloudinary |
| `location` | `VARCHAR(255)` | `NULL` | |
| `start_time` | `TIMESTAMPTZ` | `NOT NULL` | |
| `end_time` | `TIMESTAMPTZ` | `NOT NULL` | |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'DRAFT'` | `DRAFT`, `PUBLISHED`, `CANCELLED` |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | Soft delete |
| `version` | `INT` | `NOT NULL DEFAULT 0` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

```sql
CREATE TABLE events (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organizer_id  BIGINT NOT NULL REFERENCES users(id),
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    banner_url    VARCHAR(500),
    location      VARCHAR(255),
    start_time    TIMESTAMPTZ NOT NULL,
    end_time      TIMESTAMPTZ NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    deleted_at    TIMESTAMPTZ,
    version       INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status) WHERE deleted_at IS NULL;
```

## 7. Bảng: ticket_types

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | `BIGINT` | PK | |
| `event_id` | `BIGINT` | `FK → events.id NOT NULL` | |
| `name` | `VARCHAR(100)` | `NOT NULL` | |
| `price` | `NUMERIC(12,2)` | `NOT NULL CHECK (price >= 0)` | Cố định sau khi mở bán |
| `quantity_total` | `INT` | `NOT NULL CHECK (quantity_total >= 0)` | |
| `quantity_remaining` | `INT` | `NOT NULL CHECK (quantity_remaining >= 0)` | Cột bị lock bởi `FOR UPDATE` khi Reserve |
| `sales_start_at` | `TIMESTAMPTZ` | `NULL` | |
| `sales_end_at` | `TIMESTAMPTZ` | `NULL` | |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | Soft delete |
| `version` | `INT` | `NOT NULL DEFAULT 0` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

```sql
CREATE TABLE ticket_types (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id            BIGINT NOT NULL REFERENCES events(id),
    name                VARCHAR(100) NOT NULL,
    price               NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    quantity_total      INT NOT NULL CHECK (quantity_total >= 0),
    quantity_remaining  INT NOT NULL CHECK (quantity_remaining >= 0),
    sales_start_at      TIMESTAMPTZ,
    sales_end_at        TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ,
    version             INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_types_event_id ON ticket_types(event_id);
```

**Ghi chú:** `quantity_remaining` được thao tác qua pessimistic lock (`SELECT ... FOR UPDATE`), không dựa vào cột `version` (optimistic lock) như các bảng khác — vì luồng Reserve có tần suất tranh chấp (contention) cao, pessimistic lock phù hợp hơn để tránh retry storm. Xem [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md#8-concurrency-control--chống-oversell).

## 8. Bảng: tickets

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | `BIGINT` | PK | |
| `ticket_type_id` | `BIGINT` | `FK → ticket_types.id NOT NULL` | |
| `customer_id` | `BIGINT` | `FK → users.id NOT NULL` | |
| `qr_code` | `VARCHAR(36)` | `UNIQUE NULL` | UUID, chỉ sinh khi `CONFIRMED` |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'RESERVED'` | `RESERVED`, `CONFIRMED`, `CHECKED_IN`, `EXPIRED`, `CANCELLED` |
| `idempotency_key` | `VARCHAR(64)` | `NULL` | Chống double-submit khi Reserve |
| `reserved_at` | `TIMESTAMPTZ` | `NOT NULL` | |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Hạn giữ chỗ |
| `confirmed_at` | `TIMESTAMPTZ` | `NULL` | |
| `checked_in_at` | `TIMESTAMPTZ` | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

```sql
CREATE TABLE tickets (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_type_id   BIGINT NOT NULL REFERENCES ticket_types(id),
    customer_id      BIGINT NOT NULL REFERENCES users(id),
    qr_code          VARCHAR(36) UNIQUE,
    status           VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    idempotency_key  VARCHAR(64),
    reserved_at      TIMESTAMPTZ NOT NULL,
    expires_at       TIMESTAMPTZ NOT NULL,
    confirmed_at     TIMESTAMPTZ,
    checked_in_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_tickets_qr_code ON tickets(qr_code) WHERE qr_code IS NOT NULL;
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_ticket_type_id ON tickets(ticket_type_id);
CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE UNIQUE INDEX idx_tickets_idempotency_key ON tickets(customer_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
```

**Về QR code:** bảng chỉ lưu `qr_code` dạng chuỗi UUID unique — không lưu ảnh QR. Ảnh được sinh on-the-fly bằng ZXing tại thời điểm cần hiển thị (Customer xem vé qua `GET /tickets/{id}/qr`) hoặc khi quét (Checkin Staff dùng `html5-qrcode` để đọc chuỗi, gửi lên backend qua `POST /checkin`).

## 9. Bảng: gates

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | `BIGINT` | PK |
| `event_id` | `BIGINT` | `FK → events.id NOT NULL` |
| `name` | `VARCHAR(100)` | `NOT NULL` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |

```sql
CREATE TABLE gates (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id    BIGINT NOT NULL REFERENCES events(id),
    name        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gates_event_id ON gates(event_id);
```

## 10. Bảng: checkin_logs

Ghi lại mọi lần quét, kể cả lần thất bại (quét lại lần 2, vé không hợp lệ) — phục vụ tính năng cảnh báo và lịch sử check-in.

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | `BIGINT` | PK | |
| `ticket_id` | `BIGINT` | `FK → tickets.id NOT NULL` | |
| `gate_id` | `BIGINT` | `FK → gates.id NOT NULL` | |
| `staff_id` | `BIGINT` | `FK → users.id NOT NULL` | |
| `result` | `VARCHAR(20)` | `NOT NULL` | `SUCCESS`, `DUPLICATE`, `INVALID` |
| `checked_in_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Thời điểm ghi log (kể cả log thất bại) |

```sql
CREATE TABLE checkin_logs (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id      BIGINT NOT NULL REFERENCES tickets(id),
    gate_id        BIGINT NOT NULL REFERENCES gates(id),
    staff_id       BIGINT NOT NULL REFERENCES users(id),
    result         VARCHAR(20) NOT NULL,
    checked_in_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkin_logs_checked_in_at ON checkin_logs(checked_in_at);
CREATE INDEX idx_checkin_logs_gate_id ON checkin_logs(gate_id);
CREATE INDEX idx_checkin_logs_ticket_id ON checkin_logs(ticket_id);
```

## 11. Locking Strategy tổng hợp

| Bảng | Cơ chế | Lý do |
|---|---|---|
| `ticket_types.quantity_remaining` | **Pessimistic lock** (`SELECT ... FOR UPDATE`) | Tranh chấp cao (nhiều Customer cùng đặt 1 loại vé cùng lúc), cần đảm bảo tuyệt đối không oversell |
| `tickets.status` (check-in) | **Conditional update** (`UPDATE ... WHERE status = 'CONFIRMED'`, dựa vào affected rows) | Không cần giữ lock lâu, chỉ cần tính nguyên tử của một câu UPDATE |
| `events`, `users`, `gates`, và các bảng còn lại | **Optimistic lock** (cột `version`) | Tranh chấp thấp, tránh lost update khi 2 request sửa đồng thời (ví dụ: Organizer sửa event trên 2 tab) |

## 12. Soft Delete

Áp dụng cho `events` và `ticket_types` (cột `deleted_at`) nhằm giữ lại lịch sử, do đã có `tickets` liên kết tới các bản ghi này, không thể xoá cứng (hard delete) mà không phá vỡ dữ liệu vé đã bán.

```java
@Where(clause = "deleted_at IS NULL")   // Hibernate filter mặc định loại bản ghi đã xoá mềm
@Entity
@Table(name = "events")
public class Event extends BaseEntity {
    // ...
    private Instant deletedAt;
}
```

## 13. Migration (Flyway)

Quy ước đặt tên file: `V<version>__<mo_ta_snake_case>.sql`, đặt tại `backend/src/main/resources/db/migration/`.

```
V1__init_schema.sql          -- tạo toàn bộ bảng ở mục 4-10
V2__seed_roles.sql           -- seed 4 role
V3__seed_demo_data.sql       -- seed dữ liệu demo (mục 14)
V4__add_xxx.sql              -- các thay đổi schema sau này, luôn tăng version, không sửa lại file cũ
```

**Quy tắc bắt buộc:** không sửa lại một file migration đã chạy trên bất kỳ môi trường nào (kể cả local) — luôn tạo file mới với version tăng dần.

## 14. Seed Data

File `V3__seed_demo_data.sql` tạo sẵn dữ liệu demo đủ cho từng role để kiểm thử nhanh:

```sql
-- 1 ADMIN, 1 ORGANIZER, 1 CHECKIN_STAFF, 1 CUSTOMER
-- 1 Event mẫu ("Demo Tech Conference") với 2 TicketType ("Vé thường" x100, "Vé VIP" x20)
-- 1 Gate mẫu ("Cổng A")
-- Mật khẩu demo: xem README.md, không hardcode plaintext trong file migration — dùng hash BCrypt có sẵn
```

## 15. Định hướng mở rộng: staff_gate_assignments

Bảng `staff_gate_assignments` (quan hệ many-to-many giữa `users` và `gates`, cho phép một Checkin Staff được gán nhiều cổng cụ thể trong cùng một event) được để ở giai đoạn mở rộng sau MVP. Ở MVP, việc gán Checkin Staff dừng lại ở mức event (cột `users.assigned_event_id`, xem mục 5), không phân quyền theo từng cổng cụ thể.

```sql
-- Thiết kế tham khảo cho giai đoạn mở rộng (chưa migrate ở MVP):
-- CREATE TABLE staff_gate_assignments (
--     id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--     staff_id BIGINT NOT NULL REFERENCES users(id),
--     gate_id  BIGINT NOT NULL REFERENCES gates(id),
--     UNIQUE (staff_id, gate_id)
-- );
```