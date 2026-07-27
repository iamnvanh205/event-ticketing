# 10 - Chiến Lược Kiểm Thử

## Mục lục

1. [Chiến lược tổng quan](#1-chiến-lược-tổng-quan)
2. [Unit Test](#2-unit-test)
3. [Integration Test (Testcontainers)](#3-integration-test-testcontainers)
4. [Concurrency Test — phần quan trọng nhất](#4-concurrency-test--phần-quan-trọng-nhất)
5. [E2E Test](#5-e2e-test)
6. [Test Data](#6-test-data)
7. [Coverage](#7-coverage)
8. [Cấu trúc thư mục test](#8-cấu-trúc-thư-mục-test)

---

## 1. Chiến lược tổng quan

| Loại test | Công cụ | Mục tiêu |
|---|---|---|
| Unit Test | JUnit 5 + Mockito | Kiểm thử logic Service layer cô lập (mock Repository) |
| Integration Test | Testcontainers (PostgreSQL thật) | Kiểm thử hành vi thật của DB, đặc biệt `SELECT ... FOR UPDATE` |
| Concurrency Test | `ExecutorService` + `CountDownLatch` | Bằng chứng kỹ thuật quan trọng nhất của dự án — chứng minh chống oversell/double check-in đúng dưới tải đồng thời thật |
| E2E Test | Playwright (frontend) hoặc test toàn luồng qua REST API | Kiểm thử toàn bộ luồng nghiệp vụ từ góc nhìn người dùng |

Không đặt target % coverage cứng — ưu tiên chất lượng test ở phần concurrency hơn số liệu coverage tổng thể.

## 2. Unit Test

Sử dụng **JUnit 5 + Mockito**, tập trung ở tầng Service. Bắt buộc có test cho các trường hợp:

- Chống oversell (logic kiểm tra `quantityRemaining` trong Service, mock Repository trả về giá trị biên)
- Chống double check-in (logic xử lý khi `affected rows = 0`)
- Hết hạn giữ chỗ (logic lazy check khi `expires_at` đã qua)
- Ownership check (Organizer khác event, Checkin Staff khác event được gán)
- Idempotency (gọi lại `reserve` với cùng `idempotencyKey`)

```java
@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock private TicketRepository ticketRepository;
    @Mock private TicketTypeRepository ticketTypeRepository;
    @InjectMocks private TicketServiceImpl ticketService;

    @Test
    void reserve_shouldThrowTicketSoldOut_whenNotEnoughQuantity() {
        TicketType ticketType = TicketType.builder().id(1L).quantityRemaining(1).build();
        when(ticketTypeRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(ticketType));

        ReserveRequest request = new ReserveRequest(1L, 2); // yêu cầu 2, chỉ còn 1

        BusinessException ex = assertThrows(BusinessException.class,
                () -> ticketService.reserve(request, 10L, "key-1"));

        assertEquals(ErrorCode.TICKET_SOLD_OUT, ex.getErrorCode());
    }

    @Test
    void checkIn_shouldRejectSecondScan_whenAffectedRowsZero() {
        when(ticketRepository.findByQrCode(any())).thenReturn(Optional.of(confirmedTicket()));
        when(ticketRepository.checkInIfConfirmed(any())).thenReturn(0); // đã check-in trước đó

        BusinessException ex = assertThrows(BusinessException.class,
                () -> checkInService.checkIn(request, staffId));

        assertEquals(ErrorCode.TICKET_ALREADY_CHECKED_IN, ex.getErrorCode());
    }
}
```

## 3. Integration Test (Testcontainers)

Bắt buộc sử dụng Testcontainers với PostgreSQL thật (image `postgres:16`), không dùng H2 — hành vi lock (`SELECT ... FOR UPDATE`) của H2 khác Postgres, test trên H2 có thể pass nhưng vẫn sai trên production.

```java
@SpringBootTest
@Testcontainers
class TicketIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("event_ticketing_test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private TicketService ticketService;
    @Autowired private TicketTypeRepository ticketTypeRepository;

    @Test
    void reserve_shouldPersistCorrectly_withRealPostgresLock() {
        // Arrange: seed 1 ticket type với quantityRemaining = 5
        // Act: gọi reserve thật qua Service
        // Assert: quantityRemaining trong DB giảm đúng, Ticket được tạo đúng trạng thái RESERVED
    }
}
```

## 4. Concurrency Test — phần quan trọng nhất

Bộ test riêng sử dụng `ExecutorService` + `CountDownLatch` để giả lập nhiều thread gửi request thực sự đồng thời (không phải tuần tự) — đây là bằng chứng kỹ thuật quan trọng nhất của toàn bộ dự án, chứng minh trực tiếp mục tiêu kỹ thuật về concurrency control.

### 4.1. Test chống oversell: 50 thread cùng đặt 1 vé cuối cùng

```java
@Test
void reserve_50ConcurrentRequests_onlyOneShouldSucceed_whenOnlyOneTicketLeft() throws InterruptedException {
    // Arrange: seed ticket type với quantityRemaining = 1
    Long ticketTypeId = seedTicketTypeWithQuantity(1);

    int threadCount = 50;
    ExecutorService executor = Executors.newFixedThreadPool(threadCount);
    CountDownLatch readyLatch = new CountDownLatch(threadCount);
    CountDownLatch startLatch = new CountDownLatch(1);
    CountDownLatch doneLatch = new CountDownLatch(threadCount);

    AtomicInteger successCount = new AtomicInteger(0);
    AtomicInteger soldOutCount = new AtomicInteger(0);

    for (int i = 0; i < threadCount; i++) {
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await(); // đảm bảo mọi thread bắt đầu cùng lúc
                ticketService.reserve(new ReserveRequest(ticketTypeId, 1), randomCustomerId(), UUID.randomUUID().toString());
                successCount.incrementAndGet();
            } catch (BusinessException e) {
                if (e.getErrorCode() == ErrorCode.TICKET_SOLD_OUT) soldOutCount.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        });
    }

    readyLatch.await();      // chờ toàn bộ 50 thread sẵn sàng
    startLatch.countDown();  // bắn tín hiệu bắt đầu đồng thời
    doneLatch.await(10, TimeUnit.SECONDS);
    executor.shutdown();

    // Assert: đúng 1 thành công, 49 nhận TICKET_SOLD_OUT
    assertEquals(1, successCount.get());
    assertEquals(49, soldOutCount.get());

    TicketType finalState = ticketTypeRepository.findById(ticketTypeId).orElseThrow();
    assertEquals(0, finalState.getQuantityRemaining()); // không âm, không lệch
}
```

### 4.2. Test chống double check-in: nhiều thread cùng quét 1 QR

```java
@Test
void checkIn_20ConcurrentScans_onlyOneShouldSucceed() throws InterruptedException {
    Ticket confirmedTicket = seedConfirmedTicket();

    int threadCount = 20;
    ExecutorService executor = Executors.newFixedThreadPool(threadCount);
    CountDownLatch startLatch = new CountDownLatch(1);
    CountDownLatch doneLatch = new CountDownLatch(threadCount);
    AtomicInteger successCount = new AtomicInteger(0);

    for (int i = 0; i < threadCount; i++) {
        executor.submit(() -> {
            try {
                startLatch.await();
                checkInService.checkIn(confirmedTicket.getQrCode(), gateId, staffId);
                successCount.incrementAndGet();
            } catch (BusinessException ignored) {
                // TICKET_ALREADY_CHECKED_IN — kết quả mong đợi cho 19/20 thread
            } finally {
                doneLatch.countDown();
            }
        });
    }

    startLatch.countDown();
    doneLatch.await(10, TimeUnit.SECONDS);

    assertEquals(1, successCount.get()); // đúng 1 lần check-in thành công
    long duplicateLogCount = checkInLogRepository.countByTicketIdAndResult(confirmedTicket.getId(), DUPLICATE);
    assertEquals(19, duplicateLogCount); // 19 lần còn lại được ghi log DUPLICATE
}
```

Cả hai test trên bắt buộc chạy trên Testcontainers PostgreSQL thật (kế thừa từ mục 3), vì hành vi lock/atomic update chỉ đúng khi chạy trên engine DB thật.

## 5. E2E Test

- **Frontend**: Playwright, kiểm thử các luồng chính: đăng nhập → tạo event (Organizer) → đặt vé (Customer) → check-in (Checkin Staff) → xem dashboard cập nhật real-time.
- **Phương án thay thế**: test toàn luồng qua REST API trực tiếp (không qua UI) nếu ưu tiên tốc độ viết test hơn độ phủ UI thật.

```typescript
// Ví dụ Playwright (minh hoạ luồng happy path)
test('customer có thể đặt vé và nhận QR', async ({ page }) => {
  await page.goto('/events/42');
  await page.click('text=Vé thường');
  await page.click('text=Đặt vé');
  await expect(page.locator('text=Đang giữ chỗ')).toBeVisible();
  await page.click('text=Xác nhận');
  await expect(page.locator('img[alt*="Mã QR"]')).toBeVisible();
});
```

**Design Consideration:** công cụ E2E cụ thể (Playwright hoặc REST-only) — đề xuất Playwright cho độ phủ thực tế cao hơn, có thể điều chỉnh tuỳ thời gian thực tế khi triển khai.

## 6. Test Data

Sử dụng dữ liệu seed riêng cho môi trường test (tách biệt với seed demo ở [`05-DATABASE.md#14-seed-data`](./05-DATABASE.md#14-seed-data)), tạo qua test fixture/builder pattern:

```java
public class TestDataBuilder {
    public static TicketType ticketTypeWithQuantity(int remaining) {
        return TicketType.builder()
                .name("Test Ticket")
                .price(new BigDecimal("100000"))
                .quantityTotal(remaining)
                .quantityRemaining(remaining)
                .build();
    }
}
```

## 7. Coverage

Không đặt target % coverage cứng cho toàn dự án. Ưu tiên theo thứ tự:

1. 100% các luồng concurrency quan trọng (mục 4) phải có test — không thương lượng.
2. Mỗi quy tắc nghiệp vụ tại [`07-BUSINESS-RULES.md`](./07-BUSINESS-RULES.md) có ít nhất 1 unit test.
3. Coverage tổng thể — theo dõi tham khảo (ví dụ: báo cáo JaCoCo trong CI), không chặn merge PR dựa trên % coverage.

## 8. Cấu trúc thư mục test

```
backend/src/test/java/com/vanh/eventticketing/
├── ticket/
│   ├── TicketServiceTest.java                # unit test (mục 2)
│   ├── TicketIntegrationTest.java             # integration test (mục 3)
│   └── TicketReservationConcurrencyIT.java    # concurrency test (mục 4.1)
├── checkin/
│   ├── CheckInServiceTest.java
│   └── CheckInConcurrencyIT.java              # concurrency test (mục 4.2)
└── support/
    ├── AbstractIntegrationTest.java           # base class cấu hình Testcontainers dùng chung
    └── TestDataBuilder.java
```

**Quy ước:** file test tên `*ConcurrencyIT.java` hoặc `*IT.java` (Integration Test) chạy chậm hơn — có thể tách profile Maven riêng (`mvn test` chạy unit test nhanh, `mvn verify` chạy thêm integration/concurrency test) để CI phân tách rõ giai đoạn.