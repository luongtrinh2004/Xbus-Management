# Chuyển Dữ Liệu Xbus Từ JSON Sang MySQL

## 1. Mục tiêu và phạm vi

Hiện ứng dụng lưu nghiệp vụ trong `src/data/json/*.json` và đọc/ghi qua `src/libs/jsonRepository.js`. Cách này phù hợp một container duy nhất nhưng không an toàn khi cần nhiều replica, truy vấn phức tạp, giao dịch đồng thời hoặc backup/khôi phục có kiểm soát.

Mục tiêu migration:

- Giữ nguyên ID nghiệp vụ hiện hữu (`usr_*`, `fund_*`, `log_*`), không đổi URL/API client.
- Chuyển dữ liệu sang MySQL 8; dùng transaction và foreign key.
- Cho phép chạy song song giai đoạn kiểm chứng, sau đó chuyển đọc/ghi hoàn toàn sang MySQL.
- Không lưu avatar/binary vào MySQL; giữ file trong Docker volume hoặc chuyển sang object storage sau này.

## 2. Cấu trúc dữ liệu JSON hiện tại

| File | Root key | Dữ liệu |
| --- | --- | --- |
| `users.json` | `users` | Nhân sự, xác thực, vai trò, bộ phận, hình thức, điểm rèn luyện |
| `types.json` | `types` | Bộ phận chuyên môn |
| `categories.json` | `categories` | Hình thức nhân sự |
| `funds.json` | `funds` | Kỳ quỹ, khoản đóng, thu, chi |
| `assets.json` | `imports`, `exports` | Phiếu nhập/xuất tài sản; tồn kho được tính động |
| `water-schedules.json` | `schedules` | Lịch bê nước và người tham gia |
| `water-exemptions.json` | `userIds` | Danh sách miễn bê nước |
| `afternoon-tea.json` | `menuImageUrl`, `invitations` | Ảnh menu và lời mời trà chiều |
| `audit-logs.json` | `auditLogs` | Nhật ký thao tác |
| `settings.json` | object | Cấu hình toàn hệ thống |

### 2.1. Thực thể nhân sự

`users`: `id`, `googleId`, `name`, `email`, `code`, `avatarUrl`, `gender`, `phone`, `role`, `typeId`, `categoryId`, `status`, `password`, `birthday`, `schedulingPoints`, `waterTripCount`, `createdAt`, `updatedAt`, `activatedAt`, `activatedBy`.

Quan hệ: một nhân sự thuộc tối đa một bộ phận (`typeId`) và một hình thức (`categoryId`); một nhân sự có nhiều đóng quỹ, lịch bê nước, giao dịch tài sản (qua tên hiện tại), audit log.

### 2.2. Quỹ phòng

`funds`: `id`, `year`, `month`, `openingBalance`, `members[]`, `incomes[]`, `expenses[]`, `updatedAt`.

- `members[]`: `userId`, `paid`, `amount`, `paidAt`, `updatedAt`, `approvedBy`; phiên bản PayOS bổ sung `paymentStatus`, `orderCode`, `paymentLinkId`, `checkoutUrl`, `paymentReference`.
- `incomes[]`: `id`, `title`, `category`, `amount`, `note`, `userId`, `userName`, `receivedAt`, `createdBy`, `createdByName`, `createdAt`.
- `expenses[]`: cùng dạng income, dùng `spentAt`.

Mỗi kỳ quỹ duy nhất theo `(year, month)`. Tổng thu, chi và số dư hiện là dữ liệu tính toán, không lưu cứng.

### 2.3. Lịch bê nước

`schedules[]`: `id`, `year`, `month`, `weekIndex`, `range`, `validDays[]`, `date`, `time`, `requiredPeople`, `status`, `note`, `participants[]`, timestamps.

`participants[]`: `userId`, `name`, `code`, `completed`. Tên/mã là snapshot hiển thị; `userId` là khóa nghiệp vụ.

### 2.4. Tài sản, trà chiều và audit

- Phiếu tài sản nhập/xuất: `id`, `code`, `name`, `date`, `quantity`, `location`, `person`, `note`, timestamps. Tồn kho = tổng nhập trừ tổng xuất theo `code`.
- Lời mời trà chiều phải được tách thành invitation và invitation participant/response khi migrate; ảnh menu chỉ lưu URL/path.
- Audit log: `id`, `adminId`, `adminName`, `adminEmail`, `action`, `targetType`, `targetId`, `details`, `ip`, `timestamp`.
- Settings gồm domain email, role/status mặc định, số người bê nước mặc định và mức đóng quỹ tối thiểu.

## 3. Schema MySQL đề xuất

| Bảng | Khóa chính | Quan hệ/chỉ mục chính |
| --- | --- | --- |
| `users` | `id VARCHAR(64)` | `email UNIQUE`, `code UNIQUE NULL`, FK `department_id`, `employment_category_id` |
| `departments` | `id VARCHAR(64)` | `name UNIQUE` |
| `employment_categories` | `id VARCHAR(64)` | `name UNIQUE` |
| `app_settings` | `setting_key VARCHAR(100)` | JSON value hoặc cột riêng cho cấu hình phổ biến |
| `fund_periods` | `id VARCHAR(64)` | `UNIQUE(year, month)` |
| `fund_member_payments` | `id BIGINT` | `UNIQUE(fund_period_id, user_id)`, FK kỳ quỹ/user/approver |
| `fund_transactions` | `id VARCHAR(64)` | FK kỳ quỹ, user; `kind ENUM('income','expense')`, `category`, `occurred_at` |
| `fund_reminder_logs` | `id BIGINT` | FK kỳ quỹ/user; `UNIQUE(fund_period_id,user_id,reminder_date,trigger)` |
| `asset_transactions` | `id VARCHAR(64)` | `type ENUM('import','export')`, index `(asset_code, transaction_date)` |
| `water_schedules` | `id VARCHAR(64)` | `UNIQUE(year,month,week_index)` |
| `water_schedule_participants` | `id BIGINT` | FK schedule/user; `UNIQUE(schedule_id,user_id)` |
| `water_exemptions` | `user_id VARCHAR(64)` | FK user |
| `tea_invitations` | `id VARCHAR(64)` | thời gian, creator, menu URL |
| `tea_invitation_members` | `id BIGINT` | FK invitation/user; trạng thái phản hồi |
| `audit_logs` | `id VARCHAR(64)` | index `(timestamp)`, `(target_type,target_id)`, `(admin_id,timestamp)` |

### Quy tắc kiểu dữ liệu

- Tiền dùng `BIGINT UNSIGNED` (VNĐ), tuyệt đối không dùng `FLOAT`.
- Ngày nghiệp vụ: `DATE`; thời điểm: `DATETIME(3)` UTC.
- Các enum linh hoạt (`role`, `status`, payment status) dùng `VARCHAR(32)` + validation application để dễ mở rộng.
- URL/path avatar/menu: `VARCHAR(1024)`.
- Nội dung audit/note: `TEXT`; dữ liệu ít truy vấn linh hoạt dùng `JSON`.

## 4. Migration theo giai đoạn

1. **Chuẩn bị**: thêm MySQL 8 vào `docker-compose`, tạo DB/user quyền tối thiểu, backup toàn bộ JSON và volume ảnh.
2. **Schema**: tạo migration versioned (khuyến nghị Prisma Migrate hoặc Drizzle Kit); áp dụng FK sau khi import dữ liệu sạch.
3. **Import một lần**: script đọc JSON, insert theo thứ tự `departments/categories → users → fund periods/payments/transactions → schedules/participants → assets → audit` trong transaction theo nhóm.
4. **Đối soát**: so số lượng users, fund periods, tổng tiền theo kỳ, số payment đã đóng, số schedule/participant và checksum audit log.
5. **Dual-read có kiểm soát**: staging đọc MySQL, so sánh kết quả với JSON; production vẫn ghi JSON.
6. **Cutover**: bật repository MySQL qua feature flag, tạm dừng ghi JSON, chạy import delta cuối, chuyển traffic.
7. **Rollback**: giữ snapshot JSON và feature flag; chỉ rollback trước khi có ghi mới chỉ-Mysql, hoặc export delta ngược lại.
8. **Dọn dẹp**: sau ít nhất 30 ngày ổn định, bỏ JSON repository khỏi luồng runtime; giữ backup read-only theo chính sách.

## 5. Thay đổi code

- Giữ interface repository (`getUsers`, `saveUsers`, `getFunds`...) trong giai đoạn đầu nhưng thay implementation bằng repository MySQL async.
- Chuyển route handlers từ thao tác mảng sang query transaction.
- Các thay đổi nhiều bảng (xác nhận PayOS, đóng quỹ, hủy giao dịch, hoàn điểm) bắt buộc dùng transaction SQL.
- Password hash hiện có bcrypt được giữ nguyên; không reset mật khẩu khi migrate.
- Tạo migration script idempotent, có `--dry-run` và log lỗi theo record.

## 6. Vận hành và backup

- MySQL volume riêng; backup logical hằng ngày bằng `mysqldump` và kiểm thử restore định kỳ.
- Không commit `.env`, database dump chứa dữ liệu cá nhân hoặc App Password.
- Bật timezone DB UTC; UI chuyển sang `Asia/Ho_Chi_Minh` khi hiển thị.
- Theo dõi connection, dung lượng volume, slow query và lỗi migration.

## 7. Quy trình đã kiểm tra ở máy local

> Trạng thái hiện tại: MySQL local chạy độc lập; ứng dụng vẫn giữ `DATA_SOURCE=json`. Không đổi nguồn đọc/ghi của ứng dụng trước khi repository MySQL hoàn chỉnh và đối soát đạt yêu cầu.

### 7.1. Khởi động MySQL local bằng Docker

```powershell
docker run --name xbus-mysql `
  -e MYSQL_ROOT_PASSWORD=xbus_root_local_dev `
  -e MYSQL_DATABASE=xbus `
  -e MYSQL_USER=xbus `
  -e MYSQL_PASSWORD=xbus_local_dev `
  -p 127.0.0.1:3306:3306 `
  -v xbus_mysql_data:/var/lib/mysql `
  -d mysql:8.4 `
  --character-set-server=utf8mb4 `
  --collation-server=utf8mb4_unicode_ci
```

- Chỉ bind `127.0.0.1` để MySQL không mở ra mạng LAN/Internet.
- Các password trên chỉ dùng local; không dùng lại ở VPS/production.

Kiểm tra health:

```powershell
docker exec xbus-mysql mysqladmin ping -h 127.0.0.1 -uxbus -pxbus_local_dev --silent
docker exec -it xbus-mysql mysql -uxbus -pxbus_local_dev xbus
```

### 7.2. Tạo schema và import JSON

Schema nằm tại `database/migrations/001_initial_schema.sql`.

```powershell
Get-Content database\migrations\001_initial_schema.sql |
  docker exec -i xbus-mysql mysql -uxbus -pxbus_local_dev xbus

npm run db:import-json
```

Script `scripts/import-json-to-mysql.mjs` đọc toàn bộ JSON theo thứ tự quan hệ và chạy trong transaction. Script idempotent: chạy lại sẽ update record theo khóa hiện có, không nhân đôi dữ liệu.

### 7.3. Kết quả import mẫu đã xác minh

| Bảng | Số bản ghi |
| --- | ---: |
| `users` | 29 |
| `fund_periods` | 1 |
| `fund_member_payments` | 12 |
| `fund_transactions` | 7 |
| `asset_transactions` | 5 |
| `water_schedules` | 5 |
| `audit_logs` | 92 |

Kiểm tra lại thủ công:

```powershell
docker exec xbus-mysql mysql -uxbus -pxbus_local_dev -Nse "SELECT (SELECT COUNT(*) FROM users), (SELECT COUNT(*) FROM fund_periods), (SELECT COUNT(*) FROM fund_member_payments), (SELECT COUNT(*) FROM fund_transactions), (SELECT COUNT(*) FROM asset_transactions), (SELECT COUNT(*) FROM water_schedules), (SELECT COUNT(*) FROM audit_logs);" xbus
```

Lưu ý: dữ liệu lịch bê nước có thể có nhiều record cùng `(year, month, week_index)`, vì vậy schema dùng index `ix_water_period`, không dùng unique key cho ba cột này.

## 8. Cài đặt trên VPS

### 8.1. Chuẩn bị và backup

Trước mọi thao tác phải backup JSON volume và xác minh file backup tồn tại:

```bash
cd /home/stackops/xbus-management
docker compose down
docker run --rm \
  -v xbus-management_xbus_data:/data:ro \
  -v "$PWD":/backup \
  alpine tar czf /backup/xbus-json-$(date +%F).tar.gz -C /data .
docker compose up -d
```

Không xóa volume JSON trong giai đoạn migration.

### 8.2. Thêm service MySQL vào Docker Compose

Thêm service nội bộ, không khai báo `ports:`:

```yaml
  mysql:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: xbus
      MYSQL_USER: xbus
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/migrations:/docker-entrypoint-initdb.d:ro

volumes:
  mysql_data:
```

Trong `.env` VPS thêm password mạnh, duy nhất:

```env
DATA_SOURCE=json
MYSQL_PASSWORD=<mật-khẩu-app-mạnh>
MYSQL_ROOT_PASSWORD=<mật-khẩu-root-mạnh-khác>
DATABASE_URL=mysql://xbus:<mật-khẩu-app-mạnh>@mysql:3306/xbus
```

Không commit `.env`; không mở cổng `3306` qua firewall/Nginx. MySQL chỉ được truy cập trong Docker network.

### 8.3. Khởi tạo và import production

```bash
docker compose up -d mysql
docker compose logs -f mysql
docker compose exec xbus-office npm run db:import-json
```

Nếu app image không có source script/migration mới, rebuild trước:

```bash
docker compose build xbus-office
docker compose up -d
```

Đối soát row count và tổng tiền quỹ trên JSON/MySQL trước khi đổi `DATA_SOURCE`.

### 8.4. Cutover và rollback

1. Dừng ghi dữ liệu ngắn hạn (maintenance window).
2. Chạy `npm run db:import-json` lần cuối để lấy delta.
3. Đặt `DATA_SOURCE=mysql`, rebuild/restart app.
4. Kiểm thử đăng nhập, user, quỹ, PayOS, tài sản, lịch nước, audit log.
5. Nếu lỗi trước khi phát sinh dữ liệu chỉ-Mysql: đặt lại `DATA_SOURCE=json` và restart.

Sau khi MySQL ổn định tối thiểu 30 ngày mới cân nhắc loại JSON repository khỏi runtime.

### 8.5. Backup MySQL hằng ngày

```bash
docker compose exec -T mysql mysqldump -uxbus -p"$MYSQL_PASSWORD" --single-transaction xbus > /home/stackops/backups/xbus-mysql-$(date +%F).sql
```

Khôi phục thử nghiệm:

```bash
cat /home/stackops/backups/xbus-mysql-YYYY-MM-DD.sql | docker compose exec -T mysql mysql -uxbus -p"$MYSQL_PASSWORD" xbus
```
