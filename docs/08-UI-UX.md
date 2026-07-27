# 08 - Thiết Kế Giao Diện & Trải Nghiệm Người Dùng

## Mục lục

1. [Tổng quan hệ thống thiết kế](#1-tổng-quan-hệ-thống-thiết-kế)
2. [Color Palette](#2-color-palette)
3. [Typography](#3-typography)
4. [Spacing](#4-spacing)
5. [Component Library](#5-component-library)
6. [Chiến lược Responsive](#6-chiến-lược-responsive)
7. [Dark Mode](#7-dark-mode)
8. [Accessibility (WCAG A)](#8-accessibility-wcag-a)
9. [Animation](#9-animation)
10. [Layout mẫu theo trang](#10-layout-mẫu-theo-trang)

---

## 1. Tổng quan hệ thống thiết kế

- **Nền tảng:** Tailwind CSS + shadcn/ui
- **Phong cách:** Minimal / Clean, hướng dashboard hiện đại, gọn gàng, nhiều khoảng trắng, hạn chế trang trí thừa
- **Triết lý:** ưu tiên rõ ràng và tốc độ thao tác hơn hiệu ứng thị giác — phù hợp với hai nhóm người dùng chính cần thao tác nhanh: Checkin Staff (quét liên tục tại cổng) và Organizer (đọc số liệu dashboard nhanh)

## 2. Color Palette

Bảng màu đề xuất (dùng biến CSS Tailwind, dễ áp dụng dark mode sau này dù MVP chưa cần):

| Token | Hex | Dùng cho |
|---|---|---|
| `--primary` | `#4F46E5` (Indigo 600) | Nút hành động chính, link, trạng thái active |
| `--primary-foreground` | `#FFFFFF` | Chữ trên nền primary |
| `--success` | `#16A34A` (Green 600) | Check-in thành công, trạng thái `CONFIRMED`/`CHECKED_IN` |
| `--destructive` | `#DC2626` (Red 600) | Cảnh báo quét lại vé, lỗi, trạng thái `EXPIRED`/`CANCELLED` |
| `--warning` | `#D97706` (Amber 600) | Trạng thái `RESERVED` (đang giữ chỗ, sắp hết hạn) |
| `--background` | `#FFFFFF` | Nền trang |
| `--muted` | `#F4F4F5` (Zinc 100) | Nền card, khối phụ |
| `--muted-foreground` | `#71717A` (Zinc 500) | Chữ phụ, chú thích |
| `--border` | `#E4E4E7` (Zinc 200) | Viền input, card, table |
| `--foreground` | `#18181B` (Zinc 900) | Chữ chính |

```css
:root {
  --primary: 243 75% 59%;
  --success: 142 71% 35%;
  --destructive: 0 73% 51%;
  --warning: 32 95% 44%;
  --background: 0 0% 100%;
  --muted: 240 5% 96%;
  --border: 240 6% 90%;
  --foreground: 240 10% 4%;
}
```

**Ghi chú:** bảng màu trên là đề xuất thiết kế, không phải giá trị đã chốt tuyệt đối — có thể điều chỉnh sắc độ khi triển khai giao diện thật, miễn giữ đúng vai trò từng token.

## 3. Typography

| Cấp | Font | Size | Weight | Dùng cho |
|---|---|---|---|---|
| Display | Inter | 32px / 2rem | 700 (Bold) | Tiêu đề trang lớn (ví dụ: tên event trên trang chi tiết) |
| H1 | Inter | 24px / 1.5rem | 600 (Semibold) | Tiêu đề section |
| H2 | Inter | 20px / 1.25rem | 600 | Tiêu đề card/dialog |
| Body | Inter | 14px / 0.875rem | 400 (Regular) | Nội dung chính |
| Small | Inter | 12px / 0.75rem | 400 | Chú thích, timestamp, label phụ |
| Số liệu dashboard | Inter | 36px / 2.25rem | 700 | Số liệu real-time nổi bật (ví dụ: "320 đã check-in") |

Font chính: **Inter** (Google Fonts), fallback hệ thống `system-ui, sans-serif`. Font Inter được lựa chọn vì độ rõ ràng cao ở kích thước nhỏ, phù hợp với thao tác của Checkin Staff trên màn hình điện thoại ngoài trời.

## 4. Spacing

Theo thang spacing mặc định của Tailwind (bội số 4px): `4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px`.

- Padding trong card: `16px` (mobile) / `24px` (desktop)
- Khoảng cách giữa các section: `32px`
- Khoảng cách giữa các field trong form: `16px`

## 5. Component Library

Sử dụng **shadcn/ui** làm nền tảng, các component chính cần dùng trong dự án:

| Component | Dùng ở |
|---|---|
| `Button` | Mọi hành động (Reserve, Confirm, Check-in...) |
| `Card` | Hiển thị event, ticket type, số liệu dashboard |
| `Dialog` | Xác nhận đặt vé, xác nhận huỷ vé |
| `Table` | Danh sách event (Organizer), lịch sử check-in |
| `Badge` | Trạng thái vé (`RESERVED`/`CONFIRMED`/`CHECKED_IN`/`EXPIRED`) |
| `Toast` | Thông báo kết quả check-in (thành công/thất bại), thông báo lỗi API |
| `Form` + `Input` | Form tạo event, tạo loại vé, đăng nhập |
| `Skeleton` | Loading state khi tải dữ liệu event/dashboard |

```tsx
// Ví dụ Badge trạng thái vé
function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const variant = {
    RESERVED: "warning",
    CONFIRMED: "default",
    CHECKED_IN: "success",
    EXPIRED: "secondary",
    CANCELLED: "destructive",
  }[status];
  return <Badge variant={variant}>{status}</Badge>;
}
```

## 6. Chiến lược Responsive

| Trang | Chiến lược | Lý do |
|---|---|---|
| **Trang Check-in** (Checkin Staff quét QR) | Mobile-first, bắt buộc | Nhân viên luôn dùng điện thoại tại cổng, không có desktop |
| **Dashboard Organizer** | Desktop-first | Organizer theo dõi số liệu trên máy tính, cần hiển thị nhiều dữ liệu cùng lúc (bảng, biểu đồ) |
| **Trang đặt vé Customer** | Mobile-first | Phần lớn khách hàng đặt vé qua điện thoại |

Breakpoint Tailwind chuẩn: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`. Với trang Dashboard (desktop-first), layout mobile vẫn phải sử dụng được (không được vỡ hoàn toàn) nhưng không cần tối ưu chi tiết như hai trang còn lại.

## 7. Dark Mode

Không triển khai ở giai đoạn MVP. Biến CSS (mục 2) được thiết kế theo dạng HSL token để nếu cần bổ sung dark mode sau này, chỉ cần định nghĩa thêm bộ giá trị cho class `.dark` mà không cần đổi cấu trúc component.

## 8. Accessibility (WCAG A)

Áp dụng mức cơ bản cho các thao tác chính (đặt vé, check-in):

- **Alt text**: mọi ảnh (banner event, mã QR) đều có `alt` mô tả rõ nghĩa (ví dụ: `alt="Mã QR vé sự kiện Tech Conference 2026"`).
- **Contrast tối thiểu**: tỷ lệ tương phản chữ/nền đạt tối thiểu 4.5:1 cho text thường (bảng màu ở mục 2 đã đảm bảo mức này).
- **Keyboard navigable**: các thao tác chính (Reserve, Confirm, submit form đăng nhập) phải thực hiện được hoàn toàn bằng bàn phím (Tab + Enter), không phụ thuộc chuột.
- **Label rõ ràng cho input**: mọi `<Input>` có `<Label>` liên kết đúng (`htmlFor`/`id`), không chỉ dựa vào `placeholder`.

```tsx
<Label htmlFor="event-name">Tên sự kiện</Label>
<Input id="event-name" name="name" required />
```

**Ghi chú:** mức WCAG A là mức cơ bản đã chốt cho MVP — không yêu cầu AA/AAA (ví dụ: không bắt buộc hỗ trợ đầy đủ screen reader cho mọi thành phần động như trang Dashboard real-time).

## 9. Animation

Giữ tối giản, chỉ dùng animation có mục đích rõ ràng (không trang trí thừa):

- Transition mượt khi số liệu dashboard cập nhật qua WebSocket (ví dụ: số đếm tăng dần, `duration: 300ms`, `ease-out`).
- Toast xuất hiện/biến mất khi có kết quả check-in.
- Không dùng animation phức tạp (parallax, scroll-triggered...) — không phù hợp với đối tượng người dùng và mục tiêu kỹ thuật của dự án.

## 10. Layout mẫu theo trang

### Trang Check-in (mobile-first)

```
┌─────────────────────────┐
│  ← Cổng A               │  header cố định, chọn cổng
├─────────────────────────┤
│                         │
│    [ Camera preview ]   │  vùng quét QR full-width
│                         │
├─────────────────────────┤
│  Check-in thành công    │  toast kết quả, màu theo trạng thái
│  Vé #5001 · Vé VIP    │  (xanh = success, đỏ = duplicate/invalid)
└─────────────────────────┘
```

### Dashboard Organizer (desktop-first)

```
┌─────────────────────────────────────────────────────────────┐
│  Tech Conference 2026                    [Đã publish]       │
├───────────────┬───────────────┬─────────────────────────────┤
│  Đã bán       │  Đã check-in  │  Còn lại                    │
│  850          │  320          │  150                        │
├───────────────┴───────────────┴─────────────────────────────┤
│  Theo cổng                                                  │
│  ┌─────────────┬─────────────┬──────────────┐               │
│  │ Cổng A      │ 200         │ ████████░░   │               │
│  │ Cổng B      │ 120         │ █████░░░░░   │               │
│  └─────────────┴─────────────┴──────────────┘               │
└─────────────────────────────────────────────────────────────┘
```