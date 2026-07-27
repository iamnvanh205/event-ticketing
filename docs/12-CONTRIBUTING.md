# 12 - Quy Trình Đóng Góp

## Mục lục

1. [Git Flow](#1-git-flow)
2. [Quy ước đặt tên Branch](#2-quy-ước-đặt-tên-branch)
3. [Quy ước Commit](#3-quy-ước-commit)
4. [Pull Request](#4-pull-request)
5. [Quy tắc Review](#5-quy-tắc-review)
6. [Release & Versioning](#6-release--versioning)
7. [Checklist trước khi mở PR](#7-checklist-trước-khi-mở-pr)

---

## 1. Git Flow

Dự án áp dụng GitHub Flow đơn giản — phù hợp dự án cá nhân, không dùng Git Flow đầy đủ (không có nhánh `develop`/`release` riêng):

```
main ──●──●──●──────────●──●──▶  (luôn deployable, deploy liên tục)
        \         /
         ●───●───●   feature/ticket-reservation
```

- `main` là nhánh duy nhất luôn ở trạng thái deploy được (CD tự động deploy khi merge — xem [`11-DEPLOYMENT.md`](./11-DEPLOYMENT.md#7-cicd--github-actions)).
- Mọi thay đổi đi qua feature branch → Pull Request → merge vào `main`.
- Không thực hiện thay đổi trực tiếp trên `main`.

## 2. Quy ước đặt tên Branch

| Loại | Format | Ví dụ |
|---|---|---|
| Tính năng mới | `feature/<mô-tả-ngắn-gọn>` | `feature/ticket-reservation` |
| Sửa lỗi | `fix/<mô-tả-ngắn-gọn>` | `fix/checkin-race-condition` |
| Công việc phụ trợ (không đổi logic) | `chore/<mô-tả-ngắn-gọn>` | `chore/upgrade-spring-boot` |
| Tài liệu | `docs/<mô-tả-ngắn-gọn>` | `docs/update-api-spec` |

Mô tả ngắn gọn bằng tiếng Anh, `kebab-case`, đủ rõ để hiểu nội dung nhánh mà không cần mở PR.

## 3. Quy ước Commit

Dự án áp dụng Conventional Commits:

```
<type>: <mô tả ngắn gọn, thì hiện tại, không viết hoa chữ đầu, không dấu chấm cuối>

[phần mô tả chi tiết, tuỳ chọn]
```

| Type | Dùng khi |
|---|---|
| `feat:` | Thêm tính năng mới |
| `fix:` | Sửa lỗi |
| `chore:` | Việc phụ trợ (cập nhật dependency, cấu hình build...) |
| `docs:` | Chỉ thay đổi tài liệu |
| `test:` | Thêm/sửa test, không đổi logic sản phẩm |
| `refactor:` | Tái cấu trúc code, không đổi hành vi bên ngoài |

```bash
git commit -m "feat: add pessimistic lock for ticket reservation"
git commit -m "fix: prevent double check-in via conditional update"
git commit -m "test: add concurrency test for 50 concurrent reservations"
git commit -m "docs: update API spec for checkin endpoint"
```

## 4. Pull Request

Mọi thay đổi — kể cả khi làm việc một mình — vẫn tạo Pull Request và tự review trước khi merge vào `main`, không merge trực tiếp không qua PR.

### Mẫu PR Template (`.github/pull_request_template.md`)

```markdown
## Mô tả
<!-- Tóm tắt ngắn gọn thay đổi trong PR này -->

## Loại thay đổi
- [ ] feat — tính năng mới
- [ ] fix — sửa lỗi
- [ ] chore — việc phụ trợ
- [ ] docs — tài liệu
- [ ] test — test
- [ ] refactor — tái cấu trúc

## Checklist
- [ ] Đã tự review lại toàn bộ diff
- [ ] Đã chạy `mvn verify` (hoặc `npm test`) local, pass toàn bộ
- [ ] Nếu đụng tới luồng Reserve/Check-in: đã có concurrency test tương ứng (xem `10-TESTING.md`)
- [ ] Nếu đổi schema DB: đã thêm file Flyway migration mới (không sửa migration cũ)
- [ ] Nếu thêm business rule mới: đã cập nhật `07-BUSINESS-RULES.md` và `09-ERROR-CODES.md`

## Ghi chú thêm
<!-- Rủi ro, đánh đổi, hoặc điều cần lưu ý khi review -->
```

## 5. Quy tắc Review

- Do làm việc cá nhân, "review" nghĩa là tự đọc lại toàn bộ diff trước khi merge, kiểm tra đúng các mục trong checklist PR template ở mục 4.
- Với thay đổi liên quan trực tiếp tới concurrency (luồng Reserve, Confirm, Check-in): bắt buộc tự kiểm tra lại đã tuân thủ đúng cơ chế lock tại [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md#8-concurrency-control--chống-oversell) trước khi merge, không bỏ qua bước này dù là thay đổi nhỏ.
- Không merge PR khi CI (GitHub Actions) đang fail.

## 6. Release & Versioning

Dự án sử dụng Semantic Versioning (`vMAJOR.MINOR.PATCH`, ví dụ: `v1.0.0`):

| Thành phần | Tăng khi |
|---|---|
| `MAJOR` | Có breaking change (ví dụ: đổi cấu trúc response API, đổi schema không tương thích ngược) |
| `MINOR` | Thêm tính năng mới, tương thích ngược |
| `PATCH` | Sửa lỗi, không đổi hành vi API |

```bash
git tag -a v1.0.0 -m "MVP release: reserve/confirm, checkin, real-time dashboard"
git push origin v1.0.0
```

Do deploy liên tục từ `main` (CD tự động — xem [`11-DEPLOYMENT.md`](./11-DEPLOYMENT.md)), tag version dùng để đánh dấu mốc quan trọng (ví dụ: hoàn thành MVP), không nhất thiết gắn với từng lần deploy.

## 7. Checklist trước khi mở PR

- [ ] Code tuân thủ quy ước đặt tên tại [`03-CODING-STANDARDS.md`](./03-CODING-STANDARDS.md)
- [ ] Không đặt business logic trong Controller
- [ ] Mọi `BusinessException` mới có `errorCode` tương ứng đã khai báo tại [`09-ERROR-CODES.md`](./09-ERROR-CODES.md)
- [ ] Không truy cập trực tiếp Repository của module khác — xem ranh giới module tại [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md#4-ranh-giới-module-module-boundaries)
- [ ] Thay đổi liên quan concurrency có test `ExecutorService` + `CountDownLatch` tương ứng
- [ ] Không commit secret/API key vào Git