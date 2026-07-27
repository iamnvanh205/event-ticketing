# 11 - Triển Khai Hệ Thống

## Mục lục

1. [Tổng quan môi trường](#1-tổng-quan-môi-trường)
2. [Local Development (Docker Compose)](#2-local-development-docker-compose)
3. [Production — Render (Backend)](#3-production--render-backend)
4. [Production — Vercel (Frontend)](#4-production--vercel-frontend)
5. [Production — Neon (Database)](#5-production--neon-database)
6. [Secrets Management](#6-secrets-management)
7. [CI/CD — GitHub Actions](#7-cicd--github-actions)
8. [Logging & Monitoring](#8-logging--monitoring)
9. [Backup](#9-backup)

---

## 1. Tổng quan môi trường

| Environment | Backend | Frontend | Database |
|---|---|---|---|
| **Local (dev)** | Docker Compose (container) | Docker Compose (container) hoặc `npm run dev` | Docker Compose (Postgres container) |
| **Production** | Render | Vercel | Neon (PostgreSQL) |

## 2. Local Development (Docker Compose)

File `docker-compose.yml` đặt ở thư mục gốc repo, chạy đồng thời Postgres, backend và frontend:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: event_ticketing
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: jdbc:postgresql://postgres:5432/event_ticketing
      DATABASE_URL_DIRECT: jdbc:postgresql://postgres:5432/event_ticketing
      JWT_SECRET: local-dev-secret-change-me
      SPRING_PROFILES_ACTIVE: local
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build: ./frontend
    environment:
      VITE_API_BASE_URL: http://localhost:8080/api/v1
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  pgdata:
```

```bash
# Chạy toàn bộ local dev
docker compose up --build

# Chỉ chạy Postgres, backend/frontend chạy trực tiếp bằng IDE/npm cho tốc độ dev nhanh hơn
docker compose up postgres
```

## 3. Production — Render (Backend)

- Deploy dạng Web Service từ Dockerfile trong `backend/`.
- Biến môi trường khai báo trực tiếp trên Render Dashboard (xem mục 6).
- Health check endpoint: `GET /actuator/health` (Spring Boot Actuator).

```dockerfile
# backend/Dockerfile (minh hoạ multi-stage build)
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## 4. Production — Vercel (Frontend)

- Deploy dạng Static Site / Vite project, build command `npm run build`, output directory `dist/`.
- Biến môi trường (`VITE_API_BASE_URL`, `VITE_WS_URL`) khai báo trên Vercel Dashboard.
- Auto-deploy khi có push/merge vào `main` (xem mục 7).

## 5. Production — Neon (Database)

- **Runtime connection**: sử dụng pooled connection string (qua PgBouncer của Neon), phù hợp nhiều connection ngắn hạn từ HikariCP.
- **Migration connection**: sử dụng direct connection string (không qua pooler) cho Flyway.

```
DATABASE_URL=postgresql://<user>:<pass>@<host>-pooler.neon.tech/event_ticketing?sslmode=require
DATABASE_URL_DIRECT=postgresql://<user>:<pass>@<host>.neon.tech/event_ticketing?sslmode=require
```

Chi tiết migration được mô tả tại [`05-DATABASE.md`](./05-DATABASE.md#13-migration-flyway).

## 6. Secrets Management

Quản lý trực tiếp qua Environment Variables trên dashboard Render/Vercel — không sử dụng thêm công cụ khác (không Vault, không AWS Secrets Manager) ở giai đoạn MVP, phù hợp quy mô dự án cá nhân.

| Biến | Nơi khai báo | Ghi chú |
|---|---|---|
| `DATABASE_URL` | Render | Pooled connection (Neon) |
| `DATABASE_URL_DIRECT` | Render | Direct connection, chỉ dùng migration |
| `JWT_SECRET` | Render | Tối thiểu 256-bit, sinh ngẫu nhiên |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Render | Google OAuth2 |
| `CLOUDINARY_URL` | Render | Upload banner event |
| `VITE_API_BASE_URL` | Vercel | URL backend production |
| `VITE_WS_URL` | Vercel | URL WebSocket production |

**Quy tắc bắt buộc**: không commit bất kỳ secret nào vào Git, kể cả trong file `application-local.yml` mẫu — sử dụng `application-local.yml.example` làm template, file thật nằm trong `.gitignore`.

## 7. CI/CD — GitHub Actions

Hệ thống áp dụng cả CI và CD:

- **CI**: chạy test tự động khi có push/PR (bao gồm unit test, integration test, concurrency test — xem [`10-TESTING.md`](./10-TESTING.md)).
- **CD**: auto-deploy lên Render/Vercel khi merge vào `main`.

```yaml
# .github/workflows/backend-ci.yml
name: Backend CI
on:
  pull_request:
    paths: ["backend/**"]
  push:
    branches: [main]
    paths: ["backend/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: "21"
          distribution: "temurin"
      - name: Run tests (unit + integration + concurrency)
        working-directory: backend
        run: mvn -B verify   # verify chạy cả integration/concurrency test qua Testcontainers
```

```yaml
# .github/workflows/backend-deploy.yml
name: Backend Deploy
on:
  push:
    branches: [main]
    paths: ["backend/**"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: []   # Render tự trigger deploy qua webhook khi merge vào main (Auto-Deploy),
                # workflow này minh hoạ trường hợp cần trigger thủ công qua Render Deploy Hook
    steps:
      - name: Trigger Render Deploy Hook
        run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI
on:
  pull_request:
    paths: ["frontend/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - working-directory: frontend
        run: npm ci && npm run build && npm run test
```

**Ghi chú:** Vercel có tích hợp GitHub trực tiếp (auto-deploy khi merge `main` mà không cần workflow riêng) — `frontend-deploy.yml` chỉ cần thiết nếu muốn kiểm soát thủ công thay vì dùng tích hợp mặc định của Vercel.

## 8. Logging & Monitoring

Ở giai đoạn MVP, hệ thống sử dụng log built-in của Render/Vercel (xem log trực tiếp qua dashboard), không tích hợp công cụ giám sát chuyên sâu (Sentry, Grafana, Prometheus...) — thuộc phạm vi mở rộng sau.

- Backend: log text thường qua SLF4J/Logback (xem [`03-CODING-STANDARDS.md#7-logging`](./03-CODING-STANDARDS.md#7-logging)), Render tự thu thập stdout/stderr.
- Frontend: lỗi runtime hiển thị qua console browser, chưa cần error tracking tập trung ở MVP.

## 9. Backup

Neon có cơ chế backup/point-in-time-restore theo mặc định của dịch vụ (theo gói sử dụng) — dự án MVP sử dụng nguyên cơ chế mặc định của Neon, không tự xây thêm pipeline backup riêng.

**Known Limitations:** cấu hình cụ thể của gói Neon đang sử dụng (thời gian retention point-in-time-restore) chưa được xác nhận trong nghiên cứu ban đầu, cần kiểm tra trực tiếp trên Neon Dashboard khi thiết lập production.