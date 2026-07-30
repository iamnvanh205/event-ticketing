# 00 - Tổng Quan Hệ Thống

> Tài liệu tổng quan dự án **event-ticketing**. Đây là tài liệu nền tảng nên được tham khảo trước khi xem các tài liệu chuyên đề khác trong bộ tài liệu `docs/`.

## Mục lục

1. [Giới thiệu dự án](#1-giới-thiệu-dự-án)
2. [Mục tiêu dự án](#2-mục-tiêu-dự-án)
3. [Bài toán kỹ thuật cốt lõi](#3-bài-toán-kỹ-thuật-cốt-lõi)
4. [Đối tượng sử dụng](#4-đối-tượng-sử-dụng)
5. [Vai trò người dùng (Roles)](#5-vai-trò-người-dùng-roles)
6. [Quy mô hệ thống](#6-quy-mô-hệ-thống)
7. [Phạm vi chức năng MVP](#7-phạm-vi-chức-năng-mvp)
8. [Ngoài phạm vi MVP (Post-MVP)](#8-ngoài-phạm-vi-mvp-post-mvp)
9. [Thực thể chính (Entities)](#9-thực-thể-chính-entities)
10. [Luồng nghiệp vụ chính (Happy Path)](#10-luồng-nghiệp-vụ-chính-happy-path)
11. [Tech Stack tóm tắt](#11-tech-stack-tóm-tắt)
12. [Bản đồ tài liệu](#12-bản-đồ-tài-liệu)

---

## 1. Giới thiệu dự án

**Tên dự án:** `event-ticketing`

Nền tảng bán vé sự kiện quy mô nhỏ. Người tổ chức (Organizer) tạo sự kiện và các loại vé có giới hạn số lượng; khách hàng (Customer) đặt vé và nhận vé QR; nhân viên tại cổng (Checkin Staff) quét QR để check-in; dashboard hiển thị số liệu real-time cho Organizer.

Đây là dự án quy mô cá nhân, phục vụ mục đích học tập, không phải sản phẩm thương mại. Hệ thống được thiết kế để triển khai thực tế (production) và phục vụ người dùng thật, không chỉ chạy trên môi trường phát triển cục bộ.

## 2. Mục tiêu dự án

Trọng tâm kỹ thuật của dự án là **concurrency control** (kiểm soát truy cập đồng thời) trong hệ thống backend thực tế. Toàn bộ quyết định kiến trúc, lựa chọn công nghệ và thiết kế cơ sở dữ liệu trong bộ tài liệu này đều phục vụ mục tiêu đảm bảo xử lý đúng khi có nhiều request cạnh tranh trên cùng một tài nguyên.

## 3. Bài toán kỹ thuật cốt lõi

Hệ thống phải đảm bảo tính đúng đắn trong mọi trường hợp, kể cả khi nhiều request đến **đồng thời**:

| Bài toán | Yêu cầu |
|---|---|
| **Chống oversell** | Không được bán vượt quá số lượng vé giới hạn của một loại vé, kể cả khi nhiều khách đặt cùng lúc chiếc vé cuối cùng |
| **Chống double check-in** | Một vé chỉ được check-in thành công đúng 1 lần, kể cả khi nhiều nhân viên/máy quét cùng lúc quét 1 mã QR |

Chi tiết cơ chế kỹ thuật được mô tả tại [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md) và [`07-BUSINESS-RULES.md`](./07-BUSINESS-RULES.md).

## 4. Đối tượng sử dụng

- **Chủ dự án:** sử dụng để demo, học tập, làm minh chứng kỹ thuật (portfolio).
- **Người dùng thử nghiệm:** được mời sử dụng thực tế (đặt vé, check-in) trên môi trường production, không phải dữ liệu giả lập.

Hệ thống không phải sản phẩm thương mại, không có mục tiêu kinh doanh, không cần cơ chế thanh toán thật ở giai đoạn MVP.

## 5. Vai trò người dùng (Roles)

Hệ thống có đúng **4 role cố định**, không áp dụng phân quyền động (dynamic permission):

| Role | Mô tả |
|---|---|
| `ADMIN` | Quản lý toàn hệ thống (toàn quyền, vượt trên tất cả Organizer) |
| `ORGANIZER` | Quản lý event của chính mình: tạo/sửa event, tạo loại vé, tạo tài khoản Checkin Staff, xem dashboard |
| `CHECKIN_STAFF` | Quét mã QR tại cổng để check-in vé, chỉ trong phạm vi event được gán |
| `CUSTOMER` | Đặt vé, xem vé QR của mình |

**Lưu ý quan trọng:** Cơ chế RBAC theo role là chưa đủ — hệ thống áp dụng thêm 2 quy tắc **ownership** bắt buộc kiểm tra ở tầng Service. Chi tiết tại [`06-AUTHENTICATION.md`](./06-AUTHENTICATION.md#6-ownership-check).

## 6. Quy mô hệ thống

| Thông số | Giá trị |
|---|---|
| Số event chạy song song tối đa | 10 |
| Số vé tối đa / event | 1.000 |
| Kịch bản chịu tải chuẩn (concurrency benchmark) | 1 vé cuối cùng, 50 request đặt vé đồng thời — chỉ đúng 1 request thành công |

Quy mô hệ thống ở mức nhỏ về mặt hạ tầng nhưng đủ để kiểm chứng tính đúng đắn của cơ chế khoá (locking). Đây là mục tiêu chính của dự án, không phải khả năng chịu tải lớn (load-test quy mô lớn thuộc phạm vi mở rộng sau này).

## 7. Phạm vi chức năng MVP

MVP gồm 6 nhóm chức năng:

1. Organizer tạo sự kiện kèm loại vé giới hạn số lượng.
2. Customer đặt vé theo luồng giữ chỗ (reserve) → xác nhận (confirm), sinh mã QR duy nhất cho từng vé sau khi xác nhận thành công.
3. Checkin Staff check-in bằng camera điện thoại quét QR tại cổng (ứng dụng web, sử dụng `html5-qrcode`).
4. Dashboard real-time cho Organizer: số vé đã bán / đã check-in / còn lại — cập nhật theo từng cổng, không cần tải lại trang (WebSocket/STOMP).
5. Cảnh báo khi một vé bị quét lại lần 2 (dấu hiệu vé giả hoặc chia sẻ QR trái phép), có ghi log riêng.
6. Lịch sử check-in theo cổng, theo khung giờ.

## 8. Ngoài phạm vi MVP (Post-MVP)

Các hạng mục sau không thuộc phạm vi triển khai ở MVP, chỉ được ghi nhận để đảm bảo thiết kế hiện tại không cản trở việc mở rộng sau này:

- Thanh toán thật (ví dụ: VNPay/Momo sandbox) — MVP đặt vé miễn phí, không tích hợp cổng thanh toán.
- Refund / huỷ vé sau khi đã ở trạng thái `CONFIRMED`.
- Multi-gate với phân quyền staff theo từng cổng cụ thể (bảng `staff_gate_assignments`).
- Load-test quy mô lớn bằng k6/JMeter.
- Redis (cache dashboard hoặc distributed lock).
- Dark mode giao diện.
- Công cụ giám sát chuyên sâu (Sentry, Grafana).

## 9. Thực thể chính (Entities)

`User`, `Role`, `Event`, `TicketType`, `Ticket`, `Gate`, `CheckInLog`.

Chi tiết đầy đủ về cột, quan hệ, index được mô tả tại [`05-DATABASE.md`](./05-DATABASE.md).

## 10. Luồng nghiệp vụ chính (Happy Path)

```
┌─────────────┐        ┌──────────────┐        
│  ORGANIZER  │──(1)──▶│  Tạo Event + │       
│             │        │  TicketType  │        
└─────────────┘        └──────────────┘        
                                               
┌─────────────┐        ┌──────────────┐  (2)   ┌──────────────┐        ┌──────────────┐
│  CUSTOMER   │───────▶│ Reserve      │───────▶│ Confirm      │───────▶│  Ticket +    │
│             │        │ (giữ chỗ)    │        │ (xác nhận)   │        │  QR sinh ra  │
└─────────────┘        └──────────────┘        └──────────────┘        └──────────────┘
                                                                             │
┌─────────────┐        ┌──────────────┐        ┌──────────────┐              │
│CHECKIN_STAFF│──(3)──▶│  Quét QR     │───────▶│ Check-in OK  │◀─────────────┘
│             │        │  tại cổng    │        │ hoặc từ chối │
└─────────────┘        └──────────────┘        └──────┬───────┘
                                                      │ (4) WebSocket/STOMP
                                                      ▼
                                                 ┌────────────────────┐
                                                 │ ORGANIZER          │
                                                 │ Dashboard real-time│
                                                 └────────────────────┘
```

Mô tả các bước trong luồng nghiệp vụ:

1. Organizer tạo `Event` kèm `TicketType` (ví dụ: "Vé thường" x100, "Vé VIP" x20).
2. Customer chọn loại vé, thực hiện **Reserve** (giữ chỗ, trừ tạm số lượng, hạn giữ chỗ 5–10 phút), sau đó **Confirm** (xác nhận, sinh `Ticket` kèm QR). Nếu không xác nhận kịp thời hạn, vé tự động chuyển trạng thái `EXPIRED` và chỗ được trả lại.
3. Đến ngày sự kiện, Checkin Staff quét QR bằng ứng dụng web trên điện thoại.
4. Hệ thống xác thực vé hợp lệ và chưa check-in, sau đó cập nhật trạng thái và phát sự kiện qua WebSocket để dashboard của Organizer cập nhật ngay lập tức.

## 11. Tech Stack tóm tắt

| Layer | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA, Spring WebSocket (STOMP) |
| Frontend | React + Vite + TypeScript, Tailwind CSS + shadcn/ui, `@stomp/stompjs` |
| Database | PostgreSQL (Neon) |
| Xac thuc | JWT (access token + refresh token) + Google Identity Services ID token login (Customer) |
| QR Code | ZXing (sinh QR tại backend), `html5-qrcode` (quét QR tại frontend) |
| Migration | Flyway |
| Build tool | Maven (backend), npm (frontend) |
| CI/CD | GitHub Actions |
| Deployment | Render (backend), Vercel (frontend), Neon (PostgreSQL) |

Chi tiết đầy đủ được mô tả tại [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md).

## 12. Bản đồ tài liệu

| File | Nội dung |
|---|---|
| `00-OVERVIEW.md` | Tài liệu này — tổng quan dự án |
| `01-ARCHITECTURE.md` | Kiến trúc hệ thống, luồng dữ liệu, cơ chế concurrency |
| `02-FOLDER-STRUCTURE.md` | Cấu trúc thư mục backend/frontend |
| `03-CODING-STANDARDS.md` | Quy ước lập trình, quy ước đặt tên |
| `04-API.md` | Danh sách API, request/response, versioning |
| `05-DATABASE.md` | Schema cơ sở dữ liệu, quan hệ, index, migration |
| `06-AUTHENTICATION.md` | JWT, Google Identity Services, RBAC, kiem tra ownership |
| `07-BUSINESS-RULES.md` | Toàn bộ quy tắc nghiệp vụ, luồng xử lý, trường hợp biên |
| `08-UI-UX.md` | Hệ thống thiết kế, responsive, khả năng truy cập (accessibility) |
| `09-ERROR-CODES.md` | Mã lỗi, HTTP status, xử lý ngoại lệ |
| `10-TESTING.md` | Chiến lược kiểm thử, đặc biệt là kiểm thử concurrency |
| `11-DEPLOYMENT.md` | Môi trường triển khai, Docker, CI/CD |
| `12-CONTRIBUTING.md` | Quy trình Git, quy ước commit, quy tắc Pull Request |
